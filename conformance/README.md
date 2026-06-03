# Conformance vectors

Cross-implementation test vectors for ASP/APP signature interop. If you
implement these protocols in another language, your implementation MUST pass
these.

- **`vectors.json`** — committed fixtures. Two kinds:
  - `canonical[]` — an object + its expected **canonical string** (signature
    field dropped, keys recursively sorted, UTF-8 JSON). Key-free and fully
    deterministic. Your canonicalization MUST produce the identical string.
  - `signatureVectors[]` — an object + `publicKeyDerBase64` + an Ed25519
    `signature`. Your verifier MUST accept it, and MUST reject any mutation.
- **`run.mjs`** — runs the reference implementation against `vectors.json`.
- **`generate.mjs`** — regenerates `vectors.json` from the reference impl.

```bash
cd .. && npm run build          # build the reference primitives first
node conformance/run.mjs        # verify
node conformance/generate.mjs   # regenerate (dev only)
```

The canonical rule is the whole game: a signature is Ed25519 over
`canonicalObject(x)`. Get the canonical string identical and signatures
interoperate across languages.
