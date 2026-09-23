# Sprint 14B — Targeted institutional enrollment foundation

**Status:** Backend slice deployed 2026-09-23. No school, invitation, or institutional enrollment has been persisted. School onboarding and tenant release remain gated.

## Flow

1. A school admin with an active school membership can issue a targeted invitation for an existing active student or teacher account. A teacher can issue a student class invitation only for an active assignment in that school. The recipient can be identified by account UUID or existing-account email; email lookup is service-only and no email copy is stored in the public invitation table.
2. The server generates a 256-bit random token. Only its SHA-256 digest is stored. The one-time plaintext token is returned to the issuer. Invitations expire within seven days (default 48 hours), name one recipient and role, and may be revoked before use.
3. The recipient signs in with the named account. Redemption locks the invitation row, revalidates the issuer, class, year and recipient, then creates or reuses an active institutional membership and, for a class invitation, creates a separate time-aware institutional class enrollment. Consumption and enrollment are one transaction.
4. These enrollments do not enter legacy `class_memberships`. Migration 0082 still blocks that table for institution-scoped classes, so the current Physics 7 learner runtime cannot treat this new membership as course entitlement.

## Authorization boundaries

- `service_issue_institutional_invitation_14b`, `service_redeem_institutional_invitation_14b`, `service_revoke_institutional_invitation_14b`, and `service_lookup_invitee_by_email_14b` are executable only by `service_role`. The Edge Functions authenticate a live session, and the database functions enforce the school and assignment boundary.
- `institutional_invitations` and `institutional_class_enrollments` have RLS and no ordinary client grants/policies. Even `service_role` has no direct INSERT/UPDATE/DELETE/TRUNCATE on these two tables; their mutations occur through the controlled database functions. Invitation and enrollment mutations enter the protected academic identity audit log.
- School A actors cannot issue for School B through the DB function. A copied token cannot be redeemed by a different account. Concurrent attempts serialize on the invitation row; consumed and revoked tokens cannot be reused.
- School registration tokens for new accounts, school-admin bootstrap/delegation, teacher/class UI, membership termination, and institutional course entitlement are outside this bounded slice. A school admin must first be provisioned through a separate governed bootstrap.

## Evidence

- Migrations [0083](https://github.com/johnvanesyan-arch/armenian-mastery-platform/blob/main/supabase/migrations/0083_sprint_14b_targeted_invitations.sql), [0084](https://github.com/johnvanesyan-arch/armenian-mastery-platform/blob/main/supabase/migrations/0084_sprint_14b_invitation_role_cast.sql), and [0085](https://github.com/johnvanesyan-arch/armenian-mastery-platform/blob/main/supabase/migrations/0085_sprint_14b_existing_account_email_lookup.sql) applied. 0084 corrected an enum/text comparison discovered by the first rollback probe.
- [Rollback probe](https://github.com/johnvanesyan-arch/armenian-mastery-platform/blob/main/tests/sprint-14b-invitation-probe.sql) passed for two schools, cross-school issuance denial, wrong-recipient denial, atomic redemption, single-use replay, teacher assignment, revocation, and no legacy membership. All fixture data rolled back.
- [Endpoint tests](https://github.com/johnvanesyan-arch/armenian-mastery-platform/blob/main/tests/sprint-14b-invitation-api.test.mjs) cover digest-only persistence, email lookup, input/role denial and redemption response. The broader focused regression is 54/54. GitHub CI [#728](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/35907870332) passed.
- Active Supabase functions: `manage-institutional-invitation` v2 and `redeem-institutional-invitation` v1, both with JWT gateway checks. Security advisor's no-policy information notices are intentional deny-by-default; no unindexed foreign-key findings on the new tables.

## Remaining Sprint 14B work

- Governed school and first school-admin bootstrap, invitation UI, account creation/roster provisioning for users without an account, membership/enrollment termination, and cross-role authenticated browser tests.
- Define whether a learner may hold simultaneous school memberships and how transfers affect institutional record visibility before production school onboarding.
- Wire institutional entitlements and session provenance only after class/programme evidence scoping in the subsequent academic-context slice. Do not remove migration 0082's legacy blocker until that end-to-end gate passes.
