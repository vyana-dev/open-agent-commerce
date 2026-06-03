// Adapter: Stripe/OpenAI Agentic Commerce Protocol (ACP) → UnifiedAuthorizationRequest.
//
// ACP's "Delegate payment" passes a single-use Shared Payment Token (SPT),
// scoped to a specific amount, seller, currency, and expiry, between buyer,
// agent, and business via "payment handlers". The SPT carries card brand + last
// four but NEVER the PAN.
//
// ACP does not define a strong, separate agent-identity attestation the way TAP
// (RFC 9421) or AP2 (VDC) do, so identity is modeled as "payment-token" unless
// the caller supplies agent key material out of band.
//
// NOTE: confirm field names against docs.stripe.com/agentic-commerce/acp. UAP
// normalizes only; it does not validate the token.

import type {
  UnifiedAuthorizationRequest,
  BuildOpts,
} from "../model.ts";
import { buildUnifiedRequest } from "../model.ts";

export type AcpInput = {
  /** The Shared Payment Token (single-use, scoped). */
  sharedPaymentToken: string;
  /** Seller the token is scoped to. */
  seller: string;
  /** Amount the token is scoped to, in minor units (cents). */
  amountMinor: number;
  /** ISO 4217 currency, e.g. "USD". */
  currency: string;
  expiresAt?: string;
  cardBrand?: string;
  last4?: string;
  userRef?: string;
  /** Optional agent key material, if available out of band. */
  agent?: {
    id: string;
    keyId?: string;
    algorithm?: string;
    publicKeyB64?: string;
  };
};

export function fromAcp(
  input: AcpInput,
  opts: BuildOpts = {},
): UnifiedAuthorizationRequest {
  return buildUnifiedRequest(
    {
      identity: {
        source: "openai-acp",
        agent_id: input.agent?.id ?? "acp:unattested",
        key_id: input.agent?.keyId,
        algorithm: input.agent?.algorithm ?? "unspecified",
        public_key_b64: input.agent?.publicKeyB64,
        attestation: {
          kind: "payment-token",
          value: input.sharedPaymentToken,
          issued_at: opts.createdAt,
        },
        verified: false,
      },
      authorization: {
        source: "openai-acp",
        user_ref: input.userRef,
        scope: { services: [input.seller] },
        limits: { amount_minor: input.amountMinor, currency: input.currency },
        expires_at: input.expiresAt,
        raw: input,
      },
      instrument: {
        source: "openai-acp",
        type: "shared-payment-token",
        reference: input.sharedPaymentToken,
        brand: input.cardBrand,
        last4: input.last4,
      },
    },
    opts,
  );
}
