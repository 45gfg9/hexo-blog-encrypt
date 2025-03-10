# hexo-blog-encrypt

This plugin is so fucked. You should use my fork (this repository) instead. See [Changes](#changes).

## Usage

Install using the Git URL:

```bash
npm install git+https://github.com/45gfg9/hexo-blog-encrypt.git
```

## Changes

- Tried to tidy up the code.
- Removed irritating boasting strings.
- Removed the abuse of `script` tag.
- Moved `hbe.js` to appropriate directory `js` instead of `lib`.
- Replaced hexstrings with base64 encoding to save bandwidth.
- Used `async` and Promises properly and responsibly.
- Used AES-GCM for proper AEAD, instead of AES-CBC with shitty homemade authentication.
  - What's the point of using HMAC in the first place, if the result of the verification wasn't even respected?
- Used proper random IV and salt generation.
  - To be clear, the last commit of the original code fixed this, but this change was not included in the npm package.
- Used a proper PBKDF2 iteration count (100,000) instead of 1,024. Seriously, what the fuck?

## License

See [LICENSE](LICENSE) file.

## Thanks

All contributors of the original plugin. See full list in the original repository.

And me, who tried hard to fix this shit.
