# BF-20 historical data-effect review — 15 November 2026

**Merged and verified on 15 November 2026 (Asia/Yerevan).** Owner-approved [PR490](https://github.com/johnvanesyan-arch/HaiEdu/pull/490) merged at `74128e40bc6f970398330a04f57ddab8c53870f2`, preserving tree `25bb9afb2d15fcbbba52d0c6e1e19ee6f0b587ae`. All five [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43705104577) and [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43710495607) pass: 1,847 code tests, 696 browser checks, nine review controls and 17 new real-component checks, plus the retained baseline and future-update qualification. The pinned historical review is complete for **fresh-rebuild dispositions**. This closes the question of what to do with the reviewed historical operations during a fresh reconstruction. It does not assert that every old operation ran successfully, that current production rows are complete, or that a backup can be restored.

Reviewed source: `5eb162cc077f5d3104de685186909e16a023a6cb`. Shared-core reconstruction/qualification only; no subject-specific default or application behavior change. The original migrations, archived operation, baseline SQL, technical seed, manifest, crosswalk and forward-update plan remain byte-identical.

## Result

All **209 source files** (208 migrations plus one archived operation) and **218 recorded production entries** have a hash-bound disposition in [the review](../../supabase/updates/historical-data-review.json). There are zero unclassified entries and zero approved historical replays. The existing four actor-rate policy rows remain the only automatic technical seed.

Nine explicit [fresh-feature requirements](../../supabase/updates/fresh-data-requirements.json) distinguish technical defaults, governed provisioning, activation, environment setup and recovery. The newly explicit prerequisites are:

| Requirement | Fresh baseline | Before the feature is claimed ready |
| --- | --- | --- |
| Multiple-choice answer order | Configuration row absent; the preserved function returns staged canonical order | Qualify compatible SQL/Edge consumers, then explicitly configure `mcq_option_order` with the reviewed enabled algorithm in the approved target. Preserve stored session order during recovery. |
| Supplementary files | Bucket absent | Create/read back private `supplementary-materials`, 5 MiB, PDF only; qualify mediated delivery. |
| Teacher task files | Bucket absent | Create/read back private `teacher-task-files`, 10 MiB, PDF/DOCX; verify privacy, size and MIME restrictions, including existing-bucket readback. |
| Counter maintenance | Function/health view present; job absent | Separately install and observe the reviewed schedule. Scheduling does not authorize BF-16 enforcement. |
| Programmes, questions, policies, approvals and runtime bindings | Empty | Use governed provisioning or separately qualified recovery; bind the target's actual compatible runtime. |
| Accounts, schools and learning history | Empty | Provision a new school/operator explicitly or recover existing records. Historical cohort consent and inferred backfills are not new authorizations. |
| Provider settings, audio/material manifests and actual files | Not copied | Configure the approved target separately; recover file bytes and verify access under BF-02. Bucket metadata alone is not file recovery. |

These are setup requirements, not an installer. No live setting was changed and no additional automatic seed is proposed. The current forward-update plan remains empty.

## Review method and evidence

The earlier static inventory identified 79 files with explicit data writes and 66 with executable review targets; these groups overlap. This review inspected their immediate effects, anonymous procedural blocks, dynamic statements, invoked helper/trigger paths and data-dependent structural changes. Source parsing covered 93 procedural block nodes and 22 dynamic-execute statements. Dynamic structural loops and function-definition replacement are represented by the final baseline catalogue; none supplies an additional generic seed.

All 218 recorded SQL bodies were matched locally to the existing crosswalk fingerprints. Fifty-nine came from retained private read-only captures; the remainder were reconstructed only where public source bytes matched the recorded hash exactly. No fresh production query or historical execution was needed. Raw captured SQL and private diagnostics are excluded from this publication.

Of the 193 name-matched source/recorded operations, 186 have identical token-normalized SQL; the seven differences below were reviewed explicitly. The remaining 25 recorded-only/alias entries were reviewed against their recorded bodies. The public manifest preserves hashes, source references, classes and explanations, not private SQL bodies or user rows.

| Variant | Reviewed difference and disposition |
| --- | --- |
| `0005` | Additional recorded policy drops; final security structure is represented in the baseline. |
| `0006` | Two source indexes are represented in a separate recorded index operation; no extra seed. |
| `0013` | Source-only identity assignment to an existing seed field and policy drops; the common historical content backfill is not replayed. |
| `0031` | Optional procedural block-ending semicolon; same historical backfill/assertion. |
| `20261015163749` | Source placeholder versus the separately archived actual runtime-binding operation; target-specific provenance is not copied. |
| `20261104111921` | Recorded recovery timeouts, function-digest preflight and read-only preservation assertions; no additional data write beyond the reviewed source recovery. |
| `20261106175539` | Recorded recovery timeouts; same bounded hint repair. |

Recorded-only entries cover initial schema/security/functions, aliases/indexes, initial programme-specific subjects/grades and verified no-op markers. Initial subjects/grades are governed programme scope, not subject-neutral technical defaults. Entries classified as no-op were checked as `SELECT 1` rather than inferred from their names.

Representative nontrivial paths were followed through their writes: item materialization and parallel-item helpers produce items/options/keys and historical review records; generation plans invoke those helpers; release transitions backfill existing learner provenance; option-order changes preserve session-item order; privacy defaults affect existing profiles; snapshot repair is bound to specific hashes and does not establish generic recovery or new content approval. Dated pilot participants/consent, administrator identity marking, active curriculum indexes and shared-audio exposure backfills remain historical/provisioning/recovery concerns. Full per-file and per-record treatment is in the pinned review.

`scripts/check-historical-data-review.py` checks coverage, hashes, classification, references and forbidden replay. It validates the recorded review's integrity; it does **not** repeat semantic review or independently retrieve private production SQL in CI. Changed inputs, missing/duplicate dispositions, substituted recorded hashes, unresolved classifications and forbidden replay fail its negative controls. Future changes need a freshly reviewed record, never automatic acceptance of new hashes.

## Qualification

Use the existing pinned Python requirements and owned-component setup from the [baseline instructions](../../supabase/baseline/README.md):

```sh
python scripts/check-historical-data-review.py
python tests/historical-data-review-unit.py
python tests/fresh-data-requirements-integration.py --evidence-dir /tmp/haiedu-fresh-data-evidence
```

The new integration runner accepts only an evidence directory. It creates and removes its own local PostgreSQL 17.6/Auth/Storage stack and synthetic data; no existing project or connection string can be supplied. It verifies:

- The baseline's four technical policies and empty governed/configuration/provider data.
- Missing/disabled answer-order configuration, explicit local activation in two synthetic subjects, option identity preservation and rationale-required fixed order.
- Ordinary browser/service roles cannot change the protected presentation setting.
- Both real local private buckets: absence failure, empty provisioning, database/API configuration readback, service PDF byte readback, denied direct public/anonymous/authenticated reads, rejected MIME/oversize uploads and no rejected object rows.
- Unchanged application catalogue, no installed maintenance schedule and no populated rate counters; owned stack/data/file cleanup.

Synthetic authoring records satisfy the existing prospective evidence constraints and remain unreviewed draft data. Initial fixture-development runs stopped at existing authoring constraints (missing template evidence configuration and required item fields). Two further runs caught omitted Storage limits because the test used SDK option names in the raw HTTP payload; the fixture now supplies the provider API's snake_case fields and verifies their actual database/API values. These test-harness mistakes were corrected without weakening product constraints or the baseline. Retained failed receipts are not counted as passing qualification.

A subsequent over-limit upload exposed a missing **local fixture** setting: standalone Storage converted its absent global upload limit to `NaN`, preventing the per-bucket comparison from rejecting the upload. The shared owned-component fixture now explicitly sets a 50 MiB global ceiling, above both reviewed bucket limits. Both bucket-specific refusals pass in the final local, PR and merged-source runs. This is a local harness repair, not evidence of a hosted service defect or a production setting change; the failed observation is retained.

The [safe receipt](../evidence/historical-data-review-20261115.json) records final local results, source/artifact hashes and CI status. Required CI adds the review validator, refusal controls and component qualification to the existing PostgreSQL job; all five required checks remain in place. Existing baseline, forward-update, application and browser checks remain in place and run with the corrected shared local fixture.

## Release verification

The three public addresses serve `74128e40bc6f970398330a04f57ddab8c53870f2`. Twelve fresh checks verify release identity, exact asset manifest, representative account-access HTML/JavaScript bytes, MIME, cache rules and enforcing security headers. Unchanged full-build evidence is reused; application/build inputs are byte-identical. Only static files were fetched. No page scripts, sign-in, Supabase requests or production QA ran. The initial source probe saw the previous commit during normal deployment propagation; final checks pass on the new source. Normal Git integration updated the site; no manual promotion or hosting-setting change occurred.

The safe receipt records approved head/tree, exact PR/main checks and the static results. Original migration history, baseline files, empty update plan, deployed backend functions, real accounts/files and provider settings remain unchanged. Documentation recording and Notion synchronization preserve the distinction between this completed review and the separately deferred recovery/hosted work.

## Remaining boundary

The bounded historical review is complete; it is not a full database audit, historical-execution proof, feature-complete school, hosted component equivalence, full Edge proxy journey, statistical shuffle certification or production acceptance. No user records or actual files were inspected/copied/restored. Owner usability acceptance: not given (no user-facing change).

BF-02 database-plus-Storage recovery remains separately deferred. Any hosted adoption, first real target provisioning, provider upgrade, runtime release or backend automation still needs its exact plan, preservation/recovery evidence and applicable approval. BF-16 limits remain off; paid stolen-password protection remains declined. The existing hosted test project is untouched.

Production QA not run (paused by owner); affected suites: none.
