// AES-GCM Payload Encryption/Decryption using Web Crypto API

const DEFAULT_SECRET_KEY = import.meta.env.VITE_PAYLOAD_ENCRYPTION_KEY || "CSU_SECURE_PAYLOAD_KEY_2026_XYZ";

/**
 * Derives a raw CryptoKey from the pre-shared secret key string using SHA-256.
 */
const getRawKey = async (secret: string) => {
  const enc = new TextEncoder();
  const secretBytes = enc.encode(secret);
  const hash = await window.crypto.subtle.digest("SHA-256", secretBytes);
  return window.crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts standard JSON/plaintext using AES-GCM (256-bit).
 * Returns a Base64 encoded string containing [12-byte Nonce][Ciphertext][16-byte Tag].
 */
export const encryptPayload = async (plaintext: string, secret = DEFAULT_SECRET_KEY) => {
  if (!plaintext) return plaintext;
  try {
    const enc = new TextEncoder();
    const key = await getRawKey(secret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv, tagLength: 128 },
      key,
      enc.encode(plaintext)
    );

    // Web Crypto API appends the 16-byte authentication tag at the end of the encrypted buffer
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert bytes to Base64 safely
    let binary = "";
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error("[CRYPTO ERROR] Encryption failed:", err);
    throw err;
  }
};

/**
 * Decrypts a Base64 ciphertext back to standard plaintext using AES-GCM.
 */
export const decryptPayload = async (base64Ciphertext: string, secret = DEFAULT_SECRET_KEY) => {
  if (!base64Ciphertext) return base64Ciphertext;
  try {
    const key = await getRawKey(secret);
    const binary = atob(base64Ciphertext);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length < 28) {
      throw new Error("Ciphertext too short (must be at least 28 bytes containing 12-byte Nonce and 16-byte Tag).");
    }

    const iv = bytes.slice(0, 12);
    const encryptedData = bytes.slice(12); // Contains [Ciphertext][Tag]

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv, tagLength: 128 },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error("[CRYPTO ERROR] Decryption failed:", err);
    throw err;
  }
};
