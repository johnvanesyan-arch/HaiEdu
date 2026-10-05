# Sprint 15B.12 — Authorized learning context and assessment policy

Started: 2026-10-05. Overall status: in progress. First bounded slice: **15B.12A — read-only context and policy contract foundation**.

## Confirmed starting checkpoint

Production readback confirms all 43 Chapter II misconception definitions are active, including the 40 John reviewed and approved; none remain draft. This closes the human definition-review step only. Question, guide, SME, assessment and curriculum-release decisions remain independent. Earlier inventory evidence is retained as historical evidence.

## 15B.12A implementation

The new `get-learning-context` Edge Function accepts an explicit institutional enrollment, curriculum release, unit and assessment mode. It verifies the JWT against Auth, the active live session and active student role, then resolves the entire context from server-owned records. The selector cannot supply a student, school, class, policy or programme override.

The subject-neutral resolver verifies student ownership, enrollment/membership dates and status, class/year/school consistency, active teacher assignment and membership, teacher account and subject authorization, published subject/programme, programme/release dates, exact release-unit membership and frozen unit metadata. It rejects draft, retired, expired, mismatched and unauthorized contexts without disclosing which record failed. Multiple matching subject authorizations fail closed rather than picking arbitrarily. No legacy-class fallback or subject/grade default is added.

Blueprint lookup includes **release + unit + purpose**. An active version is selected deterministically; missing/unpublished/ambiguous blueprints fail closed. No question bodies, answers or protected item memberships are returned.

The prospective `haiedu-assessment-policy-v1` contract is read from the immutable blueprint's `configuration_snapshot.assessmentPolicy`. It declares exact programme/release/unit/mode scope, version, counts, registered response/scoring capabilities, model/lifecycle version references, hint/baseline rules and explicit per-skill delivery/pass counts. Unequal allocations are supported; additional/supporting skills are not automatically made mandatory pass conditions. The one-baseline rule is retained. The selected-response strategy is an explicitly registered capability of this contract version; unsupported capabilities require a new governed extension, never a subject branch.

An absent contract returns `assessmentPolicyStatus: unconfigured`. A structurally valid declared contract returns `declared`, **not permission to launch**. This slice does not validate referenced model/lifecycle rows, complete pool coverage, per-unit skill allocation, scoring comparability or readiness. Those checks belong to 15B.12B's authoritative policy binding and session transactions. No existing blueprint is rewritten or backfilled. Existing Chapter I blueprints therefore remain unconfigured for the prospective contract while their current runtime remains unchanged.

This endpoint is read-only and cannot create sessions, assessments, pools, exposure or learner evidence. It must not be reused as a commit-time write authorization: mutable institutional status and live-session state must be revalidated atomically by the future session-start transaction.

## Consumer migration sequence

| Slice | Consumers and required work | Status |
|---|---|---|
| 15B.12A | New student context resolver, prospective policy parser and protected read-only endpoint | Implemented; release verification pending |
| 15B.12B | Authoritative immutable policy bindings; exact enrollment selection at session insert; release/unit skill scope; pool/form coverage; baseline and session resume queries | Next |
| 15B.12C | Session start/item/answer/mastery/help/remediation; exposure, readiness, review/retry lifecycle and recommendation telemetry; audit every importing deployed function | Pending |
| 15B.12D | Student course navigation, dashboards/status/instructions; teacher and school analytics and historical provenance | Pending |
| 15B.12E | Full isolated two-unit/two-subject acceptance; deployed parity and authenticated multi-context acceptance once a second authorized release exists | Pending |

The initial audited coupled consumers are `start-learning-session`, `get-student-dashboard`, `get-mastery-check-status`, `get-session-item`, `submit-answer`, `submit-mastery-answer`, `get-remediation-help`, `get-chapter-mastery-lifecycle`, course access, assessment integrity, model/runtime bindings, lifecycle/session RPCs, recommendation telemetry, `student-courses.js`, `mastery.js`, and teacher/school evidence consumers. The inventory must be extended by import tracing in each migration slice. Neither this foundation nor its tests establish platform-wide migration completion.

## Product decisions and content work

Chapter II's 16-question assessments, 192-question total and mandatory/additional/supporting scoring remain proposals. No count, pass criterion, readiness rule or new subject release has been approved by this implementation. Existing learner criteria stay in force until their explicitly scoped policy is bound without changing historical evidence.

Question finalization across **all subjects, grades, chapters and assessment modes** must include relevant source-textbook illustrations under the [platform-wide illustration requirement](question-illustration-policy.md).

## Validation and release boundaries

53 focused executable tests cover authorized context, two chapters, two subjects, reciprocal school ownership, ended/future enrollment, student/teacher suspension, revoked subject authorization, class/year/programme/release mismatches, frozen labels, blueprint unit isolation, missing/invalid policies, unequal skill allocations, authentication/role failures, revocation during a pending context read and no content/evidence reads or writes. They use isolated in-memory Supabase/Auth query doubles; they are not live authenticated or PostgreSQL acceptance.

Required before completion: full CI, existing native Chromium and PostgreSQL jobs, aggregate Platform release checks; deploy the new endpoint with JWT verification and all dependencies, read back all files, verify signed-out denial and compare content/release preservation evidence. The only runtime importer of the new modules is the new endpoint. Existing deployed consumers are intentionally not changed in 15B.12A. Live second-release switching remains open.
