// AES-256-GCM envelope encryption for the credential vault.
//
// Architecture per §1.4 Component 8:
//   - Per-user data key (DEK), wrapped by a master key (KEK) in KMS.
//   - For the prototype, we use a single master key from APP_ENCRYPTION_KEY
//     and derive a per-user DEK via HKDF. Swap to AWS KMS pre-prod.
//
// Format on disk (base64):
//   [12-byte IV][16-byte GCM tag][ciphertext]
//
// `encryption_key_id` records WHICH KEK was used so we can rotate the master
// key by re-wrapping rather than re-encrypting every credential.

import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function masterKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be a 64-char hex string. Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

const ACTIVE_KEY_ID = "vyana-app-kek-v1";

function deriveUserKey(userId: string): Buffer {
  // HKDF-SHA256, 32 bytes. Info-bound to userId so the same KEK yields a
  // different DEK per user. Salt is the static key id (good enough for V1).
  return Buffer.from(
    hkdfSync("sha256", masterKey(), Buffer.from(ACTIVE_KEY_ID), `user:${userId}`, 32),
  );
}

export function encryptForUser(userId: string, plaintext: string) {
  const dek = deriveUserKey(userId);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([iv, tag, ct]).toString("base64"),
    encryptionKeyId: ACTIVE_KEY_ID,
  };
}

export function decryptForUser(userId: string, ciphertextB64: string): string {
  const dek = deriveUserKey(userId);
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
