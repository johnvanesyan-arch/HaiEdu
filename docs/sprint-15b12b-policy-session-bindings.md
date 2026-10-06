# Sprint 15B.12B — immutable policy binding and transactional session context

Started 2026-10-06. Implementation prepared; reviewed CI and production migration verification are required before closure.

The shared database foundation uses explicit enrollment, programme, release, unit and blueprint identities. It adds no subject, grade, question-count, language or scoring default. It does not activate Chapter II or change an existing learner's assessment rules.

## Governed binding

`assessment_policy_bindings` is an append-only, service-readable ledger. `service_bind_assessment_policy` obtains the declaration from the published blueprint; its caller cannot supply policy values. Binding is idempotent only while the frozen declaration and skill scope match. Published blueprint/release status, exact scope, registered v1 response/scoring capabilities, count allocations, released skills, primary item curriculum scope, active pool membership, published item versions and every active diagnostic form are validated inside the transaction.

The binding freezes both the policy declaration and the eligible blueprint's released skill IDs. Scope is derived from `item_curriculum_scopes`, never a skill-code prefix. All pass requirements remain explicit: an assessed supporting skill is not automatically a mandatory pass condition. The fingerprint is an accidental-change checksum, not a signature; database privileges and immutability triggers provide authority.

The referenced immutable model must be a baseline or approved configuration for the exact release. Its `configuration.assessmentPolicyContracts` array must explicitly contain the complete policy declaration. Merely referencing an existing model is insufficient to establish compatible delivery/scoring rules. The referenced lifecycle version must be active/effective; review length must agree with its configured length. This adds a governed compatibility contract without rewriting model parameters or existing snapshots.

The registered `haiedu-assessment-policy-v1` extension supports selected-response capabilities only. Unsupported response/scoring capabilities require a governed contract extension. The accepted one-baseline and diagnostic-before-practice/review rules remain enforced. The existing bounded session schema's maximum is checked as a storage constraint, not used as a default assessment length.

## Atomic enrollment and session creation

`service_start_governed_session_atomic` is executable by `service_role` only. A future authenticated Edge consumer must obtain student identity and Auth session ID from an Auth-verified JWT, never from body overrides. Anonymous/authenticated database clients cannot invoke it or the binding operation. Private authorization helpers are not separate preflight RPCs.

The transaction verifies and locks the exact student enrollment, student and teacher memberships/profiles, teaching assignment and subject authorization, school/class/year identities, published subject/programme, programme/release dates, release-unit membership and live Auth user/session. Time is checked after lock waits using the database clock in UTC. Shared teacher-offboarding advisory locks coordinate with the existing exclusive offboarding operation without serializing unrelated student starts. Membership locks precede enrollment locks to match existing membership termination.

The header records the selected enrollment and server-derived school/year/class/teacher/programme, exact unit, immutable policy binding, model/lifecycle version and runtime build. The Auth session origin is retained as audit provenance without a foreign key that would delete history on sign-out. New bindings and provenance cannot be backfilled onto old sessions. Selected item/pool/form memberships are rechecked while locked; the header and complete assignment set commit or roll back together.

Concurrent starts in one context resume one session. Resume revalidates current authorization and returns the existing session's original binding, including when a later blueprint version is selected or retired. It does not restamp history with a new policy. A legacy active session is explicitly returned as `legacySession`; the 12C consumer must retain its existing runtime contract.

## Baselines and slice boundary

The existing lifetime chapter diagnostic unique indexes remain unchanged. New scoped prerequisite queries require the learner's exact release and blueprint unit. A diagnostic for another chapter or subject cannot unlock practice. A completed baseline regardless of score unlocks its chapter. An older-release baseline without a governed compatibility mapping produces `diagnostic_baseline_requires_governed_mapping`; the new path does not force or manufacture a second diagnostic.

This slice implements diagnostic/practice transaction machinery. Mastery/review bindings can be validated, but the new start RPC rejects those modes with `governed_mode_runtime_pending` until 15B.12C migrates their readiness, attempt allocation and review-cycle lifecycle together. Existing mastery/review RPCs continue unchanged. This is the approved B/C consumer boundary, not a new learner restriction.

No Edge consumer is switched to the new path in 12B, no shared Edge import changes, and no dashboard/navigation changes. Existing blueprints lack the prospective declaration and existing models lack the explicit compatibility declaration; zero production policy bindings are seeded. No content, release, pool/form, model, lifecycle or learner evidence row is rewritten. 12C connects and migrates the learning consumers; 12D migrates dashboards/analytics; 12E retains deployed authenticated multi-context acceptance after a second authorized release exists.

## Verification

77 executable PGlite/PostgreSQL policy and session tests cover three chapters across two programmes, exact enrollment ownership, reciprocal subject/school boundaries, incomplete forms/pools, version changes, unsupported contracts, explicit unequal allocations, optional supporting-skill pass requirements, model/lifecycle compatibility, live-session revocation, resume provenance, permissions, atomic rollback and legacy preservation. These are isolated synthetic fixtures, not authenticated production learner acceptance.

The PostgreSQL 17 CI job adds 15 independent-connection cases: duplicate starts, rollback, enrollment/membership/teacher/student/year/Auth revocation, existing teacher offboarding, termination after a successful start, item retirement, form removal, expiry during a lock wait and independent chapter starts. Existing CI jobs and the aggregate Platform release checks are retained.

Release closure requires all reviewed PR/main checks, production migration readback, function/table privilege checks, before/after content and learner-history inventories, advisor comparison and roadmap reconciliation. Production frontend revision and persistent blocking deployment checks are verified separately from CI success. Final evidence is recorded in `docs/evidence/sprint-15b12b-release-20261006.json`.
