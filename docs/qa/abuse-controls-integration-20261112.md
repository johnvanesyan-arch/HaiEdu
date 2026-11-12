# BF-16 — application integration candidate

12 November 2026 (Asia/Yerevan). Prepared from merged source `4c7ec3ccdc7aeac8cbb87091a935f18ee99df844` after the owner authorized the next integration phase. All 65 Edge entrypoints now have admission controls in the candidate source. Enforcement defaults to off. This record does not authorize or claim a merge, production migration, Edge deployment, settings change or activation.

Owner usability acceptance: not given. John explicitly approved both Armenian waiting messages below; that copy approval is distinct from acceptance of the finished interface. Paid stolen-password protection remains owner-declined, with no purchase or activation pending.

## Scope and behavior

This is shared, subject-neutral infrastructure. The authenticated person's UUID owns the allowance across tabs, sessions, roles, classes and subjects. A school network address is not a counter key. Current curriculum, grading, tenant boundaries, role/MFA checks and content-release gates remain in force.

The [server boundary](../../supabase/functions/_shared/rate-budget.mjs) uses a closed inventory of 65 server-selected route names. Requests cannot choose another actor, session, policy, cost or enforcement mode. Every applicable cost is reserved in one separately committed RPC before protected business work. Later business failure does not refund it. Repeated live-session checks within an operation do not reserve again.

| Candidate budget | Initial allowance | Refill | Consumer |
| --- | --- | --- | --- |
| Ordinary app activity | 60 requests | 120 requests/minute | Every application Edge endpoint |
| Session starts | 10 starts | 30 starts/minute | `start-learning-session`, in addition to ordinary activity |
| Code/token attempts | 10 attempts | 10 attempts/10 minutes | All three class/institutional/student-invitation redemption endpoints, including malformed authenticated attempts |
| Invitation recipient attempts | 100 recipients | 120 recipients/hour | Student/staff provisioning and staff invitation resend, in addition to ordinary activity |

These are tested candidate values, not live settings or a claim of representative classroom throughput. The existing Supabase Auth shared-address limits and Gmail pilot constraints remain separate. Invite and set up learners before class; the application counter does not enlarge Auth's sign-in allowance.

Student mail cost uses the handler's trimmed, lowercased, deduplicated recipient list, with its existing raw batch maximum of 20. Staff provisioning/resend costs one recipient attempt; listing/revocation and code-only invitation management do not spend email allowance. Attempt accounting is conservative: existing identities, later validation/provider failures and partially attempted batches receive no automatic refund. It is not a count of delivered messages.

For these three mail endpoints, enforced mode reads at most 64 KiB and caches the parsed request for the original handler. Oversized input returns `413`; malformed JSON retains the original handler's `400` behavior after ordinary admission. Padding cannot bypass recipient accounting. Off mode does not pre-read bodies or call a new RPC.

## Session binding and failure contract

The CLI-generated [candidate migration](../../supabase/migrations/20261112172643_bf16_actor_rate_budgets.sql) carries the previously tested counter plus a new service-only `service_reserve_session_rate_budgets(actor, session, costs)` wrapper. It checks the verified token's Auth session/user relationship, revocation, expiry, deletion and ban before reservation and again after any lock wait. A newly invalid session raises an exception and rolls back that reservation. Browser roles cannot execute the capability or read private counter state.

The wrapper deliberately does not replace per-route profile/role permissions. In particular, the existing `deletion_pending` account-deletion cancellation path still works. An active-profile-only generic wrapper would have broken that right.

The server mode is `HAIEDU_RATE_BUDGETS_MODE`: absent, empty or `off` is inert; only `enforce-v1` enables admission. Unknown configuration, storage failures, malformed counter replies and a four-second RPC deadline return a safe `503`. There is no automatic reservation retry. An uncertain reservation may consume allowance, but protected work is not started after that failure.

Enforced refusal returns HTTP `429`, `Cache-Control: no-store`, a CORS-visible integer `Retry-After` header and:

```json
{"error":"rate_limit_exceeded","retryAfterSeconds":60}
```

The response does not expose policies, remaining allowance, database errors or other people's identities.

## Approved interface change

The original class-joining page incorrectly treated a synthetic `429` as a bad class code. Its current source was rendered at 375/1280 pixels and 100%/200% text before the owner reviewed the change. The approved messages are:

1. `Խնդրում ենք սպասել {seconds} վայրկյան և կրկին փորձել։` — Please wait {seconds} seconds and try again.
2. `Չափազանց շատ փորձեր են կատարվել։ Խնդրում ենք քիչ անց կրկին փորձել։` — Too many attempts. Please try again shortly.

All 41 browser modules that invoke the Edge SDK use the [same response boundary](../../web/rate-budget-feedback.mjs). The existing teacher-startup optimization also has a computed raw-fetch URL: it discards non-successful prefetches and falls back once to the ordinary controller, whose SDK request uses this boundary. That bounded read fallback is retained; it never retries a write. Existing provider Auth feedback remains separate. The boundary preserves the original response body, entered work and existing account/request fences. It adds no timer, automatic request retry, sign-out or shared classroom state.

A definite application admission refusal is distinguished from an unknown write outcome or a provider email quota. A refused draft/submission/publication/send keeps its text or selected recipients and releases the existing editing controls. Genuine unknown outcomes retain their existing reconciliation and duplicate-prevention behavior. Master-admin search/paging read failures are caught and shown instead of becoming unhandled promises.

## Deployed-source audit

All 65 current deployed bundles were freshly read without invoking their business endpoints: 272 file occurrences, comprising 264 byte-exact matches to the base, seven trailing-newline-only differences and one older shared file. The [review/deployment manifest](../evidence/abuse-controls-edge-manifest-20261112.json) records every route, intended file hash, baseline version/artifact and existing gateway JWT setting.

The older copy is `governed-learning-runtime.mjs` inside `get-student-dashboard`. Its sole imported export in that bundle is `verifiedSessionClaim`, whose body is unchanged; differences concern other learning/hint routes. Nine other deployed consumers already carry the base helper. The candidate deployment will align this copy with reviewed source; no unrelated learning behavior change is claimed by this comparison. Preserve each existing gateway JWT setting rather than imposing one value on all functions.

Read-only catalogue checks confirm the required Auth columns exist. The new tables and session-bound RPC are absent in production; no counter is installed or enabled. The connection also reports no `pg_cron` extension. No cleanup scheduler was installed or silently added to this migration.

## Verification and limits

The [machine-readable evidence](../evidence/abuse-controls-integration-20261112.json) records final check outcomes. Verification includes real handler/shared sources, embedded SQL, independent PostgreSQL 17.6 connections and native Chromium with synthetic identities/services. It is not fresh signed-in production acceptance.

- All 65 actual endpoint paths refuse before business work and expose the same header/body contract; all retain anonymous rejection and OPTIONS handling without counter allocation.
- Optimized teacher directory/class paths are covered, along with one-reservation repeated-session checks, a failed code business operation, and deletion cancellation while the profile is pending deletion.
- Real PostgreSQL checks cover 40 competing callers, 120 logical people through up to 24 connections, session expiry/revocation/ban/deletion during a real lock wait, separate business rollback and rollback/reapplication.
- Native regressions cover all four main roles, phone/desktop and enlarged text, retained code/email/text/recipients, editable definite refusals, no automatic write retries and stale-account replies. Two new cases fail as expected against the previous source.
- Full code/browser suites, bundle/archive checks, type/syntax checks, public-email scan and production-QA dependency currency are required before PR handoff. Exact-head CI remains the merge authority.

Local verification passes 1,839 code tests. The broad native run exercised 696 cases: 690 passed, five failed and one was cancelled because two isolated fixtures omitted the new shared module. Those fixtures were corrected, and all nine cases in their two files pass on rerun. The 696 distinct cases are covered across that broad run and corrected-fixture reruns; this is not represented as one all-green local invocation. All 17 newly added native cases pass. The full 696-case exact-head CI run remains required. Nine new PostgreSQL 17.6 checks pass. Bundle/archive parity, type/syntax, public-email and QA-routing checks pass. No failed case is waived.

Production QA not run (paused by owner). Affected production QA: all 16 automatically triggered suites — Mobile Browser QA; Teacher Feedback; Resource Assignments; English Units 1–3; Chapter II–VI read acceptance; Sprint 14 actions; Sprint 14D analytics; Sprint 15A3 authenticated QA; Teacher Performance; Teacher Loading Rollout. Their new dependency paths remain current, with the existing pause, reviewed-main guards and shared non-cancelling fixture lock retained. No workflow was dispatched and no protected fixture account was signed in manually. Any future targeted production run remains John's decision; existing CAPTCHA/bootstrap qualification limits still apply.

## Reviewable release sequence

| Step | Concrete boundary | Estimated active time |
| --- | --- | --- |
| Review and merge this PR | Exact-head five-job CI, explicit PR approval and fresh no-other-merger confirmation; frontend remains compatible with enforcement off | 15–30 minutes, excluding owner/CI waits |
| Install the approved candidate and deploy all 65 bundles | Separate specific production approval; preflight live source/schema/settings, preserve gateway settings, deploy/read back every manifest file with enforcement off | 30–60 minutes |
| Qualify and activate | Approved representative test route/accounts, account-flow readiness and a bounded cleanup/monitoring arrangement; explicit approval of candidate policy values and activation | 30–60 minutes, excluding classroom scheduling |
| Observe the first real pilot | Confirm actual classroom/email behavior with the owner and adjust only through reviewed changes | Scheduled with owner |

The prepared [rollback](../../supabase/proposals/bf16_actor_rate_budgets_rollback.sql) first requires the mode off for all consumers. It then removes only BF-16 state/capabilities, preserving Auth and business records. Isolated rollback/reapplication is verified. Counter cleanup remains a service-only bounded capability (default 200, maximum 500, skip locked); a recurring maintenance mechanism and monitoring are activation work, not claimed installed retention.

This candidate does not open a curriculum release, authorize real-account sign-in or email, resume production QA, change billing, or grant production-write permission.
