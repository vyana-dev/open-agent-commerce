// @vyana/agent-signup-core — reference primitives for the Agent Signup Protocol
// (ASP) and Agent Payment Protocol (APP).
//
// Three things, framework-free (Node `crypto` only):
//   - objects:  the wire-object TypeScript shapes (UCM, SignupMandate, …)
//   - signing:  canonical JSON + Ed25519 sign/verify (the bytes both sides hash)
//   - crypto:   AES-256-GCM envelope encryption for the Credential Capsule vault
//
// Specs: ../../spec/ASP-0.1.md and ../../spec/APP-0.1.md
// JSON Schemas (language-neutral): ../../schemas/

export * from "./objects.ts";
export * from "./signing.ts";
export * from "./crypto.ts";

// Unified Agent Protocol — normalize TAP / AP2 / ACP / Vyana into one request.
export * from "./uap/index.ts";
