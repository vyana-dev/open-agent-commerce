# Agent Signup Protocol (ASP) — Version 0.1 DRAFT

> An open protocol for AI agents to create accounts at SaaS services
> on behalf of a user, with cryptographic proof of authorization,
> bounded ToS-compliant strategies, and a hash-chained audit trail.

| | |
|---|---|
| **Status** | DRAFT — public RFC |
| **Editor** | Vyana Technologies (stewards) |
| **Version** | 0.1 |
| **License** | CC BY 4.0 (spec) · MIT (reference impl) |
| **Last updated** | 2026-05-24 |
| **Revision note** | Aligned with the Vyana Flow Document: adds the long-lived User Consent Mandate, KYC/authenticator-tier cap binding, and the `native-asp` Strategy with its SIT/ACR/AOC artifacts. |

---

## 1 · Abstract

ASP defines a wire protocol, a set of object schemas, and a discovery
mechanism that together enable an AI agent to legitimately create an
account at a third-party Service on behalf of a User, with that User's
cryptographically-verifiable consent.

It standardises:

- The shape of the **User → Agent → IdP → Service** authorization flow.
- A two-tier consent model: a long-lived **User Consent Mandate (UCM)**
  that bounds what an Agent may do, and a per-signup **Signup Mandate**
  issued within it.
- A set of **Signup Strategies** describing how a signup is mechanically
  performed (`native-asp`, `oauth-app`, `cli-session-reuse`,
  `paste-token`, `browser-automation`) and their ToS-compliance
  properties.
- The **Signup Mandate**: the signed object that proves user intent.
- The **Credential Capsule**: the signed object that returns credentials,
  optionally carrying a Service-signed **Account Creation Receipt (ACR)**
  and **Account Ownership Certificate (AOC)** when the Service is
  ASP-aware.
- The **Provenance Chain**: a hash-chained audit log of every step.
- A **discovery endpoint** so any IdP can advertise its capabilities
  uniformly.

Identity binding is integral: every User is KYC-verified through
jurisdiction-appropriate infrastructure and holds a hardware-backed
authenticator. The achieved KYC level and authenticator strength bound
the spending caps a UCM may declare. This spec treats them as a single
numeric `kyc_level` and `authenticator_tier`; the provider matrix and
hardware tiers live in the Vyana Flow Document, not here.

ASP is layered above MCP and complementary to AP2: MCP is how agents
invoke tools; ASP is how agents create accounts; AP2 is how agents pay
once accounts exist. The Signup Mandate's `user_raw_message` and cost
caps align with AP2's Intent Mandate and Cart Mandate respectively.

---

## 2 · Terminology

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and
**MAY** in this document are to be interpreted as described in
[RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

- **User** — a human who authorizes signups.
- **Agent** — an AI system (Claude Code, Codex, Antigravity, n8n,
  bespoke MCP client) that initiates signups on behalf of the User.
- **Service** — a third-party SaaS at which an account is being
  created (Vercel, Supabase, Stripe, fal.ai, etc.).
- **Identity Provider (IdP)** — a service that implements ASP and
  brokers signups. Vyana hosts the reference IdP at `vyana.ai`; any
  party MAY operate their own.
- **Signup Mandate** — a User-signed object expressing authorization
  for a specific Agent to create a specific Service account under
  specific conditions. See §6.
- **Signup Strategy** — the mechanical method by which a signup is
  performed. See §7.
- **Credential Capsule** — the encrypted result returned to the Agent
  on successful signup. See §8.
- **Provenance Chain** — the hash-chained record of every event in a
  signup. See §10.
- **Service Adapter** — an IdP-side module implementing the
  Strategy-to-Service translation for one specific Service.
- **User Consent Mandate (UCM)** — a long-lived User-signed object that
  bounds an Agent's authority: allowed Service categories, spending
  caps, and validity period. Signup Mandates are issued within an active
  UCM. See §6.1.
- **Signup Intent Token (SIT)** — an IdP-signed, short-lived (≤ 5 min),
  single-use, Service-specific token presented to an ASP-aware Service
  by the `native-asp` Strategy. See §7.4.
- **Account Creation Receipt (ACR)** — a Service-signed attestation that
  it created an account under a given SIT. Returned in the Credential
  Capsule on the `native-asp` path.
- **Account Ownership Certificate (AOC)** — a Service-signed certificate
  granting the User a direct-claim path to take over billing/ownership
  of the account independently of the IdP. The User's safety net.
- **KYC level** — an integer 1–4 recording the strength of the User's
  verified legal identity, abstracted across jurisdictions.
- **Authenticator tier** — an integer 1–4 recording the strength of the
  User's enrolled authenticator (platform passkey / hardware key / TOTP).
- **Broker / Merchant** — the business-facing names used in the Vyana
  Flow Document for the **IdP** and **Service** respectively. This spec
  uses the protocol-neutral terms throughout.

---

## 3 · Roles & trust model

ASP defines four roles. Trust flows from the User; every other party
is a delegate.

```
   USER                                AGENT
   │ holds the signing key              │ runs the conversation
   │ controls revocation                │ MUST NOT sign on User's behalf
   │ owns the audit                     │ may be untrusted
                                        
                  ┌───────────────────┐
                  │       IdP         │ ◀── operated by Vyana, or
                  │ holds adapter set │     self-hosted, or a
                  │ runs verify chain │     competitor
                  │ stores credentials│
                  └───────────────────┘
                            │
                            ▼
                       SERVICE
                       │ third-party SaaS
                       │ trusts strategy outputs
                       │ NOT required to know ASP
```

- The User signs every Signup Mandate with a private key the IdP has
  registered. The IdP verifies that signature before any action.
- The Agent **MUST NOT** ever hold the User's private signing key.
  The Agent receives Mandates pre-signed by the User (typically via an
  MCP-resident signing helper running on the User's machine).
- The IdP **MUST NOT** store plaintext credentials returned by the
  Service. They MUST be encrypted with a key bound to the User.
- The User is a KYC-verified human bound to a hardware-backed
  authenticator; pure software bots cannot obtain a UCM. The achieved
  `kyc_level` and `authenticator_tier` bound the caps a UCM may declare.
- User authority is expressed in two tiers: a long-lived **UCM** the User
  signs once, and per-signup **Signup Mandates** the User signs within
  that UCM's bounds. Revoking the UCM invalidates all child Mandates
  (§11.6).
- By default the Service is unaware of ASP, and ASP works without any
  Service cooperation via the Strategies in §7. When a Service *does*
  implement ASP natively (the `native-asp` Strategy, §7.4), it verifies
  the IdP's SIT and returns a Service-signed ACR and AOC — but this
  remains optional, not required for conformance.

---

## 4 · High-level signup flow

**Prerequisite (one-time).** Before any signup the User completes KYC and
signs a **User Consent Mandate** (§6.1) that bounds spending caps and
allowed Service categories. The steps below all occur within an active
UCM.

```
   1. User instructs Agent
        │
        ▼
   2. Agent constructs Signup Mandate (unsigned)
        │
        ▼
   3. User signs Mandate (using device key)
        │
        ▼
   4. Agent POSTs Mandate to IdP /v1/signup
        │
        ▼
   5. IdP runs Verify Chain (§9)
        │  ├─ signature
        │  ├─ UCM active & covers scope
        │  ├─ KYC level sufficient
        │  ├─ caps
        │  ├─ replay/nonce
        │  ├─ scope
        │  └─ rate limit
        ▼
   6. IdP selects Strategy via Service Adapter (§7)
        │
        ▼
   7. IdP executes Strategy
        │
        ▼
   8. IdP encrypts credentials into Credential Capsule
        │
        ▼
   9. IdP writes Provenance Chain
        │
        ▼
  10. IdP returns Capsule to Agent (encrypted, scoped)
        │
        ▼
  11. Agent uses credentials on User's behalf
```

The flow is synchronous in v0.1. Asynchronous strategies
(browser-automation that takes >30s, email verification round-trips
that wait for human inbox action) MAY return `status: pending` and
provide a `polling_url`; the Agent then polls the `status_endpoint`
(§5) until the signup resolves.

---

## 5 · Discovery — `/.well-known/asp-configuration`

Any ASP IdP **MUST** expose a discovery document at
`/.well-known/asp-configuration` (mirroring OpenID Connect's
`/.well-known/openid-configuration`).

```json
{
  "issuer": "https://vyana.ai",
  "version": "0.1",
  "signup_endpoint": "https://vyana.ai/v1/signup",
  "status_endpoint": "https://vyana.ai/v1/signup/{id}/status",
  "revocation_endpoint": "https://vyana.ai/v1/signup/{id}/revoke",
  "consent_mandate_endpoint": "https://vyana.ai/v1/ucm",
  "kyc_status_endpoint": "https://vyana.ai/v1/kyc/{user_id}",
  "discovery_endpoint": "https://vyana.ai/v1/services",
  "jwks_uri": "https://vyana.ai/.well-known/jwks.json",
  "signing_alg_values_supported": ["EdDSA"],
  "encryption_alg_values_supported": ["A256GCM"],
  "kyc_levels_supported": [1, 2, 3, 4],
  "strategies_supported": [
    "native-asp",
    "oauth-app",
    "cli-session-reuse",
    "paste-token",
    "browser-automation"
  ],
  "tos_url": "https://vyana.ai/legal/asp-terms",
  "spec_url": "https://github.com/vyana/asp/blob/main/ASP-0.1.md"
}
```

This document **MUST** be served over HTTPS, with a short cache TTL
(<= 1 hour). Agents and other IdPs **MAY** cache it.

The `kyc_status_endpoint` lets an ASP-aware Service (or any authorised
verifier) confirm a User's KYC level independently of the Signup Mandate,
keyed by `user_id`. An ASP-aware Service in turn publishes its own
signing key at `/.well-known/asp-keys` so the IdP can verify ACR and AOC
signatures (§7.4).

---

## 6 · Mandates

ASP uses a two-tier consent model. The **User Consent Mandate (UCM)** is
signed once and bounds the Agent's authority over time. A **Signup
Mandate** is signed per signup and MUST fall within an active UCM.

### 6.1 The User Consent Mandate (UCM)

```jsonc
{
  "ucm_id":             "01HXXX...",      // ULID
  "version":            "asp-0.1",
  "issued_at":          "2026-05-23T12:00:00Z",
  "expires_at":         "2027-05-23T12:00:00Z",  // default 1 year

  "user_id":            "vyana:9490f1f2...",
  "device_id":          "0a0feade-...",          // signing device
  "idp":                "https://vyana.ai",       // issuer bound to this UCM

  // ── identity binding (asserted by IdP at signing time) ──
  "kyc_level":          2,                         // 1–4
  "authenticator_tier": 1,                         // 1–4

  // ── bounds ───────────────────────────────────────────────
  "caps": {
    "monthly_paise":    1000000,                   // ≤ tier ceiling
    "per_txn_paise":    500000,
    "daily_paise":      500000
  },
  "allowed_categories": ["hosting", "database", "email", "ai-inference"],
  "allowed_services":   ["*"],                     // or an explicit list

  // ── signature ────────────────────────────────────────────
  "signature_alg":      "EdDSA",
  "signature":          "<base64 of Ed25519(canonical(payload))>"
}
```

The maximum `caps` an IdP MAY accept are bounded by `kyc_level` ×
`authenticator_tier`; the IdP **MUST** reject a UCM whose caps exceed the
ceiling for the User's verified tier. The ceiling table itself is IdP
policy (see the Vyana Flow Document for Vyana's tiers); ASP only requires
that the binding be enforced. A UCM is valid until `expires_at`, until
the User revokes it (§11.6), or until the underlying KYC verification
expires — whichever comes first.

### 6.2 The Signup Mandate

```jsonc
{
  // ── identifiers ──────────────────────────────────────────
  "mandate_id":         "01HXXX...",      // ULID, client-generated
  "ucm_id":             "01HXXX...",      // the UCM this mandate is issued under
  "version":            "asp-0.1",
  "issued_at":          "2026-05-23T12:00:00Z",
  "expires_at":         "2026-05-23T12:10:00Z",  // <= 10 min from issue
  "nonce":              "32-bytes-hex",

  // ── parties ──────────────────────────────────────────────
  "user_id":            "vyana:9490f1f2...",   // namespaced by IdP
  "device_id":          "0a0feade-...",         // signing device
  "agent": {
    "platform":         "claude_code",
    "session_id":       "anthropic-session-...",
    "version":          "1.0.x"
  },
  "idp":                "https://vyana.ai",     // issuer who'll act

  // ── intent ───────────────────────────────────────────────
  "service":            "vercel",
  "plan":               "hobby",
  "config": {                                    // service-specific
    "project_name":     "my-app",
    "framework":        "nextjs"
  },

  // ── conditions ───────────────────────────────────────────
  "max_cost_paise":     0,                       // 0 = free tier only
  "allowed_strategies": ["oauth-app", "cli-session-reuse"],
  "consent_budget":     "one-tap",               // max user interaction

  // ── intent verification (anti-prompt-injection) ─────────
  "user_raw_message":   "Set up a Vercel hobby project for me",

  // ── audit ────────────────────────────────────────────────
  "provenance_callback": "https://my-app.com/audit",  // optional

  // ── signature ────────────────────────────────────────────
  "signature_alg":      "EdDSA",
  "signature":          "<base64 of Ed25519(canonical(payload))>"
}
```

### 6.3 Canonical form

To produce a signature, all fields EXCEPT `signature` are serialised
into a canonical JSON string using these rules:

- Keys ordered by their declaration order in this spec (NOT alphabetical).
- No whitespace between tokens.
- All numbers as integers where possible; floats use ECMA-262 `ToString`.
- Strings use canonical UTF-8.
- Missing optional fields are omitted (NOT included as `null`).

A reference canonicaliser is published as `@vyana/asp-canonical`.

### 6.4 Validity rules

A Mandate is valid iff:

1. The signature verifies against the public key registered for
   `device_id` under `user_id`.
2. `expires_at - issued_at <= 600 seconds` (10 minutes max).
3. `expires_at > now`.
4. `nonce` has not been seen in the previous `expires_at - issued_at`
   window. IdPs **MUST** enforce nonce uniqueness.
5. `allowed_strategies` contains at least one strategy the Service
   Adapter supports.
6. `consent_budget` is one of `zero-tap | one-tap | two-tap | manual`.
7. `ucm_id` references a UCM that is active — not expired, not revoked,
   and signed by the same `user_id`/`device_id`.
8. The Mandate's `service`/category is within the UCM's
   `allowed_categories` and `allowed_services`.
9. `max_cost_paise` is within the UCM's remaining `caps` (monthly,
   per-transaction, and daily).

---

## 7 · Signup Strategies

A Strategy is the mechanical method an IdP uses to actually create
the account at the Service. Each Strategy has a declared trust level,
a declared ToS compliance class, and a declared minimum consent budget.

| Strategy | Trust | ToS class | Min consent | Description |
|---|---|---|---|---|
| `native-asp` | High | A | `one-tap` | Service implements ASP natively: exposes `POST /asp/create-account`, verifies the IdP's SIT, and returns a Service-signed ACR + AOC. The highest-trust path; IdPs **MUST** prefer it when available. See §7.4. |
| `oauth-app` | High | A | `one-tap` | Service publishes an Apps API (GitHub Apps, Vercel Integrations). User installs once; IdP receives a scoped access token via OAuth callback. |
| `oauth-redirect` | High | A | `one-tap` | Service supports OAuth 2.0 Authorization Code flow without a formal Apps install. |
| `cli-session-reuse` | High | A | `zero-tap` | IdP detects an existing CLI session on the User's machine (e.g., `~/.vercel/auth.json`), with the User's explicit one-time consent to read it. |
| `paste-token` | Medium | A | `manual` | User generates a token in the Service's web UI and pastes it once. IdP stores and brokers. |
| `service-account` | High | A | `one-tap` | Cloud-style service accounts (GCP, AWS IAM, K8s). User grants role to IdP's principal. |
| `browser-automation` | Low | B/C | `manual` | IdP runs Playwright/Browserbase to drive the Service's signup form. ToS-permissibility varies; IdP **MUST** check before executing. |

### 7.1 ToS compliance classes

- **Class A — Explicitly permitted.** Service publishes a public Apps/OAuth/API mechanism. ASP-compliant IdPs SHOULD prefer these.
- **Class B — Permitted with restrictions.** Some Services permit automation if rate-limited and labelled (e.g., "automated agent" headers). IdP MUST honour the Service's stated limits.
- **Class C — Prohibited or grey area.** Service's ToS forbids automation or is silent. IdP **MUST NOT** select these strategies by default. The Mandate must explicitly include the strategy in `allowed_strategies`.

A normative Service Compliance Registry is maintained at
`https://asp.dev/registry/` (TBD; v0.1 publishes a starter list).

### 7.2 Strategy selection algorithm

Given a valid Mandate, an IdP **MUST** select the highest-trust
Strategy that satisfies all of:

1. Listed in the Mandate's `allowed_strategies`.
2. Supported by the Service Adapter.
3. The Service's published ToS classes it as A, or B with the
   Mandate's `allowed_strategies` explicitly listing the strategy in
   the Class B/C category.
4. Achievable within the Mandate's `consent_budget`.

If no Strategy satisfies all four, the IdP **MUST** return HTTP 422
with `error: "no_compatible_strategy"` and an enumeration of which
Strategies were rejected and why.

### 7.3 Browser-automation guard

When `browser-automation` is selected, the IdP **MUST**:

- Record the exact selectors and steps used (for replay forensics).
- Watermark every request with the User's IdP-issued alias (for
  audit trail at the Service end).
- Refuse to execute if the Service's `robots.txt` disallows it.
- Refuse to execute if a CAPTCHA appears (no CAPTCHA bypass attempts).

These constraints are **normative**, not advisory.

### 7.4 The `native-asp` Strategy

When a Service implements ASP natively, the IdP does not screen-scrape or
reuse a CLI session — it speaks ASP directly to the Service. This is the
highest-trust Strategy and the IdP **MUST** prefer it when the Service
Adapter reports native support.

**Signup Intent Token (SIT).** The IdP mints a SIT — an IdP-signed,
single-use, Service-specific token, valid ≤ 5 minutes — derived from the
verified Signup Mandate. The SIT carries the Service, plan, config, the
User's verified email, the `user_id`, the governing `ucm_id`, the accepted
`tos_version`, and a `nonce`. The IdP POSTs the SIT plus the signed Signup
Mandate to the Service's `POST /asp/create-account`.

**Service-side verification.** An ASP-aware Service **MUST** run these
checks before creating the account, returning the listed status/reason on
failure:

| # | Check | On failure |
|---|---|---|
| 1 | SIT signature verifies against the IdP key from `/.well-known/asp-keys` | 401 `invalid_token` |
| 2 | SIT not expired (≤ 5 min) | 401 `token_expired` |
| 3 | `nonce` not already seen | 409 `nonce_reused` |
| 4 | Signup Mandate signature OK | 401 `invalid_cart_signature` |
| 5 | KYC confirmed via the IdP `kyc_status_endpoint` | 403 `kyc_required` |
| 6 | Requested plan/service within the Service's published ASP scope | 403 `scope_mismatch` |
| 7 | `tos_version` in the SIT is accepted | 403 `tos_not_accepted` |

On success the Service creates the account (marked ASP-created, billed to
the IdP, owned by `user_id`) and returns an **ACR**, an **AOC**, and the
credentials.

**Account Creation Receipt (ACR)** — Service-signed proof of what was
created, for whom, with which parameters, and when. **Account Ownership
Certificate (AOC)** — Service-signed, carrying a `direct_claim_url` on the
Service's domain and a single-use `claim_token` so the User can take over
billing/ownership directly, even if the IdP disappears (§11.7). Both are
signed with the Service's key published at `/.well-known/asp-keys`; the
IdP verifies them and embeds them in the Credential Capsule (§8).

A Service adopting `native-asp` implements four things only: the
`POST /asp/create-account` endpoint, the `GET /.well-known/asp-keys`
endpoint, an Ed25519 signing keypair for ACR/AOC, and configuration of
which plans are ASP-eligible. No IdP code runs on the Service. The full
merchant integration guide lives in the Vyana Flow Document.

---

## 8 · The Credential Capsule

On successful signup, the IdP returns:

```jsonc
{
  "capsule_id":         "01HXXX...",          // ULID
  "mandate_id":         "01HXXX...",          // ties to Mandate
  "issued_at":          "2026-05-23T12:00:01Z",
  "service":            "vercel",
  "strategy_used":      "oauth-app",
  "tos_class_used":     "A",
  "provisioned_resource_id": "team_xyz",      // optional, service-specific

  // ── ownership (present only on the native-asp Strategy, §7.4) ─
  "account_creation_receipt":      "<Service-signed JWS, optional>",
  "account_ownership_certificate": "<Service-signed JWS, optional>",

  // ── credentials ──────────────────────────────────────────
  "credentials": [
    {
      "name":            "VERCEL_TOKEN",
      "type":            "api_key",
      "value":           "<encrypted>",       // see §8.1
      "expires_at":      null
    },
    {
      "name":            "VERCEL_TEAM_ID",
      "type":            "identifier",
      "value":           "team_xyz",          // not encrypted (identifier, not secret)
      "expires_at":      null
    }
  ],

  // ── audit ────────────────────────────────────────────────
  "provenance": {
    "chain_id":         "01HXXX...",
    "head_hash":        "<sha256 hex>",
    "events_count":     8
  },

  // ── signature ────────────────────────────────────────────
  "signature_alg":      "EdDSA",
  "signature":          "<base64 of Ed25519(canonical(payload))>"
}
```

### 8.1 Credential encryption

Secret-typed credential `value`s **MUST** be encrypted with the
User's per-user data encryption key, returned as base64-encoded
`[IV(12) || tag(16) || ciphertext]` using AES-256-GCM.

The key derivation is IdP-defined; Vyana's reference IdP uses
HKDF-SHA256 over an IdP-held KEK with `user_id` as the info parameter.

`type: identifier` values are NOT encrypted — they are not secrets
(team IDs, project refs, regions, etc.).

---

## 9 · The Verify Chain

Before an IdP executes a Strategy it **MUST** run these checks in
the order listed. Each step's result **MUST** be recorded in the
Provenance Chain.

| # | Check | Failure mode |
|---|---|---|
| 1 | `signature` — Ed25519 verifies against `device_id` public key | reject signup |
| 2 | `expiry` — Mandate not yet expired | reject signup |
| 3 | `nonce` — not previously seen | reject signup |
| 4 | `ucm` — `ucm_id` references an active, non-revoked UCM | reject signup |
| 5 | `kyc` — User's KYC level ≥ that required for the requested category and caps | reject signup |
| 6 | `consent_budget` — strategy required ≤ Mandate's budget | reject signup |
| 7 | `caps` — Service+plan price ≤ `max_cost_paise` AND within the UCM's remaining caps | reject signup |
| 8 | `scope` — requested Service/category is within the UCM's `allowed_categories`/`allowed_services` | reject signup |
| 9 | `velocity` — within rate limits for this User | reject signup |
| 10 | `intent` — `user_raw_message` plausibly matches Mandate intent | reject OR escalate to user |

Step 10 is intentionally heuristic; implementations MAY use lexical
matching, semantic matching, or both. A `step_result: "pending"`
return for step 10 means "escalate to User for explicit confirmation
before proceeding."

---

## 10 · The Provenance Chain

Every Verify Chain step and every Strategy execution step **MUST**
emit a Provenance Event:

```jsonc
{
  "chain_id":       "01HXXX...",            // ULID, one per signup
  "event_id":       "01HXXX...",            // ULID, monotonic within chain
  "step_name":      "verify.signature" | "strategy.oauth-app.consent-grant" | ...,
  "step_result":    "success" | "failure" | "pending",
  "timestamp":      "2026-05-23T12:00:00.123Z",
  "actor":          "idp:vyana.ai",
  "payload":        { ...event-specific fields },

  "prev_hash":      "<sha256 hex of previous event canonical form, or null>",
  "this_hash":      "<sha256 hex of THIS event canonical form>",

  "signed_by":      "idp:vyana.ai",
  "signature":      "<base64 of EdDSA over this_hash>"
}
```

The chain is a tamper-evident audit log. The Capsule's
`provenance.head_hash` is the `this_hash` of the final event.

Any party (User, regulator, the Service's compliance team) presented
with the Mandate, the Capsule, and the chain can verify offline that
no events were inserted, deleted, or reordered.

---

## 11 · Security considerations

### 11.1 Signature key compromise

A leaked device signing key allows any party with it to issue
Mandates as that User up to the Mandate's `max_cost_paise` and
`allowed_strategies`. Users **MUST** be able to revoke a `device_id`
at the IdP's `revocation_endpoint`. Revocation **MUST** invalidate
all Mandates from that device with `expires_at` after the revocation
timestamp.

### 11.2 IdP compromise

A compromised IdP can forge Capsules. Mitigations:

- IdPs **MUST** publish their signing JWKS at `/.well-known/jwks.json`.
- Verifiers (other IdPs, regulators, the Service if it cares)
  **SHOULD** pin known-good IdP keys.
- IdPs **SHOULD** offer a transparency log (T-log style) of
  issued Capsule hashes for external observability.

### 11.3 Replay of Mandates

`nonce` + bounded `expires_at` defeats replay. Implementations
**MUST** retain seen-nonce tracking for at least the Mandate's max
TTL after `expires_at`.

### 11.4 Phishing of consent

Adversaries may craft Mandates to trick users into signing up to
malicious Services. Mitigations:

- Mandates **MUST** be presented to the User in human-readable form
  before signing.
- IdPs **SHOULD** maintain a published list of allowed Services and
  reject Mandates referencing unknown Services unless the User opts
  in to allow them.

### 11.5 Browser-automation abuse

The protocol explicitly permits but bounds browser automation. An
IdP that ships browser-automation as the default Strategy for a
Service whose ToS forbids it is **non-compliant** and **MUST NOT**
advertise itself as ASP-conformant.

### 11.6 Consent revocation

Revocation operates at two granularities. Revoking a `device_id` (§11.1)
invalidates Mandates signed by that device. Revoking a **UCM** invalidates
the UCM and every Signup Mandate issued under it, and blocks any in-flight
signup. The IdP **MUST** honour a revocation within seconds, **MUST**
notify the User on completion, and **MUST NOT** refuse or delay it for any
reason (including disputes or maintenance). Where a payment mandate backs
the UCM (e.g., a UPI mandate), bank-level revocation is authoritative and
the IdP cannot override it.

### 11.7 Account ownership & recovery

The AOC (§7.4) is the User's safety net: it lets the User claim an
ASP-created account directly at the Service, independently of the IdP,
even if the IdP is unreachable or ceases to operate. The Service **MUST**
verify the AOC signature and independently authenticate the User (e.g.,
Sign in with Apple/Google or password setup) before transferring billing;
the single-use `claim_token` **MUST NOT** be replayable.

For lost authenticators, the IdP **SHOULD** support recovery via any other
enrolled authenticator, falling back to KYC re-verification plus a
multi-day notify-and-wait period to defeat social engineering. Recovery
policy is IdP-defined; see the Vyana Flow Document for Vyana's hierarchy.

### 11.8 Identity binding

Because every User is KYC-verified and bound to a hardware authenticator,
ASP excludes pure software bots at the identity layer. The `kyc_level` and
`authenticator_tier` bound the caps a UCM may carry, so weak credentials
map to low spending ceilings even if a signing key is compromised.

---

## 12 · The reference IdP

Vyana operates the reference IdP at `https://vyana.ai`. It is
free for individual developers (with rate limits) and offers paid
tiers for organisations. Self-hosted IdPs are first-class — any
ASP-conformant implementation has equal protocol standing.

Brand:

- The protocol is **ASP**; never "Vyana ASP."
- The hosted-IdP UX uses the brand button **"Sign up with Vyana"**
  the same way "Sign in with Google" works for OIDC.

---

## 12A · Brokered Authentication (PR F — additive to v0.1)

This section describes how Service providers in IdP custody MAY route
**sensitive authentication events** through the IdP for user approval,
while routing **informational events** directly to the User. It is an
additive extension to v0.1: Services that don't implement it remain
fully conforming. Services that do implement it MUST follow the
constraints in this section.

### 12A.1 · Communication taxonomy (normative)

Every Service-originated communication about a Vyana-provisioned account
MUST fall into exactly one of three buckets, declared per event type in
`/.well-known/asp-configuration`:

| Bucket           | Routing                                                | Examples                                                     |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `sensitive`      | IdP webhook → user approval (passkey step-up required) | password_reset, auth_otp, new_device_auth, step_up           |
| `dual_route`     | direct to User AND audit copy to IdP                   | security_alert, suspended_account, subscription_renewal_warn |
| `informational`  | direct to User only; IdP never sees                    | welcome, marketing, product_updates, invoices                |

Bucket classification is fixed per `event_type` at the Service level. A
Service MUST NOT reclassify an event in the per-event payload — the
classification is part of the Service's protocol contract.

### 12A.2 · `/.well-known/asp-configuration` extension

Services that implement brokered authentication MUST advertise the
following in their well-known document:

```json
"communication": {
  "events": {
    "password_reset":       { "bucket": "sensitive",     "schema_version": 1 },
    "auth_otp":             { "bucket": "sensitive",     "schema_version": 1 },
    "new_device_auth":      { "bucket": "sensitive",     "schema_version": 1 },
    "step_up":              { "bucket": "sensitive",     "schema_version": 1 },
    "security_alert":       { "bucket": "dual_route",    "schema_version": 1 },
    "subscription_renewal": { "bucket": "dual_route",    "schema_version": 1 },
    "welcome":              { "bucket": "informational" },
    "marketing":            { "bucket": "informational" }
  },
  "notify_url_base": "https://vyana-broker.example",
  "allowed_callback_origins": ["https://my-service.example"]
}
```

`allowed_callback_origins` lists the Service's domain origins. The IdP
MUST reject inbound webhooks whose `notify_url` origin is NOT in this
list. This is the protocol-level SSRF guard.

### 12A.3 · Inbound webhook — Service → IdP

For every `sensitive`-bucket event, the Service MUST POST a signed
webhook to the IdP at:

```
POST /v1/webhooks/merchant/auth-challenge
```

Headers (all REQUIRED):

| Header                          | Value                                           |
| ------------------------------- | ----------------------------------------------- |
| `X-Vyana-Merchant-Id`           | Service ID at the IdP                           |
| `X-Vyana-Merchant-Key-Id`       | Key id from Service JWKS / pinned set           |
| `X-Vyana-Merchant-Signature`    | `ed25519:<base64>` over canonical body          |
| `X-Vyana-Timestamp`             | ISO-8601, ±60s skew tolerance                   |

Body (signed over):

```json
{
  "schema_version":         1,
  "challenge_type":         "password_reset",
  "account_ref":            "acct_xxx",
  "challenge_token":        "<OTP or token>",
  "expires_in_seconds":     300,
  "routing_state_version":  17,
  "merchant_nonce":         "<single-use, random>",
  "notify_url":             "https://my-service.example/asp/auth-callback",
  "approval_context":       {
    "requester_ip_city":    "Bengaluru, IN",
    "user_agent_category":  "browser",
    "human_summary":        "Password reset requested from a new device"
  }
}
```

The IdP MUST:

1. Reject (uniform 401 `{ "error": "rejected" }`) if:
   - signature does not verify against the Service's pinned key, OR
   - `merchant_nonce` was used before for this Service (replay), OR
   - timestamp skew > 60s, OR
   - `notify_url` origin is not in `allowed_callback_origins`, OR
   - `notify_url` resolves to a private/loopback/cloud-metadata host, OR
   - `routing_state_version` is less than the IdP's last-known version
     for this `(merchant_id, account_ref)` pair (stale post-sunset), OR
   - the `account_ref`'s AOC is `claimed`, expired, or not found.
2. Encrypt `challenge_token` at rest using the User's KEK before
   persisting. Plaintext MUST NOT be logged.
3. Return `202 Accepted` with `{ "ok": true, "ack_id": "<challenge_id>" }`
   when all checks pass.

All error responses MUST share the same shape, the same status code, and
should be approximately constant-time so that error responses do not
enumerate IdP state.

### 12A.4 · User approval — bearer-authed + step-up gated

The User (via dashboard, agent, or MCP) lists pending challenges:

```
GET /v1/account/auth-challenges
  Authorization: Bearer <device_token>
```

Approval requires a fresh step-up token with
`purpose=approve_merchant_auth_challenge`. This is a NEW step-up
boundary added in this PR. Bearer alone MUST NOT be sufficient.

```
POST /v1/account/auth-challenges/<challenge_id>/approve
  Authorization: Bearer <device_token>
  Body: { "step_up_token": "<fresh single-use token>" }
```

Rejection MAY be unauthenticated beyond the bearer (rejection is always
safe):

```
POST /v1/account/auth-challenges/<challenge_id>/reject
  Authorization: Bearer <device_token>
```

### 12A.5 · Outbound callback — IdP → Service

On approval or rejection, the IdP POSTs a signed callback to the
Service's `notify_url`:

```json
{
  "schema_version":      1,
  "challenge_id":        "...",
  "merchant_nonce":      "...",
  "resolution":          "approved",
  "resolution_token":    "<single-use random>",
  "resolved_at":         "...",
  "user_step_up_method": "passkey",
  "broker_assertion_ttl": 60,
  "signature_alg":       "EdDSA",
  "signature":           "<base64>"
}
```

The Service MUST:

1. Verify the IdP's signature against its pinned IdP public key.
2. Reject if `resolved_at` + `broker_assertion_ttl` is in the past.
3. Burn `resolution_token` after first verification (single-use).
4. Verify `merchant_nonce` matches the original challenge it sent.

The IdP delivers the callback with a 5-second timeout per attempt and up
to 5 retries with exponential backoff (1s, 2s, 4s, 8s, 16s). If all
attempts fail, the IdP MUST surface the failure to the User in the
dashboard but MUST NOT roll back the User's approval — the approval
itself remains recorded.

### 12A.6 · AOC sunset — two-phase commit

When the User claims ownership of an account via the AOC flow, brokered
authentication MUST cease for that account. The Service is responsible
for triggering this handoff via a signed POST to:

```
POST /v1/account/aoc/<account_ref>/sunset
  Headers: X-Vyana-Merchant-* (same shape as 12A.3)
  Body: { "new_routing_state_version": 18 }
```

On success the IdP:

1. Marks the AOC `claimed_at = now`.
2. Bumps the IdP's stored `routing_state_version` for this Service to
   `new_routing_state_version`.
3. Marks all `pending` `AuthChallenges` for this `(merchant_id,
   account_ref)` as `superseded`.
4. Returns a signed `broker_ack` payload the Service can verify before
   committing its own routing flip.

After sunset the IdP returns `410 Gone` (uniformly shaped) on any
further inbound webhooks for this account_ref. The User is now fully
direct-routed for all communications from this Service.

### 12A.7 · Fail-safe (normative)

The IdP MUST NOT be a single point of failure for User access. If the
IdP is unreachable, the Service MUST:

1. Time out the webhook at 5 seconds (or the Service-configured value).
2. Fall back to delivering the OTP / verification directly to the
   User's primary contact (email, SMS, etc.).
3. Log the failover so the User can be told "Vyana was unavailable; we
   sent the code to your email instead."

A Service that locks Users out when the IdP is unavailable does NOT
conform to this section.

### 12A.8 · Security posture (normative)

Implementations MUST satisfy:

- **Single-use everything**: `merchant_nonce`, `resolution_token`,
  step-up tokens.
- **TTL on everything**: challenges (≤15m), step-up tokens (≤5m),
  resolution tokens (≤60s), AOC claim URLs (30d per PR D).
- **Pinned keys** in both directions: Service-side IdP key pinned at
  SDK install; IdP-side Service key pinned at Service onboarding.
- **SSRF guard**: `notify_url` MUST pass both an allow-list check
  and a private-IP check.
- **Constant-shape errors**: receipt endpoint returns the same body and
  status for every rejection class.
- **User approval is non-bypassable**: bearer alone MUST NOT approve a
  `sensitive`-bucket challenge.
- **AOC sunset is two-phase commit**: both sides MUST agree on the
  routing flip before either commits. Idempotent on retry.

### 12A.9 · Threat model summary

The following attacks were considered and have protocol-level defenses:

| Attack                                              | Defense                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Forged webhook from non-Service                     | Ed25519 signature pinned to `MerchantKey`                              |
| Replay of captured webhook                          | Unique `merchant_nonce` per Service; ±60s timestamp skew               |
| CSRF auto-approve via stolen session cookie         | step-up token required on every approve                                |
| Stolen IdP session bearer → bulk approve            | step-up token required on every approve                                |
| Compromised IdP server → forged callback            | Broker signing key SHOULD live in HSM; callback signatures verifiable  |
| SSRF via malicious `notify_url`                     | allowed_callback_origins + private-IP block                            |
| Race during AOC claim                               | `routing_state_version` + two-phase commit                             |
| Stale callback replayed at Service                  | `broker_assertion_ttl=60s`; single-use `resolution_token`              |
| Service compromise → flood IdP                      | per-Service rate limit at IdP middleware                               |
| IdP availability attack → User lockout              | normative fail-safe: Service falls back to direct delivery on timeout  |
| Notification fatigue → user auto-approves           | step-up on every approve; per-Service per-day caps; sensitivity labels |
| Information disclosure via dashboard                | bearer-authed list endpoint; decrypted token only on view, not log     |
| Cross-account challenge confusion                   | `challenge_id` cryptographically binds approval to one challenge       |
| TOCTOU on routing state at IdP                      | transactional check+update in single DB transaction                    |

### 12A.10 · Out of scope (this version)

- Inbound email parsing or relay inbox infrastructure.
- SMS-channel challenges (regulated; future work).
- MFA enrollment via brokered authentication (separate spec).
- Mobile-push approval (Flavor C — depends on push infrastructure).
- IdP-as-decision-authority mode (Flavor B — eliminates the OTP token
  from the Service ↔ User surface; planned for v0.2).

---

## 13 · Versioning & extension

Protocol versions follow `MAJOR.MINOR`:

- **MAJOR** bumps when wire-incompatible changes are made.
- **MINOR** bumps add fields, strategies, or strategy parameters in a
  backward-compatible way.

`/.well-known/asp-configuration` advertises supported `version`s.
Mandates declare their `version`; IdPs **MUST** reject Mandates whose
major version exceeds the IdP's supported maximum.

Extensions follow a namespaced field convention:

```json
"x-acme-priority": "high"
```

Unknown `x-*` fields **MUST** be preserved through the Provenance
Chain but **MAY** be ignored during Verify Chain checks.

---

## 14 · References

- [RFC 2119] Key words for use in RFCs to Indicate Requirement Levels
- [RFC 6749] OAuth 2.0 Authorization Framework
- [RFC 7519] JSON Web Token (JWT)
- [RFC 8032] Edwards-Curve Digital Signature Algorithm (EdDSA)
- Google A2A and AP2 protocols (complementary; out of band of ASP)
- Anthropic Model Context Protocol (MCP) (transport for ASP Mandates
  when Agent operates as an MCP client)
- OpenID Connect Discovery 1.0 (model for `/.well-known/asp-configuration`)

---

## Appendix A — Open questions for the v0.1 RFC period

The following are deliberately under-specified in v0.1 and intended
for community input before v1.0:

1. **Revocation propagation.** Should revoked Capsules be invalidated
   at the Service via best-effort cleanup, or only at the IdP?
2. **Multi-IdP federation.** Can a Mandate be issued by IdP-A but
   executed by IdP-B (e.g., User has accounts at multiple IdPs)?
3. **AP2 mandate composition.** What's the exact JSON shape for
   embedding an ASP Capsule into a subsequent AP2 Intent Mandate?
4. **Service-side ASP awareness.** v0.1 now defines the optional
   `native-asp` Strategy (§7.4) for Services that implement ASP directly,
   including the `/.well-known/asp-keys` and `/asp/create-account`
   endpoints and the ACR/AOC artifacts. Open: a richer Service discovery
   document and a Service Compliance Registry entry format.
5. **Token rotation semantics.** Mandates issue point-in-time
   credentials. Ongoing rotation (refresh tokens, key rolls) — should
   that be part of ASP v1.0 or a separate spec ("Agent Token Lifecycle
   Protocol")?
6. **User key recovery.** §11.7 sets a baseline (recover via another
   enrolled authenticator, else KYC re-verification with a notify-and-wait
   period), but the exact flow remains IdP-defined. Should the wait period
   and notification channels be standardised?

Comment on any of these in the RFC comment thread.

### Roadmap (informative)

Tracked from the Vyana Flow Document's "open questions and future work":

- **v0.2 — ASP-Cancel.** Standard account-deletion/offboarding flow with
  attestation, parallel to the AOC claim path.
- **v0.2–1.0 — Regulatory profiles.** Per-market tax/compliance hooks
  (GST documented; US sales tax, EU VAT to follow).
- **v0.3 — Team mandates.** Multi-user UCMs with delegation hierarchies.
- **v0.4 — Dispute resolution.** Arbitration workflow on top of the
  Provenance Chain.
- **v1.x — Privacy-preserving signup.** ZK techniques to create accounts
  without revealing User identity to the Service.
- **Future — Cross-broker federation.** Broker registry + reputation so a
  Mandate issued at one IdP can execute at another (Appendix A #2).

---

## Appendix B — Glossary of MUST/SHOULD constraints (normative checklist)

For implementers, this is the conformance checklist:

- [ ] Implements all four `signup_endpoint`, `status_endpoint`,
      `revocation_endpoint`, `discovery_endpoint`.
- [ ] Exposes `/.well-known/asp-configuration` over HTTPS.
- [ ] Verifies Ed25519 signatures on every Mandate.
- [ ] Enforces `nonce` uniqueness over the Mandate TTL window.
- [ ] Encrypts secret-typed credentials with a per-user key.
- [ ] Writes one Provenance Event per Verify Chain step.
- [ ] Refuses Strategies whose ToS class is C unless explicitly
      listed in the Mandate.
- [ ] Refuses to execute `browser-automation` against CAPTCHA-protected
      flows.
- [ ] Publishes JWKS at `/.well-known/jwks.json`.
- [ ] Tags the protocol version on every wire object.
- [ ] Verifies the governing UCM is active and bounds the Mandate's scope
      and caps before executing a signup.
- [ ] Enforces the `kyc_level` × `authenticator_tier` cap ceiling when
      accepting a UCM.
- [ ] Supports UCM revocation; revocation invalidates all child Mandates.
- [ ] If advertising `native-asp`: mints single-use ≤ 5-min SITs, verifies
      Service-signed ACR/AOC, and embeds them in the Capsule.

An IdP is **ASP-conformant** when all items pass. Implementations
that fail any item MUST NOT advertise ASP conformance.

---

## End of ASP-0.1 DRAFT.
