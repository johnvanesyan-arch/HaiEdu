# BF-13 — browser security headers and shared text safety

10 November 2026 · Asia/Yerevan. **Stage 1 is live and statically verified; BF-13 remains open for CSP observation and enforcement.**
Based on `167767eec45cd739454ee7b87d5db405728bde85`, including the owner production-QA pause and maintenance rules. Imported findings **P1:C3 / P4:T1** require staged browser hardening; no production XSS was demonstrated.

## Implemented first stage

Global Vercel headers declare nosniff, strict-origin-when-cross-origin, SAMEORIGIN framing and a Permissions Policy retaining same-origin microphone while denying unused camera, geolocation, payment and USB. Existing cache rules are unchanged. HSTS remains platform-managed.

CSP is deployed in **report-only** mode. Its proposed policy limits application scripts/fonts to self and connections to self plus the exact configured Supabase origin; those CSP restrictions are not yet enforced. Blob audio/downloads, MFA data images and governed HTTPS learning images retain their supported contracts. Inline styles remain allowed because the checked frontend has one style block, 16 style attributes and runtime style changes. There are no inline application scripts. Registered compatibility routes and computed resource consumers were reviewed. New BF15 CAPTCHA/provider integrations must account for their required origins.

Native tests collect `securitypolicyviolation` events locally. There is no new production report collector, transmission of browsing data or database logging. The benign inline-script control intentionally executes and emits a report: **report-only is monitoring, not script enforcement**. X-Frame-Options independently enforces the tested framing boundary. Enforced CSP remains a separate gate after deployed observations and review.

The fourteen local HTML helpers now use one `text-safety.mjs` implementation; fifty direct source consumers were identified. Nullish handling, string conversion, Unicode and five-character HTML escaping are preserved. Seven helpers' apostrophe spelling normalizes from `&#39;` to `&#039;`, with identical decoded DOM text and form values. Existing navigation/content-workspace exports remain compatible.

URL checks are separate from HTML escaping. Task source/submission/history links, teacher review links and material/resource dialogs independently validate HTTPS using the existing task-text/server contract. Invalid synthetic URLs display as inert text. Master-admin attention links stay on the current origin. Valid labels, HTTPS links, noopener/noreferrer, role/tenant checks and normal actions are preserved. Invalid synthetic response DTOs do not establish an exploitable server storage path.

## Verification

The original two browser regressions fail before the change: a wrongly typed classic script executes, and no CSP report is observed. After implementation they pass. A further image case caught an overly narrow candidate img-src and passes after preserving the governed HTTPS image contract; the initial observation remains recorded.

Final local runs pass **1,794/1,794 unit/integration** and **627/627 native Chromium cases**, with zero failures, skips or cancellations. The 52 new security cases are included in 627; four shared-text unit cases are included in 1,794. Counts are overlapping verification executions, not distinct learner journeys.

Coverage includes all 29 canonical compiled pages signed out; compiled synthetic student, school-teacher and master-admin views; text/link history and review boundaries; MIME enforcement; same/foreign frames; external referrer behavior; microphone capability; blob download/audio decoding; governed HTTPS images; login rejection/retry/reset; and an actual bundled Auth SDK request intercepted with a synthetic 400 response before any remote request. The standalone task-boundary harnesses load the real source controllers copied into the build; they are not separately emitted canonical entry bundles.

The first integration runs retain 1,765/1,793 unit cases and 606/627 native cases (20 failures, one cancellation). Their outdated QA harnesses omitted the imported helper, module maps or an AST-extracted helper that moved. Fixtures now provide the actual shared implementation; authorization, stale-response, observer, request-count and cleanup assertions remain. Corrected content checks pass 83 unit and 15 native cases; guide/privacy checks pass 9. Separate initial bundle-layout and Auth-selector setup errors are retained and are not product defects.

Typecheck, five-module core parity, teacher bundles, pinned SDK, browser build/archive, favicon/font provenance and QA dependency checks pass. Build `b61ab8c323b12fd50507502d2137d5f9fa4a0b749a867e8c96f142eab10ecaf8` has **29 pages / 124 immutable assets**. All 31 base releases and 330 archived files remain; the retained archive has 32 releases / 371 files.

## Release and hosted verification

Owner-approved functional [PR461](https://github.com/johnvanesyan-arch/HaiEdu/pull/461) is merged at `3fdeef2b021941df78acd56dc986c0adc4ec7099`. Its tree matches the approved `d13b0d89b614a62a2b89a9458a30fcef870331e0` candidate. All five required jobs pass on both [PR CI42835368838](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42835368838) and [main CI42843770813](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42843770813): **1,794 unit/integration and 627 native Chromium cases**, zero failures, skips or cancellations. PostgreSQL 17, institutional concurrency and the aggregate release check also pass. Automated code review reported no findings.

Hosted preview and canonical production static readbacks match the reviewed build: **29 HTML pages and 124 immutable assets**, exact SHA-256, manifest bytes, release identity before/after, all five security headers, cache policies and MIME types. Each verification includes 156 logical file reads covering 155 unique static files. The production check also confirms platform HSTS and the absence of an enforced CSP header. It fetches public bytes only, following same-origin clean-URL redirects within a reviewed static path allowlist; it sends no application credentials and executes no JavaScript.

The owner authorized private expiring preview access for static checks only. Vercel reused an existing link within the authorized 23-hour bound. Its URL, token and cookies are omitted from public evidence, and temporary local access files were deleted. Two initial preview bootstrap comparisons retained a hash difference caused by Vercel's injected feedback toolbar. Request-only `x-vercel-skip-toolbar: 1` suppresses that injection, after which the unmodified verifier matches every served file exactly. No Vercel project setting or production verifier was changed. The optional preview toolbar uses `vercel.live`; account for it before enforcing CSP. This readback runs no scripts and establishes no hosted runtime violation observations.

The production build became READY while the custom domain still served the previous commit and main CI was pending. Canonical verification waits for the exact merged source before testing files. Deployment state alone is not counted as a usable or verified release. The documentation closure preserves all runtime, archive, backend, workflow, dependency and deployment-configuration bytes; exact closure checks and final source are linked from the closure PR/Notion checkpoint.

## Production QA and remaining gates

Existing production preflight now checks security headers on the release marker, manifest, every HTML page and immutable asset. Missing headers or a single stale asset policy fail before signed-in acceptance. Existing exact-source, hash/cache checks, 20-second request limits and six-request batching remain. Header checking adds no requests. The 31 focused build/release-safety tests pass.

Seven workflow path lists add the shared module. All 20 designated-fixture workflows retain serialization/queue:max, and all 16 owner manual-only conditions remain byte-identical. No production locators or fixture-account expectations change.

**Affected production QA:** Mobile; teacher feedback; resource assignments; English Units 1–3 pilot reads; Chapters II–VI pilot reads; Sprint 14 actions; Sprint 14D analytics. Shared headers/imports affect their frontend dependencies. The independent teacher-performance/loading and Sprint 15A3 manual UI runners also consume affected pages. If requested, a targeted Mobile/teacher-feedback/resource-assignment run is the first recommendation; no manual run is dispatched here.

**Production QA not run (paused by owner).** All 13 production workflows triggered by the functional merge were skipped; none was dispatched. No preview/production application sign-in or Supabase request was made. Isolated role/Auth/media tests remain separate evidence. Stage 1 merge/release and static verification are complete. Deployed report-only observations, CSP enforcement and owner usability remain open. B.12.3/B.12 and independent content/security gates retain their scope; BF-02 stays deferred and subject work stays paused. No backend, schema, Auth setting, scoring or content release changed.

No central CSP collector is installed. The next BF-13 stage needs authorized browser observations of legitimate flows and violation review, including BF-15 provider/CAPTCHA origins and the optional Vercel preview toolbar. Propose and test an enforced policy only after that review and obtain release approval. Static file/header checks do not establish signed-in usability or production CSP violation coverage.

[Verification receipt](../evidence/browser-security-20261110.json)
