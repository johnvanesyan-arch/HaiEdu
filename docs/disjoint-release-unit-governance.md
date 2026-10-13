# Independently released chapters

The Chapter II release authorization must preserve Chapter I's active release,
two unfinished sessions and existing evidence. A combined successor would hide
Chapter I's release-scoped progress and legacy navigation. The draft Chapter II
candidate is therefore narrowed to Chapter II, while the original Chapter I
release remains active. This is release packaging, not evidence migration.

## Shared contract

`20261013101644_disjoint_curriculum_release_units.sql` replaces the one-active-
release-per-programme index with a private, trigger-maintained unique claim for
each unit. Units belong to a programme; every release-unit attachment must match
that programme. Different chapters can have separate pilot/production releases.
Two active releases cannot claim the same unit. Concurrent conflicting activations
are arbitrated by the claim table's primary key, not a read-before-write check.

The six existing pilot gates remain required; production additionally requires
`external_sme_approved`. The migration corrects the existing production-only
array append expression so this seventh gate can be evaluated. Direct active
inserts are rejected: build a draft and pass the existing activation trigger.
This migration does not pass any gate or activate any release.

Governance writes to release headers, release snapshots and unit programme
assignments require **READ COMMITTED**. An older transaction snapshot fails with
`curriculum_release_governance_requires_read_committed`; there is no automatic
retry. This prevents a concurrent chapter attachment from being invisible to
activation or programme reassignment. This restriction is for catalogue
governance writes, not learner transactions or ordinary reads.

Snapshot writes lock both source and destination release headers, including
attempted moves from an activated release into a draft. Activated release scope,
identity, source snapshot and content fingerprint cannot be rewritten, deleted
or reopened as draft. Status retirement/supersession remains supported and frees
the unit claim transactionally. Notes and operational dates retain their prior
contracts. The private claims table has RLS enabled and no API-role privileges;
only internal triggers maintain it. Existing public-table RLS remains in force.

## Consumer audit

| Consumer | Result |
|---|---|
| `resolve_active_curriculum_release`, legacy session/attempt/exposure provenance triggers | Already constrained to a unit code or item scope. Chapter I still resolves to its unchanged original release. |
| `lock_student_learning_context`, `validate_assessment_policy_v1`, `service_start_governed_session_atomic` | Explicit enrollment, programme, release and unit identity; no programme singleton selection. |
| `scoped_chapter_baseline`, model/runtime bindings, mastery state, attempts and exposure | Remain on their original release identities. No history, baseline or mastery rows copied. |
| `stamp_learning_session_academic_context_14c` | Joins the session's exact release to the enrollment programme, without selecting the programme's latest release. |
| `service_student_learning_navigation`, `service_student_learning_dashboard` | Enumerate active release/unit pairs and authorize each exact context. Chapter I stays on its registered legacy adapter; Chapter II uses governed policies. |
| Edge `student-learning-context.mjs`, `academic-context.ts`, `get-student-classes`, governed learning handlers | Resolve explicit release IDs; no singleton assumption. No Edge source change for coexistence. |
| `institutional-teacher-dashboard.ts`, `get-school-performance-analytics` | Enumerate release/unit options and query evidence by selected identities; both active chapters remain separately selectable. |
| `get-content-quality-dashboard` | Enumerates releases and gates; no singleton assumption. |
| Browser `learning-navigation.mjs`, `student-courses.js`, `multi-subject-home.js` | Group courses by enrollment plus programme; preserve each chapter's own release ID. Do not label a multi-release course with one release number. |
| Browser `course-page.js` | Exact context remains authoritative. Chapter links can cross releases within the same enrolled programme, without carrying an in-progress learning action into another chapter. |
| Teacher chapter selector, school analytics filters and learning player | Already carry exact release/unit IDs; no shared code change needed. |

The current governed prerequisite recommendation query only considers prerequisite
skills present in the session's release. It does not resolve cross-release
prerequisites. Chapter II's U01 prerequisite relation remains curriculum metadata;
it is not an additional readiness block. Removing Chapter I's copied skill
snapshots from the narrowed draft avoids recommending an out-of-scope skill using
nonexistent Chapter II-release evidence. No Chapter I mastery evidence is copied.

## Verification scope

`tests/release-unit-scope.test.mjs` executes the real migration and gate function
in isolated PostgreSQL-compatible PGlite. It checks disjoint/overlapping scopes,
all pilot gates and the production SME gate, immutable snapshot moves, programme
consistency, direct active inserts, API-role permissions, representative
content-admin/student RLS writes, and unsupported isolation failures.

`tests/release-unit-concurrency.py` uses independent connections in disposable
PostgreSQL, covering overlapping/disjoint activation, rollback, retirement,
snapshot edits racing activation and stale-snapshot governance rejection. It is
included in the PostgreSQL 17 CI gate; isolated tests do not use production
credentials. Browser regressions cover a single course with chapters on separate
releases and exact release identity after switching.

Deployment acceptance must separately verify actual release inventories and the
intended frontend commit. Test fixtures are not live learner acceptance or
independent subject review.
