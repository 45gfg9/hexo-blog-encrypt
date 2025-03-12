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

  const Uint8ArrayToBase64 = Uint8Array.prototype.toBase64 ?? function () {
    let binary = '';
    for (let i = 0; i < this.length; i += 32) {
      binary += String.fromCharCode(...this.slice(i, i + 32));
    }
    return btoa(binary);
  }

  const storageName = 'hexo-blog-encrypt:#' + location.pathname;

  const mainElement = document.getElementById('hexo-blog-encrypt');
  const wrongPassMessage = mainElement.dataset.wpm;
  const ciphertext = Uint8ArrayFromBase64(mainElement.dataset.ct);
  const salt = Uint8ArrayFromBase64(mainElement.dataset.salt);
  const iv = Uint8ArrayFromBase64(mainElement.dataset.iv);
  const labelElem = mainElement.querySelector('.hbe-input-label');

  function getExecutableScript(elem) {
    const out = document.createElement('script');
    const attList = ['type', 'text', 'src', 'crossorigin', 'defer', 'referrerpolicy'];
    attList.forEach((att) => {
      if (elem[att]) {
        out[att] = elem[att];
      }
    })
    return out;
  }

  function convertHTMLToElement(content) {
    const out = document.createElement('div');
    out.innerHTML = content;
    out.querySelectorAll('script').forEach((elem) => elem.replaceWith(getExecutableScript(elem)));

    return out;
  }

  async function decrypt(decryptKey, iv) {
    const result = await crypto.subtle.decrypt({ 'name': 'AES-GCM', 'iv': iv, }, decryptKey, ciphertext);
    const decoded = new TextDecoder().decode(result);

    const hideButton = document.createElement('button');
    hideButton.textContent = 'Encrypt again';
    hideButton.type = 'button';
    hideButton.classList.add('hbe-button');
    hideButton.addEventListener('click', () => {
      localStorage.removeItem(storageName);
      location.reload();
    });

    document.getElementById('hexo-blog-encrypt').style.display = 'inline';
    document.getElementById('hexo-blog-encrypt').innerHTML = '';
    document.getElementById('hexo-blog-encrypt').appendChild(convertHTMLToElement(decoded));
    document.getElementById('hexo-blog-encrypt').appendChild(hideButton);

    // support html5 lazyload functionality.
    document.querySelectorAll('img').forEach((elem) => {
      if (elem.getAttribute('data-src') && !elem.src) {
        elem.src = elem.getAttribute('data-src');
      }
    });

    // support theme-next refresh
    window.NexT?.boot?.refresh?.();

    // TOC part
    const tocDiv = document.getElementById('toc-div');
    if (tocDiv) {
      tocDiv.style.display = 'inline';
    }

    const tocDivs = document.getElementsByClassName('toc-div-class');
    if (tocDivs && tocDivs.length > 0) {
      for (let idx = 0; idx < tocDivs.length; idx++) {
        tocDivs[idx].style.display = 'inline';
      }
    }

    // trigger event
    dispatchEvent(new Event('hexo-blog-decrypt'));
  }

  function hbeLoader() {
    const oldStorageData = JSON.parse(localStorage.getItem(storageName));

    if (oldStorageData) {
      const iv = Uint8ArrayFromBase64(oldStorageData.iv);
      const dk = oldStorageData.dk;

      crypto.subtle.importKey('jwk', dk, { 'name': 'AES-GCM', 'length': 256 }, false, ['decrypt'])
        .then((aesKey) => decrypt(aesKey, iv))
        .catch(() => localStorage.removeItem(storageName));
    }

    mainElement.addEventListener('keydown', (event) => {
      if (event.isComposing || event.key === 'Enter') {
        const password = document.getElementById('hbePass').value;
        crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
          .then((pbkdf2Key) => crypto.subtle.deriveKey({
            'name': 'PBKDF2',
            'hash': 'SHA-256',
            'salt': salt,
            'iterations': 100000,
          }, pbkdf2Key, { 'name': 'AES-GCM', 'length': 256, }, true, ['decrypt']))
          .then(async (aesKey) => {
            await decrypt(aesKey, iv);
            return await crypto.subtle.exportKey('jwk', aesKey);
          })
          .then((exportedDecryptionKey) => localStorage.setItem(storageName, JSON.stringify({
            'dk': exportedDecryptionKey,
            'iv': Uint8ArrayToBase64.call(iv),
          })))
          .catch(() => {
            if (wrongPassMessage) {
              alert(wrongPassMessage);
            } else {
              labelElem.classList.add('hbe-invalid');
            }
          });
      } else {
        labelElem.classList.remove('hbe-invalid');
      }
    });
  }

  hbeLoader();
})();
