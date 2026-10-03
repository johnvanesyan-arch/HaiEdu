# Remaining Phase 3 automated QA

This batch continues unfinished Phase 3 coverage. It does not repeat Phase 2 or
change completed manual acceptance results. Browser acceptance remains separate.

Run `npm ci`, then `npm test`. The Phase 3 revision and handler tests use a new
in-memory PGlite database per test. They load synthetic fixtures and repository
functions; they accept no remote URL or credential. Historical curriculum DML
from the superseding mapping migration is deliberately excluded.

`tests/phase3-content-concurrency.py` uses the same pinned pgserver and psycopg
versions as the existing CI concurrency job. It creates a disposable PostgreSQL
cluster accessible only through a local Unix socket. Independent connections
verify blocking and commit order for guide writes, family approval, template
changes, question revision history, and service-only mutation grants. CI runs it
after the existing offboarding suite. To run locally as a non-root user:

```
python -m pip install pgserver==0.1.4 'psycopg[binary]==3.2.6'
python tests/phase3-content-concurrency.py
```

The handler harness executes the actual TypeScript handlers and SQL. Auth,
live-session, and AAL inputs are fixture doubles. Passing these tests does not
prove real MFA, a deployed Edge Function, browser rendering, or hosted RLS.
Fixture SQL creates a deliberately reduced schema; never apply it to Supabase.

Synthetic targets are defined in `tests/fixtures/phase3-db-harness.mjs`:

| Target | Local-only ID | Purpose |
| --- | --- | --- |
| Reviewer | `10000000-0000-4000-8000-000000000010` | Fixture content administrator |
| Question | `30000000-0000-4000-8000-000000000001` | Revision, draft mapping, current QA, approval |
| Sibling | `30000000-0000-4000-8000-000000000002` | Family fingerprint races |
| Other subject question | `30000000-0000-4000-8000-000000000003` | Isolation comparison |
| Template | `10000000-0000-4000-8000-000000000009` | Family and template locks |
| Skill guide | `10000000-0000-4000-8000-000000000011` | Independent guide writers |
| Template guide | `10000000-0000-4000-8000-000000000012` | Independent guide writers |

These IDs are not approved hosted fixtures or real user accounts. Hosted manual
write acceptance requires a separately approved QA backend, genuine test Auth
accounts and MFA, and isolated runtime fixtures created through governed flows.
Keep production project `xzyjvwiiibuarpotppid` excluded from all fixture work.

Production changes in this batch are session lifecycle guards in shared reviewer
code. Server authorization, SQL, QA criteria, version rules, SME states, MFA,
curriculum releases and learner visibility are unchanged. The new tests exercise
normal current-session success as well as interrupted and stale completions.

## PostgreSQL 17.6 and executable analytics follow-up

The `phase3-postgres-17` CI job pins `postgres:17.6`, matching the production major
and minor version. It runs the seven existing Phase 3 lock/commit-order checks,
then `tests/phase3-analytics-integration.test.mjs`. The latter executes the real
analytics SQL, actual Edge handler with Auth doubles, and actual Evidence page
code in a Node VM. This is not browser, genuine Auth/MFA or hosted RLS acceptance.
Ordinary `npm test` executes the same analytics tests with in-memory PGlite.

`tests/fixtures/phase3_postgres.py` accepts no DSN, project reference or secret.
CI mode requires `GITHUB_ACTIONS=true`, a fixed loopback service, fixture-only
credentials, and an exact PostgreSQL 17.6/version/user/root-database identity.
Each suite/test owns a randomly named disposable child database and drops only
that database on completion. Local fallback remains Unix-socket pgserver.
Never enable CI mode against a developer or production database.

The analytics fixture uses four synthetic programme contexts: `QA-A-U01` has
flagged items, `QA-B-U01` has an unflagged item, and C/D are empty. It covers all
eight operational flags, sample/rate boundaries, repeat lift, response times,
unanswered/abandoned/completed counts, protected-pool leakage, fallback reasons,
pool capacity, diagnostic forms, retirement provenance and service-only grants.
The Evidence page consumes the handler's actual SQL response and links each
flagged row to its question. Minimal fixture SQL is local/CI only.

Executable fixtures reproduced two defects: help on unanswered exposures could
inflate `helpUseRate`, and absent unit scope silently selected Physics. The
follow-up migration preserves total `helpUsedCount`, adds
`answeredHelpUsedCount`, and divides answered help by answered exposures.
The SQL function is strict with a null default; the handler rejects missing or
invalid unit codes with HTTP 400. Both reviewer consumers already pass selected
unit codes explicitly. Flag thresholds, role/session checks, service-only grants,
SME states, MFA, curriculum, versioning and release controls are unchanged.

This migration replaces one read-only function and contains no content DML.
Deploy only after CI passes; read back the function and Edge bundle, preserve
the existing JWT setting/shared auth helper, and compare the recorded content
hashes before and after deployment. Keep P3-15 live browser acceptance pending.

## Same-user guide authentication follow-up

`tests/content-guide-auth-refresh.test.mjs` adds eight executable P3-22 checks
against the actual guide page code. A repeated same-user `SIGNED_IN` event must
retain dirty content for both guide scopes and both reviewer roles while still
performing the authoritative catalogue/access read. Initial reads coalesce;
same-user revalidation does not cancel a pending save; user changes synchronously
clear protected state; denied access hides the console and permits recovery.
These synthetic VM checks do not establish real tab-focus or hosted Auth/MFA
acceptance. The remaining browser actions are unchanged.
