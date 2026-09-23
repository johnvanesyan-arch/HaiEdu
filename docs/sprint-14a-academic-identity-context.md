# Sprint 14A — Academic identity and context foundation

**Status:** Deployed foundation, 2026-09-23. This is not the Sprint 14 tenant release gate.

## Identity and access contract

- `profiles.id` remains the global person ID. `institutional_memberships` records time-bounded school roles.
- `academic_years` are school-scoped. `classes.academic_year_id` is nullable only for historical/unscoped classes. A teacher assignment binds one school, academic year, class, teacher membership, and canonical subject programme; active periods cannot overlap for the same teacher/class/programme.
- New tables have RLS enabled without ordinary-client grants or policies. Server code uses service-role access only after authenticating a live session and validating the teacher's membership and assignment.
- `get-teacher-academic-context` takes `assignmentId`, `curriculumReleaseId`, and `unitId` as UUIDs. It derives school, class, academic year, programme, subject, grade, and unit from persisted rows, verifies current teacher assignment and membership, and rejects cross-school, cross-programme, inactive, legacy, and forged selections. The endpoint returns metadata only, not learner evidence. A URL can persist these IDs but cannot grant access.
- Canonical national releases and units remain separate from institution data. The context resolver permits pilot or production releases; it rejects draft, legacy, superseded, and retired releases.

## Temporary legacy boundary

- `get-teacher-dashboard`, `get-teacher-student`, `manage-teacher-class`, and `join-class` handle only `classes.school_id IS NULL`. The first two still show legacy Chapter I evidence under the prior rules.
- Migration 0082 rejects a legacy `class_memberships` insert/update for a school-scoped class and rejects rewriting the school/year of an existing class. This is a temporary deny gate until controlled enrollment and historical adjudication are implemented.
- Current learner functions and the shared course-entitlement runtime were not redeployed in this slice. No institutional class can acquire a legacy class membership, so that path cannot confer access to one.
- Five existing classes and four class memberships remain unbound. No school, academic year, institutional membership, assignment, or audit fixture is persisted.

## Verification

- Rollback-only production probes: two-school assignment mismatch and overlapping active teacher memberships rejected; service-role audit writes succeeded; scoped class enrollment and legacy class identity rewrite rejected; unscoped class enrollment still succeeded. All fixture rows rolled back.
- 49 focused tests pass across context resolution, second school/subject, read-only API, legacy boundaries, and teacher role checks.
- GitHub CI [#715](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/35904145968) and [#716](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/35904273320) passed.
- Supabase active versions: academic context v1, teacher dashboard v7, teacher student v7, class manager v4, join class v4. New tables are inaccessible to `anon` and ordinary `authenticated` roles; `service_role` lacks TRUNCATE. Advisor reports RLS-with-no-policy on the new tables as informational; this is intentional deny-by-default.

## Remaining gates

1. Controlled school enrollment, invitations, administrator delegation, time-bounded student memberships, and revocation. Replace the temporary migration 0082 blocker only after the new workflow has cross-school denial tests.
2. Teacher selector and analytics queries must consume authorized context, including class, academic year, programme, release, and unit. Existing `PHY7-U01` and student-global mastery queries cannot be treated as institution-scoped evidence.
3. Stamp new learning sessions with authorized class/institution context. Preserve existing sessions as unbound historical evidence; do not infer a school from today's roster.
4. Run authenticated teacher/student/admin two-school, two-chapter browser/API tests and verify rollover/handover and current-session denial. No production school onboarding before this release gate.

The detailed [Sprint 14 plan](https://app.notion.com/p/3e4355a472bf81bca43bd8557727ca7f) tracks subsequent slices.
