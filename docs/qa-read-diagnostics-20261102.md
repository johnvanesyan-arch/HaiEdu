# QA read diagnostics — 2026-11-02

Delivered through [PR385](https://github.com/johnvanesyan-arch/HaiEdu/pull/385), main `524a4ee5d8c45117410babeb82b0225ee31f1d16`. Required PR/main CI, canonical source and one guarded hosted read are verified. [Delivery receipt](evidence/qa-read-diagnostics-delivery-20261102.json). B.12.3/B.12 remain open for owner usability acceptance; subjects stay paused. The historical no-response incident is not declared repaired.

## Scope and invariants

Every request made by the shared Node `runIsolation` helper adds `checks[].diagnostics` under `diagnosticsVersion: haiedu-qa-read-diagnostics-v1`. Fields are UTC `startedAt`, monotonic `elapsedMs`, `headersAfterMs` when a response is obtained, the existing `timeoutMs: 20000`, a random `traceId`, and a UUID-shaped `providerRequestId` only when the `sb-request-id` response header supplies one. An absent response never creates a provider ID.

Each request carries a fresh W3C `traceparent`. There is no baggage, tracing SDK, dependency, exporter or additional destination. Supabase documents standard propagation in [client-side tracing](https://supabase.com/docs/guides/observability/client-side-tracing); this delivery separately verifies correlation for the actual raw-fetch QA client.

Failures add only fixed `failurePhase` (fetch/body), `failureKind`, an allowlisted Node `failureCode` when available and `timeoutSource` for timeouts. Categories distinguish client deadline, transport timeout, abort, network/DNS, TLS, invalid request, invalid JSON and unclassified fetch/body failures. Error messages/stacks, arbitrary error names/codes, URLs/queries, bodies, tokens, cookies, credentials, learner identities and arbitrary headers are excluded. Only `sb-request-id` is read; malformed header values and optional metadata/clock errors cannot change request results.

The original 20-second deadline, single attempt, methods/payloads, HTTPS-origin validation, 54 positive/negative controls, foreign-identity scan, expected denial codes, stopped-negative-probe rule and own-session cleanup remain. The legacy full-dashboard positive control retains its exact payload without a faster `readMode`. Empty 204/logout bodies are normal. Invalid JSON retains the actual HTTP status and null data; only a rejected fetch returns the existing HTTP 0 placeholder. Diagnostics do not decide pass/fail.

Application/UI, SQL/Edge deployment, authentication, grants, learning/content/audio, role authority, domains, plans, projects, queue/mutex and release gates are unchanged. The normal pipeline stamps the current source revision. No browser/credential workaround was used.

## Consumers and trigger coverage

The [preparation receipt](evidence/qa-read-diagnostics-preparation-20261102.json) preserves the initial scope and local evidence: 12 importing isolation runners, two constant-only learner recipes and the standalone isolation CLI. Each invoking runner retains the nested diagnostic fields. This is shared QA infrastructure without a subject or grade assumption.

The path checker previously missed compact static imports such as `import{...}from'./module.mjs'`. It now recognizes compact imports/re-exports without matching longer identifiers. Literal dynamic imports and relative HTML/CSS dependencies remain covered. Explicit main paths include the newly visible Teacher Feedback dependency chain and its service dependencies, plus the helper in five other affected workflows. All 11 dependency graphs pass. Manual-only workflows remain manual; bounded teacher-performance recipes retain their entrypoint routing. Computed recipe calls and direct CLI use were reviewed. The shared serial mutex, main/fixture/source guards, permissions, secrets and timeout values are unchanged.

## Verification and release

All 27 focused cases pass: timing and correlation shape, the exact budget, deadline versus transport classification, allowlisted codes, malicious error/header privacy, optional diagnostic failures, normal empty logout, unchanged 54-control success, one-attempt failed full read, actual-status invalid JSON and session cleanup. These injected failures are isolated tests, not reproduced live incidents. All 1,649 local unit/integration checks, typecheck, Node syntax, 11 dependency graphs and diff checks pass.

The first PR native run [41425426290](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41425426290) failed 390/391 at an immediate School Admin disclosure attribute read after `press('Enter')`. Native disclosure assertions now wait for the same exact state across School Admin, Master Admin and student Home, retaining keyboard, nested-parent and folded-history checks without sleeps or retries. The next run [41426460942](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41426460942) passed the four admin cases but failed 390/391 because the Home edit lacked its `expect` import. That test-only import was corrected. Both failed receipts remain failed.

Final corrected-source [PR CI 41427747912](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41427747912) and [main CI 41428954690](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41428954690) pass all five required jobs: 1,649 unit/integration and 391 native checks, zero failures/skips/cancellations. Local Chromium is unavailable; local syntax/source inspection is not represented as a native browser run. Product visual inspection reuses unchanged, source-equivalent evidence; the 391 native tests are fresh and do not constitute owner usability acceptance.

Candidate `dpl_CWiwJfLw4eerL7YSYcsofMV7i64x` was READY while the canonical hostname still served the previous revision during main CI. After the main gates passed, the canonical deployment and public `release.json` matched `524a4ee5d8c45117410babeb82b0225ee31f1d16`. Independent Production/Blocking configuration evidence from 2026-10-31 is reused; no release setting was changed. Runtime root hashes are recorded in the receipt.

## Controlled hosted diagnostic result

The existing main-triggered [Chapter V read-only run 41428954766](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41428954766), attempt 1, passed **191/191** checks and **54/54** nested isolation controls against the exact merged/canonical source. It ran from 10:35:20.249 to 10:40:57.620 UTC. It retained the designated two-school fixtures, source guards, original mutex and read-only learning behavior; no additional acceptance run or write retry was dispatched.

All 54 isolation requests captured finite timing, the unchanged 20,000ms budget, distinct valid trace IDs and valid provider request IDs. No failure category appeared on these successful/expected-denial requests. All six nested and six parent QA sessions closed with HTTP 204. Both browser journeys recorded zero page errors and zero blocked/mutating requests. The recipe preserved existing baseline/session/history/learning state across five pilot units. This is not a completed learner attempt, specialist approval, teacher question-bank isolation certification or owner usability decision; the artifact retains those limitations.

Artifact 13133788788 has verified ZIP SHA256 `2901bc9050ab9ebcf4a40f1d68aa4f73cf6533f876e231ce27b662b35f15aa7d`; the report SHA256 is `463b0dfc17b6510ac96e2a0a72cd85f0ef09f67899ed73c05b1f67801c74c618`. The retained diagnostic subset is in the delivery receipt.

The exact previously failing **A: teacher own class evidence** control returned **HTTP 200 in 12,526ms**, with headers after 12,521ms. A bounded 10:35:20–10:36:05 UTC provider query found the exact client trace ID in 74 API gateway records. The returned provider request ID independently matched one function-edge and one function-log record. Those function records did not expose the trace ID; a single record containing both identifiers is not claimed. Only source labels and aggregate counts were returned, without JWTs, bodies, raw headers or learner data.

## Historical incident and remaining limits

Resource 41346785982 remains **failed 326/327**. Its earlier 200/6577ms server record now correlates through hashed designated-fixture IDs to teacher B; the failing class read was teacher A. No matching teacher A dashboard invocation was found in the bounded 2026-11-01 20:42:40–20:46:00 UTC window. The gap is consistent with the old 20-second client deadline, but the old client did not preserve an error category, duration or trace ID. The separate later 130/130 plus 54-control read remains independent evidence. Original failed/cancelled/unknown receipts are not rewritten or retrospectively passed.

This fresh read verifies diagnostic capture and provider correlation; it does not reproduce the old transport failure, identify its raw cause or establish a free-plan quota cause. The raw no-response incident stays open for evidence-based follow-up if it recurs. Failure classifications/privacy are verified through isolated injected cases. Documentation closure follows the normal PR/main gates, then source-verified synchronization of the existing Notion map while retaining all 13 child pages and independent security/routing gates. Next remains John’s focused usability review and explicit acceptance; B.12.3/B.12 are open and subject expansion is paused.
