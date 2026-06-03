# Unified Agent Protocol (UAP) — 0.1 DRAFT

> A neutral normalization layer that maps the major agent-commerce protocols —
> **Visa Trusted Agent Protocol (TAP)**, **Google Agent Payments Protocol (AP2)**,
> **Stripe/OpenAI Agentic Commerce Protocol (ACP)**, and **Vyana ASP/APP** — into
> one canonical `UnifiedAuthorizationRequest`, so a verifier can evaluate any of
> them with one policy engine and emit one provenance record.

**Status:** DRAFT 0.1, public RFC. Spec licensed CC BY 4.0; reference code MIT.

## What UAP is — and is not

UAP **does not replace** TAP, AP2, or ACP, and does not claim ownership of them.
Those protocols are owned by their stewards (Visa, Google, Stripe/OpenAI). UAP is
an **interop/normalization** layer:

- **It normalizes shape.** Each source protocol expresses agent identity, a
  mandate, and (optionally) a payment instrument differently. UAP defines one
  canonical request that adapters populate from each source.
- **It does not verify signatures.** Adapters set `identity.verified = false`.
  Verification (RFC 9421 for TAP, VDC proof for AP2, token validation for ACP,
  Ed25519 canonical-form for Vyana) is the **verifier's** responsibility, because
  each uses different algorithms and key-discovery mechanisms.
- **It is rail-agnostic.** The same `UnifiedAuthorizationRequest` is produced
  whether settlement lands on cards (TAP/ACP), an AP2 instrument, or UPI.
- **It is independent.** UAP is not affiliated with or endorsed by Visa, Google,
  Stripe, or OpenAI. Protocol names are used nominatively to describe
  interoperability; the mappings below are informative until confirmed against
  each protocol's published specification.

The value: a merchant or broker integrates **one** authorization + provenance
engine and accepts agents arriving over **any** of these ecosystems.

## The canonical request

A `UnifiedAuthorizationRequest` (UAR) has three normalized parts plus an envelope:

| Part | Question it answers |
|---|---|
| `identity` | Who is the agent, and how did it attest? (`UnifiedAgentIdentity`) |
| `authorization` | What is the agent allowed to do — scope, amount limits, expiry? (`UnifiedAuthorization`) |
| `instrument` *(optional)* | What payment instrument reference is in play? (`UnifiedPaymentInstrument`) |

Envelope: `uap_version`, `request_id`, `created_at`, `sources[]`. Full
machine-readable definition:
[`../schemas/unified-authorization-request.schema.json`](../schemas/unified-authorization-request.schema.json).

### Money

`limits.amount_minor` and `per_txn_minor` are **integer minor units** (paise for
INR, cents for USD) with an explicit ISO-4217 `currency`. Never floats.

### Identity attestation kinds

| `attestation.kind` | Source | Carries |
|---|---|---|
| `ed25519-detached` | Vyana ASP/APP | Ed25519 over canonical object form |
| `http-message-signature` | Visa TAP | RFC 9421 signature + covered components, session id |
| `verifiable-credential` | Google AP2 | VDC proof over the mandate(s) |
| `payment-token` | ACP (no separate identity) | the Shared Payment Token |

## Source mappings (informative)

> These mappings capture each protocol's **documented concepts**. Exact upstream
> field names are defined by each protocol's own spec/reference implementation
> and MUST be confirmed there before production use. They are intentionally
> isolated in adapters so they can track upstream changes without touching the
> canonical model.

### Visa TAP → UAR
| TAP concept | UAR field |
|---|---|
| agent/operator identifier | `identity.agent_id`, `identity.operator_id` |
| key id, algorithm | `identity.key_id`, `identity.algorithm` |
| RFC 9421 `Signature` + covered components, session id | `identity.attestation` (`http-message-signature`) |
| Agent Registry public key | `identity.public_key_b64` |
| bound domain / operation | `authorization.scope.services` / `authorization.intent` |
| verifiable consumer identifier | `authorization.user_ref` |
| Payment Account Reference (PAR) | `instrument` (`par`), `brand`, `last4` |

### Google AP2 → UAR
| AP2 concept | UAR field |
|---|---|
| agent role identity | `identity.agent_id` |
| VDC proof over mandate(s) | `identity.attestation` (`verifiable-credential`) |
| Cart/Checkout Mandate intent | `authorization.intent`, `scope` |
| Payment Mandate amount/instrument | `authorization.limits`, `instrument` |
| merchant role | `authorization.scope.services` |
| raw Cart + Payment Mandate | `authorization.raw` |

### Stripe/OpenAI ACP → UAR
| ACP concept | UAR field |
|---|---|
| Shared Payment Token (single-use, scoped) | `instrument` (`shared-payment-token`), `identity.attestation` (`payment-token`) |
| token seller scope | `authorization.scope.services` |
| token amount / currency / expiry | `authorization.limits`, `authorization.expires_at` |
| card brand + last four (never PAN) | `instrument.brand`, `instrument.last4` |

### Vyana ASP/APP → UAR
| Vyana object | UAR field |
|---|---|
| device signature (Ed25519, canonical form) | `identity.attestation` (`ed25519-detached`) |
| UCM `allowed_services` / `allowed_categories` | `authorization.scope` |
| UCM caps / mandate amount (paise) | `authorization.limits` |
| `user_raw_message` | `authorization.intent` |
| UPI Reserve Pay / AutoPay | `instrument` (`upi-reserve-pay` / `upi-mandate`) |

## Flow

```mermaid
sequenceDiagram
    autonumber
    participant SRC as Agent (TAP / AP2 / ACP / Vyana)
    participant ADP as UAP adapter
    participant VC as Verifier
    participant PROV as Provenance ledger

    SRC->>ADP: protocol-native request
    ADP-->>VC: UnifiedAuthorizationRequest (identity + authorization + instrument)
    Note over ADP,VC: normalize SHAPE only; identity.verified = false
    VC->>VC: validate attestation per identity.attestation.kind → set verified
    VC->>VC: enforce scope + limits
    VC->>PROV: hash-chained event per step
    alt verified & within policy
        VC-->>SRC: ALLOW + provenance head
    else
        VC-->>SRC: DENY + provenance head
    end
```

More diagrams: [`../docs/SEQUENCES.md`](../docs/SEQUENCES.md).

## Verification & provenance (normative)

A UAP verifier MUST:

1. Validate the source attestation using the correct mechanism for
   `identity.attestation.kind`, and set `identity.verified` accordingly. A
   request whose attestation cannot be validated MUST NOT be treated as verified.
2. Enforce `authorization.scope` and `authorization.limits` against its policy
   (e.g. per-transaction / daily / monthly caps, allowed services).
3. Emit a provenance event for each decision step, hash-chained so the full
   reasoning trail is tamper-evident and exportable for dispute/audit. (Vyana's
   reference verifier chains `signature → mandate → ucm → kyc → scope → amount →
   intent → velocity → replay`.)

UAP defines the **request** and the **obligations**; it does not mandate a
specific verifier implementation.

## Reference code

`@vyana/open-agent-commerce` exports the model + adapters:

```ts
import { fromVisaTap, fromAp2, fromAcp, fromVyana } from "@vyana/open-agent-commerce";
```

See [`../examples/unify-protocols.ts`](../examples/unify-protocols.ts) for a
runnable demo that normalizes a TAP request and an AP2 mandate into the same
shape.

## Open items for 0.2

- Bind upstream field names to pinned protocol versions (TAP, AP2, ACP specs).
- Define a canonical signing form for the UAR itself (so a verifier's verdict +
  provenance head can be co-signed and forwarded).
- A conformance vector set per source protocol.
