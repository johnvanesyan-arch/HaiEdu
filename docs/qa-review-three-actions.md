# Bounded code-review follow-up — 2026-09-28

Execution mode: Work. This slice contains only the three immediate actions agreed in the code-review discussion. Sprint 14 remains in progress; its remaining acceptance and content-release gates are unchanged.

## Implementation

- Added `npm run check:core-parity` and a named CI step. The check compares the five required mirrored modules (`grading`, `mastery`, `practice`, `recommendation`, `types`) and automatically includes newly mirrored top-level TypeScript modules. Missing required copies fail. TypeScript parsing restricts normalization to relative `.js`/`.ts` module specifiers in imports, exports, import types and dynamic imports; comments, ordinary strings, formatting and logic are otherwise compared exactly.
- Aligned two pre-existing non-runtime differences in the backend copies: removed one extra comment in `practice.ts` and one extra blank line in `types.ts`. No shared Edge Function file or executable core logic changed. Core-only and Edge-only helpers remain intentional and are not treated as mirrored modules.
- Replaced both MFA factor HTML interpolation sites in `web/admin-security.js` with DOM creation and replacement. Names and labels use `textContent`; option IDs use `value`; removal IDs use `dataset`. Existing classes, labels, factor ordering, verified-factor filtering, confirmation, session refresh, active-admin entry checks and sole-factor protection are preserved.
- Updated README to describe `start-learning-session`, `get-session-item` and `submit-answer` as the live session-bound loop. The retired `get-practice-item` returns HTTP 410 after its existing authentication/live-session checks; it does not deliver assessable content.

## Verification

- Focused parity regressions cover allowed import-extension differences, unchanged ordinary strings/comments/package imports, logic drift, missing copies and newly mirrored-module drift.
- Focused MFA regressions execute the actual page functions with DOM operations that reject HTML parsing. They cover hostile names and IDs, exact selected-ID forwarding, factor labels/fallbacks, verified-factor filtering, re-render replacement, removal/refresh, cancellation, sole-factor protection, no-factor enrollment and denied account entry.
- Local validation passed on Node 22.23.3: all **569 tests**, `npm run check:core-parity` (five mirrors), `npm run typecheck`, and syntax checks for every `web/*.js`, `scripts/*.mjs` and `e2e/*.js`. The initial run under the machine's Node 20 failed because existing tests require Node 22 TypeScript APIs; the rerun matches CI's Node 22 configuration. The PR's CI run is the authoritative hosted validation record, including the existing institutional concurrency job.
- A separate browser smoke attempt could not launch Chrome in the local sandbox. DOM regression tests passed with mocked Auth; authenticated browser/production MFA acceptance is not claimed.

## Boundaries and delivery

No database migration, authorization policy, AAL parsing, rate limiting, Cache-Control, curriculum release, learner evidence or deployed Edge Function code changes are included. The root deployment policy's shared-runtime redeployment requirement is not triggered: `_shared` and all importing Edge Function entrypoints are byte-for-byte unchanged. The only browser runtime consumer changed is the admin-security page.

This record describes the implementation slice, not authenticated production MFA acceptance or a completed Sprint 14. Repository/CI delivery and any production deployment must be distinguished in the PR and Notion checkpoint. The canonical sprint roadmap and its Notion mirror track this checkpoint without closing other sprint gates.
