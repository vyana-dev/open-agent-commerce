## What & why

<!-- Brief description of the change and the motivation. -->

## Checklist

- [ ] If a wire object changed, I updated **all three** in lockstep: TS types
      (`packages/open-agent-commerce/src/objects.ts`), JSON Schema (`schemas/`),
      and spec prose (`spec/`).
- [ ] If canonicalization or a signed object changed, I bumped the protocol
      `version` and regenerated `conformance/vectors.json`.
- [ ] `npm run typecheck && npm run build` passes.
- [ ] `node conformance/run.mjs` passes.
- [ ] Examples still run (`examples/sign-and-verify.ts`, `examples/unify-protocols.ts`).
