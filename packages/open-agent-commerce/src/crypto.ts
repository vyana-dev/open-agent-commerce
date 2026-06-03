// AES-256-GCM envelope encryption for the credential-capsule vault.
//
// ── NON-NORMATIVE REFERENCE ──────────────────────────────────────────────────
// This is an EXAMPLE of how an IdP/broker MAY encrypt credentials at rest. It is
// NOT part of the Open Agent Commerce wire format (nothing here is signed or
// exchanged on the wire), and it is NOT a turnkey production vault. In
// production, derive or wrap keys in a KMS/HSM; this module reads a single
// master key from APP_ENCRYPTION_KEY purely for demonstration.
//
// Design:
//   - Per-user data key (DEK) via HKDF-SHA256 from the master key (KEK).
//   - AES-256-GCM with a random 96-bit IV; the user id is bound as AAD so a
//     ciphertext is cryptographically tied to its user.
//
// Format (base64): [12-byte IV][16-byte GCM tag][ciphertext]
// `encryption_key_id` records WHICH KEK was used, enabling rotation by
// re-wrapping rather than re-encrypting every credential.

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
  cipher.setAAD(Buffer.from(`user:${userId}`)); // bind ciphertext to the user
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
  decipher.setAAD(Buffer.from(`user:${userId}`)); // must match encryption AAD
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
