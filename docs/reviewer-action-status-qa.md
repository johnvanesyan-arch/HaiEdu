# Question action-status panel QA

Date: 2026-10-24. Base: `c43fa3c062527554115c054b820b463318cce35a`.

## Reviewer behavior

The shared question editor now has one action-status panel above its tabs. It contains the only Save, Run QA and Approve buttons, the next required step, and an always-visible explanation beside each button. Disabled reasons are associated through `aria-describedby`; the status heading and operation feedback use live regions. Tab changes preserve the panel.

Unsaved changes require an explicit save. Saving a new version requires fresh QA and content review. Missing QA offers Run QA; failed QA shows its first localized error and offers the full issue list. A passed current-version QA permits content review. Already-approved versions explain why another approval is unnecessary. Archived questions point to Restore in History. Generated/template-controlled items explain why direct editing is unavailable without incorrectly blocking their permitted QA/review actions. Pending SME review remains separate from technical QA; content approval is not described as release activation.

An approval rejection carrying `requiresQaRerun` immediately invalidates the client’s apparent passing QA until a new QA action. An ordinary refresh cannot clear that known hold. Successful writes followed by failed dashboard reads require an explicit refresh before another write; the panel retains the actual failure message. During writes, action buttons and editor controls are disabled, preventing duplicate submission and edits that could otherwise be lost when the saved detail returns. The original disabled state of read-only controls is preserved. Failed saves retain edits and the native unsaved-navigation warning remains.

The panel uses the existing save/QA/approval handlers and authoritative dashboard/detail contracts. It adds no automatic saving, QA, approval, publication or new backend privileges. Existing server authorization and review checks remain authoritative.

## Scope

Production consumers of `content.js` are `content-item.html` and `content-bank.html`; only the item page renders an editor. The retained legacy editor mode uses the same action logic. New stylesheet selectors are limited to the new panel. The materials and teaching-guide workflows are separate and are not changed by this question-editor slice. The implementation has no subject, grade, academic-year, programme or question-format assumptions. No database, Edge bundle, assessment policy, question content or curriculum release gate is changed. Unit 2’s publication hold and Sprint 16.5’s design scope remain unchanged.

## Verification and release

- Four new isolated Chromium cases cover the complete save → QA → review sequence at 1365px and 390px; unique action controls across tabs; associated disabled reasons; pending-save field locking and duplicate prevention; server-required QA rerun; failed read and retry; archived/generated questions; failed QA; and separate SME status.
- The six existing list-navigation cases and fourteen observer/editor cases pass, including unsaved navigation, pending actions, old item/account response isolation and observer settling.
- The tests use actual frontend files with synthetic auth/API data. The older observer suite also reuses its isolated dashboard-handler fixture. No authenticated production reviewer action or content approval is claimed.
- The refresh regression fixture now implements `document.querySelectorAll`, required by pending-control handling. Its original assertions remain unchanged. The approval double-click regression uses two immediate DOM clicks because the first now disables the button synchronously.
- Desktop/mobile screenshots reviewed; horizontal overflow remains absent. Browser syntax and QA dependency-trigger checks pass. All 1,423 non-browser tests pass locally; all five required CI jobs remain required before release.
- Reuse the separately inspected, unchanged Vercel Production / Blocking Deployment Check from this session.

The final Notion checkpoint records the merged source, successful PR/main CI, production deployment and byte-identical live frontend readback. Documentation is prepared with this implementation; that checkpoint establishes release completion and preserves the roadmap’s native child pages.
