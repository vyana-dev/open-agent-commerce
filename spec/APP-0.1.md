# Agent Payment Protocol (APP) — Version 0.1 DRAFT

> A companion protocol to ASP for AI agents to authorize, execute, and
> reconcile payments on behalf of a user or organization, with signed
> consent, bounded spend, verifiable merchant settlement, and refund-safe
> delivery.

| | |
|---|---|
| **Status** | DRAFT — public RFC |
| **Editor** | Vyana Technologies |
| **Version** | 0.1 |
| **License** | CC BY 4.0 (spec) · MIT (reference impl) |
| **Last updated** | 2026-05-26 |
| **Relationship** | ASP creates accounts and credentials. APP authorizes and settles spend. Both are bound by the same UCM. |

---

## 1 · Abstract

APP defines the payment half of Vyana's agent-commerce stack. ASP answers:

> "Can this agent create or connect this merchant account?"

APP answers:

> "Can this agent spend money with this merchant, for this cart, under this
> user's signed limits, and can every party prove what happened?"

APP is AP2-aligned in shape: it uses signed intent, cart, and payment
authorization artifacts, but specializes them for Vyana's agent-developer
workflows: API credits, infrastructure provisioning, usage caps, escrow,
merchant settlement, refunds, and account ownership.

APP does **not** require Vyana to be a prefunded wallet. The preferred v0.1
models are:

- **Merchant billing / BYOK** — the merchant bills the user's connected account;
  Vyana only enforces an agent budget cap and audit trail.
- **Merchant-hosted checkout** — the merchant remains merchant of record and
  collects payment directly.
- **Marketplace split** — Vyana collects through a payment gateway and routes
  merchant share via regulated split/settlement rails such as Razorpay Route.

Prefunded Vyana wallet balances are an optional future extension and require
separate compliance review.

---

## 2 · Terminology

- **User** — the human or organization authorizing spend.
- **Agent** — the AI system requesting payment authority.
- **Broker** — Vyana, or another APP-compatible broker.
- **Merchant** — the service being paid.
- **Payment Rail** — the regulated payment system used to collect or settle
  funds: UPI mandate, card, merchant checkout, Razorpay Route, RazorpayX,
  Stripe Connect, bank transfer, or cross-border PA-CB partner.
- **User Consent Mandate (UCM)** — long-lived user consent shared with ASP.
- **Payment Intent Mandate (PIM)** — user-signed authorization that an agent may
  seek quotes/payments within a bounded purpose, merchant set, amount cap, and
  validity window.
- **Cart Mandate (CM)** — user-signed authorization for a specific merchant,
  cart, amount, currency, taxes, fees, refund terms, and expiry.
- **Payment Execution Token (PET)** — broker-signed, short-lived,
  single-use token presented to a payment rail or merchant.
- **Payment Receipt (PR)** — payment-rail or merchant-signed receipt proving
  collection, authorization, capture, transfer, refund, or failure.
- **Merchant Settlement Receipt (MSR)** — receipt proving the merchant share
  was transferred, settled, or intentionally left to merchant-direct billing.
- **Delivery Receipt (DR)** — merchant-signed proof that the paid resource was
  delivered.
- **Refund Receipt (RR)** — proof that funds were reversed or refunded.

---

## 3 · Core Design Rule

Agents may request payment authority, but agents MUST NOT self-authorize
payment.

Every APP payment is bounded by:

1. an active UCM,
2. an agent/session identity,
3. an explicit merchant or merchant category,
4. amount caps in integer minor units,
5. a user- or organization-approved mandate,
6. a nonce and short expiry,
7. a settlement strategy,
8. a hash-chained provenance log.

Money amounts in Vyana implementations MUST be stored as integer paise
(`BigInt`) for INR, or integer minor units for other currencies.

---

## 4 · Payment Modes

APP supports four payment modes. A merchant declares supported modes in
discovery.

| Mode | Who collects user money? | Who settles merchant? | Vyana role | v0.1 priority |
|---|---|---|---|---|
| `merchant_billing` | Merchant | Merchant | Consent, cap, audit only | Highest |
| `merchant_checkout` | Merchant | Merchant | Signed checkout authorization | Highest |
| `route_split` | Vyana payment gateway | Gateway split to merchant linked account | Broker + platform fee | Medium |
| `broker_payout` | Vyana payment gateway | Vyana payout to merchant bank/UPI | Broker + payable ledger | Later |
| `prefunded_wallet` | Vyana wallet | Vyana or gateway | Stored value | Future only |

### 4.1 `merchant_billing`

Used for BYOK/connected-account merchants such as fal.ai, OpenRouter, Neon, or
Supabase where the user already has billing with the merchant.

```
Agent asks for spend
→ Vyana verifies mandate and org policy
→ Vyana creates/extends scoped key or resource cap
→ Merchant bills user's existing merchant account
→ Vyana records budget, usage, and receipt metadata
```

No funds pass through Vyana.

### 4.2 `merchant_checkout`

Used when an ASP/APP-aware merchant owns checkout.

```
Agent requests purchase
→ Vyana obtains signed quote
→ User signs Cart Mandate
→ Vyana sends PET to merchant
→ Merchant creates checkout
→ User pays merchant
→ Merchant provisions resource
→ Merchant signs PR + DR + ACR/AOC if account created
```

Merchant remains merchant of record and handles tax, refunds, chargebacks, and
payment-method compliance.

### 4.3 `route_split`

Used when Vyana collects payment but settlement is split by a regulated
marketplace rail.

```
User pays Vyana checkout
→ Gateway creates payment
→ Gateway transfer object routes merchant share to linked account
→ Vyana platform fee remains with Vyana
→ Merchant receives settlement or transfer event
→ Merchant provisions resource
```

In India this maps naturally to Razorpay Route linked accounts. Merchant
onboarding and KYC are required.

### 4.4 `broker_payout`

Used when split-at-payment is unavailable.

```
User pays Vyana
→ Vyana records merchant payable
→ Vyana pays merchant via RazorpayX/Bank/UPI payout
→ Payout receipt closes payable
```

This mode creates more custody, reconciliation, refund, and regulatory burden.
It SHOULD NOT be the default.

---

## 5 · Objects

> **Status of this section (read first).** Of the objects below, only the
> **Cart Mandate** is currently implemented in code and has a JSON Schema — and
> the **authoritative shape is the one in
> [`schemas/cart-mandate.schema.json`](../schemas/cart-mandate.schema.json) and
> [`objects.ts`](../packages/open-agent-commerce/src/objects.ts)** (`version:
> "asp-0.1"`, `amount_paise`, `line_items`, `consent_budget`, …), which differs
> from the illustrative JSON shown here. The Payment Intent Mandate and Payment
> Execution Token below are **design sketches, not yet normative and not yet
> schematized** — treat their field names as illustrative. They will be reconciled
> with the schema set and given conformance vectors before APP leaves draft (see
> [ROADMAP](../ROADMAP.md)). Do not implement against the JSON in §5.1/§5.4 yet.

### 5.1 Payment Intent Mandate

User-signed object that authorizes an agent to seek a payment.

```json
{
  "type": "app.payment_intent_mandate",
  "version": "0.1",
  "id": "pim_...",
  "ucm_id": "ucm_...",
  "user_id": "user_...",
  "organization_id": "org_...",
  "agent_id": "agent_codex",
  "agent_group_id": "grp_coding_agents",
  "merchant": "fal",
  "purpose": "Generate final landing page assets",
  "max_amount_paise": "50000",
  "currency": "INR",
  "allowed_payment_modes": ["merchant_billing", "merchant_checkout"],
  "expires_at": "2026-05-26T10:30:00Z",
  "nonce": "...",
  "signature": "..."
}
```

### 5.2 Merchant Quote

Merchant-signed or broker-signed quote containing authoritative price and terms.

```json
{
  "type": "app.merchant_quote",
  "version": "0.1",
  "id": "quote_...",
  "merchant": "fal",
  "line_items": [
    {
      "sku": "image_generation_budget",
      "description": "fal.ai image generation budget",
      "amount_paise": "50000",
      "quantity": 1
    }
  ],
  "subtotal_paise": "50000",
  "tax_paise": "0",
  "platform_fee_paise": "0",
  "total_paise": "50000",
  "currency": "INR",
  "payment_mode": "merchant_billing",
  "refund_policy_hash": "sha256:...",
  "terms_hash": "sha256:...",
  "expires_at": "2026-05-26T10:10:00Z",
  "signature": "..."
}
```

### 5.3 Cart Mandate

User-signed approval for an exact cart.

```json
{
  "type": "app.cart_mandate",
  "version": "0.1",
  "id": "cm_...",
  "payment_intent_mandate_id": "pim_...",
  "quote_id": "quote_...",
  "merchant": "fal",
  "total_paise": "50000",
  "currency": "INR",
  "payment_mode": "merchant_billing",
  "expires_at": "2026-05-26T10:15:00Z",
  "user_raw_message": "Use fal.ai to generate final product images. Max spend ₹500.",
  "nonce": "...",
  "signature": "..."
}
```

### 5.4 Payment Execution Token

Broker-signed token presented to merchant or rail after verification.

```json
{
  "type": "app.payment_execution_token",
  "version": "0.1",
  "id": "pet_...",
  "cart_mandate_id": "cm_...",
  "merchant": "fal",
  "amount_paise": "50000",
  "currency": "INR",
  "payment_mode": "merchant_billing",
  "rail": "merchant_direct",
  "issued_at": "2026-05-26T10:01:00Z",
  "expires_at": "2026-05-26T10:06:00Z",
  "nonce": "...",
  "signature": "..."
}
```

### 5.5 Receipts

APP receipts MUST be signed by the actor that performed the action.

| Receipt | Signed by | Purpose |
|---|---|---|
| Payment Receipt | Merchant, gateway, or broker | Collection/auth/capture result |
| Merchant Settlement Receipt | Gateway, payout rail, or merchant | Merchant share settled or direct-billed |
| Delivery Receipt | Merchant | Paid resource was delivered |
| Refund Receipt | Gateway, merchant, or broker | Funds reversed/refunded |

---

## 6 · Verify Chain

APP uses the same fail-closed posture as ASP.

```
signature
→ ucm
→ kyc
→ role
→ agent_group
→ merchant
→ quote
→ amount
→ currency
→ payment_mode
→ intent
→ velocity
→ replay
→ settlement
```

Each layer appends a provenance event. The `settlement` layer checks that the
selected payment mode is available for the merchant and legal for the user's
jurisdiction, organization policy, and amount.

---

## 7 · Discovery

APP-aware brokers and merchants SHOULD expose discovery documents.

### 7.1 Broker

```json
{
  "issuer": "https://vyana.ai",
  "app_version": "0.1",
  "payment_intent_endpoint": "https://vyana.ai/v1/payments/intents",
  "quote_endpoint": "https://vyana.ai/v1/payments/quote",
  "execute_endpoint": "https://vyana.ai/v1/payments/execute",
  "status_endpoint": "https://vyana.ai/v1/payments/{id}/status",
  "jwks_uri": "https://vyana.ai/.well-known/jwks.json",
  "supported_payment_modes": [
    "merchant_billing",
    "merchant_checkout",
    "route_split"
  ]
}
```

### 7.2 Merchant

```json
{
  "merchant": "fal.ai",
  "app_version": "0.1",
  "quote_endpoint": "https://fal.ai/app/quote",
  "checkout_endpoint": "https://fal.ai/app/checkout",
  "provision_endpoint": "https://fal.ai/app/provision",
  "webhook_endpoint": "https://fal.ai/app/webhook",
  "jwks_uri": "https://fal.ai/.well-known/jwks.json",
  "supported_payment_modes": [
    "merchant_billing",
    "merchant_checkout"
  ],
  "supports_account_ownership_certificate": true
}
```

---

## 8 · End-to-End Flows

### 8.1 BYOK budget extension

```
Agent: "Need ₹500 fal.ai budget"
  → Vyana quote: merchant_billing, no Vyana collection
  → User signs Cart Mandate
  → Vyana creates/extends scoped fal.ai key
  → fal.ai bills user's existing account as usage happens
  → Vyana logs PR as "merchant_direct_billing"
```

### 8.2 Native APP merchant checkout

```
Agent requests API credits
  → Vyana asks merchant for quote
  → User signs Cart Mandate
  → Vyana sends PET to merchant checkout endpoint
  → Merchant checkout collects payment
  → Merchant webhook confirms payment
  → Merchant provisions credits/key
  → Merchant signs PR + DR + ACR/AOC
```

### 8.3 Route split marketplace payment

```
Agent requests paid service
  → Vyana quote includes merchant share + Vyana fee
  → User signs Cart Mandate
  → Vyana creates gateway order with transfer split
  → User pays
  → Gateway routes merchant share to linked account
  → Vyana receives transfer receipt
  → Merchant provisions resource
```

### 8.4 Escrow with auto-refund

```
User pays
  → funds held or transfer delayed
  → merchant delivery timeout/failure
  → Vyana triggers reversal/refund
  → Refund Receipt closes provenance chain
```

---

## 9 · Compliance Posture

APP implementations MUST distinguish bookkeeping from real money movement.

- Ledger credits to `merchant` are not settlement unless a signed MSR exists.
- Wallet balances MUST NOT be exposed as spendable stored value unless recharge,
  balance decrement, refund, and regulatory obligations are implemented.
- Route/split payments require merchant onboarding, KYC/bank data, and a
  commercial agreement.
- Broker payout mode requires payee onboarding, payout rail reconciliation, and
  refund/chargeback handling.
- Cross-border merchant payment requires regulated cross-border partners and
  purpose-code/compliance metadata.

For India-first deployment, Vyana SHOULD prefer:

1. BYOK merchant billing,
2. merchant-hosted checkout,
3. Razorpay Route linked-account split,
4. RazorpayX payout only when Route is unavailable,
5. prefunded wallet only after legal review.

---

## 10 · Merchant Partnership Requirements

Native APP merchants SHOULD sign an integration agreement or MOU covering:

- payment mode and merchant-of-record status,
- settlement account or linked account onboarding,
- taxes, invoices, refunds, disputes, and chargebacks,
- quote and checkout API obligations,
- webhook retry and idempotency requirements,
- Delivery Receipt and Account Ownership Certificate signing,
- data sharing, audit, and security responsibilities,
- termination and ownership recovery.

BYOK merchants do not require a merchant MOU for basic connected-account use,
but Vyana MUST respect merchant API terms and SHOULD pursue partnerships for
native checkout, settlement, and co-marketing.

---

## 11 · MVP Scope

APP v0.1 should ship in this order:

1. `merchant_billing` for connected-account merchants.
2. `Cart Mandate` approval and audit events.
3. Budget top-up request from MCP.
4. Merchant usage/balance read where available.
5. `merchant_checkout` reference merchant.
6. `route_split` reference implementation with test linked accounts.

Do not ship prefunded wallet as the default payment model.

---

## 12 · Relationship To ASP, AP2, And ACP

- **ASP** creates accounts, credentials, ACR, and AOC.
- **APP** authorizes payment, collection, settlement, refund, and payment
  receipts.
- **AP2** is Google's open agent-payments protocol. APP's payment objects
  (Payment Intent Mandate / Cart Mandate / Payment Execution Token) are designed
  to **align in shape** with AP2's mandate model (intent → cart → payment,
  expressed as signed Verifiable Credentials). The exact field-level mapping is
  **informative until confirmed against AP2's published specification** — see
  [`UAP-0.1`](./UAP-0.1.md) for the normalization adapters and their status.
  Money crosses 1:1 because INR's ISO-4217 minor unit is the paise. APP
  additionally covers concerns AP2 does not model — account provisioning, the
  credential vault, and Account Ownership Certificates — which it inherits from
  ASP. (Open Agent Commerce is not affiliated with or endorsed by Google; "AP2"
  is used nominatively.)
- **ACP** is merchant checkout-oriented agentic commerce. APP can interoperate
  with ACP-style merchant checkout by treating the merchant checkout session as
  the payment rail and preserving Vyana's signed mandate/provenance layer.

