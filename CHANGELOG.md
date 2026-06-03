# Changelog

All notable changes to ASP / APP / UAP and the reference primitives. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the protocols
use independent draft versions (`asp-0.1`, `uap-0.1`).

## [Unreleased]

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
