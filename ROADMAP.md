# Roadmap

Directional, not a commitment of dates. Shaped in the open — influence it via
[issues](https://github.com/vyana-dev/open-agent-commerce/issues) labeled
`asp-rfc-comment`. See [GOVERNANCE.md](./GOVERNANCE.md) for how changes land.

## 0.1 — public draft (current)

- [x] ASP-0.1 and APP-0.1 normative specs
- [x] Reference primitives: wire objects, canonical JSON, Ed25519, vault encryption
- [x] JSON Schemas for core wire objects
- [x] Unified Agent Protocol (UAP-0.1): model + TAP / AP2 / ACP / Vyana adapters
- [x] Sequence + architecture diagrams
- [x] Conformance vectors (canonical-form + signature) + CI

## 0.2 — interop hardening

- [ ] Pin each adapter's upstream field mappings to specific TAP / AP2 / ACP
      protocol versions, with citations.
- [ ] Define a **canonical signing form for the `UnifiedAuthorizationRequest`**
      itself, so a verifier's verdict + provenance head can be co-signed and
      forwarded.
- [ ] Per-source conformance vectors (one fixture set per inbound protocol).
- [ ] Additional adapters as rails stabilize (e.g. UPI-native, x402).
- [ ] Reference **verifier** implementation (the policy chain that consumes a UAR
      and emits a provenance record), not just the primitives.

## 0.3 — ecosystem

- [ ] Know-Your-Agent (KYA) registry interop: resolve agent public keys across
      directories (incl. Visa Agent Registry-style lookups).
- [ ] Provenance ledger export format + verifier for dispute/audit.
- [ ] A second-language reference implementation to prove cross-language interop.
- [ ] Test-suite badge and a public conformance report.

## 1.0 — stable

- [ ] Wire format frozen with a documented deprecation policy.
- [ ] Multiple independent, conformant implementations.
- [ ] Governance moved to a vendor-neutral home (working group / foundation).

## Non-goals

See [README → Design goals & non-goals](./README.md#design-goals--non-goals).
This is not becoming a payment rail, a PSP, or a fraud-scoring system.
