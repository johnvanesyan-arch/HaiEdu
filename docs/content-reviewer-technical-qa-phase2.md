# Content Reviewer — Technical QA Phase 2

**Date:** 2026-10-02  
**Status:** ✅ Complete  
**Scope:** Non-browser technical QA that can be completed safely from repository, CI, Supabase, production assets and live read-only data.  
**Excluded / Phase 3:** Positive signed-in browser acceptance requiring a real Content Reviewer session.

## Coverage

Phase 2 reviewed:

- Content Reviewer home, review queue, question bank, item workspace, curriculum coverage, pilot evidence and remediation-guide workspaces;
- frontend-to-Edge-Function contracts;
- authenticated negative authorization;
- item versioning, QA and review-state invariants;
- curriculum scoping;
- remediation-guide authoring/runtime lifecycle integrity;
- SME governance separation;
- error/localization behavior;
- authenticated-workspace cache/loading architecture;
- production static delivery.

## Defects corrected

### 1. Dedicated Question Bank curriculum companion could fail and over-fetch

`web/content-curriculum.js` still carried assumptions from the old monolithic console.

On the dedicated Question Bank page:

- `detailPanel` does not exist, yet the module attempted to attach a `MutationObserver` to it;
- the module created its own Supabase client/bootstrap;
- it independently called `get-content-quality-dashboard`;
- mutations of the question table scheduled another live dashboard refresh.

This could produce a runtime exception on the bank page and also reintroduce duplicate heavy dashboard requests after the earlier navigation-performance work.

Correction:

- use the shared `contentSupabase` / `loadContentDashboard` layer;
- coalesce initial loading through the shared in-flight cache;
- null-guard the optional detail panel;
- table mutations now re-apply scope only and do not trigger a network refresh;
- `content.js` emits `haiedu:content-dashboard` after authoritative refresh so the curriculum companion consumes the same state;
- the visible refresh action clears the short-lived cache and performs one forced authoritative load;
- curriculum selector/error copy was normalized to Armenian.

### 2. SME validation was editable from ordinary Content Reviewer metadata

The item editor exposed `validation_state` as an editable text input even though SME validation is a distinct governance process.

Correction:

- Content Reviewer now sees SME status as read-only governance metadata;
- ordinary revision payloads no longer include SME state;
- `manage-content-quality` strips `validationState` from revision payloads from older/open browser bundles;
- direct metadata attempts to mutate SME state return `sme_validation_managed_separately`;
- production `manage-content-quality` v11 enforces this boundary.

### 3. Review-history enhancement retained legacy assumptions

The review-history helper still depended on the removed legacy “Review workflow” heading and retained obsolete queue integration.

Correction:

- history anchors to the current Model A `contentDecisionSection`;
- obsolete monolithic changes-request queue code was removed;
- shared Supabase auth client is reused;
- token refresh does not restart the helper;
- no-item polling is bounded;
- backend error payload details are preserved and localized.

### 4. User-facing machine/English error leakage

The reviewer could still receive raw English labels or backend error codes in several workflows.

Corrections include:

- item-editor labels and validation copy localized;
- all known technical-QA codes mapped to natural Armenian;
- all explicit `manage-content-quality` action error codes mapped;
- all explicit remediation-guide API errors mapped;
- all explicit pilot-evidence API errors mapped;
- all explicit review-history API errors mapped;
- remediation preview difficulty bands localized.

### 5. Accessibility regressions

- Question Bank rows are keyboard operable with Enter/Space.
- Item workspace toggle controls no longer use `aria-selected` without a tab role model.
- Existing remediation-guide tablist keeps the correct tab semantics.

## Live production data checks

### Item bank

Current production: **284 items**.

Zero issues were found for:

- duplicate item codes;
- published items not content-approved;
- approved items without current-version passing QA;
- published items without current-version passing QA;
- single-choice items with insufficient options;
- duplicate option keys;
- correct answers absent from options;
- approved review-history/current-version mismatch;
- retired items still published.

Current state snapshot:

- 280 published / approved;
- 4 `needs_review`;
- 4 current-version QA missing;
- 0 current-version QA failures;
- 284 `provisional_no_sme_review`.

### Curriculum scope

- 284/284 items have a primary curriculum scope;
- 0 items have no primary scope;
- 0 items have multiple primary scopes;
- all unit codes accepted by the evidence endpoint satisfy its unit-code contract.

### Remediation guides

Current catalogue:

- 23 published guides;
- 2 drafts.

For published guides:

- runtime-version audit mismatch: **0**;
- reference-metadata mismatch: **0**;
- learner-visible content mismatch: **0**.

The previously suspicious cases where `authoring_version > runtime_version` are expected. Authoring versions count draft/review/publish lifecycle events; the latest publish event records `published_runtime_version`, which matches the actual runtime guide version.

Non-blocking governance observation:

- 18 legacy Chapter I published guides still have empty reference metadata.
- They are older baseline authoring records rather than a runtime/versioning defect.
- Phase 2 did not rewrite historical or learner-facing content.

## Authorization

The authenticated negative QA harness was expanded to cover:

- `manage-remediation-guides`;
- `get-content-quality-dashboard`;
- `manage-content-quality`;
- `get-content-review-history`;
- `get-pilot-item-analytics`.

For each API it verifies:

- anonymous request denied;
- authenticated School Admin denied;
- revoked session token denied.

Result: **19/19 passed**.

## Verification

Final Phase-2 CI:

- **CI #1123**
- **715/715 tests passed**
- typecheck passed;
- browser JavaScript syntax passed;
- institutional concurrency passed.

Production static assets were verified serving the corrected Content Reviewer modules.

## Phase 3 — deferred signed-in browser acceptance

Phase 3 should later exercise the real authenticated UI, without repeating Phase 2:

1. Review Queue search/filter and open-question routing.
2. Question Bank curriculum/skill/status filters.
3. All five item tabs.
4. Temporary edit → dirty-state navigation warning → discard without saving.
5. Curriculum drill-down to bank.
6. Pilot-evidence unit selection and populated data rendering.
7. Remediation-guide filters and guide tabs/lifecycle presentation, without unsafe production mutation.
8. Repeated cross-page navigation/cache behavior.
9. Desktop/mobile visual acceptance with authenticated populated data.

Phase 3 is an acceptance layer, not a substitute for the technical/data checks already completed here.
