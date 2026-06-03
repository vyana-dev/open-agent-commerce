// Conformance runner: verify the reference implementation against vectors.json.
//   npm run build && node conformance/run.mjs
//
// Other-language implementations should port this: for each canonical vector,
// your canonicalization MUST produce the identical string; for each signature
// vector, your Ed25519 verify MUST accept the signature and reject any mutation.

import { readFileSync } from "node:fs";
import {
  canonicalObject,
  verifyAspObject,
} from "../packages/agent-signup-core/dist/index.js";

const v = JSON.parse(readFileSync(new URL("./vectors.json", import.meta.url)));
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("FAIL:", msg);
};

for (const c of v.canonical) {
  const got = canonicalObject(c.object);
  if (got !== c.canonical) {
    fail(`canonical[${c.name}] mismatch\n  expected: ${c.canonical}\n  got:      ${got}`);
  } else {
    console.log(`ok  canonical  ${c.name}`);
  }
}

for (const s of v.signatureVectors) {
  if (verifyAspObject(s.object, s.publicKeyDerBase64) !== s.expectVerify) {
    fail(`signature[${s.name}] verify expected ${s.expectVerify}`);
  } else {
    console.log(`ok  verify     ${s.name}`);
  }
  // Mutating any signed field must break verification.
  const tampered = { ...s.object };
  if ("max_cost_paise" in tampered) tampered.max_cost_paise += 1;
  else if ("amount_paise" in tampered) tampered.amount_paise += 1;
  else tampered.nonce = (tampered.nonce ?? "") + "x";
  if (verifyAspObject(tampered, s.publicKeyDerBase64) !== false) {
    fail(`signature[${s.name}] tamper NOT detected`);
  } else {
    console.log(`ok  tamper     ${s.name} (mutation rejected)`);
  }
}

if (failures) {
  console.error(`\n${failures} conformance failure(s)`);
  process.exit(1);
}
console.log("\nall conformance vectors pass");
