# BF-21 — assessments and private files in owned local staging

The owner authorized the next BF-21 slice on 15 November 2026. This extends the [real-dashboard checks](local-staging-dashboards-20261115.md) with assessment completion and private teacher-task files. **Locally qualified; exact-head CI and merge approval pending.** No merge or hosted acceptance is claimed.

## Scope and boundaries

The new `assessment-files` journey uses the original student course, My work and teacher Review pages, real local Auth, PostgREST, Storage and repository Edge Functions. Teachers prepare their fictional task deliveries through authenticated service calls; students upload and submit through the actual page controls, and teachers save and publish feedback through the actual Review page. No response, dashboard document or authentication event is fabricated.

Two fictional schools contain six accounts and two different subjects/grades. Each school has a small, explicitly synthetic selected-response question set. Source records, curriculum gates, immutable question snapshots, model/policy bindings and release activation use the existing constraints and triggers. These fixture records are not educational approval or real curriculum activation. No learner answer or session is pre-seeded.

The default `dashboards` journey preserves its navigation-only fixture and its unavailable-assessment coverage. The new profile is a separately identified fixture, `two-school-assessment-files-v3`. Both profiles require independently owned origins, matching source/build identity and complete asset verification before sign-in.

The fixed local service registry now includes the assessment and teacher-task handlers needed by this journey. The gateway forwards only the reviewed private file bucket/object routes to the owned Storage service, preserving caller authorization. Other buckets, administrative/signing routes and unsupported HTTP methods are refused. File request bodies have explicit bounded limits, including bodies without a declared length. Academic-year and staff-invitation handlers retain their list-only local restrictions.

All application, schema, browser and package source remains unchanged. The existing SDK pins and digest-pinned provider images are retained. The local function wrapper permits only the owned gateway, and the browser permits only its two exact owned origins. These are request-layer controls for reviewed code, not an operating-system sandbox for arbitrary code or a hosted-runtime parity claim.

## Run locally

Use the [stage-1 prerequisites](local-staging-20261115.md#run-locally), then:

```sh
python scripts/run-local-staging.py --journey assessment-files --evidence-dir /tmp/haiedu-assessment-files-evidence
```

The runner creates its own disposable backend, fictional credentials and generated browser configuration. It accepts no hosted target, existing project, DSN or supplied account. Local CAPTCHA and rate budgets remain off; production protection and limits are unchanged. Private screenshots and troubleshooting logs must stay outside Git. Only the sanitized receipt is suitable for publication. Cleanup removes only resources created by this run.

## Verification

The [sanitized receipt](../evidence/local-staging-assessment-files-20261115.json) records **25 passing assessment/file check groups** across six accounts, two schools and two subjects. The unchanged dashboard profile also passes all **28 groups**, including its cross-tab delayed-response checks.

- Each student completes a two-question Diagnostic and Practice assessment through the native player. Reload resumes the existing session; exact answer retries preserve the result, while changed-answer retries are refused. The initial diagnostic prerequisite and protected answer-key access are checked.
- Teachers upload private PDF sources and deliver real tasks. Students upload PDF responses, save and download them, replace them with DOCX, reload, submit and download the exact stored bytes. Invalid file content is refused.
- The teacher Review page downloads the submitted document and source, saves private feedback and publishes it. Students then see their own published feedback. Foreign-school contexts, submission/file identifiers and teacher-only operations are refused or absent.
- Direct authenticated Storage and public-object routes cannot return the private source. Missing, malformed and revoked sessions cannot use the source, response, review-file or assessment-item services.
- An independent database read confirms exactly four completed sessions, eight correct answers, two submissions, two published reviews and six private objects. Student/enrollment/release/school bindings, teacher-review ownership, ready object paths and absence of duplicate answers are checked. All auth sessions are closed, rate counters remain zero, and all owned containers/network/temporary credentials are removed.

All **1856 code tests** pass with zero failures/skips/cancellations, including nine target/gateway controls. The setup-redirect control, type checking, core/teacher bundle parity, asset/archive validation and production QA dependency audit pass. Four representative desktop views were inspected: Diagnostic completion, Practice completion, submitted work and published teacher feedback. This is a bounded visual observation, not full responsive/accessibility/usability acceptance.

Both local journeys run in the existing required PostgreSQL CI job; all five required jobs remain in the release aggregate. The receipt identifies the tested base plus exact runner hashes; exact PR-head and merged-source CI remain separate. Private screenshots and troubleshooting logs stay outside Git. The receipt separately identifies a subsequent metadata-only correction to the synthetic release notes; local results are reused for that unchanged behavior, with final fixture execution required in exact-head CI.

Production QA not run (paused by owner). Affected production QA: none. No product page, service implementation, hosted setting or production QA script changes. Owner usability acceptance: not given.

## Remaining work

This slice is limited to selected-response Diagnostic/Practice completion and feedback-based teacher tasks using PDF sources and PDF/DOCX responses. It does not certify every response format, Mastery attempt/review lifecycle, assessed audio, writing/resource workflow, classroom capacity, file-format rendering or usability. The tiny synthetic files exercise validation, storage and exact-byte transfer; they are not a document-renderer test.

Wider BF-21 remains open: additional workflows, separately approved hosted adoption, assertion-preserving migration of the 21 credential-bearing QA workflows and synthetic-report exclusion. No hosted database or `haiedu-bf16-test` is queried, reset or converted. BF-02 recovery remains deferred, BF-22 stays on hold, BF-16 live limits remain off and paid stolen-password protection remains declined.
