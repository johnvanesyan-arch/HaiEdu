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
| 15B.12A | New student context resolver, prospective policy parser and protected read-only endpoint | Complete; PR/main checks and exact production revision verified |
| 15B.12B | Authoritative immutable policy bindings; exact enrollment selection at session insert; release/unit skill scope; pool/form coverage; baseline and session resume queries | Complete and deployed; implementation PR/main checks and database preservation verified |
| 15B.12C | Session start/item/answer/mastery/help/remediation; exposure, readiness, review/retry lifecycle and recommendation telemetry; explicit legacy compatibility mapping; audit every importing deployed function | Complete and deployed; all affected bundles, SQL/source/history and release checks verified |
| 15B.12D | Student course navigation, dashboards/status/instructions; teacher and school analytics and historical provenance | Complete and deployed; release checks, runtime parity and existing two-school acceptance verified |
| 15B.12E | Full isolated two-unit/two-subject acceptance; deployed parity and authenticated multi-context acceptance once a second authorized release exists | Pending |

The initial audited coupled consumers are `start-learning-session`, `get-student-dashboard`, `get-mastery-check-status`, `get-session-item`, `submit-answer`, `submit-mastery-answer`, `get-remediation-help`, `get-chapter-mastery-lifecycle`, course access, assessment integrity, model/runtime bindings, lifecycle/session RPCs, recommendation telemetry, `student-courses.js`, `mastery.js`, and teacher/school evidence consumers. The inventory must be extended by import tracing in each migration slice. Neither this foundation nor its tests establish platform-wide migration completion.

## Product decisions and content work

Chapter II's 16-question assessments, 192-question total and mandatory/additional/supporting scoring remain proposals. No count, pass criterion, readiness rule or new subject release has been approved by this implementation. Existing learner criteria stay in force until their explicitly scoped policy is bound without changing historical evidence.

Question finalization across **all subjects, grades, chapters and assessment modes** must include relevant source-textbook illustrations under the [platform-wide illustration requirement](question-illustration-policy.md).

## Validation and release boundaries

53 focused executable tests cover authorized context, two chapters, two subjects, reciprocal school ownership, ended/future enrollment, student/teacher suspension, revoked subject authorization, class/year/programme/release mismatches, frozen labels, blueprint unit isolation, missing/invalid policies, unequal skill allocations, authentication/role failures, revocation during a pending context read and no content/evidence reads or writes. They use isolated in-memory Supabase/Auth query doubles; they are not live authenticated or PostgreSQL acceptance.

[PR #127](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/127) merged as `1de1a4b3d322816f30d8ce2d46ad1888729e42ae`. PR CI #1188 passed 1,043 Node tests, 22 native Chromium tests, both PostgreSQL jobs and the aggregate Platform release checks. GitHub's hosted-runner incident blocked the original main/evidence checks. The owner cancelled and deleted runs #1189, #1190 and #1191; their provider errors are retained in the captured evidence. After GitHub recovery, [evidence CI #1192, attempt 2](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/37368399063) passed all required jobs on `43ee0f954099b9ccdceb99de72e3acc10ed6419b`: 1,043 Node tests, the retained successful 22-test native Chromium result, both PostgreSQL jobs and the aggregate check. The persistent Vercel GitHub Platform release checks setting was separately reverified as Production / Blocking on 2026-10-06. Evidence PR #128 merged as `f07af23aafabb648414aa9626611de11ef6cc3e8`; main CI #1194 passed all five required jobs and production deployment `dpl_FM4sxZzsXkvwZFcnWHo6dUp8ctth` served that exact revision, verified through alias/source metadata and HTTP 200 release.json. This closes 15B.12A; the earlier incident record remains historical.

`get-learning-context` v1 is ACTIVE with JWT verification enabled. All five deployed files match the reviewed repository source exactly. Live OPTIONS boot/preflight returns HTTP 200 and `ok`; a signed-out POST receives HTTP 401 at the JWT gateway. At the 2026-10-05 deployment checkpoint, all 18 content/release inventory counts and checksums and baseline advisor counts were unchanged. [Captured deployment evidence](evidence/sprint-15b12a-release-20261005.json).

The only runtime importer of the new modules is the new endpoint. Existing deployed consumers are intentionally not changed in 15B.12A. No new frontend behavior was deployed. The isolated tests do not replace real authenticated student acceptance; live second-release switching and full consumer migration remain open.

## 15B.12B closure — 2026-10-06

The authoritative database foundation is complete and deployed through PR #129. Immutable policy/skill bindings and commit-time exact enrollment authorization are validated against governed release/unit scope. Diagnostic/practice headers and assignments commit atomically. Governed lifetime baselines use frozen programme/unit identity across releases and years, so reused chapter labels and later blueprint reassignment cannot mix evidence. Legacy records retain their provenance and need explicit mapping before new-engine consumption.

PR CI #1199 and main CI #1200 passed 1,125 Node checks, 22 native Chromium checks, both PostgreSQL jobs and the aggregate release check. Sixteen PostgreSQL 17.6 race cases passed. Production readback verifies all ten function bodies, RLS/privileges, zero seeded bindings and unchanged counts/checksums across 30 existing tables. No Edge, dashboard, assessment criterion, model parameter or release gate is switched in this slice. [Implementation, consumer boundary and deployment evidence](sprint-15b12b-policy-session-bindings.md).

## 15B.12C closure — 2026-10-06

Shared learning APIs now consume explicit enrollment/release/unit selectors and authoritative policies through atomic delivery, scoring, authored help, evidence, lifecycle review/retry and recommendation operations. Existing unconfigured clients use an immutable seven-blueprint legacy mapping; history and current learner criteria are preserved. All eleven importing Edge bundles and their 85 runtime files were deployed and read back exactly.

PR #131 and independent main CI #1209 passed all five jobs, including 1,164 Node and 22 native Chromium checks. Twenty-four added PostgreSQL 17.6 runtime races passed. Production migration source/function privileges, the appended runtime build and unchanged content/learner history were verified. Existing authenticated two-school analytics and action workflows passed 10/10 and 143/143 on the merged frontend SHA. [Implementation and deployment evidence](sprint-15b12c-learning-runtime.md). 15B.12D navigation/dashboards/analytics is now complete; 15B.12E and a second authorized release remain required for live multi-context learner acceptance. No Chapter II assessment policy or release is activated.

## 15B.12D closure — 2026-10-06

Student navigation resolves exact server-authorized enrollment/release/chapter identities and derives status, instructions, counts and available actions from governed policies. Teacher, School Admin and Master Admin evidence retains original context and scoring contracts; authorized closed-year/ended-assignment history is read-only and still requires current access. The registered legacy extension preserves existing learner criteria.

PRs #133–#135 are merged. Final PR CI #1222 and independent main CI #1223 passed all five jobs (1,207 Node, 30 native Chromium and both PostgreSQL checks). Five added PostgreSQL 17.6 dashboard/context races passed. SQL body/privilege readback, all six affected Edge bundles, all 38 deployed files and the appended runtime build match the reviewed implementation. All 33 checked content/model/learner-history inventories and every older build are unchanged. Production served the exact implementation main SHA, and the persistent Production / Blocking setting was separately verified. Authenticated two-school analytics and actions passed 10/10 and 143/143, with 54/54 read isolation before and after and complete disposable-resource cleanup. Earlier dashboard timeout failures and their fixes are retained in the evidence.

[Implementation and verification boundaries](sprint-15b12d-navigation-analytics.md) · [Deployment evidence](evidence/sprint-15b12d-release-20261006.json). 15B.12E is next; its live multi-context learner gate requires a second authorized release. Chapter II and prospective criteria remain inactive/unconfigured.
