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


## Follow-up visual QA — 2026-10-01

Product-owner screenshot QA identified two cross-page consistency issues after deployment:

1. several bordered reviewer work surfaces inherited the shared card border/shadow without deliberate internal padding;
2. the original page-header **Դուրս գալ** control remained visible even though the shared role sidebar already supplies sign-out.

The corrective pass:
- normalized inner spacing for the Question Bank filter card and table heading, Evidence controls/metrics, Curriculum programme cards, and Remediation Guide filters/list heading/editor;
- brought the Remediation Guide topbar under the same shared reviewer shell treatment;
- hides the original topbar sign-out on every `data-role-workspace="content*"` page while retaining the hidden action hook used by the single sidebar sign-out;
- added regression tests for reviewer card spacing and the one-sign-out presentation contract.

Commits:
- `4cd42d8dc397d193e24325331ea5fb31bd55b698`
- `19976cb9ac1f99fcb93d1fc7ea3890c8176b02e9`

Verification:
- CI #996 passed the full suite after the spacing/sign-out change.
- CI #997 passed after hardening the topbar sign-out rule so it remains hidden independent of sidebar-render timing.
