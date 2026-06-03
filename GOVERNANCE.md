# Governance

Open Agent Commerce is developed in the open. This document describes how
decisions are made, how the specification evolves, and how anyone can take part.

## Mission

Provide neutral, vendor-independent protocols and reference primitives for
agent-mediated commerce — signup, payment authorization, and a unified
verification layer across rails — so that any agent, merchant, or rail can
interoperate without lock-in.

## Stewardship

The project is currently **stewarded by Vyana Technologies**. Stewardship means
maintaining the repository, shepherding the RFC process, and cutting releases —
**not ownership of the standard**. The specification is published under CC BY 4.0
and the reference code under MIT precisely so the standard cannot be captured.

**Intent:** as adoption and the contributor base grow, the project intends to
move governance to a vendor-neutral home (an independent working group or
foundation). Until then, this document is the operating agreement.

## Roles

- **Users** — anyone implementing or deploying the protocols. Users participate
  by filing issues, asking questions, and publishing implementations.
- **Contributors** — anyone who opens a pull request or a substantive spec
  comment. No formal status required.
- **Maintainers** — listed in [MAINTAINERS.md](./MAINTAINERS.md). Maintainers
  review and merge changes, triage issues, and steward releases.
- **Steward** — currently Vyana Technologies; holds release authority and
  facilitates the move to neutral governance.

## How decisions are made

We operate by **lazy consensus**: a proposal proceeds if no maintainer objects
within the review window. Most changes are uncontroversial and merge once a
maintainer approves.

- **Code / docs / examples / schemas (non-wire):** 1 maintainer approval.
- **Normative spec or wire-format changes:** an RFC issue, a **minimum 7-day**
  public comment window, and **2 maintainer approvals**. Wire-breaking changes
  additionally require a version bump and a CHANGELOG migration note.
- **Disputes:** if consensus cannot be reached, maintainers decide by simple
  majority; the steward breaks ties. Rationale is recorded in the issue.

## Spec-change (RFC) process

1. **Propose** — open an issue labeled `asp-rfc-comment` describing the problem
   and a concrete proposal (cite the spec section).
2. **Discuss** — public comment for at least 7 days.
3. **Draft** — open a PR updating the spec prose, the JSON Schema(s), the
   TypeScript types, and conformance vectors **in lockstep** (see
   [CONTRIBUTING.md](./CONTRIBUTING.md)).
4. **Review** — 2 maintainer approvals; CI green (typecheck, build, examples,
   conformance).
5. **Merge & version** — bump the affected wire version if the change is
   wire-breaking; record it in [CHANGELOG.md](./CHANGELOG.md).

## Becoming a maintainer

Sustained, high-quality contribution (reviews, well-scoped PRs, spec work) over
time is the path. Any existing maintainer may nominate a contributor; the
nomination passes by lazy consensus among maintainers. Maintainers who become
inactive may move to emeritus status.

## Releases

The steward cuts releases. Each release corresponds to a tagged commit, a
CHANGELOG entry, and — for the reference library — an npm publish.

## Amendments

This document is changed like any normative document: via the RFC process above.

## Code of conduct

All participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
