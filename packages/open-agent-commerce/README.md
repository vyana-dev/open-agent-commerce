# @vyana/open-agent-commerce

Reference primitives for the **Agent Signup Protocol (ASP)** and **Agent Payment
Protocol (APP)**. Framework-free — depends only on Node's built-in `crypto`.

```bash
npm install @vyana/open-agent-commerce
```

## What's in the box

| Module | Exports |
|---|---|
| `objects` | Wire-object types: `UserConsentMandate`, `SignupMandate`, `SignupIntentToken`, `AccountCreationReceipt`, `AccountOwnershipCertificate`, `CredentialCapsule`, `CartMandate`, `Receipt`, … |
| `signing` | `canonicalObject`, `signAspObject`, `verifyAspObject`, `signDetached`, `verifyDetached`, `generateDeviceKeyPair`, plus the MCP-request `canonicalize`/`signPayload`/`verifyPayload` |
| `crypto` | `encryptForUser` / `decryptForUser` — AES-256-GCM envelope encryption for the Credential Capsule vault |

## The one rule that makes signatures interoperate

A signature is computed over the **canonical form** of an object: drop the
`signature` field, then serialize with **recursively sorted keys**. Any party can
re-derive the exact signed bytes from the object alone — no shared per-object key
list required.

```ts
import { signAspObject, verifyAspObject, generateDeviceKeyPair } from "@vyana/open-agent-commerce";

const { privateKeyPem, publicKeyDerBase64 } = generateDeviceKeyPair();

const mandate = {
  mandate_id: "01J...", ucm_id: "01H...", version: "asp-0.1",
  service: "example.com", max_cost_paise: 49900, /* … */
};

mandate.signature = signAspObject(mandate, privateKeyPem);
verifyAspObject(mandate, publicKeyDerBase64); // → true
```

See [`../../examples/sign-and-verify.ts`](../../examples/sign-and-verify.ts) for a
full runnable mint → sign → tamper → verify cycle.

## Conventions

- **Money is always integer paise** (`amount_paise`), never floats.
- **Signatures are EdDSA / Ed25519.** Public keys are base64 DER (SPKI); private
  keys are PKCS#8 PEM.
- Canonical bytes are UTF-8 JSON with deeply sorted keys and the `signature`
  field removed.

Normative behaviour is defined in [`../../spec/ASP-0.1.md`](../../spec/ASP-0.1.md)
and [`../../spec/APP-0.1.md`](../../spec/APP-0.1.md). License: MIT.
