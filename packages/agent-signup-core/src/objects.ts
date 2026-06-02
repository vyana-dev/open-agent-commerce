// Agent Signup Protocol (ASP) + Agent Payment Protocol (APP) — wire objects.
//
// TypeScript shapes for the cryptographic documents exchanged between an Agent,
// an IdP (broker), and a Service (merchant). Signatures are computed over the
// CANONICAL form of these objects (see ./signing.ts → canonicalObject), so any
// party can re-derive the exact signed bytes from the object alone.
//
// Normative spec: ../../spec/ASP-0.1.md (signup) and ../../spec/APP-0.1.md (pay).
// Section references (§) below point into those documents.
//
// Money is ALWAYS integer paise (1 INR = 100 paise). Never floats.

export const ASP_VERSION = "asp-0.1" as const;

/** Long-lived user consent. Signed once by the user; bounds the agent. (§6.1) */
export type UserConsentMandate = {
  ucm_id: string; // ULID
  version: typeof ASP_VERSION;
  issued_at: string; // ISO 8601
  expires_at: string; // default +1 year
  user_id: string;
  device_id: string;
  idp: string;
  kyc_level: 1 | 2 | 3 | 4;
  authenticator_tier: 1 | 2 | 3 | 4;
  caps: { monthly_paise: number; per_txn_paise: number; daily_paise: number };
  allowed_categories: string[];
  allowed_services: string[]; // ["*"] or explicit ids
  signature_alg: "EdDSA";
  signature: string; // base64
};

/** Per-signup authorization. Signed by the user, scoped to one UCM. (§6.2) */
export type SignupMandate = {
  mandate_id: string;
  ucm_id: string;
  version: typeof ASP_VERSION;
  issued_at: string;
  expires_at: string; // <= 10 min from issue
  nonce: string;
  user_id: string;
  device_id: string;
  agent: { platform: string; session_id: string; version: string };
  idp: string;
  service: string;
  plan: string;
  config: Record<string, unknown>;
  max_cost_paise: number;
  allowed_strategies: string[];
  consent_budget: "zero-tap" | "one-tap" | "two-tap" | "manual";
  user_raw_message: string;
  provenance_callback?: string;
  signature_alg: "EdDSA";
  signature: string;
};

/** The legitimate signup mechanisms an IdP may use against a Service. (§7) */
export type SignupStrategy =
  | "native-asp"
  | "oauth-app"
  | "cli-session-reuse"
  | "paste-token"
  | "browser-automation";

/** Broker-signed, single-use, service-specific token for native-asp. (§7.4) */
export type SignupIntentToken = {
  sit_id: string;
  version: typeof ASP_VERSION;
  issued_at: string;
  expires_at: string; // <= 5 min
  nonce: string;
  idp: string;
  service: string;
  plan: string;
  config: Record<string, unknown>;
  user_id: string;
  ucm_id: string;
  verified_email: string;
  tos_version: string;
  signature_alg: "EdDSA";
  signature: string;
};

/** Service-signed proof an account was created under a SIT. (§7.4) */
export type AccountCreationReceipt = {
  acr_id: string;
  sit_id: string;
  service: string;
  user_id: string;
  account_ref: string;
  plan: string;
  created_at: string;
  signature_alg: "EdDSA";
  signature: string;
};

/** Service-signed user safety net — direct claim of the account. (§7.4, §11.7) */
export type AccountOwnershipCertificate = {
  aoc_id: string;
  service: string;
  user_id: string;
  account_ref: string;
  direct_claim_url: string;
  claim_token: string; // single-use
  issued_at: string;
  signature_alg: "EdDSA";
  signature: string;
};

/** Broker-signed result returned to the agent. (§8) */
export type CredentialCapsule = {
  capsule_id: string;
  mandate_id: string;
  issued_at: string;
  service: string;
  strategy_used: string;
  tos_class_used: "A" | "B" | "C";
  provisioned_resource_id?: string;
  account_creation_receipt?: string; // JWS, native-asp only
  account_ownership_certificate?: string; // JWS, native-asp only
  credentials: Array<{
    name: string;
    type: "api_key" | "oauth_token" | "password" | "ssh_key" | "identifier";
    value: string; // encrypted unless type === "identifier"
    expires_at: string | null;
  }>;
  provenance: { chain_id: string; head_hash: string; events_count: number };
  signature_alg: "EdDSA";
  signature: string;
};

// ── Agent Payment Protocol (AP2-aligned) ─────────────────────────────────────

/** User-signed authorization to PAY a merchant (AP2 "Cart Mandate"). (§13) */
export type CartMandate = {
  mandate_id: string;
  ucm_id: string;
  version: typeof ASP_VERSION;
  issued_at: string;
  expires_at: string; // <= 10 min from issue
  nonce: string;
  user_id: string;
  device_id: string;
  idp: string;
  service: string;
  line_items: Array<{ description: string; amount_paise: number }>;
  amount_paise: number; // total, integer paise
  currency: "INR";
  reason: string;
  consent_budget: "zero-tap" | "one-tap" | "two-tap" | "manual";
  user_raw_message: string;
  signature_alg: "EdDSA";
  signature: string;
};

// ── Agent Receipt Protocol ───────────────────────────────────────────────────

/** Signed proof of what was purchased, delivered, and billed. */
export type Receipt = {
  receipt_id: string;
  kind: "signup" | "payment" | "subscription" | "refund";
  version: typeof ASP_VERSION;
  issued_at: string;
  idp: string;
  user_id: string;
  service: string;
  account_ref?: string;
  transaction_id: string;
  line_items: Array<{ description: string; amount_paise: number }>;
  subtotal_paise: number;
  tax_paise: number;
  total_paise: number;
  currency: "INR";
  delivery: "pending" | "delivered" | "failed";
  billed_to: "user" | "broker";
  signature_alg: "EdDSA";
  signature: string; // broker-signed
};

// ── Agent Cancellation Protocol ──────────────────────────────────────────────

/** Service-signed proof a subscription/account was cancelled or recovered. */
export type CancellationReceipt = {
  cancellation_id: string;
  version: typeof ASP_VERSION;
  kind: "subscription_cancel" | "ownership_recovery";
  issued_at: string;
  service: string;
  user_id: string;
  account_ref: string;
  effective_at: string;
  prorated_refund_paise: number;
  reason: string;
  signature_alg: "EdDSA";
  signature: string;
};

// ── Agent Preference Protocol ────────────────────────────────────────────────

/** User-signed standing preferences the broker enforces/advises across actions. */
export type PreferenceProfile = {
  profile_id: string;
  version: typeof ASP_VERSION;
  user_id: string;
  issued_at: string;
  budget: { monthly_soft_cap_paise: number; prefer_free_tier: boolean };
  brands: { allow: string[]; deny: string[] };
  dietary: string[];
  privacy: { share_email: boolean; alias_only: boolean; data_retention_days: number };
  location: { country: string; region?: string };
  risk_tolerance: "low" | "medium" | "high";
  signature_alg: "EdDSA";
  signature: string;
};

// ── Agent Dispute Protocol ───────────────────────────────────────────────────

export type DisputeState =
  | "open"
  | "evidence"
  | "refunded"
  | "chargeback"
  | "arbitration"
  | "resolved"
  | "rejected";

/** A dispute over a transaction: failed delivery, refund, chargeback, arbitration. */
export type DisputeCase = {
  dispute_id: string;
  version: typeof ASP_VERSION;
  transaction_id: string;
  user_id: string;
  service: string;
  reason: "not_delivered" | "wrong_item" | "overcharged" | "unauthorized" | "quality";
  state: DisputeState;
  amount_paise: number;
  opened_at: string;
  resolved_at?: string;
  resolution?: string;
  signature_alg: "EdDSA";
  signature: string;
};
