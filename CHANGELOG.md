# Changelog

All notable changes to ASP / APP / UAP and the reference primitives. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the protocols
use independent draft versions (`asp-0.1`, `uap-0.1`).

## [Unreleased]

### Security & wire (pre-1.0, wire-breaking within the 0.1 draft)
- **Domain-separated signatures.** Object signatures are now computed over
  `"open-agent-commerce/object/v1\n" + canonicalForm`, and MCP-request signatures
  over `"open-agent-commerce/request/v1\n" + payload`. This prevents an OAC
  signature from being replayed in another signing context. Existing signatures
  are invalidated; conformance vectors regenerated. Canonical-form (key-free)
  vectors are unchanged.
- **`verifyAspObject` documented as signature-only** — a `true` result means
  authentic bytes, NOT "safe to act on"; callers MUST still enforce
  expiry/replay/scope/amount (the verify chain).
- **`CredentialCapsule` gains `expires_at` + `nonce`** (was a signed object
  carrying live credentials with no freshness/replay protection).
- **`crypto.ts` relabelled non-normative** (it is a reference vault, not part of
  the wire format) and now binds the user id as AES-GCM AAD.

### Fixed
- **Verify-chain order unified** to one normative sequence across ASP §4/§9, the
  README, UAP-0.1, and the reference verifier (was stated four different ways).
- APP: removed private-monorepo path references, hedged the AP2 version/date
  claim, added a status banner to §5 (only `CartMandate` is implemented), fixed a
  dangling `(§13)` doc-comment, and aligned the cart-mandate schema `$id`.

### Added
- **Unified Agent Protocol (UAP-0.1)** — neutral normalization layer mapping Visa
  TAP, Google AP2, Stripe/OpenAI ACP, and Vyana ASP/APP into one
  `UnifiedAuthorizationRequest`. Spec (`spec/UAP-0.1.md`), JSON schema, model +
  four adapters in `@vyana/open-agent-commerce`, and a runnable demo.
- **Sequence & architecture diagrams** (`docs/SEQUENCES.md`) — consent, signup
  (native + cold-start), payment + settlement, the verify chain, unified UAP
  verification, and ownership recovery.
- **Conformance vectors** (`conformance/`) — canonical-form and signature
  fixtures with a runner, for cross-language interop.
- Project hygiene: `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue/PR templates.
- **Standard-grade governance & docs**: `GOVERNANCE.md` (roles, RFC process,
  path to neutral governance), `ROADMAP.md`, `MAINTAINERS.md`, `CITATION.cff`,
  `.github/CODEOWNERS`; README expanded with design goals & non-goals, a
  versioning/stability policy, standards & prior-art grounding, an
  implementations table, and a community/support section.
- Renamed the suite to **Open Agent Commerce**; package
  `@vyana/agent-signup-core` → `@vyana/open-agent-commerce`.
- **Honest interoperability framing**: an Interoperability status table (what the
  TAP/AP2/ACP adapters do today — shape-normalization, draft — vs. conformance
  against live implementations on the roadmap) and a non-affiliation / trademark
  notice across README, the UAP spec, and the comic. No "supported by" overclaims.
- **Explainer comic** (`docs/COMIC.md` + `docs/comic/*.svg`): 8-panel story
  including the account lifecycle and ownership-claim flows; clickable cover hero
  on the README home page.

## [0.1.0] — initial public draft

### Added
- **ASP-0.1** and **APP-0.1** normative specs (CC BY 4.0).
- `@vyana/open-agent-commerce` reference primitives (MIT): wire objects, canonical
  JSON + Ed25519 signing/verification, AES-256-GCM credential encryption.
- JSON Schemas for the core wire objects.
- `sign-and-verify` example and CI.
