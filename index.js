/* global hexo, __dirname */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');

const defaultConfig = {
  abstract: 'Here\'s something encrypted, password is required to continue reading.',
  message: 'Hey, password is required here.',
  theme: 'default',
  wrong_pass_message: 'Oh, this is an invalid password. Check and try again, please.',
};

hexo.extend.filter.register('after_post_render', (data) => {
  let password = data.password;
  let tagUsed = false;

  // use a empty password to disable category encryption
  if (password === '') {
    return data;
  }

  data.tags?.forEach(({ name }) => {
    const tagPassword = hexo.config.encrypt?.tags?.find(({ name: tagName }) => tagName === name)?.password;
    if (tagPassword) {
      tagUsed = password ? tagUsed : name;
      password ||= tagPassword;
    }
  });

  if (!password) {
    return data;
  }

  // make sure toc can work.
  data.origin = data.content;

  const { abstract, message, theme, wrong_pass_message } = Object.assign({}, defaultConfig, hexo.config.encrypt, data);

  // read theme from file
  const template = fs.readFileSync(path.resolve(__dirname, `lib/hbe.${theme.trim().toLowerCase()}.html`), 'utf8');

  data.content = data.content.trim();
  data.encrypt = true;

  const salt = crypto.randomBytes(18);
  const key = crypto.pbkdf2Sync(new TextEncoder().encode(password), salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(data.content, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64');

  data.content = template.replace(/{{hbeCiphertext}}/g, ciphertext)
    .replace(/{{hbeWrongPassMessage}}/g, wrong_pass_message)
    .replace(/{{hbeMessage}}/g, message)
    .replace(/{{hbeSalt}}/g, salt.toString('base64'))
    .replace(/{{hbeIv}}/g, iv.toString('base64'));
  data.content += `<script data-pjax src="${hexo.config.root}js/hbe.js"></script><link href="${hexo.config.root}css/hbe.style.css" rel="stylesheet" type="text/css">`;
  data.excerpt = data.more = abstract;

  return data;
}, 1000);

hexo.extend.generator.register('hexo-blog-encrypt', () => [{
  data() { return fs.createReadStream(path.resolve(__dirname, `lib/hbe.style.css`)); },
  path: `css/hbe.style.css`,
}, {
  data() { return fs.createReadStream(path.resolve(__dirname, 'lib/hbe.js')); },
  path: 'js/hbe.js',
}]);
