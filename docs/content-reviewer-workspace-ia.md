# Content Reviewer Workspace — Information Architecture Refactor

**Date:** 2026-10-01  
**Status:** Deployed front-end restructuring; protected content-governance semantics unchanged.

## Purpose

The previous Content Reviewer console combined curriculum filters, the full question bank, item editing, metadata, technical QA, review history, lifecycle controls and pilot evidence in one workspace. This refactor separates those tasks without changing the backend authorization or governance model.

## Deployed surfaces

| Route | Purpose |
|---|---|
| `/content` | Action dashboard: what needs attention now |
| `/content-review` | Review queue: items awaiting a decision or correction |
| `/content-bank` | Browse/search question bank and curriculum filters |
| `/content-item?id=...` | Full-page item editor/reviewer workspace |
| `/content-curriculum` | Curriculum/program/unit coverage and quality gaps |
| `/content-evidence` | Operational pilot-evidence monitor |
| `/content-guides` | Existing governed remediation-guide authoring |

## Item workspace

The item workspace preserves the existing atomic revision, current-version QA, review/approval, request-changes, retirement and history behavior. Presentation is reorganized into:

1. **Նախադիտում** — learner-facing question preview.
2. **Բովանդակություն** — question/options/answer editing and revision save.
3. **Մետատվյալներ** — difficulty, family, source, validation and misconception mappings.
4. **QA և ստուգում** — technical QA and reviewer decision.
5. **Պատմություն** — lifecycle, review history and technical provenance.

## Invariants preserved

- Content authorization remains enforced by the existing protected Edge Functions.
- Current-version QA and review evidence remain version-scoped.
- Editing still uses the atomic revision RPC.
- Generated deterministic variants remain edit-locked where required.
- Learner release/pool activation is unchanged.
- Pilot analytics remain explicitly operational evidence, not validated psychometrics.
- No database migration, RLS change, learning-model change or curriculum-release activation was introduced.

## Verification

Final implementation head before documentation sync: `0ebaa7b8bb178b9538944146f2dc6ad3ac65d3d1`.

GitHub CI #994 passed:
- **612/612 tests**
- TypeScript typecheck
- browser JavaScript syntax checks, including the new Content Reviewer modules
- institutional PostgreSQL concurrency

Static production delivery returned the new page structures for:
- `/content`
- `/content-review`
- `/content-bank`
- `/content-curriculum`
- `/content-evidence`

Authenticated Content Reviewer interaction remains the next manual product-owner QA step; this record does not claim a signed-in browser acceptance run.
