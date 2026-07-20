export const EphemeralCryptoEngine = {
  _strToBuf(str) { return new TextEncoder().encode(str); },
  _bufToStr(buf) { return new TextDecoder().decode(buf); },

  async _deriveAesKey(passphrase, salt) {
    const baseKey = await window.crypto.subtle.importKey(
      "raw", this._strToBuf(passphrase), "PBKDF2", false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 80000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  async encryptKey(plaintext, passphrase) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await this._deriveAesKey(passphrase, salt);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      this._strToBuf(plaintext)
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv))
    };
  },

  async decryptKey(payload, passphrase) {
    const ciphertextBuffer = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
    const salt = Uint8Array.from(atob(payload.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));

    const aesKey = await this._deriveAesKey(passphrase, salt);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      ciphertextBuffer
    );

    return this._bufToStr(decryptedBuffer);
  }
};