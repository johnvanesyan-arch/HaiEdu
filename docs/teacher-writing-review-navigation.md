# Permanent teacher writing review — B.12.3.1

2026-10-29 Asia/Yerevan · shared core navigation; no subject/grade default.

John accepted the permanent writing-review sidebar entry and clear status filters after confirming that the existing rubric screen opens. The supplied screenshot is an existing reviewed synthetic QA submission (8/12), not a new learner submission. The separate generic JavaScript toast is not diagnosed by that screenshot and remains open; this delivery does not claim to fix it.

## Behaviour

Sidebar **Գրավորի ստուգում** opens a dedicated page even with zero pending work. Select active or archived classes, a class and its exact governed unit. Four visible buttons select Pending, Returned, Reviewed or All. Reviewed responses reopen through the same existing feedback editor; regrading still requires a reason and explicit publication. A saved draft remains private. The original Home pending queue and class/unit review path remain.

A fresh review entry leaves class selection explicit. From an already-selected class, the sidebar retains its exact tuple. Class discovery is paged (24 rows), with a separate archive selector. Only the selected class is loaded; no class-by-class queue fan-out, learner-data cache or new authority is introduced. Deep links retain class, assignment, release, unit, source and validated state, including browser back/reload. The server selects and reauthorizes each unit. Missing, denied or failed selections clear old writing; retry retains the requested tuple. Legacy contexts without a supported unit show an explicit unavailable message.

Unsaved private feedback guards class/source/unit/page changes. Disposed or superseded class/queue reads cannot repaint a new context or account. Event handlers and subscriptions are removed on disposal. The obsolete B.9 specimen footer link is removed; its internal URL and historical evidence remain.

## Scope and consumers

`role-layout.js` is shared across staff/reviewer/account pages; only the teacher configuration/navigation and teacher-only specimen footer change. `written-work.mjs` also serves learner course writing, class review and Today review. Its existing default select-filter behaviour remains; the dedicated review page opts into state buttons and URL callbacks. The local teacher bundle is regenerated from canonical sources. Browser QA dependency coverage includes the new imported module. No backend, schema, storage, permissions, scoring, approved content or audio changes.

WRITE-CREATE and RESOURCE-SUBMIT remain additional capabilities. No teacher-created prompts or learner responses to PDF/link assignments are implied. DEMO-01 and all 45 mappings remain. Full B.12.3 cross-role journeys and final owner usability acceptance remain separate, before subject/English C47 resumption and the four-subject gate.

## Verification

Implementation verification is pending required PR/main CI, including all five gates and native Chromium. The new native cases cover exact deep links/state, no eager queue fan-out, back navigation, stale reads/account changes, exact-unit retry, paged archives, 360px/200% text and real isolated SQL feedback publication/unsaved guards. Existing shared writing, feedback, lifecycle and cross-role tests are retained. No production grade or synthetic learner attempt is created for this navigation delivery.

Local browser installation was unavailable (the browser download did not yield a valid archive); native results must come from the required CI runner. Local focused checks and final CI/source/deployment evidence will be recorded in the release receipt. Previously verified backend and content/audio evidence are reused because their files and contracts do not change. Persistent production Deployment Check configuration remains separately evidenced by the existing 2026-10-20 receipt; a READY deployment alone is not its attestation.
