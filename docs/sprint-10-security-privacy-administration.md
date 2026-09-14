# Sprint 10 — Security, Privacy & Administration

## Objective

Make the prototype safe enough for a controlled real-school pilot by strengthening role boundaries, account status, privacy controls, child-data minimization, account administration, audit logging, and deletion procedures.

This sprint is **technical pilot hardening**, not a legal-compliance certification.

## Roles and account status

Supported roles:

- `student`
- `teacher`
- `content_admin`
- `admin`
- `parent` remains reserved in the enum but is not a pilot workflow yet.

Supported account states:

- `active`
- `suspended`
- `deletion_pending`

Normal learner/teacher RLS reads require an active account.

## Child-data minimization

The platform application profile intentionally does not collect or duplicate:

- date of birth;
- home address;
- phone number;
- parent email;
- government ID.

The profile stores role, optional display name, account status, and timestamps. Authentication email remains in Supabase Auth. Learning records are limited to what the mastery system requires: class relationships, sessions, attempts, mastery state and remediation evidence.

## Privacy preferences

`privacy_preferences` stores explicit optional preferences:

- product analytics opt-in — default `false`;
- research-use opt-in — default `false`.

These fields record preferences only. They do not themselves establish legal or ethical authorization for research involving minors.

## User privacy surface

`/privacy.html` allows the authenticated user to:

- inspect a high-level data inventory;
- edit an optional display name;
- change analytics/research preferences;
- submit an account deletion request;
- cancel an open deletion request.

The inventory returns counts, not raw internal tables.

## Administration surface

`/admin.html` allows an active administrator to:

- inspect account roles and status;
- change another user's role;
- suspend/reactivate accounts;
- reassign teacher-owned classes;
- review deletion requests;
- approve a deletion request into a reversible processing state;
- perform a separate explicit irreversible erasure action;
- inspect recent security/privacy audit events.

Safeguards:

- an admin cannot change their own role;
- an admin cannot suspend their own account;
- the last active admin is protected;
- staff accounts are not eligible for automatic student erasure;
- teacher/admin offboarding must transfer or archive owned resources first.

## Two-stage deletion runbook

Deletion is intentionally separated into a reversible approval step and an irreversible execution step.

1. The student submits a deletion request. Status becomes `pending`.
2. An administrator reviews and approves it. Status becomes `processing`; the application profile becomes `deletion_pending`.
3. The student may still cancel at this point. Cancellation restores the request to `cancelled` and the profile to `active`.
4. If deletion should proceed, the administrator chooses the separate permanent-delete action and must explicitly confirm it, including typing `DELETE` in the admin UI.
5. The service-role-only erasure procedure removes student learning data and the application profile.
6. Only after learning-data erasure succeeds is the Supabase Auth user deleted.
7. The deletion request is retained in sanitized completed form with `resolution_code = student_erased`; direct identifiers are null after profile deletion.
8. A sanitized audit event records the completion and erased row counts without storing answer content or credentials.

The user-facing cancellation path applies to both `pending` and `processing` requests. Once the final erasure action has completed, the deletion is irreversible.

## Live deletion QA

Live QA verified both critical branches of the corrected workflow:

- `request -> admin approval -> processing -> student cancellation -> active` passed;
- `request -> admin approval -> processing -> explicit execute deletion -> completed` passed.

The corrected final hard-delete test produced `admin.student_account_erased` with `authDeleted: true`. The completed request no longer references an application profile or Auth user.

An earlier QA run exposed that the first implementation erased on approval, which made cancellation impossible. That implementation was replaced by the two-stage workflow above and regression tests were added.

## Post-deletion browser state

Deleting the server-side Auth user can leave a cached browser access token until the client notices that the user no longer exists. The shared frontend UX layer now validates the live Auth user, clears a dead local session, redirects to the login surface, and displays an Armenian explanation instead of leaving a student dashboard showing the raw `Edge Function returned a non-2xx status code` message.

This is a targeted safety/usability fix. A broader visual/product frontend redesign remains separate work.

## Audit logging

`security_audit_log` captures sensitive administrative/privacy mutations such as:

- role changes;
- account suspension/reactivation;
- class ownership transfer;
- privacy preference changes;
- deletion request/cancellation;
- deletion approval;
- deletion rejection;
- final student erasure.

Audit records intentionally do not store passwords or student answer content.

## Student erasure RPC

`public.erase_student_data(uuid)` is executable only by the service role and refuses non-student profiles. It deletes via the profile cascade after first collecting a compact inventory of affected learning records.

The administrator Edge Function deletes the Supabase Auth account only after this erasure succeeds.

## Security residuals before pilot closure

Two technical gates remain before Sprint 10 can be closed:

1. Supabase Auth **Leaked Password Protection** must be enabled.
2. Legacy pre-Sprint-10 service-role Edge Functions must all perform an active-account or live-session validation in addition to validating the JWT, so suspension/revocation is respected immediately rather than waiting for an already-issued access token to expire.

Direct database RLS is already active-account-gated, and the Sprint 10 privacy/admin functions enforce active account state.
