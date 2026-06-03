# Contributing to ASP / APP

These are **draft open standards**. We want implementations and critique from
any vendor — payment networks, agent platforms, merchants, wallets.

## Comment on the spec

Open an issue with the label **`asp-rfc-comment`**. Good comments are concrete:
point at a section (`ASP §7.4`), state the problem, and propose wording.

## Change the wire objects carefully

Signatures are computed over the **canonical form** of every object (drop the
`signature` field, sort keys deeply — see `packages/open-agent-commerce/src/signing.ts`).
That means:

- The TypeScript types in `packages/open-agent-commerce/src/objects.ts`, the JSON
  Schemas in `schemas/`, and the spec prose in `spec/` MUST stay in lockstep.
  A field added in one and not the others is a bug.
- Any change to a signed object is a **wire-breaking change** unless it is a new
  optional field. Bump the `version` (`asp-0.1` → `asp-0.2`) for breaking changes.

## Conventions

- **Money is always integer paise** (`*_paise`), never floats, never rupees.
- Signatures are **Ed25519 / EdDSA**. Public keys: base64 DER (SPKI). Private
  keys: PKCS#8 PEM.
- Add a test vector under `examples/` (or `conformance/`, when present) for any
  new object so other-language implementations can check byte-for-byte.

## Local checks

```bash
cd packages/open-agent-commerce
npm install && npm run typecheck
node --experimental-strip-types ../../examples/sign-and-verify.ts
```

By contributing you agree your contributions are licensed under MIT (code) and
CC BY 4.0 (spec prose), matching this repository.
