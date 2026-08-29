import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from a passphrase using SHA-256.
 */
const deriveKey = (passphrase: string): Buffer => {
  return createHash("sha256").update(passphrase).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded iv + tag + ciphertext.
 */
export const encryptKey = (plaintext: string, passphrase: string): string => {
  const key = deriveKey(passphrase);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
};

/**
 * Decrypt a base64-encoded iv + tag + ciphertext string.
 */
export const decryptKey = (encryptedBase64: string, passphrase: string): string => {
  const key = deriveKey(passphrase);
  const data = Buffer.from(encryptedBase64, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
};
