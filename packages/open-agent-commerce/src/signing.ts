// Ed25519 signing + verification for MCP requests.
// Device key lives in the user's OS keychain on the install side; the public
// key is stored on `devices.public_key` (base64 DER, SPKI) at pairing time.
//
// Canonical signing payload — the EXACT bytes both sides hash:
//   JSON.stringify({
//     request_id, nonce, timestamp, tool,
//     service, plan, config, user_raw_message,
//   })
//
// Key insight: do not include the signature in the canonical payload, and
// stringify with a stable key order. We use the literal ordered keys above
// so server + client agree byte-for-byte.

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";

export type SigningPayload = {
  request_id: string;
  nonce: string;
  timestamp: string;
  tool: string;
  service?: string;
  plan?: string;
  config?: Record<string, unknown>;
  user_raw_message?: string;
};

export function canonicalize(p: SigningPayload): Buffer {
  // Stable order — DO NOT change without a backward-compat plan.
  const ordered = {
    request_id: p.request_id,
    nonce: p.nonce,
    timestamp: p.timestamp,
    tool: p.tool,
    service: p.service ?? null,
    plan: p.plan ?? null,
    config: p.config ?? {},
    user_raw_message: p.user_raw_message ?? "",
  };
  return Buffer.from(JSON.stringify(ordered));
}

export function generateDeviceKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    publicKeyDerBase64: publicKey
      .export({ format: "der", type: "spki" })
      .toString("base64"),
  };
}

export function signPayload(payload: SigningPayload, privateKeyPem: string): string {
  const priv: KeyObject = createPrivateKey(privateKeyPem);
  const sig = sign(null, canonicalize(payload), priv);
  return sig.toString("base64");
}

export function verifyPayload(
  payload: SigningPayload,
  signatureBase64: string,
  publicKeyDerBase64: string,
): boolean {
  const pub = createPublicKey({
    key: Buffer.from(publicKeyDerBase64, "base64"),
    format: "der",
    type: "spki",
  });
  return verify(
    null,
    canonicalize(payload),
    pub,
    Buffer.from(signatureBase64, "base64"),
  );
}

// Generic detached Ed25519 over an arbitrary string. Used for signing the
// broker's SIT and Credential Capsule, provenance event hashes, and verifying
// merchant ACR/AOC documents.
export function signDetached(message: string, privateKeyPem: string): string {
  const priv = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(message, "utf8"), priv).toString("base64");
}

export function verifyDetached(
  message: string,
  signatureBase64: string,
  publicKeyDerBase64: string,
): boolean {
  const pub = createPublicKey({
    key: Buffer.from(publicKeyDerBase64, "base64"),
    format: "der",
    type: "spki",
  });
  return verify(null, Buffer.from(message, "utf8"), pub, Buffer.from(signatureBase64, "base64"));
}

// ── Whole-object signing (SIT / ACR / AOC / capsules) ─────────────────────────
// Distinct from canonicalize() above (which fixes the MCP request key list):
// these sign over an ENTIRE ASP object with its `signature` field removed and
// every key in recursively-sorted order, so any party can re-derive the exact
// signed bytes from the object alone. This is how the broker signs a SIT and the
// merchant verifies it (and how the merchant signs an ACR/AOC the broker checks)
// without sharing a per-object canonical key list.

function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

/** Canonical bytes for a whole ASP object: drop `signature`, sort keys deeply. */
export function canonicalObject(obj: Record<string, unknown>): string {
  const clone: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) if (k !== "signature") clone[k] = obj[k];
  return stableStringify(clone);
}

/** Sign an ASP object (any shape) with an Ed25519 PEM. Returns base64. */
export function signAspObject(obj: Record<string, unknown>, privateKeyPem: string): string {
  return signDetached(canonicalObject(obj), privateKeyPem);
}

/** Verify an ASP object's own `signature` field against a base64 DER(SPKI) key. */
export function verifyAspObject(
  obj: Record<string, unknown> & { signature?: string },
  publicKeyDerBase64: string,
): boolean {
  if (!obj.signature || typeof obj.signature !== "string") return false;
  return verifyDetached(canonicalObject(obj), obj.signature, publicKeyDerBase64);
}
