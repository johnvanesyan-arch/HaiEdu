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


## MVP Model A reviewer workflow — 2026-10-01

The current MVP has no separate content-author recipient. The Content Reviewer is therefore both the authorized editor and the human reviewer for question items.

The deployed item-review flow is:

```text
Inspect question
  ├─ needs correction → Edit question → Save new version → Run QA
  └─ no correction needed ─────────────────────────────→ Run QA
                                                     ↓
                                              QA must pass
                                                     ↓
                                                  Approve
```

### UI changes

- Removed **Submit review** from the question reviewer decision area.
- Removed **Request changes** from the question reviewer decision area.
- Added **Խմբագրել հարցը** as the direct correction action.
- **Հաստատել** is disabled until the current saved version has passing QA.
- Unsaved edits block both QA and approval; the reviewer must explicitly save a new version first.
- Running QA no longer silently saves edited content.
- Approving no longer silently saves content or silently runs QA.
- Existing review/version/audit history remains preserved.

### Compatibility boundary

The server-side `submit_review` and `request_changes` actions are retained for historical records and future subject-scoped Content Author / independent reviewer workflows. The current Content Reviewer item UI does not call them.

### Verification

Implementation:
- `57e33394b629da7523c8d0f63637f78d44dcaed9`
- `0dbfdb449ffcc98b1fb931934c7f626e8decebfd`
- `e33307c28e415a2a7604042e72e46fdd4edae2ef`

CI #1002 passed **617/617 tests**, typecheck, browser JavaScript syntax checks and institutional concurrency. Production `/content-item` and `/content.js` serve the Model A workflow copy and behavior.


## Technical QA vs governance state — 2026-10-01

A live reviewer check exposed that pre-approval QA runs stored `content_review_not_approved`, which became stale immediately after the reviewer approved the same version. `sme_review_pending` was also being rendered beside technical QA despite representing a separate governance gate.

The corrected model is:

- **Technical QA**: structural/metadata/generated-variant checks only.
- **Content review**: live item `review_status`.
- **SME validation**: live item `validation_state`.

Implementation:
- new QA runs no longer add `content_review_not_approved` or `sme_review_pending`;
- historical QA rows are preserved unchanged;
- the UI filters those two legacy governance codes from historical QA warning lists;
- the QA/Review tab now displays live **Բովանդակային հաստատում** and **Մասնագիտական (SME) ստուգում** status cards;
- actual technical metadata warnings (for example source, family, misconception mapping, duplicate prompt, unit consistency) remain part of QA;
- `manage-content-quality` was deployed as Edge Function **v5**.

Verification:
- GitHub CI #1005 passed **618/618 tests**, typecheck, browser JavaScript syntax and institutional concurrency.
- Production static assets serve the governance-status UI.
- Production Edge Function v5 source contains neither governance warning generator.


## Revision-save correction for draft misconception mappings — 2026-10-01

A live wording edit on `PHY7-U02-S02-I01` failed with HTTP 409. Postgres logged `invalid_misconception_code`.

Root cause:
- Chapter II currently carries governed **draft** misconceptions.
- The item already had mappings to `particle_identity_or_count_changes`.
- The editor populated its misconception picker from **active** misconceptions only, so an existing draft mapping rendered without a valid selectable code.
- The atomic revision RPC then rejected the payload even though the reviewer had changed only wording.

Correction:
- preserve an already-attached draft misconception during a revision;
- still reject newly attached draft or retired misconceptions;
- recover an empty misconception code from the uniquely matching existing response-key mapping for pre-fix browser bundles;
- render the current non-active mapping in the editor as an existing mapping;
- surface the actual function error payload in the content editor;
- replace the global misleading generic Edge Function message that implied account deletion/suspension with a neutral action-failed message.

Migration: `20261001070000_content_revision_preserve_draft_misconceptions.sql`.

Verification:
- production function definition confirms existing-draft preservation and blank-code recovery;
- the affected item remained at v2 during diagnosis; no failed-save mutation was committed;
- production static assets serve the corrected editor/error behavior;
- GitHub CI #1008 passed.
