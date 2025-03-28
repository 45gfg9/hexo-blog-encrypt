'use strict';

(() => {
  // this is still not widely supported...
  const Uint8ArrayFromBase64 = Uint8Array.fromBase64 ?? function (b64str) {
    const byteStr = atob(b64str);
    const bytes = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) {
      bytes[i] = byteStr.charCodeAt(i);
    }
    return bytes;
  };

  const storageName = 'hexo-blog-encrypt:#' + location.pathname;

  const mainElement = document.getElementById('hexo-blog-encrypt');
  const wrongPassMessage = mainElement.dataset.wpm;
  const ciphertext = Uint8ArrayFromBase64(mainElement.dataset.ct);
  const salt = Uint8ArrayFromBase64(mainElement.dataset.salt);
  const iv = Uint8ArrayFromBase64(mainElement.dataset.iv);
  const labelElem = mainElement.querySelector('.hbe-input-label');

  function getExecutableScript(elem) {
    const out = document.createElement('script');
    for (const attr of elem.attributes) {
      out.setAttribute(attr.name, attr.value);
    }
    out.textContent = elem.textContent;
    return out;
  }

  function convertHTMLToElement(content) {
    const out = document.createElement('div');
    out.innerHTML = content;
    out.classList.add('markdown-body');
    out.querySelectorAll('script').forEach((elem) => elem.replaceWith(getExecutableScript(elem)));

    return out;
  }

  async function decrypt(decryptKey) {
    const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, decryptKey, ciphertext);
    const decoded = new TextDecoder().decode(result);

    const hideButton = document.createElement('button');
    hideButton.textContent = 'Encrypt again';
    hideButton.type = 'button';
    hideButton.classList.add('hbe-button');
    hideButton.addEventListener('click', () => {
      localStorage.removeItem(storageName);
      location.reload();
    });

    mainElement.style.display = 'inline';
    mainElement.innerHTML = '';
    mainElement.appendChild(convertHTMLToElement(decoded));
    mainElement.appendChild(hideButton);

    // support html5 lazyload functionality.
    document.querySelectorAll('img').forEach((elem) => elem.src ||= elem.dataset.src);

    // support theme-next refresh
    window.NexT?.boot?.refresh?.();

    // TOC part
    const tocDiv = document.getElementById('toc-div');
    if (tocDiv) {
      tocDiv.style.display = 'inline';
    }
    for (const elem of document.getElementsByClassName('toc-div-class')) {
      elem.style.display = 'inline';
    }

    // trigger event
    dispatchEvent(new Event('hexo-blog-decrypt'));
  }

  function hbeLoader() {
    const storageKey = JSON.parse(localStorage.getItem(storageName));
    if (storageKey) {
      crypto.subtle.importKey('jwk', storageKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
        .then(decrypt)
        .catch(() => localStorage.removeItem(storageName));
    }

    mainElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const password = document.getElementById('hbePass').value;
        crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
          .then((pbkdf2Key) => crypto.subtle.deriveKey({
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt,
            iterations: 100000,
          }, pbkdf2Key, { name: 'AES-GCM', length: 256, }, true, ['decrypt']))
          .then(async (aesKey) => {
            await decrypt(aesKey);
            return await crypto.subtle.exportKey('jwk', aesKey);
          })
          .then((exportedKey) => localStorage.setItem(storageName, JSON.stringify(exportedKey)))
          .catch(() => {
            if (wrongPassMessage) {
              alert(wrongPassMessage);
            } else if (!labelElem.classList.contains('hbe-invalid')) {
              labelElem.classList.add('hbe-invalid');
              setTimeout(() => labelElem.classList.remove('hbe-invalid'), 200);
            }
          });
      }
    });
  }

  hbeLoader();
})();
