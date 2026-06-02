# ASP / APP — specifications

Normative specification documents. Licensed **CC BY 4.0** (see `../LICENSE-SPEC`).

| Document | Scope |
|---|---|
| [`ASP-0.1.md`](./ASP-0.1.md) | **Agent Signup Protocol** — account creation, signup strategies, Signup Intent Token, Credential Capsule, Account Creation Receipt (ACR), Account Ownership Certificate (AOC), provenance chain, discovery. |
| [`APP-0.1.md`](./APP-0.1.md) | **Agent Payment Protocol** — Cart Mandate, payment + merchant settlement receipts, billing modes, AP2 alignment. |

Section numbers (§) referenced from code (`packages/agent-signup-core/src/objects.ts`)
and JSON Schemas (`schemas/`) point into these documents. The three MUST stay in
lockstep — see `../CONTRIBUTING.md`.

> Status: **DRAFT 0.1**, public RFC. Comment via issues labeled `asp-rfc-comment`.
