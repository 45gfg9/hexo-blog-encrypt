/* global hexo, __dirname */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const log = hexo.log;

const defaultConfig = {
  'abstract': 'Here\'s something encrypted, password is required to continue reading.',
  'message': 'Hey, password is required here.',
  'theme': 'default',
  'wrong_pass_message': 'Oh, this is an invalid password. Check and try again, please.',
  'wrong_hash_message': 'OOPS, these decrypted content may changed, but you can still have a look.',
  'silent': false,
};

// As we can't detect the wrong password with AES-CBC,
// so adding an empty tag and check it when decrption.
const knownPrefix = "<hbe-prefix></hbe-prefix>";

// disable log
let silent = false;
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
  silent = config.silent;
  theme = config.theme.trim().toLowerCase();

  // read theme from file
  let template = fs.readFileSync(path.resolve(__dirname, `./lib/hbe.${theme}.html`)).toString();

  data.content = knownPrefix + data.content.trim();
  data.encrypt = true;

  const keySalt = crypto.randomBytes(18);
  const key = crypto.pbkdf2Sync(password, keySalt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const hmac = crypto.createHmac('sha256', key);

  let encryptedData = cipher.update(data.content, 'utf8', 'hex');
  hmac.update(data.content, 'utf8');
  encryptedData += cipher.final('hex');
  const hmacDigest = hmac.digest('hex');

  data.content = template.replace(/{{hbeEncryptedData}}/g, encryptedData)
    .replace(/{{hbeHmacDigest}}/g, hmacDigest)
    .replace(/{{hbeWrongPassMessage}}/g, config.wrong_pass_message)
    .replace(/{{hbeWrongHashMessage}}/g, config.wrong_hash_message)
    .replace(/{{hbeMessage}}/g, config.message)
    .replace(/{{hbeKeySalt}}/g, keySalt.toString('hex'))
    .replace(/{{hbeIvSalt}}/g, iv.toString('hex'));
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
