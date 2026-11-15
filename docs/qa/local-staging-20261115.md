# BF-21 stage 1 — owned local staging

**Follow-up:** the [real-dashboard slice](local-staging-dashboards-20261115.md) extends this historical stage-1 scope; its qualification and release status are recorded separately.

**Merged and verified on 15 November 2026.** Owner-approved [PR492](https://github.com/johnvanesyan-arch/HaiEdu/pull/492) merged at `975230b7dd482e093b503511dff9411b3f256fd6`, preserving approved tree `c43b6bc4365c7a786f04f92a7e0554767e5af7c8`. All five [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43737395251) and [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43742311841) pass, including the new staging journey. This completes BF-21 stage 1, not the wider staging/migration initiative.

This first stage provides a disposable place to test real sign-in and school-scoped service access. It rebuilds the complete reviewed application schema, creates six fictional accounts in two schools with two distinct subjects/grades, and runs three repository Edge services in the real Supabase Edge Runtime. It does not convert or reset `haiedu-bf16-test`.

## Run locally

Prerequisites: Node 22 or later, Python 3.12, a local Docker daemon on `/var/run/docker.sock`, and Chromium. Install the committed dependencies with `npm ci`, the Python dependencies with `python -m pip install -r tests/requirements-fresh-baseline.txt`, and the browser with `npx playwright install --with-deps chromium`.

```sh
node --test tests/staging-target.test.mjs
python scripts/run-local-staging.py --evidence-dir /tmp/haiedu-local-staging-evidence
```

An existing Chromium installation can be selected with `WRITING_QA_CHROMIUM=/absolute/path/to/chromium`. This selects only the browser executable, never a target URL or credentials. The runner has no DSN, project, website, existing-container or credential option. It creates its own target every time.

The sanitized `result.json` contains source/build hashes, pinned component images, checks and cleanup status. `private-diagnostics/` is local troubleshooting material and must not be published. Generated credentials and temporary browser/function builds are removed; owned containers and their network are removed on normal success or failure. As with other process-owned fixtures, forced machine termination can prevent cleanup. Never use broad Docker prune commands to clean a shared workspace.

## What the journey covers

- The BF-20 baseline rebuild and complete schema/permission comparison, with its technical seed and source-history checks preserved.
- Real GoTrue creation of six synthetic users and profiles. User-editable `admin` metadata does not grant a staff role. Staff fixture activation uses valid provisioning records with the existing account-type guard still enabled.
- The existing compiled sign-in form, real password sign-in, profile lookup and correct student/teacher/school-admin destination in Chromium.
- Real calls from that browser session through the local gateway to `get-student-classes`, `get-teacher-dashboard` (directory mode) and `get-school-admin-overview`, then actual PostgREST/database functions.
- Each role's own school/class visibility, foreign-school profile/class exclusion, wrong-role refusal, missing/malformed identity refusal, private capability denial and denial after real session logout. Teachers also request the other school's exact class and assignment and must be refused.
- The browser build identity and every compiled asset hash before authentication, plus removal of the runner's own resources afterward.

The role destination document is intentionally replaced by a minimal local handoff page. The login form and API responses are real; this stage **does not test destination dashboard rendering or interaction**. It is the first navigation/service slice, not a complete learner assessment journey. No curriculum releases or assessments are activated by its synthetic programmes.

## Target controls and runtime boundaries

The generated target manifest binds the local backend and frontend origins, source commit, fixture version, run identifier and browser build hash. Missing or inconsistent configuration is refused. The parent proves Docker resource ownership and loopback port bindings; the child checks the gateway's run/source identity and the separate browser build before signing in. The browser receives synthetic accounts and the public local key; it never receives the service key.

The Node request helper permits only the two exact owned loopback origins and refuses redirects. Browser interception checks every destination, refuses HTTP redirects and blocks service workers. The local gateway has fixed provider/function routes, with no caller-selected upstream. A separately hashed test-runtime wrapper restricts application `fetch` calls to the owned gateway and forces redirect refusal. Negative controls cover production, the existing hosted test project, malformed/encoded targets and mismatched ownership/build/fixture inputs before network access.

These are application/request-layer controls, **not an operating-system network sandbox for untrusted code**. Docker uses its normal bridge and loopback publication. Only reviewed repository code runs here. Where Docker inherits a proxy, only the fixed local service aliases are exempted; external proxy policy is preserved. No production secrets are supplied, including in pull-request CI.

Function bodies and their application imports are unchanged. The staging builder bundles the existing lockfile's Supabase SDK 2.118.0, records every input/output hash and adds only the local HTTP restriction wrapper. The real Edge Runtime image is pinned by digest. This is a local runtime adapter; it does not certify parity with every hosted runtime/SDK version or close BF-36 dependency work.

The generated browser configuration points exclusively at the owned backend and disables the local challenge to match local Auth. Production Cloudflare protection is unchanged. Auth uses a local mail catcher, and the three functions use rate-budget mode `off`. No external email or Cloudflare verification is part of this slice. Storage is started by the baseline component stack but file journeys belong to stage 2; Realtime, Studio and the full Supabase CLI distribution are not included.

## Verification and remaining work

The [sanitized local receipt](../evidence/local-staging-20261115.json) records all six successful role journeys, 13 browser/service check groups, all test sessions closed, zero rate-budget counters, and verified owned cleanup. Four target/server refusal tests, one setup-redirect test, 1,851 code tests, eight baseline controls and fifteen forward-update controls pass. Teacher bundle, browser asset/archive parity, type checking and production QA dependency checks pass. The receipt identifies the base commit and exact new runner hashes; exact PR-head and merged-source CI both pass with 1,851 code tests and 696 browser checks, with zero failures/skips/cancellations in those counted suites. The new six-account staging journey and all retained database qualifications pass in both runs. The new journey is included in the existing required PostgreSQL CI job; the five-job release aggregate remains intact. Production QA not run (paused by owner). Affected production QA: none; application code, production runners and their pause guards are unchanged.

BF-21 remains open after stage 1. Later work includes broader fixtures and file/assessment journeys, separately approved hosted conversion, assertion-preserving migration of the 21 credential-bearing QA workflows, synthetic-report exclusion, and the existing deferred BF-02 recovery dependency. This stage does not establish classroom capacity, production acceptance, content/SME approval or owner usability acceptance.

Owner usability acceptance: not given. BF-22 is on hold while this selected stage is completed. BF-16 live limits remain off; paid stolen-password protection remains declined.

## Release verification

The three public addresses serve `975230b7dd482e093b503511dff9411b3f256fd6`. Twelve fresh checks verify release identity, exact asset manifest, representative account-access HTML/JavaScript bytes, MIME, cache rules and enforcing security headers. Existing full-build proof is reused because application/build source is byte-identical to the earlier verified release. Only static files were fetched; no page scripts, sign-in, Supabase requests or production QA ran. Normal Git integration updated the site; no manual promotion or hosting-setting change occurred.

The release receipt records the approved head/tree, exact PR/main checks and public static observations. The original local receipt and its working-tree source hashes remain preserved. No hosted test-project reset, backend deployment, production data change or paid action occurred. The separate documentation record and Notion summary preserve all later-stage and recovery boundaries.
