// Adapter: Vyana ASP/APP → UnifiedAuthorizationRequest.
//
// Maps a User Consent Mandate (long-lived bounds) plus a per-action mandate
// (SignupMandate or CartMandate) into the unified model. Vyana objects are
// Ed25519-signed over their canonical form (see ../../signing.ts), and money is
// always integer paise (currency INR).

import type {
  UnifiedAuthorizationRequest,
  BuildOpts,
} from "../model.ts";
import { buildUnifiedRequest } from "../model.ts";
import type {
  UserConsentMandate,
  SignupMandate,
  CartMandate,
} from "../../objects.ts";

export type VyanaInput = {
  ucm?: UserConsentMandate;
  mandate: SignupMandate | CartMandate;
  /** Device public key (base64 DER SPKI) that signed the mandate. */
  publicKeyDerB64?: string;
};

function isCartMandate(m: SignupMandate | CartMandate): m is CartMandate {
  return (m as CartMandate).amount_paise !== undefined;
}

export function fromVyana(
  input: VyanaInput,
  opts: BuildOpts = {},
): UnifiedAuthorizationRequest {
  const { ucm, mandate } = input;
  const cart = isCartMandate(mandate);
  const amount_paise = cart ? mandate.amount_paise : mandate.max_cost_paise;

  return buildUnifiedRequest(
    {
      identity: {
        source: cart ? "vyana-app" : "vyana-asp",
        agent_id: mandate.device_id,
        algorithm: "EdDSA",
        public_key_b64: input.publicKeyDerB64,
        attestation: {
          kind: "ed25519-detached",
          value: mandate.signature,
          session_id: cart ? undefined : mandate.agent?.session_id,
          issued_at: mandate.issued_at,
        },
        verified: false,
      },
      authorization: {
        source: cart ? "vyana-app" : "vyana-asp",
        mandate_id: mandate.mandate_id,
        user_ref: mandate.user_id,
        intent: mandate.user_raw_message,
        scope: {
          services: ucm?.allowed_services ?? [mandate.service],
          categories: ucm?.allowed_categories,
        },
        limits: {
          amount_minor: amount_paise,
          currency: "INR",
          per_txn_minor: ucm?.caps.per_txn_paise,
        },
        nonce: mandate.nonce,
        issued_at: mandate.issued_at,
        expires_at: mandate.expires_at,
        raw: { ucm, mandate },
      },
      instrument: {
        source: cart ? "vyana-app" : "vyana-asp",
        type: "upi-reserve-pay",
        reference: ucm?.ucm_id ?? mandate.ucm_id,
      },
    },
    opts,
  );
}
