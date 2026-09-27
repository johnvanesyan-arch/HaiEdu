# Sprint 14 authenticated two-school isolation

Status (2026-09-28): runner implemented; live acceptance BLOCKED on a second school and configured QA identities. This is test preparation, not a passed tenant-isolation gate.

## Current prerequisite check

Read-only production inventory found one school, one active school-admin membership, one active teacher membership, and one active student enrolment. The executor has no QA credentials. Existing mobile QA expects only one teacher and learner; it cannot establish two-school or school-admin isolation. Its stored secrets were not read or assumed valid.

Do not fabricate authenticated acceptance using service-role impersonation, synthetic JWTs, disabled session checks, or mocked database calls. The seven runner regression tests use simulated responses solely to test the runner itself.

## Fixture to prepare

Designate two QA schools, A and B. Existing Test School may be A if explicitly designated; school creation is not institutional rollout. Each needs its own active school administrator, teacher and student (six distinct accounts), an active academic year, authorized teacher subject, exact classroom assignment and student enrolment. Use the existing authorized Physics 7 Chapter I release in both schools; a second content release is unnecessary for this isolation check and must not be fabricated. Keep each test student in exactly its designated class and each staff account confined to its own QA school.

No fixtures are created by this runner. Use normal authorized provisioning/enrolment workflows. It neither sends invitations nor resets credentials. Do not offboard real teachers to prepare a fixture.

Set repository variable `QA_TENANT_FIXTURES_JSON` from this template, replacing every placeholder with the corresponding UUID:

```json
{
  "dedicatedQa": true,
  "A": {
    "schoolId": "UUID", "classId": "UUID", "assignmentId": "UUID",
    "curriculumReleaseId": "UUID", "unitId": "UUID",
    "adminId": "UUID", "teacherId": "UUID", "studentId": "UUID"
  },
  "B": {
    "schoolId": "UUID", "classId": "UUID", "assignmentId": "UUID",
    "curriculumReleaseId": "UUID", "unitId": "UUID",
    "adminId": "UUID", "teacherId": "UUID", "studentId": "UUID"
  }
}
```

Create twelve GitHub Actions secrets using `QA_SCHOOL_{A|B}_{ADMIN|TEACHER|STUDENT}_{EMAIL|PASSWORD}`. Store passwords only in the secret manager, never in issues, logs, this document or chat. The existing mobile QA secrets remain separate. The runner uses the committed public Supabase configuration, never a service-role key.

Run **Actions → Sprint 14 authenticated isolation QA → Run workflow → main**. Missing fixtures/secrets produce a BLOCKED report and exit code 2; they are never silently skipped. Invalid credentials, inactive memberships, unexpected HTTP errors and failed assertions make the run fail. If a QA account requires MFA, the password-only runner cannot establish its required assurance and the positive control must fail; do not disable MFA to pass it.

## Checks and evidence

The live runner performs 54 checks when fully configured:

- six password sign-ins, each verified against its expected QA user ID;
- twelve positive controls proving each administrator, teacher and learner can access its legitimate school/class/context;
- thirty reciprocal negative checks across school directories, administrator scope, teacher context/dashboard/detail APIs, mixed class/assignment/student identifiers, the legacy detail path, learner-controlled identity claims, cross-role access and direct database enrolment reads;
- six local-scope sign-outs closing only sessions created by this run.

A 401, 500, timeout or malformed response does not count as authorization denial. Direct-table denial requires the explicit privilege error or an empty RLS-filtered result. API denial requires the expected 403 error code. Positive controls must pass before negative probes start.

The runner calls read endpoints only, apart from normal Auth login/logout. It does not start sessions, fetch assessment items (which records exposures), answer questions, issue invitations, change names, enrol students or offboard staff. Reports contain check labels, HTTP status, result, revision and target origin; no passwords, tokens, names, emails or learner response bodies. Reports are retained for 14 days. A forced process termination may prevent logout; any interrupted run is incomplete and must be reviewed.

## Gate limits

Even a passing read-isolation run does not by itself close all Sprint 14 acceptance. The report always keeps `sprint14GateClosed: false` for explicit review. Still required separately:

- authenticated negative mutation checks for invitation/provisioning/enrolment claims, using disposable fixtures and a controlled action matrix;
- authenticated teacher navigation, rename and offboarding action QA;
- second authorized unit/context switching;
- school-wide analytics activation only after the 14C evidence/isolation gate passes;
- final readiness reconciliation.

No learner evidence, learning criteria, curriculum release or application runtime is changed by this tooling checkpoint.
