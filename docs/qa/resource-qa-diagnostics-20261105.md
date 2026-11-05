# BF-06 — resource acceptance failure investigation and safe request diagnostics

**Verified delivery update — 5 November 2026:** BF-06 implementation and technical acceptance are complete on PR414/main `e25cebe257054041e1aaa82d7367f03b453d9d6f`. All five PR/main gates and the complete five-suite automatic production batch pass. The original preparation/investigation snapshot below is retained; [the final delivery record](browser-build-delivery-20261105.md) supplies actual source provenance, cleanup and limits. BF-37 transport cause, owner usability and other independent gates remain open.

Date: 5 November 2026, Asia/Dubai. Live source: PR411/main `c9c1632d8b58cc1a384a9df677f65f27e648cefd`. This is QA-only work; the compiled build remains `1b2a2a8183caa8e581c44bc4f642ce797f4d3511cae944c67c31aedd7a58ed57`.

## Confirmed results and retained failures

PR411 fixes the supplemental raw-HTML expectations. All five PR/main CI jobs pass (1,733 unit/integration;455 native). Fresh mobile, feedback and English Units1–3 pass:597 main assertions and378 isolation controls. Their exact source is c9c1632; they do not establish completion of resource acceptance. Original PR410 resource5/6 and feedback4/5 raw-template failures remain separately recorded.

Resource run42003567660 attempt1 reaches254/255 before the learner task-inbox request returns401. At10:07:45 UTC, a separate non-headless browser globally signs out the same designated QA account. Auth audit and request logs correlate that successful logout with session_not_found on the next QA request; a scoped read-only query confirms the exact run session is absent. The access token had not expired. All two resources are withdrawn, four resource assignments, two writing assignments and one custom delivery cancelled. Five own Auth sessions close204; the already revoked session's cleanup returns403 and is not relabeled successful. The remaining custom-task/usability checks and final isolation are not claimed.

After verified cleanup and completion of the existing queue, one complete same-source retry uses fresh ordinary sessions. Attempt2 reaches110/111 and fails A_student assignment inbox withHTTP0. Its one resource is withdrawn, both resource assignments cancelled and all six Auth sessions close204; writing/custom delivery has not started. Provider function/gateway logs do not identify the missing request. The old wrapper discarded the exception, so an exact timeout, network or response-body cause cannot be established. This is retained as a new occurrence of the existing QA-TRANSPORT-01/BF-37 investigation, not a proven Auth or build defect.

[Sanitized failure receipts](../evidence/resource-qa-failures-20261105.json) retain both attempts, their actual counts, cleanup and unexercised scope. No further blind retry is used to hide the failure. The chat connection interruption itself has no established cause in these project records.

## Bounded correction

The new resource request adapter composes the existing privacy-safe timing/error recorder. It reports the actual resource deadline of25,000ms, elapsed time, whether headers arrived, a validated provider request ID when present, a fixed error phase/category/code, the observed response status and opaque W3C trace context. Actor labels and endpoint names are allowlisted; URLs, query secrets, request/response bodies, credentials, tokens, error messages/stacks and arbitrary error/header values are excluded from diagnostic records.

The existing shared recorder and isolation runner are unchanged. Resource requests remain one POST each, with the same redirect policy, payload, authorization, multipart behavior and25-second deadline. JSON/empty logout/PDF result semantics remain unchanged, including distinguishing a failed PDF body from a request that never received headers. There are no automatic retries, extended timeouts, accepted authorization failures or new production privileges. Optional diagnostic-recorder errors cannot change request outcomes or cleanup.

The adapter covers all resource-runner direct Auth/API consumers, including supplementary resources, resource assignments, writing delivery, custom teacher tasks, cross-role reads and cleanup. Browser mutation allowlists, reviewed-main/exact-source guards, designated fixtures and the shared serial/non-cancelling queue are preserved. Existing broad scripts triggers cover resource, mobile and English Units1–3. No browser application, build/archive, database, Edge, Auth setting, account or grading changes are included.

## Validation and remaining work

All1,740 local unit/integration tests pass with zero failures/skips/cancellations. Twelve focused tests pass, including seven adapter regressions for request/deadline parity, multipart/PDF bytes, no-retry network errors, client deadline classification, malformed JSON and empty logout semantics, body-read failures, and private metadata exclusion. The dependency guard verifies20 shared-queue workflows and12 acceptance entrypoints. Full final-head/main CI and instrumented production resource acceptance must be recorded before BF-06 closure. No passing result is prewritten.

BF-02 remains owner-deferred. BF-01 independent review, BF-03 replacement-account/evidence decisions, BF-04/BF-05 owner usability/coverage and other content/security gates remain open. BF-07 has not been implemented; it follows verified BF-06 acceptance. The exact intermittent transport cause remains open under BF-37 even if a later full acceptance run passes.
