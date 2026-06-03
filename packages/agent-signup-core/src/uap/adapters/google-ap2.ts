// Adapter: Google Agent Payments Protocol (AP2) → UnifiedAuthorizationRequest.
//
// AP2 expresses authorization as cryptographically-signed Verifiable Digital
// Credentials (VDCs): a Cart/Checkout Mandate (intent → finalized cart) and a
// Payment Mandate (authorization against a specific instrument), in a role-based
// model of user / agent / merchant.
//
// NOTE: AP2's normative field names live in its specification (ap2-protocol.org).
// This input shape captures the documented concepts; confirm against the upstream
// spec before production use. UAP normalizes only; it does not verify the VDC
// proof (that is the verifier's job).

import type {
  UnifiedAuthorizationRequest,
  BuildOpts,
} from "../model.ts";
import { buildUnifiedRequest } from "../model.ts";

export type Ap2Input = {
  agent: {
    id: string;
    keyId?: string;
    algorithm?: string;
    publicKeyB64?: string;
  };
  /** The VDC proof (signature) over the mandate(s). */
  vcProof: string;
  mandateId?: string;
  userRef?: string;
  merchant?: string;
  /** Human intent captured by the (open-stage) mandate. */
  intent?: string;
  categories?: string[];
  amountMinor?: number;
  currency?: string;
  perTxnMinor?: number;
  issuedAt?: string;
  expiresAt?: string;
  /** Raw cart + payment mandate objects, retained for provenance. */
  cartMandate?: Record<string, unknown>;
  paymentMandate?: Record<string, unknown>;
  /** Optional instrument reference carried by the Payment Mandate. */
  instrumentRef?: string;
  cardBrand?: string;
  last4?: string;
};

export function fromAp2(
  input: Ap2Input,
  opts: BuildOpts = {},
): UnifiedAuthorizationRequest {
  return buildUnifiedRequest(
    {
      identity: {
        source: "google-ap2",
        agent_id: input.agent.id,
        key_id: input.agent.keyId,
        algorithm: input.agent.algorithm ?? "unspecified",
        public_key_b64: input.agent.publicKeyB64,
        attestation: {
          kind: "verifiable-credential",
          value: input.vcProof,
          issued_at: input.issuedAt,
        },
        verified: false,
      },
      authorization: {
        source: "google-ap2",
        mandate_id: input.mandateId,
        user_ref: input.userRef,
        intent: input.intent,
        scope: {
          services: input.merchant ? [input.merchant] : undefined,
          categories: input.categories,
        },
        limits: {
          amount_minor: input.amountMinor,
          currency: input.currency,
          per_txn_minor: input.perTxnMinor,
        },
        issued_at: input.issuedAt,
        expires_at: input.expiresAt,
        raw: {
          cartMandate: input.cartMandate,
          paymentMandate: input.paymentMandate,
        },
      },
      instrument: input.instrumentRef
        ? {
            source: "google-ap2",
            type: "none",
            reference: input.instrumentRef,
            brand: input.cardBrand,
            last4: input.last4,
          }
        : undefined,
    },
    opts,
  );
}
