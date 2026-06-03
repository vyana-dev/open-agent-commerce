# Security policy

These protocols govern agent authorization, credential issuance, and payment —
security reports are taken seriously.

## Reporting a vulnerability

**Do not open a public issue for vulnerabilities.** Email
**security@vyana.ai** with:

- a description and impact,
- steps to reproduce (or a proof of concept),
- affected component (spec section, `@vyana/agent-signup-core` version, or schema).

We aim to acknowledge within 3 business days and to agree a disclosure timeline
with you. Coordinated disclosure is appreciated; we credit reporters unless you
prefer to remain anonymous.

## Scope

In scope: signature/canonicalization flaws, mandate/scope/amount bypass, replay,
provenance tampering, credential-capsule encryption issues, and adapter
mis-mappings that could let a request escape its intended authorization.

Out of scope: issues in upstream protocols themselves (Visa TAP, Google AP2,
Stripe/OpenAI ACP) — report those to their respective stewards.

## Cryptography notes

- Signatures are Ed25519 over the **canonical form** of an object. Any change to
  canonicalization is a security-relevant, wire-breaking change.
- UAP adapters normalize shape only and set `identity.verified = false`;
  verification is the verifier's responsibility. Treating an unverified request
  as verified is the canonical misuse to guard against.
