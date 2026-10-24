# Materials reviewer usability QA

Date: 2026-10-24. Base: `fed7cc7edae7cecda02079d287519dca6c9f974c`. Scope: `/content-materials` and its `.html` alias.

## Findings and changes

The page omitted `content.css`, which owns its reviewer shell and topbar. Generic cards lacked internal spacing, selects did not match inputs, and the writing rubric/source package pushed all review actions far below the content. Refresh cleared selection, and a failed material read left a permanent loading panel.

The page now includes the existing reviewer stylesheet, with materials-only styles loaded last. Cards show titles first, contextual scope and labeled color badges. Search, section, type and status filters compose and clear together; the ready-for-approval filter selects QA-passed drafts. Filters and counts explicitly cover loaded materials, and pagination remains explicit. Section identities include release and unit IDs rather than display names.

Saved content is readable before opening the editor. QA and approval guidance sits near the title. Editing, source/placement, practice/models, workload, history and retirement are grouped into native disclosure sections. All existing fields and staff-only review-package information remain available. Retirement uses a separate reason field. Mobile selection moves focus to the material and offers a return-to-list control.

Refresh retains the selected logical material and resolves its latest loaded version. It blocks duplicate refreshes and editing while loading, preserves unsaved changes on failure, and cancels obsolete selections. Failed reads offer an explicit retry. Existing session/selection generation guards, immutable revisions, dirty navigation warnings, QA fingerprint requirements and MFA remain intact.

## Scope and boundaries

This is the shared reviewer surface, driven by authorized programme/release/unit data. No subject, grade, academic year, number of materials or fixed rubric is introduced. No shared stylesheet, navigation module, API, database, Edge bundle, content definition or publication gate is changed. Both known guide/writing extensions retain their contracts. No materials were approved or retired in production during this UI QA. The separate Unit 2 publication hold and Sprint 16.5 learner redesign remain unchanged.

## Verification

- All 1,423 non-browser tests passed locally.
- Six native Chromium material-reviewer cases passed using the actual HTML/CSS/JS, real Edge handler and SQL in isolated PGlite, with synthetic authentication, MFA and API transport. No production credentials or records were used.
- Coverage: revision → QA → MFA approval; dirty token-refresh/navigation; late selection and sign-out isolation; duplicate actions; three curriculum scopes; composed filters and clear/reset; refresh selection retention; failed read/retry; failed refresh with unsaved edits; pending-selection cancellation and sign-out during refresh.
- Guide and writing screenshots reviewed; horizontal overflow checks at 360, 390, 768 and 1280 pixels. Writing rubric and private support package remain available.
- Browser syntax, QA dependency trigger coverage, typecheck, mirrored-core parity and favicon checks are required alongside the repository CI release gate. Isolated browser screenshots are emitted through the existing CI artifact path.
- Live pre-change URL opened successfully but required reviewer sign-in. Authenticated production content review is not claimed by fixture results.
- Persistent Vercel Deployment Check inspected separately: GitHub `Platform release checks`, Production, Blocking. No setting was changed.

All required CI jobs, including isolated Chromium and the aggregate `Platform release checks`, must pass before merge/release. CI and production deployment records attach to the delivery commit/PR; the Notion checkpoint records the final merged source and release evidence. The production asset readback must match the merged frontend before reporting the update live.
