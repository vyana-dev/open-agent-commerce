// Unified Agent Protocol demo: a Visa TAP request and a Google AP2 mandate are
// normalized into the SAME shape, so one verify chain can evaluate either.
//
//   node --experimental-strip-types examples/unify-protocols.ts

import {
  fromVisaTap,
  fromAp2,
  fromVyana,
  type UnifiedAuthorizationRequest,
} from "../packages/agent-signup-core/src/index.ts";

// 1. An agent arriving over Visa TAP (RFC 9421 signed, card on file via PAR).
const tap = fromVisaTap({
  agentId: "operator:acme-agents",
  keyId: "tap-key-2026-01",
  algorithm: "ecdsa-p256-sha256",
  signature: "sig1=:MEUCIQ...:",
  coveredComponents: ['"@authority"', '"@method"', '"created"', '"x-tap-session"'],
  sessionId: "sess-7f3a",
  createdAt: new Date().toISOString(),
  domain: "shop.example.com",
  operation: "checkout",
  consumerRef: "consumer:abc123",
  par: "PAR-50045678901234567890ABCDEF",
  cardBrand: "visa",
  last4: "4242",
  amountMinor: 4999, // $49.99
  currency: "USD",
});

// 2. An agent arriving over Google AP2 (VDC-signed cart + payment mandate).
const ap2 = fromAp2({
  agent: { id: "agent:google-shopping", algorithm: "EdDSA" },
  vcProof: "eyJhbGciOiJFZERTQSJ9..vc-proof..",
  mandateId: "mandate:cart-991",
  userRef: "user:xyz",
  merchant: "wayfair.com",
  intent: "buy the blue armchair under $600",
  amountMinor: 58900,
  currency: "USD",
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  cartMandate: { id: "cart-991", items: ["blue-armchair"] },
  paymentMandate: { instrument: "card-on-file" },
});

// 3. An agent arriving over Vyana ASP/APP (Ed25519, UPI, paise).
const vyana = fromVyana({
  ucm: {
    ucm_id: "01H8X7UCM", version: "asp-0.1", issued_at: "", expires_at: "",
    user_id: "usr_demo", device_id: "dev_demo", idp: "https://vyana.ai",
    kyc_level: 2, authenticator_tier: 2,
    caps: { monthly_paise: 5_000_00, per_txn_paise: 1_000_00, daily_paise: 2_000_00 },
    allowed_categories: ["saas"], allowed_services: ["example.com"],
    signature_alg: "EdDSA", signature: "",
  },
  mandate: {
    mandate_id: "01J9CART", ucm_id: "01H8X7UCM", version: "asp-0.1",
    issued_at: new Date().toISOString(), expires_at: new Date(Date.now() + 6e5).toISOString(),
    nonce: "abc", user_id: "usr_demo", device_id: "dev_demo",
    idp: "https://vyana.ai", service: "example.com",
    line_items: [{ description: "Pro plan", amount_paise: 49900 }],
    amount_paise: 49900, currency: "INR", reason: "subscription",
    consent_budget: "one-tap", user_raw_message: "subscribe me to pro",
    signature_alg: "EdDSA", signature: "ed25519-sig-base64",
  },
});

function summarize(label: string, r: UnifiedAuthorizationRequest) {
  const a = r.authorization;
  console.log(
    `${label.padEnd(10)} sources=${r.sources.join("+").padEnd(12)} ` +
      `id=${r.identity.attestation.kind.padEnd(22)} ` +
      `scope=${(a.scope.services ?? []).join(",").padEnd(16)} ` +
      `limit=${a.limits.amount_minor} ${a.limits.currency} ` +
      `instrument=${r.instrument?.type ?? "none"} verified=${r.identity.verified}`,
  );
}

console.log("Three protocols, one canonical request:\n");
summarize("visa-tap", tap);
summarize("google-ap2", ap2);
summarize("vyana", vyana);

console.log(
  "\nA single verify chain now evaluates all three — same scope/amount/intent" +
    "\nchecks, one provenance record — regardless of which ecosystem they arrived on." +
    "\n(identity.verified is false here: adapters normalize; the verifier attests.)",
);

// Light sanity assertions so the example doubles as a smoke test.
const ok =
  tap.sources.includes("visa-tap") &&
  tap.instrument?.type === "par" &&
  ap2.identity.attestation.kind === "verifiable-credential" &&
  vyana.authorization.limits.currency === "INR" &&
  vyana.instrument?.type === "upi-reserve-pay";
if (!ok) {
  console.error("FAILED: unexpected normalization");
  process.exit(1);
}
