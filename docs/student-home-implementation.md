# Sprint 16.5B.1 — Shared student shell, Home and course navigation

**Current delivery — 2026-10-27:** Home, all existing student subpages and complete S45 supplementary materials are deployed under 16.5B.1–B.3. See [current dashboard acceptance](student-dashboard-acceptance.md) and the [authoritative status](project-status.md). Earlier remaining-work statements below describe their dated checkpoint. Final owner usability sign-off and full four-subject 16.5C remain separate.

**27 October 2026 · Asia/Yerevan · Bounded slice delivered; remaining 16.5B/16.5C gates open.**

John explicitly accepts the complete Forest dashboard design and style guide, preserving all 45 capabilities and their dependencies. The [acceptance record](evidence/student-dashboard-approval-20261027.json) pins the accepted documents to `feb82ce0116a8ae3b75d0147327661861f91c833`. This closes 16.5A and authorizes bounded implementation; it does not close all of 16.5B or 16.5C.

## Delivered scope

- Shared student-only Forest/cream foundations, local Armenian font, native book/leaf artwork, visible focus and logout; public/staff tokens stay scoped to their existing surfaces.
- Home, Courses and My work primary navigation. Progress remains inside its selected course; all existing bookmarked learning/assessment/progress routes remain available. S45 is the accepted fourth slot, enabled only with its complete authoring/protected-delivery slice.
- Authorized course/unit selection, preserving school, year, class, enrollment, programme and independently released units. Multiple contexts have no automatic subject default.
- Saved-work continuation uses the existing active mode, exact context and target skill. Home discovery/selection is read-only and never starts an attempt. Required diagnostic is an assessment-entry link, not an automatic start.
- Required-skill readiness is labelled separately from verified mastery; absent evidence is omitted. My work is a course-scoped writing index with no fabricated cross-course counts or new inbox.
- Context/account epochs reject old responses; same-account refresh retains selection/focus. Shared logout deduplicates visible actions and prevents an old response clearing a new login.

## Platform scope and dependencies

The shared core contains no new subject/grade/policy assumptions. Existing registered legacy extensions remain available. Consumers are Home; generic course and focused player; legacy subject, diagnostic, practice, mastery, assessment and progress routes. Join/privacy continue through their existing account services. Teacher/admin/reviewer surfaces retain their existing layout and APIs; shared staff/browser suites remain required. No database, Edge Function, content, scoring, prerequisite, playback or release-gate mutation is part of this change.

The old hidden single-subject Home renderer remains compatibility debt; this slice does not claim full legacy-core migration. The 45-row matrix is preserved. Course/assessment/progress components, full work/account placement, S45 and future backend-dependent capabilities remain separate slices. English stays parked after C47, next full Unit3 learner/audio/writing acceptance, then Units4–6; owner content/audio review is reused. Full four-subject 16.4/16.5C and formal Sprint17 gates remain open.

## Before/after

These are real browser modules with synthetic authorized contexts, not production learner data. [Before](evidence/haiedu-home-before-20261027.jpg) · [Forest Home](evidence/haiedu-home-forest-20261027.jpg).

## Verification and release record

- Local syntax, typecheck, core parity and favicon checks pass. Required CI passes all 1,454 unit/integration tests and 139 native Chromium regressions. Obsolete sidebar-text checks and a My work fixture wait were aligned with the approved routes before the final passing PR/main runs.
- Native cloud Chromium uses real local browser modules with synthetic Auth/read services, no production credentials or writes. Checked iframe widths 320/360/768/1280 px (content widths 305/345/753/1265 due to scrollbar): no horizontal overflow or clipped controls after correcting narrow mobile labels. At 200% root text, no horizontal overflow/clipped controls. This is text enlargement, not a claim of actual browser zoom or full accessibility certification.
- Added isolated native-browser regressions cover context/release/target-skill preservation, late responses, revocation/account changes, duplicate and delayed logout, empty/error/retry, keyboard/reduced motion and responsive rendering. Existing full-shell and release navigation runners follow the new Courses/disclosure routes; their authorization, exact-deployment and read-only guards remain.
- The dependency-trigger audit passes for all nine configured browser QA workflows. Computed Forest CSS and font URLs are explicitly covered in the four narrowly enumerated Physics workflows; other relevant flows already cover `web/**`.
- Unchanged font bytes are pinned and licensed in `web/assets/fonts/README.md`; unchanged source/learning-policy evidence is reused.

[PR307](https://github.com/johnvanesyan-arch/HaiEdu/pull/307) merged as `a5f9f09218b1220bb8793f21381858dc0ad786ed`. [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40471733942) and [main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40472096861) pass every required job, including the aggregate. Vercel reports success and the live release marker plus all twelve changed browser/font assets match source exactly.

Authenticated exact-source production acceptance passes [Physics Chapters I–VI: 324/324](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40472096794), [English Unit3/preserved programme reads: 154/154](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40473669603) and [staff analytics: 10/10](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40472096949). The existing shared QA concurrency group canceled the first English workflow before jobs began. The connector could not retry that empty run; the existing signed-in GitHub workflow control started a fresh guarded main run, without changing authorization, fixtures or release controls. Other unchanged learning/content evidence is reused; this is representative shared-interface acceptance, not new learner attempts or full four-subject certification.

The persistent Vercel **Production / Blocking / Platform release checks** configuration was separately verified under [reliability stage 1](reliability-stage1.md). That unchanged configuration evidence is reused. This connector still returns project-team scope denial (403), so a fresh settings readback is **not** claimed. No check or provider setting was bypassed or changed. [Machine-readable release record](evidence/student-home-release-20261027.json) preserves these limits and all three redacted production reports.

**Next:** implement the reviewed course/assessment/progress surfaces, then remaining work/account surfaces and the complete S45 materials capability. Preserve all owning-service dependencies.
