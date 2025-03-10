/* global hexo, __dirname */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');

const defaultConfig = {
  'abstract': 'Here\'s something encrypted, password is required to continue reading.',
  'message': 'Hey, password is required here.',
  'theme': 'default',
  'wrong_pass_message': 'Oh, this is an invalid password. Check and try again, please.',
  'silent': false,
};

// use default theme
let theme = 'default';

hexo.extend.filter.register('after_post_render', (data) => {
  const tagEncryptPairs = [];

  let password = data.password;
  let tagUsed = false;

  // use a empty password to disable category encryption
  if (password === "") {
    return data;
  }

  if (hexo.config.encrypt === undefined) {
    hexo.config.encrypt = [];
  }

  if (('encrypt' in hexo.config) && ('tags' in hexo.config.encrypt)) {
    hexo.config.encrypt.tags.forEach((tagObj) => {
      tagEncryptPairs[tagObj.name] = tagObj.password;
    });
  }

  if (data.tags) {
    data.tags.forEach((cTag) => {
      if (tagEncryptPairs.hasOwnProperty(cTag.name)) {
        tagUsed = password ? tagUsed : cTag.name;
        password = password || tagEncryptPairs[cTag.name];
      }
    });
  }

  if (password == undefined) {
    return data;
  }

  password = password.toString();

  // make sure toc can work.
  data.origin = data.content;

  const config = Object.assign(defaultConfig, hexo.config.encrypt, data);
  theme = config.theme.trim().toLowerCase();

  // read theme from file
  const template = fs.readFileSync(path.resolve(__dirname, `./lib/hbe.${theme}.html`)).toString();

  data.content = data.content.trim();
  data.encrypt = true;

  const keySalt = crypto.randomBytes(18);
  const key = crypto.pbkdf2Sync(new TextEncoder().encode(password), keySalt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encryptedData = Buffer.concat([
    cipher.update(data.content, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64');

  data.content = template.replace(/{{hbeEncryptedData}}/g, encryptedData)
    .replace(/{{hbeWrongPassMessage}}/g, config.wrong_pass_message)
    .replace(/{{hbeMessage}}/g, config.message)
    .replace(/{{hbeKeySalt}}/g, keySalt.toString('base64'))
    .replace(/{{hbeIvSalt}}/g, iv.toString('base64'));
  data.content += `<script data-pjax src="${hexo.config.root}js/hbe.js"></script><link href="${hexo.config.root}css/hbe.style.css" rel="stylesheet" type="text/css">`;
  data.excerpt = data.more = config.abstract;

  return data;
}, 1000);

hexo.extend.generator.register('hexo-blog-encrypt', () => [
  {
    'data': () => fs.createReadStream(path.resolve(__dirname, `./lib/hbe.style.css`)),
    'path': `css/hbe.style.css`,
  },
  {
    'data': () => fs.createReadStream(path.resolve(__dirname, './lib/hbe.js')),
    'path': 'js/hbe.js',
  },
]);
