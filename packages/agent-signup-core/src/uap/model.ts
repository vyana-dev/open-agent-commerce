// Unified Agent Protocol (UAP) — the canonical model.
//
// UAP does NOT replace Visa TAP, Google AP2, or Stripe/OpenAI ACP. It is a
// neutral NORMALIZATION layer: adapters map each ecosystem's identity +
// mandate + instrument into one `UnifiedAuthorizationRequest` (UAR) that a
// verifier (e.g. Vyana's verify chain) can evaluate once, emitting one
// provenance record regardless of which protocol the request arrived on.
//
// Adapters normalize SHAPE only. They do NOT verify signatures — different
// sources use different algorithms and key-discovery mechanisms, so the
// `verified` flag is always false out of an adapter and is set by the verifier.
//
// Spec: ../../../spec/UAP-0.1.md   Schema: ../../../schemas/unified-authorization-request.schema.json

import { randomUUID } from "node:crypto";

export const UAP_VERSION = "uap-0.1" as const;

/** Which source protocol a piece of a request was normalized from. */
export type SourceProtocol =
  | "vyana-asp"
  | "vyana-app"
  | "visa-tap"
  | "google-ap2"
  | "openai-acp";

/** How an agent proves who it is, normalized across ecosystems. */
export type UnifiedAgentIdentity = {
  source: SourceProtocol;
  /** Operator/agent identifier (TAP agent id, AP2 agent role id, Vyana device id). */
  agent_id: string;
  operator_id?: string;
  key_id?: string;
  /** Signature algorithm label, e.g. "EdDSA", "ecdsa-p256-sha256". */
  algorithm: string;
  /** Public key as base64 DER (SPKI), when resolved from a directory/registry. */
  public_key_b64?: string;
  attestation: {
    kind:
      | "ed25519-detached" // Vyana ASP/APP whole-object signature
      | "http-message-signature" // Visa TAP (RFC 9421)
      | "verifiable-credential" // Google AP2 VDC proof
      | "payment-token"; // weak/implicit identity (e.g. ACP token only)
    /** Raw signature / VC proof / token bytes (opaque to UAP). */
    value: string;
    /** RFC 9421 covered components, when applicable. */
    covered?: string[];
    session_id?: string;
    issued_at?: string;
  };
  /** Set by the VERIFIER, never by an adapter. */
  verified: boolean;
};

/** A normalized authorization (the "mandate"): what the agent may do. */
export type UnifiedAuthorization = {
  source: SourceProtocol;
  mandate_id?: string;
  user_ref?: string;
  /** Human/raw intent or the bound operation. */
  intent?: string;
  scope: {
    /** Allowed merchants/domains/services. */
    services?: string[];
    categories?: string[];
  };
  limits: {
    /** Integer MINOR units (paise for INR, cents for USD). Never floats. */
    amount_minor?: number;
    /** ISO 4217, e.g. "INR", "USD". */
    currency?: string;
    per_txn_minor?: number;
  };
  nonce?: string;
  issued_at?: string;
  expires_at?: string;
  /** The original source mandate object, retained for the provenance record. */
  raw: unknown;
};

/** A normalized payment instrument reference. NEVER carries a raw PAN. */
export type UnifiedPaymentInstrument = {
  source: SourceProtocol;
  type:
    | "par" // Visa TAP Payment Account Reference (card on file)
    | "shared-payment-token" // Stripe/OpenAI ACP SPT
    | "upi-mandate" // UPI AutoPay
    | "upi-reserve-pay" // UPI Single Block Multiple Debits
    | "none";
  /** PAR value / token id / mandate id — a reference, never a PAN. */
  reference?: string;
  brand?: string;
  last4?: string;
};

/** The canonical request a UAP-aware verifier evaluates. */
export type UnifiedAuthorizationRequest = {
  uap_version: typeof UAP_VERSION;
  request_id: string;
  created_at: string;
  identity: UnifiedAgentIdentity;
  authorization: UnifiedAuthorization;
  instrument?: UnifiedPaymentInstrument;
  /** Which source protocols contributed to this request. */
  sources: SourceProtocol[];
};

export type BuildOpts = { requestId?: string; createdAt?: string };

/** Assemble a UAR from its parts, stamping a request id + timestamp. */
export function buildUnifiedRequest(
  parts: {
    identity: UnifiedAgentIdentity;
    authorization: UnifiedAuthorization;
    instrument?: UnifiedPaymentInstrument;
  },
  opts: BuildOpts = {},
): UnifiedAuthorizationRequest {
  const sources = Array.from(
    new Set<SourceProtocol>(
      [
        parts.identity.source,
        parts.authorization.source,
        parts.instrument?.source,
      ].filter((s): s is SourceProtocol => Boolean(s)),
    ),
  );
  return {
    uap_version: UAP_VERSION,
    request_id: opts.requestId ?? randomUUID(),
    created_at: opts.createdAt ?? new Date().toISOString(),
    identity: parts.identity,
    authorization: parts.authorization,
    instrument: parts.instrument,
    sources,
  };
}
