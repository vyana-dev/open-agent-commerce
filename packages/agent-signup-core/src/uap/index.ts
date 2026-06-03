// Unified Agent Protocol (UAP) — public surface.
//
// One canonical request, four adapters. Map TAP / AP2 / ACP / Vyana into a
// UnifiedAuthorizationRequest, then run a single verify chain + provenance
// record over it. See ../../../spec/UAP-0.1.md.

export * from "./model.ts";
export { fromVisaTap, type VisaTapInput } from "./adapters/visa-tap.ts";
export { fromAp2, type Ap2Input } from "./adapters/google-ap2.ts";
export { fromAcp, type AcpInput } from "./adapters/openai-acp.ts";
export { fromVyana, type VyanaInput } from "./adapters/vyana.ts";
