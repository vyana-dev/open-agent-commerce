// Runnable end-to-end: mint a SignupMandate, sign it, verify it, tamper, fail.
//
//   node --experimental-strip-types examples/sign-and-verify.ts
//
// Demonstrates the one rule that makes ASP signatures interoperate: a signature
// is Ed25519 over the CANONICAL form (signature field dropped, keys deeply
// sorted). Any party re-derives the exact bytes from the object alone.

import {
  generateDeviceKeyPair,
  signAspObject,
  verifyAspObject,
  canonicalObject,
  type SignupMandate,
} from "../packages/agent-signup-core/src/index.ts";

const { privateKeyPem, publicKeyDerBase64 } = generateDeviceKeyPair();

const mandate: SignupMandate = {
  mandate_id: "01J9Z8MANDATE",
  ucm_id: "01H8X7UCM",
  version: "asp-0.1",
  issued_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  nonce: "9f2c1a",
  user_id: "usr_demo",
  device_id: "dev_demo",
  agent: { platform: "claude", session_id: "sess_1", version: "1.0.0" },
  idp: "https://vyana.ai",
  service: "example.com",
  plan: "pro-monthly",
  config: {},
  max_cost_paise: 49900, // ₹499.00 — always integer paise
  allowed_strategies: ["native-asp", "oauth-app"],
  consent_budget: "one-tap",
  user_raw_message: "sign me up for the pro plan on example.com",
  signature_alg: "EdDSA",
  signature: "", // filled below
};

// 1. Sign over the canonical form.
mandate.signature = signAspObject(mandate, privateKeyPem);
console.log("canonical bytes:", canonicalObject(mandate).slice(0, 80), "…");
console.log("signature:", mandate.signature.slice(0, 24), "…");

// 2. Verify — true.
console.log("verify (untampered):", verifyAspObject(mandate, publicKeyDerBase64));

// 3. Tamper with the amount — verification must now fail.
const tampered = { ...mandate, max_cost_paise: 1 };
console.log("verify (tampered):  ", verifyAspObject(tampered, publicKeyDerBase64));

if (
  verifyAspObject(mandate, publicKeyDerBase64) !== true ||
  verifyAspObject(tampered, publicKeyDerBase64) !== false
) {
  console.error("FAILED: unexpected verification result");
  process.exit(1);
}
console.log("\nOK — signature binds every field; any mutation breaks it.");
