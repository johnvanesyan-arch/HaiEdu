# Sprint 14B — Teacher offboarding and final school-administrator protection

Status: implementation prepared on 2026-09-27; merge, concurrency CI and production verification pending.

## Bounded behavior

An active school administrator can preview and confirm permanent teacher offboarding in their exact school. The preview lists active assignments, subject grants, unused student invitations and unused join codes. A revision identifies the previewed set; a changed set requires a new confirmation. Active and archived teacher memberships are supported.

One transaction ends the teacher membership and active assignments, revokes active subject grants and unused student invitations/join codes, and records the acting administrator and impact in the immutable academic event ledger. The existing membership-termination RPC routes teachers through the same transaction. This is institutional offboarding, not account erasure: other-school memberships, the teacher's global account, classes, accepted enrolments and learning evidence remain intact. Used invitations/codes retain their history. Expired but unused credentials are also withdrawn.

Ending the active teacher assignment may interrupt class learning access until an authorized replacement assignment exists. The confirmation explicitly states this. Automatic handover and academic-year rollover are not implemented here. Offboarded memberships appear separately from archived teachers and cannot be restored using the archive/restore button.

## Closure guards

Database triggers reject removal of the final effective school administrator through membership status/date/school/person/role changes, membership deletion, profile suspension/demotion or profile deletion. A successor must have a current active school-admin membership in the same school and an active school-admin profile. Future, expired, suspended, archived and wrong-role records do not count. Membership and profile guards share a school advisory transaction lock; multi-school profile closure checks use a stable school order. These mutation guards do not automatically renew naturally expiring memberships.

Account suspension updates the guarded profile before banning Auth. A guard rejection therefore cannot ban the last administrator. If Auth synchronization fails after profile suspension, the profile stays suspended, the API returns an explicit retryable partial result, and a failed synchronization audit event is recorded. Activation unbans first and only then activates the profile. Existing master-admin protection and MFA requirements remain enforced.

Invitation/code issue and redemption acquire the same teacher-membership advisory lock before credential row locks. This closes the race where a credential could be created or redeemed after offboarding had scanned outstanding invitations.

## Verification

- `node --test tests/sprint-14b-offboarding.test.mjs`: actual migration executed in PGlite against synthetic relational fixtures; 24 tests passed locally.
- `node --test tests/sprint-14b-offboarding-api.test.mjs tests/sprint-14b-termination-api.test.mjs`: 9 tests passed locally for authentication, actor derivation, validation, stale revision errors, final-admin rejection before Auth, partial Auth failure/retry, activation order, cancellation and school-context changes.
- `tests/sprint-14b-offboarding-concurrency.py`: isolated PostgreSQL tests for three competing administrator-removal paths, five offboarding-versus-credential paths, and redemption-first evidence preservation. Runs in the dedicated CI job; the local execution environment cannot switch OS users to start PostgreSQL.
- Browser script syntax and whitespace checks passed locally.

The relational fixture isolates this migration and is not a substitute for full production schema or authenticated UI QA. No real accounts are offboarded and no invitations are sent for these tests.

## Deployment sequence and limits

1. Require full CI and PostgreSQL concurrency job success.
2. Apply `20260927193107_sprint_14b_teacher_offboarding_closure.sql`.
3. Deploy `manage-school-teacher`, `manage-institutional-membership` and `manage-admin-account` with JWT verification and their existing shared authentication helper.
4. Merge the frontend change, verify production assets and read-only database/function state, then update this checkpoint.

The additive migration rewrites functions and installs guards; it does not backfill or terminate production memberships. If an API/frontend rollback is needed, preserve the database guards and full termination behavior. Do not weaken them merely to restore an older UI.

Sprint 14 remains open for authenticated two-school mutual denial, authenticated teacher navigation/rename execution, multi-unit/context switching after a second authorized release, and separately gated 14D school-wide analytics. This checkpoint does not promote curriculum content or authorize institutional rollout.
