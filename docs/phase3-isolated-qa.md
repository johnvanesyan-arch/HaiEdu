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
