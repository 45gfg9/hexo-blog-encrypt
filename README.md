# hexo-blog-encrypt

This plugin is so fucked. You should use my fork (this repository) instead. See [Changes](#changes).

## Usage

Install using the Git URL:

```bash
npm install git+https://github.com/45gfg9/hexo-blog-encrypt.git
```

## Changes

- Tried to tidy up the code.
- Removed boasting strings.
- Removed the abuse of `script` tag.
- Moved `hbe.js` to appropriate directory `js` instead of `lib`.
- Replaced hexstrings with base64 encoding.
- Used `async` and Promises properly and responsibly.
- Used AES-GCM for proper authenticated encryption, instead of the cursed AES-CBC + HMAC and HMAC's practically doing nothing.
- Used a proper PBKDF2 iteration count (100,000) instead of 1,024.

## License

See [LICENSE](LICENSE) file.

## Thanks

Collaborator - [xiazeyu](https://github.com/xiazeyu)

And me - who tried hard to fix this shit.
