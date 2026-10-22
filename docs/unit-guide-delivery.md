# Learner teaching-guide delivery

**Sprint 16.1C.18 · 2026-10-22 · Shared core capability, `unit-guides-v1`.**

John reports accepting all nine English Unit 1 guides and the writing package, including its rubric and workload proposal. That confirmation closes the material-review handoff. This slice does not repeat his review, inspect his approval rows or change any teaching content. The 200-question bank and existing source/audio evidence are reused.

## Learner experience

The shared course workspace has an **Ուղեցույցներ** (Guides) tab. Eligible learners can expand approved guides in the saved lesson order and read their explanations and worked examples. The content retains its reviewed language; navigation uses the existing Armenian platform interface. Native expandable sections support keyboard access and wrap on small screens.

Guides open after the unit's completed diagnostic baseline. Guide content is unavailable during an active Diagnostic or Mastery attempt in that programme and unit, including attempts in another enrollment or release. Loading, no published guides, required diagnostic, active assessment and retryable failure have explicit states. Merely opening or reading a guide records no completion, score or mastery evidence.

Changing the unit or account disposes the old view. Late responses cannot restore old content. Repeated focus events share one in-flight read; hiding the document clears rendered guides, and returning refetches current access. An ordinary same-account token refresh preserves the open view. These controls govern platform access; they cannot retract text a learner previously read or saved.

The capability is available to every governed programme through the same course page. No subject, grade, unit size or content language is hard-coded. **English remains inactive** until its separate qualification and release gates are satisfied; this change does not make the English unit available to learners.

## API and authorization

`POST get-unit-guides` accepts only UUID fields `enrollmentId`, `curriculumReleaseId` and `unitId`. The request limit is 2,048 bytes. The Edge function verifies the bearer token with server Auth, derives the real session identity, and checks the live session before and after its service RPC. Asserted identities, AAL fields and unknown request keys are rejected. Responses use `Cache-Control: no-store`.

`public.service_student_unit_guides` is an invoker wrapper around `private.student_unit_guides`; both have empty search paths and service-role-only execution. The private worker uses the existing exact student learning-context locks and checks: live account/session, active enrollment, school/year/class, teacher assignment and subject authority, published programme, and eligible pilot/production release. An inactive or mismatched release is denied.

Assessment-start advisory locks retain the existing legacy-then-governed order. Guide approval rows are locked while projecting content. The worker rechecks context and wall-clock validity after lock waits. Only approved `guide` records with `teaching-guide-v1`, a review timestamp and matching saved-QA fingerprint are returned. Results are ordered by `sequence_order`, `material_key`, then ID.

The response has `guidesVersion: "unit-guides-v1"`, `readOnly: true`, `availability` (`available`, `diagnostic_required` or `assessment_active`) and `guides`. Blocked reads contain an empty list. Each guide exposes only:

| Field | Meaning |
| --- | --- |
| `id`, `version` | Approved immutable material version |
| `sequenceOrder` | Saved lesson position |
| `schemaVersion` | `teaching-guide-v1` |
| `title`, `text`, `workedExample`, `locale` | Reviewed learner-facing content |

Review packages, source/comparison references, staff identities, writing models and arbitrary definition keys are excluded. The browser escapes all strings. The endpoint creates no content, review, exposure, assessment or learning records. Error categories are bounded: invalid request (400), missing/unverified authentication (401), denied learning context/session (403), and unavailable service (503).

## Evidence and deployment

The migration `20261022165640_sprint_16_1c_unit_guide_delivery.sql` and the three-file `get-unit-guides` v1 bundle are deployed. Exact readback matches both SQL function bodies and all three Edge files. Grants/search paths, JWT verification and a missing-context rejection are checked. The imported Auth helper is unchanged; no existing Edge consumer requires a new bundle.

Nine local SQL/Edge tests pass using synthetic fixtures. They cover two programmes and three units, baseline/assessment gates, current approval and retirement, private-field exclusion, exact authorization, malformed requests, direct-role denial and unchanged data after reads. Browser syntax, core parity, type checking, favicon coverage and computed production-QA trigger checks pass.

Required release CI includes three new native Chromium cases and four PostgreSQL concurrency races: assessment start, guide retirement, teacher-authority revocation and session expiry while waiting. Local Chromium installation and the local PostgreSQL launcher are unavailable in this environment, so those results must come from the required CI jobs. No VM substitute or production credentials are used. The aggregate `Platform release checks` retains all required jobs, and the existing production QA workflows retain their reviewed-main and designated-fixture guards.

[Machine-readable evidence](evidence/english-7-unit-01-guide-delivery-20261022.json) records the source/deployment and local checks. Final CI and Vercel outcomes are attached to the exact merged-source attestation in the [Notion sprint map](https://app.notion.com/p/3df355a472bf813585aac229c27f8f9c). The previously verified persistent production Deployment Check is unchanged; no fresh configuration verification or authenticated production learner acceptance is claimed.

## Next capability slice

Qualify the accepted complete bank's protected sources/forms and prepare the explicit English assessment/release contract. Preserve independent SME/form qualification, formal curriculum reconciliation, source/voice reuse and authenticated learner-release gates in [project status](project-status.md). The accepted workload figures remain planning estimates, not measured pilot results or assigned deadlines. Speaking stays classroom-assessed.
