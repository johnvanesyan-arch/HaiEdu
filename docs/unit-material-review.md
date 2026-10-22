# Unit-material review capability

**16.1C.17 · 2026-10-22 Asia/Yerevan · Implemented and CI verified; backend deployed and ten drafts staged.**

Teaching guides differ from misconception-linked remediation hints. They can cover several outcomes and retain textbook sequence. Extended writing already has student and teacher workspaces; this slice supplies the missing content review/publication step. The same explicit capabilities work across programmes, releases, units and content languages.

## Review surface

[Ուսումնական նյութեր](https://www.haiedu.am/content-materials.html) appears in every content-reviewer sidebar. Search and kind/status filters apply to the loaded catalogue; additional pages are explicit. Open a guide or writing package, inspect sources and the proposed use, revise text if needed, save a successor version, run QA, then approve with a real MFA session. Revisions never overwrite prior definitions. QA belongs to the exact saved fingerprint and does not substitute for human review. Approval covers the presented content, rubric and review package; curriculum activation is separate.

Same-account refresh keeps edits. Dirty navigation asks before discarding them; duplicate submissions are suppressed. Selection/account generations invalidate late responses. The mobile layout preserves the complete rubric and source/support package. Historical versions remain inspectable; only the latest version can be changed, approved or retired.

## Data and API

`unit_material_versions` binds immutable `definition` and staff-only `review_package` to programme, release, unit, key, version and sequence. Kinds are explicit `guide` and `writing` extensions: `teaching-guide-v1` and the existing `extended-text-v1`. The shared core has no subject code, grade, fixed number of guides, language default, fixed rubric or pass threshold. Scope, source, outcome and support-package changes require governed onboarding; the text editor cannot silently move them.

`unit_material_events` retains staging, revision, QA, approval and retirement events. Automated onboarding uses a null actor with an explicit system source; it never impersonates a reviewer. Human actions derive actor/session/AAL from verified authentication. Profile deletion nulls actor references without erasing content/history. The privacy inventory reports authored versions, reviews and events as separate staff counts, without returning protected content.

Both tables have RLS and no direct table privileges for public, anon, authenticated or service_role. Service-only invoker wrappers call private workers with an empty search path. Authorization rows are locked before material locks; wall-clock session expiry is evaluated after waits. Per-key transaction locks and exact fingerprint/latest-version checks reject competing saves. Duplicate exact approvals are idempotent.

`manage-unit-materials` accepts POST `{action,payload}` with a 100 KB bound and rejects identity/role/AAL supplied in the body. `list` takes an optional offset and returns at most 200 summaries plus `hasMore`; `get` takes an ID and returns the material, version summaries and events. Mutations require ID/fingerprint; revision additionally takes definition, unchanged reviewPackage and a reason. Retirement requires a reason. Approval/retirement require AAL2. Errors expose bounded public codes, not database internals. Responses are no-store.

Writing approval inserts the exact definition into `written_task_versions` with the real reviewer and QA/source-comparison references. Superseded approved tasks retire atomically; unrelated registered tasks cannot be overwritten. Learner runtime receives the prompt/rubric/assistance contract only. The practice prompt, model, annotations and workload proposal remain outside that definition. No writing task is published merely by staging or structural QA.

## Delivery boundaries and evidence

Guide approval stores reviewed teaching material; learner guide placement/display is a following capability slice. English remains draft/inactive. No assessment policy, scoring denominator, automatic-question approval or speaking assessment changes.

Affected Edge bundles: new `manage-unit-materials` and changed `get-my-privacy`; `_shared/auth.ts` is unchanged. Other audio/writing consumers reuse their unchanged verified source evidence. New SQL/Edge fixtures cover two programmes and three units, authorization/MFA, exact-version QA, stale revisions, malformed rubrics, private model separation and all ten English definitions. PostgreSQL race cases cover duplicate revisions/approvals, reviewer revocation and expiry after a lock wait. Native Chromium checks cover the real page with synthetic authentication backed by actual SQL/Edge code. They are isolated tests, not signed-in production acceptance.

[Unit handoff](english-7-unit-01-materials.md) · [Evidence](evidence/english-7-unit-01-materials-20261022.json)

**Verification closure:** [CI 39799180714](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39799180714) passes 1,376 tests, all 90 Chromium cases and the aggregate gate on implementation-compatible commit `4a484d64e7d71bb7730d1004a3028a080fe5375c`. An existing audio test now waits for the unchanged asynchronous resume outcome; a subsequent Ubuntu package-download timeout was resolved with a targeted job retry. The deployed migration has eight exact function bodies, and `manage-unit-materials` v1 / `get-my-privacy` v8 have four exact source files. Production staging passes a rollback rehearsal and preserves all 71 tracked existing tables. Ten exact saved QA fingerprints are independently verified; no new human approval or learner task publication is fabricated. The final Git deployment retains the same application source and existing blocking-check controls.

**Closing CI transport repair:** the documentation-only run 39802498606 passed its application, PostgreSQL and concurrency jobs, but slow Azure Ubuntu HTTP downloads consumed almost all of the browser job's ten-minute budget; the first 16 cases passed before the job was cancelled. The isolated browser job now uses the official Ubuntu HTTPS archive instead of that mirror, with two retries and 30-second connection/data timeouts. This changes only that temporary runner's package transport; Chromium, its dependency installation, all tests, aggregate dependencies and the ten-minute bound remain unchanged. See Ubuntu's [APT transport](https://manpages.ubuntu.com/manpages/jammy/man1/apt-transport-http.1.html) and [configuration](https://manpages.ubuntu.com/manpages/jammy/man5/apt.conf.5.html) documentation. Final head CI/deployment status is recorded with the merged-source Notion attestation.
