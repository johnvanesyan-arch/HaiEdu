# Sprint 10 — Security, Privacy & Administration

## Objective

Make the Chapter I prototype safe enough to enter a controlled school-pilot preparation phase by adding explicit role administration, privacy controls, child-data minimization, account lifecycle controls, audit logging, deletion procedures, and stronger teacher/student access boundaries.

This sprint implements technical controls. It is **not** a legal-compliance certification and does not replace school agreements, parental/guardian consent where applicable, a formal privacy notice, data-processing agreements, incident procedures, or legal review before a real minor-student pilot.

## Roles

The existing `user_role` model remains:

- `student`
- `teacher`
- `content_admin`
- `admin`
- `parent` (reserved; no parent product workflow yet)

New role routing separates the operational consoles:

- student → learning interface
- teacher → `/teacher.html`
- content administrator → `/content.html`
- administrator → `/admin.html`

Role changes are admin-only, audited, cannot be performed on the acting administrator's own account, and cannot demote the last active administrator.

## Account status

`profiles.account_status` now supports:

- `active`
- `suspended`
- `deletion_pending`

Core RLS read policies require the current account to be active. Admin suspension also applies a Supabase Auth ban to prevent new sign-ins/refreshes. Direct browser access to protected Postgres data therefore remains constrained by RLS even if an old browser state exists.

### Residual JWT limitation

Supabase access tokens are stateless JWTs. Revoking sessions or banning an account cannot retroactively invalidate an already-issued access token until its expiry. Existing service-role Edge Functions created before Sprint 10 authenticate the JWT but do not yet all perform a second `profiles.account_status` check. This is a known residual window and must be closed before an institutional/public release by either:

1. adding active-account/session validation to every service-role Edge Function, or
2. validating `session_id` against `auth.sessions` for sensitive operations and configuring a suitably short access-token lifetime.

For the controlled pilot, admin/privacy endpoints added in this sprint check active account status, and RLS-protected direct data access checks it as well. This residual is explicitly tracked rather than treated as solved.

## Child-data minimization

The platform profile does not add fields for:

- date of birth
- home address
- phone number
- parent/guardian email
- government identifier

The application profile stores only the account role, optional display name, account status, and learning-related identifiers. Authentication email remains in Supabase Auth rather than being duplicated into the application profile.

The `/privacy.html` page shows the learner a simple inventory of their learning records rather than exposing raw database content.

## Privacy preferences

`privacy_preferences` stores explicit opt-in preferences for:

- optional product analytics
- optional research use

Both default to `false`.

These fields record preference only. They do not imply that a separate analytics/research pipeline is active. Any future research use still requires an approved purpose, governance process, appropriate notices/consent, and minimization.

## Self-service account controls

`/privacy.html` and the JWT-protected privacy Edge Functions support:

- viewing account role/status/email
- viewing a high-level personal data inventory
- updating an optional display name
- saving optional analytics/research preferences
- requesting account deletion
- cancelling a pending deletion request

Sensitive changes are written to `security_audit_log` without storing passwords or student answer content in the audit record.

## Administration console

`/admin.html` provides active administrators with:

- account inventory
- role changes
- suspend/reactivate controls
- deletion-request queue
- student deletion approval/rejection
- class-owner reassignment
- recent security/privacy audit events

The UI cannot change the current administrator's own role/status and the backend protects the last active administrator.

## Secure teacher/student access

Existing teacher authorization remains relationship-based: detailed student learning information is available only when the student belongs to a class owned by that teacher. Sprint 10 adds active-account gating to core RLS policies and keeps protected answer keys server-side.

The content-admin role is routed to the content console rather than to the student or teacher product.

## Audit coverage

Sprint 10 audits the following sensitive changes:

- privacy preference changes
- display-name changes
- deletion request/cancellation
- admin role changes
- admin account suspension/reactivation
- class ownership reassignment
- deletion rejection
- completed student-account erasure
- direct authenticated profile role/status changes through a database trigger

This is **security/action auditing**, not full read-access telemetry. Ordinary page views and every historical teacher workflow are not yet written to this log. Broader institutional audit requirements belong in production hardening.

## Student deletion procedure

A student deletion request follows this sequence:

1. student submits request;
2. administrator verifies the request in the deletion queue;
3. request enters `processing` and account becomes `deletion_pending`;
4. Auth account is blocked from normal sign-in;
5. service-role-only `erase_student_data(uuid)` removes the application profile and cascading learner records;
6. Supabase Auth user is hard-deleted;
7. deletion request is retained in sanitized form with its user references cleared by foreign-key behavior / workflow fields;
8. a sanitized audit event records completion and counts of erased record classes, not the erased learning content.

The erasure RPC refuses non-student accounts.

## Staff offboarding

Teacher/admin accounts are not hard-deleted automatically because staff can own resources such as classes and assignments. `classes.teacher_id` and existing creator references can restrict deletion. Staff deletion therefore requires explicit offboarding, including resource ownership transfer, before account removal. Sprint 10 includes class reassignment as the first administration control for this process.

## Database controls

Migration: `supabase/migrations/0011_security_privacy_administration.sql`

Key additions:

- `profiles.account_status`
- `privacy_preferences`
- `account_deletion_requests`
- `security_audit_log`
- `private.current_user_active()`
- active-account RLS updates for profiles/classes/memberships/attempts/mastery/sessions
- service-role-only `erase_student_data(uuid)`
- profile security-change audit trigger

RLS is enabled on all Sprint 10 privacy/audit tables. Authenticated clients have no direct insert/update/delete policy on the audit log.

## Edge Functions

New JWT-protected functions:

- `get-my-privacy`
- `manage-my-privacy`
- `get-admin-dashboard`
- `manage-admin-account`

All four validate the authenticated user server-side. Admin functions additionally require an active `admin` profile.

## QA

Automated tests cover:

- opt-out defaults
- service-role-only erasure RPC
- admin-only audit-log RLS
- own-account / last-active-admin protection
- erasure ordering
- role-routing separation
- absence of service-role credentials in browser configuration

Browser JavaScript CI checks include the new admin/privacy clients.

## Supabase security advisor

After the Sprint 10 migration, the only current Supabase security-advisor warning is **Leaked Password Protection Disabled**. This is an Auth project setting and should be enabled before a real school pilot if available for the project configuration.

## Remaining pilot gates

Before declaring Sprint 10 fully QA-complete:

- provision a dedicated test `admin` account;
- browser-test `/admin.html` and `/privacy.html`;
- verify role change and suspend/reactivate against disposable test accounts;
- verify deletion request/cancel with a disposable student;
- verify end-to-end deletion only with a disposable student account whose data may be permanently removed;
- enable Supabase leaked-password protection;
- close the residual service-role Edge Function JWT/account-status window described above or explicitly accept it only for a tightly controlled internal pilot.
