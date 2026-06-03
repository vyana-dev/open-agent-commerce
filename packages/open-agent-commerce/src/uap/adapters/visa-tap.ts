// Adapter: Visa Trusted Agent Protocol (TAP) → UnifiedAuthorizationRequest.
//
// TAP authenticates an agent to a merchant using RFC 9421 HTTP Message
// Signatures (covering a timestamp, session id, key id, and algorithm, bound to
// the merchant domain + operation), with agent public keys resolved from Visa's
// Agent Registry. For cards on file it conveys a Payment Account Reference (PAR)
// plus a verifiable consumer identifier, with consumer consent.
//
// NOTE: TAP's exact wire field names are defined by its reference implementation
// (github.com/visa/trusted-agent-protocol), not by UAP. This input shape captures
// the protocol's documented concepts; confirm names against the upstream repo
// before wiring to production traffic. UAP only NORMALIZES — it does not verify
// the RFC 9421 signature (that is the verifier's job).

import type {
  UnifiedAuthorizationRequest,
  BuildOpts,
} from "../model.ts";
import { buildUnifiedRequest } from "../model.ts";

export type VisaTapInput = {
  /** Agent/operator identifier presented by the agent. */
  agentId: string;
  keyId: string;
  /** RFC 9421 algorithm label, e.g. "ed25519", "ecdsa-p256-sha256". */
  algorithm: string;
  /** Raw value of the RFC 9421 `Signature` header. */
  signature: string;
  /** Covered components parsed from the `Signature-Input` header. */
  coveredComponents?: string[];
  sessionId?: string;
  /** Signature creation timestamp (ISO 8601). */
  createdAt?: string;
  /** Merchant domain the signature is bound to. */
  domain?: string;
  /** Operation the signature is bound to (e.g. "checkout"). */
  operation?: string;
  /** Verifiable consumer identifier, if present. */
  consumerRef?: string;
  /** Agent public key (base64 DER SPKI), if resolved from the Agent Registry. */
  publicKeyB64?: string;
  /** Payment Account Reference for a card on file (consumer-consented). */
  par?: string;
  cardBrand?: string;
  last4?: string;
  /** Transaction amount, in minor units (cents), when known at this step. */
  amountMinor?: number;
  /** ISO 4217 currency, e.g. "USD". */
  currency?: string;
};

export function fromVisaTap(
  input: VisaTapInput,
  opts: BuildOpts = {},
): UnifiedAuthorizationRequest {
  return buildUnifiedRequest(
    {
      identity: {
        source: "visa-tap",
        agent_id: input.agentId,
        operator_id: input.agentId,
        key_id: input.keyId,
        algorithm: input.algorithm,
        public_key_b64: input.publicKeyB64,
        attestation: {
          kind: "http-message-signature",
          value: input.signature,
          covered: input.coveredComponents,
          session_id: input.sessionId,
          issued_at: input.createdAt,
        },
        verified: false,
      },
      authorization: {
        source: "visa-tap",
        user_ref: input.consumerRef,
        intent: input.operation,
        scope: { services: input.domain ? [input.domain] : undefined },
        limits: { amount_minor: input.amountMinor, currency: input.currency },
        nonce: input.sessionId,
        issued_at: input.createdAt,
        raw: input,
      },
      instrument: input.par
        ? {
            source: "visa-tap",
            type: "par",
            reference: input.par,
            brand: input.cardBrand,
            last4: input.last4,
          }
        : undefined,
    },
    opts,
  );
}
