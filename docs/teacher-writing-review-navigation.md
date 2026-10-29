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

[PR352](https://github.com/johnvanesyan-arch/HaiEdu/pull/352) merges reviewed head `4f26ea7c5506945cf642edcfd34209fc837e3d66` as runtime source `64edf74848125d569ae4f3973f15f5a6d97a2bf5`. Required PR CI **40827447867** and main CI **40828095533** pass all five jobs: **1,561 unit/integration and 266 native browser checks**. The six new native cases cover exact deep links/state, no eager queue fan-out, back navigation, stale class/queue replies and account changes, exact-unit retry, paged archives, 360px/200% text with padding/selected-state assertions, and actual isolated SQL feedback publication with unsaved guards. Existing shared learner/class/Today writing, feedback and cross-role tests remain. Native screenshot artifact **12876999170** contains isolated test data.

[Guarded production run 40828266585](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40828266585) passes **73/73 checks**, with **54 before + 54 after** isolation, both schools' exact review tuples, all four real queue states, no native write attempt/page error, narrow layout and run-owned session cleanup. Ten frontend files match exact source bytes; the public release stamp matches the runtime merge before and after reads. Artifact **12877842269** retains the JSON report (production screenshots were not included by the existing artifact upload path). No production submission, grade or personal snippet was manufactured. [Release receipt](evidence/teacher-writing-review-navigation-release-20261029.json).

The initial account-switch assertion expected an empty child after its entire review root was correctly removed. The revised assertion checks the empty parent and visible Home. Screenshot review then added padding/selected-state assertions, which caught a selector using a nonexistent body class; root-scoped CSS fixes it without removing the assertions. Both failed CI records are retained in the receipt. Seventy-one focused local checks, syntax, generated-bundle parity and browser-QA dependency coverage pass. Local Chromium installation was unavailable (invalid download archive); native claims use CI, not local VM checks.

No Supabase file changed from the prior closing source through this runtime merge. Previously verified backend/grants and content/audio evidence are reused without a redeployment, migration, fresh content review or new full-learner acceptance claim. Earlier B.12.2 timing observations remain historical; no fresh 150-observation result is claimed. Persistent production Deployment Check configuration remains separately evidenced by the existing 2026-10-20 receipt; READY/CI alone are not a fresh settings attestation.

The closing documentation and source-verified Notion update retain the open generic JavaScript error and full B.12.3/owner acceptance gates. This bounded navigation delivery does not close those gates.
