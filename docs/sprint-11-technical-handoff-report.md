# Sprint 11 — Technical Handoff Report

**Status:** ✅ Technical handoff ready  
**Date:** 2026-09-20  
**Target release:** `physics7_u01_2026_08_14_pilot_r1`  
**Production surface checked:** `https://armenian-mastery-platform.vercel.app/`

## Handoff decision

Sprint 11 is technically ready to hand to another person for informal QA/usability testing.

This decision closes **Sprint 11 technical handoff readiness** only. It does not claim that:

- a controlled human cohort has run;
- participant/guardian authorization exists;
- pilot entry is open;
- formal pilot evidence has been collected;
- the learning model is empirically calibrated;
- external Physics SME approval has been obtained.

The controlled pilot remains fail-closed and moves to Sprint 11.5.

## Live pilot-gate state at handoff

The 11L pilot governance record remains `blocked` by design.

- Entry gates: **4/6 passed**
  - evidence baseline classified — passed;
  - Sprint 11F disposition complete — passed;
  - Sprint 11G two-subject QA — passed/dispositioned for technical handoff;
  - Sprint 11H surface QA — passed/dispositioned for technical handoff;
  - participation authorized — blocked;
  - cohort enrolled — blocked.
- Closure gates: **0/5 passed**.
- `entry_ready = false`.
- `closure_ready = false`.

The two remaining entry gates are human Sprint 11.5 gates and were not bypassed.

## Evidence classification at handoff

The pilot evidence baseline now contains **14 classified sessions**:

- **10 partially compatible** legacy-context sessions;
- **4 incompatible** sessions;
- **0 compatible formal-pilot sessions**;
- **0 closure-eligible sessions**;
- **0 eligible attempts**;
- **0 eligible exposure events**.

Three exact-release sessions created after the original 11L baseline were classified as `incompatible / outside_cohort`. They remain useful as QA context but cannot count as pilot or calibration evidence because they occurred before participation authorization and cohort enrollment.

## 11F — production-workflow readiness

**Disposition: PASS for Sprint 11 technical handoff.**

Verified or dispositioned:

- Teacher evidence scope: the retained QA learner belongs to an active teacher-owned Physics class; the teacher-student endpoint enforces class membership before returning learner evidence.
- Learner evidence: post-baseline exact-release Practice and Diagnostic activity exists and is provenance-bound to the current release.
- Mastery: the legitimate ineligible state remains the correct result. Eligibility was not manipulated. Start/resume/completion is deferred to the authorized Sprint 11.5 cohort if it does not arise naturally beforehand.
- Suspension/session revocation: production audit evidence records successful suspension/activation. Suspension bans the Auth user and protected learning functions validate an active profile, non-banned user, and live auth session through `service_validate_active_session`.
- Privacy preferences: production audit evidence and persisted preference rows confirm the workflow has executed successfully. Analytics/research opt-in remains distinct from participant authorization.
- Deletion workflow: production evidence includes request, approval, cancellation, and completed student erasure. No new irreversible deletion was performed solely for Sprint 11 closure.

## 11G — Mathematics placeholder and subject isolation

**Disposition: PASS for Sprint 11 technical handoff with one explicit rendered-QA limitation.**

Verified:

- the prepared QA learner still has simultaneous active Physics 7 and Mathematics 7 entitlements;
- course navigation is derived from active class memberships;
- Physics 7 routes to the Physics workspace;
- Mathematics 7 routes to the generic `course.html?course=...` workspace;
- the generic course page invokes only `get-student-classes`;
- it does not invoke Physics Diagnostic, Practice, Mastery, Progress, recommendation, item, session, or learner-evidence APIs;
- prior authenticated evidence confirmed the two-subject Home and the Physics route.

Limitation:

- the Mathematics placeholder was **not re-rendered in an authenticated session on 2026-09-20** because the saved browser profile no longer contained an authenticated learner session and no credentials were available through the browser vault.
- This is an accepted technical-handoff tooling limitation, **not a claim of a current rendered PASS**.

## 11H — visual containment

**Disposition: PASS for Sprint 11 technical handoff with one explicit authenticated-render limitation.**

Verified:

- shared containment source rules remain present across role surfaces: bounded widths, `min-width: 0`, wrapping, responsive grids, and internal card/control spacing;
- prior authenticated learner evidence remains valid for the learner Home, Physics and Progress surfaces;
- prior two-subject Home evidence remains retained;
- live production rendering on 2026-09-20 found no clipping, overlap, broken Armenian wrapping, horizontal overflow, or escaping controls on:
  - teacher login surface;
  - admin login surface;
  - content-admin login surface.

Limitation:

- authenticated internal Mathematics/teacher/admin/content views were not rerun because no reusable authenticated browser session was available.
- This is recorded as an accepted tooling limitation, not as a current authenticated rendered PASS.

## Production and deployment observation

The production application was reachable and rendered successfully during the 2026-09-20 QA checks.

The connected Vercel integration did not expose a team context in this session, so deployment metadata could not be independently queried through the Vercel connector. No contrary production failure was observed.

## Known advisories accepted for handoff

These are **not classified as Sprint 11 technical handoff blockers**, but remain open and must not be forgotten:

1. `public.item_curriculum_scopes` has RLS enabled with no policy.
2. Supabase leaked-password protection is disabled.
3. Supabase performance lint reports unindexed foreign keys, RLS init-plan opportunities, multiple permissive policies, and unused indexes.
4. External Physics SME approval remains pending and continues to block production promotion by design.
5. The reusable authenticated browser context used in earlier QA is no longer available.

These items should be addressed according to their later security/production-hardening gates rather than by reopening Sprint 11 architecture.

## Safe tester handoff conditions

After Sprint 11 closure, another person may use the platform for **informal QA/usability testing** provided that:

- testing uses normal application flows and does not bypass release, role, or mastery gates;
- QA activity is not represented as formal pilot or calibration evidence;
- formal evidence is counted only after Sprint 11.5 participation authorization and cohort enrollment gates pass;
- if the tester is a minor, any applicable participant/guardian authorization remains a Sprint 11.5 requirement for formal pilot evidence;
- defects found during informal testing are recorded and triaged without silently changing historical evidence;
- the target release and its provenance remain explicit.

## Sprint 11 closure

The technical handoff criteria are satisfied:

- 11F residuals — passed/dispositioned;
- 11G isolation — passed/dispositioned;
- 11H containment — passed/dispositioned;
- standards/source baseline — complete;
- current-standard reconciliation — complete;
- curriculum release/version/provenance controls — complete;
- evidence classification and fail-closed pilot governance — intact;
- no critical unresolved defect identified that prevents informal tester handoff;
- accepted limitations and non-claims are documented here.

**Sprint 11 can be marked ✅ Complete for technical handoff readiness.**

The next formal phase is **Sprint 11.5 — Controlled External Tester Pilot**.
