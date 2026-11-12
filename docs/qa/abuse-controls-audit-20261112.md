# BF-16 — abuse controls that preserve classroom access

**Subsequent integration candidate:** [all 65 endpoint integration, approved wait copy and candidate migration](abuse-controls-integration-20261112.md) are now prepared. This file preserves its earlier checkpoint; statements that no handler or registered migration exists below are historical. No production installation or activation is claimed.

**Subsequent first-stage implementation:** the [isolated counter and verification](abuse-controls-core-20261112.md) are now prepared. This audit preserves the earlier proposal checkpoint; its implementation-not-started wording below is historical. Live integration/activation remains open.

12 November 2026 (Asia/Yerevan). Audit and implementation proposal, based on merged source `fffe31abb188ff88e6746b2b8216c1472abf1737`. This is the first BF-16 deliverable: review existing protections and propose suitable limits. The limiter is not implemented, merged, deployed or enabled by this record. Production configuration is unchanged. Owner usability acceptance: not given.

John requested BF-16 after the verified BF-15 free bot-protection release. He also explicitly declined paid stolen-password protection again. That paid feature is an owner-declined option, not a pending purchase or an outstanding BF-15 decision. Real-email delivery, representative classroom qualification and broader account-flow usability remain separate open work.

## What the audit establishes

The QA plan's `P1:A2` and `P1:A4` identify rate limiting and failed-code-attempt controls. Its suggested `120/30/10` values were proposals, not measurements or approved settings. Fresh source review covers all 65 Edge entrypoints and their local shared dependencies. The deployed function-name inventory also contains those same 65 functions. No shared application limiter is found in this source/dependency audit or the bounded database catalogue search. This does not prove the absence of infrastructure or external controls that this connection cannot inspect.

| Surface | Existing protection | BF-16 finding / consequence |
| --- | --- | --- |
| Supabase sign-in and recovery | Verified free Turnstile enforcement; provider Auth quotas | These provider endpoints retain their existing controls. A limiter inside HaiEdu's Edge handlers cannot change the provider's shared-IP sign-in bucket. |
| 65 application Edge endpoints | Existing verified identity and route-specific authorization, role/session checks and database boundaries | No shared per-person/action request budget is found. A change only to `join-class` would leave the rest of the application outside that delivery. |
| `join-class`, institutional invitation redemption, student invitation completion | Authenticated recipient, existing ownership/eligibility checks and strong existing code/token formats | No application attempt budget is found. Repeated valid-format guesses can reach the lookup path. Rejections must remain generic. |
| Invitation emails | Existing authorization, recipient ownership, provider quota feedback and a 20-recipient student batch limit | HTTP-request counts alone do not control email work: five legitimate batches can onboard 100 students, while one batch can represent 20 deliveries. Count delivery attempts separately. |
| Joining-class browser feedback | Duplicate-submission prevention and current-account fencing in the modern join page; a retained legacy join module | Temporary quota failures currently share generic failure text. Preserve existing account/response protection and distinguish waiting from a bad code. |
| Browser Data API / Storage paths | Existing permissions/RLS and upload/download contracts | No literal browser RPC call was found in the reviewed unbundled modules. Profile/school reads and task-file access remain separate surfaces; an Edge limiter is not a Data API/Storage-wide limiter. |

Fresh deployed readback of the three code-redemption entrypoints matches the reviewed source byte for byte. Their dependency bundles contain seven file occurrences: six are byte-exact; the student-invitation bundle's shared Auth helper has one extra final newline and otherwise matches. This is a retained formatting difference, not a confirmed behavior difference. No function was redeployed. The three corresponding service RPCs are not executable by `anon` or `authenticated`; service-role execution is retained. No invitation, membership, account or other application record was created by the audit.

The inventory's identity/session string markers are navigation aids, not a security verdict. Five read handlers use verified-claims helpers instead of a direct `auth.getUser` call. The workspace validates its live actor/session inside existing SQL and checks again afterward. Privacy handlers retain their existing authorization paths. BF-16 must preserve every current authorization result; it must not silently normalize or weaken unrelated Auth contracts.

## Recommended design

This is shared, subject-neutral platform behavior. Limits must not depend on a subject, grade, unit, class, school internet address or privileged role exemption.

1. Derive the person ID from the existing verified identity, and retain the current live-session/authorization checks. Never accept the actor, quota, policy name or cost from the request body, unverified token contents or editable user metadata. Switching sessions or devices must not reset one person's allowance.
2. Give every entrypoint an explicit policy classification. There are 26 read endpoints, four learning/event endpoints, three code-redemption endpoints, four invitation-management/mail endpoints and 28 other management endpoints in the audited inventory. Multi-action routes need classification by validated server-side operation; listing invitations must not consume an email allowance.
3. Use shared database state so requests reaching different workers share one allowance. Prefer an atomic, bounded token-bucket implementation in the existing PostgreSQL service over an in-memory `Map` or a new paid service. It requires a reviewed migration and isolated PostgreSQL/concurrency proof before production approval.
4. Use a fixed set of actor/action keys. Class IDs, supplied codes, email addresses, token digests, raw IP addresses and arbitrary client strings must not create quota rows. Trying a different code, changing endpoint aliases or opening another session must not evade the code-attempt budget. Students using the same valid classroom code must have independent allowances.
5. Consume all applicable budgets atomically in a stable lock order; either reserve all or reserve none. Use the database clock, not client timestamps. Return a decision and a bounded positive wait duration. A denied request must not continually extend its own wait or keep rewriting a quota row.
6. Reserve an attempt before code/token lookup. Count every valid-format lookup, including successful ones, rather than implementing an unsafe read-then-increment failed-only counter. The cheap syntactic rejection still falls under the general request budget. This keeps concurrent guesses bounded without a success/refund race. Keep current cryptographically generated eight-character class codes and 32-byte invitation tokens unchanged.
7. Keep the quota decision in a transaction that commits independently of a later failed business operation. The existing redemption RPCs can raise exceptions; adding the counter to that transaction and then raising would roll the counter back. No account or class is locked globally because someone guessed its code.
8. Restrict the state table and quota functions to the server path. Use a private schema, minimum service grants, a fixed search path and defense-in-depth RLS. No browser role may read, clear, spoof or spend another person's budget. Do not put a mutable counter in a per-row RLS predicate or a global PostgREST pre-request hook and describe it as coverage of every Supabase product.
9. Bound storage to known policy keys per active person. Index expiry, remove idle rows in bounded `SKIP LOCKED` batches, define a short retention period and measure table/index/WAL growth. Refused requests should not generate an append-only event or audit row each time. Sanitized aggregate observations must exclude codes, tokens, IPs, email addresses and learner response bodies.

## Initial test policies — proposals only

These are candidate inputs for isolated testing, not approved live limits. A token bucket permits the stated initial burst, then refills at the stated rate; the rate is not a fixed-window maximum. Provider Auth and project email settings remain unchanged.

| Server policy | Sustained refill | Initial burst | Purpose / qualification |
| --- | --- | --- | --- |
| Shared authenticated application requests | 120 per minute per person | 60 | Applies across all 65 endpoints and aliases. Verify normal startup, practice, saved work, teacher refresh and file-ticket requests fit. |
| Starting learning sessions | 30 per minute per person | 10 | Additional to the shared allowance; preserve resume/idempotency, active-session and learning-policy outcomes. |
| Code/token redemption | 10 per 10 minutes per person | 10 | Shared across all three redemption routes. Ten immediate lookups permit several class joins/typos; afterward one token refills each minute. No per-class or per-school lockout. |
| Invitation email attempts | 120 recipients per hour per authorized sender | 100 | Additional to the request allowance. Supports five 20-recipient batches for a 100-student pilot. Reserve the validated recipient count before delivery; resends use the same email budget. Provider/project quotas remain separate and may reject earlier. |

Use one shared policy registry and an explicit classification for every route/action. Unrecognized actions stay rejected under the existing contract; they must not select an unlimited fallback. Reading answers and submitting work share the ordinary request allowance, so a code-guess cooldown cannot prevent a student from continuing an existing lesson. There is no teacher/admin bypass, hard school-wide bucket or subject-specific policy.

The candidate sender allowance must be tested with batch validation, deduplication, partial delivery, provider rejection, reservation expiry and legitimate retry. Do not refund an uncertain delivery in a way that permits repeated mail. Failed-code and delivery counts are operational controls, not learner assessment evidence.

## Browser/API behavior to implement

Return HTTP `429` with stable `error: "rate_limit_exceeded"`, `retryAfterSeconds` and `Retry-After` when an application budget is exhausted. Expose that header through CORS and keep responses `no-store`. Distinguish unavailable quota storage with a retryable `503`; do not label a storage outage as an exhausted allowance. The recommended initial outage behavior is to stop the affected protected operation before its side effect and return the existing safe unavailable path. This behavior also needs isolated failure/recovery tests.

Provide shared plain Armenian feedback that asks the person to wait for the returned interval. Preserve entered work, current-account/generation fencing and explicit retry. A quota error must not be displayed as a wrong code, successful submission, expired account or lost answer. Do not automatically retry writes, trigger duplicate invitations or reset inputs. Cooldowns/timers must clear or reauthorize on account change, sign-out and page restoration. Review the exact messages and affected flows before release; broader owner usability acceptance is not given.

Known direct guess consumers include `web/join.js`, retained `web/class-join.js`, `web/account-access.js` and the guarded Sprint 14 actions script. Generic learning, teacher, school-admin, admin and content-admin request adapters, root compatibility paths and bundled sources must also be audited before implementation. The inventory's string matches do not prove dynamic/computed callers absent. Four entrypoints lack literal-name matches in that inventory and remain part of API coverage. Rebuild every affected browser bundle and immutable asset, preserve archives and update the existing production-QA dependency graph/scripts whenever behavior they rely on changes.

## Verification and release conditions

The following are planned acceptance, not completed tests:

- Run real isolated PostgreSQL17 concurrency checks from independent connections: an exhausted actor cannot exceed the allowance across workers, session rotation does not reset it, rejected business transactions do not erase spent attempts, clock/window boundaries and counter cleanup remain safe, and multi-budget decisions cannot deadlock or partially spend.
- Exercise the real handlers and service-RPC boundary with valid, invalid, revoked and stale identities. Preserve role, tenant, current session, recipient, school/year, ownership, content and learning gates. Test existing and alternate subjects without granting a subject a privileged path.
- From one simulated school address, use at least 120 independent actors for Home/start/practice and teacher refresh; each must receive its own allowance. Exhaust one actor and prove the other 119 remain unaffected. Exercise a reusable legacy classroom code separately from recipient-bound, single-use institutional codes; preserve each code's existing expiry, ownership and redemption rules. These synthetic actors are not a real-provider Auth capacity proof.
- Test 100 student invitations in five batches, limited resends, partial outcomes and uncertain transport; measure queued/reserved/attempted recipients without real email delivery. Preserve the existing quota/authorization/rollback contracts.
- Run native browser cases at 320/375/1,280 pixels and 200% text: useful wait feedback, saved inputs, manual retry, no duplicate write, account switches, stale responses and repeated page transitions. Keep upload/audio/answer recovery and idempotency contracts.
- Before wider classroom qualification, use a production-like isolated staging environment for real Auth from a shared IP and a few real browsers, as BF-21/BF-24 require. The BF-15 paced isolated sign-in experiment ran with CAPTCHA disabled to isolate provider rates; it does not qualify the combined live check or remove provider shared-IP limits. Do not load-test production.
- Run all five required PR checks on the exact head. Obtain the specific merge/deployment/migration approval and fresh release coordination, read back every affected deployed function and every shared dependency, verify final main CI and canonical frontend source, then synchronize the merged status to Notion. A source merge alone does not update deployed Edge bundles.

Production QA not run (paused by owner). No workflow was dispatched. This documentation proposal affects no production-QA script or runtime today. Prospective implementation affects every application consumer, including Mobile, teacher feedback, resource assignments, institutional actions/analytics and subject pilot-read suites, plus privileged invitation/onboarding consumers. Preserve all reviewed-main, fixture, serialization, isolation and owned-row cleanup guards. Their direct-password automation remains unqualified with live CAPTCHA; the owner's pause is not passing coverage or authorization to bypass sign-in.

## Work and estimates

| Deliverable | State | Estimated active engineering time |
| --- | --- | --- |
| Existing protection/consumer review and this proposal | Prepared; source and bounded read-only evidence retained | Initial estimate 1–2 hours; review complete |
| Atomic limiter, policy registry and isolated SQL/race coverage | Not started | 1–2 working days |
| All endpoint/action consumers and shared browser feedback | Not started | 2–3 working days |
| Isolated classroom, failure, storage-growth and native-browser qualification | Not started | 1–2 working days |
| Reviewed rollout and deployed readback | Not started | About half a day after prerequisites and approvals; hosted queues extra |

These are initial estimates, not delivery commitments. Staging availability, provider Auth/classroom qualification, recovery/schema prerequisites and owner review may add waiting time. Do not call BF-16 platform-wide or complete until every relevant route, deployed dependency and separate surface decision is covered. The next implementation step is the isolated atomic limiter and tests using the proposed policies; production settings, data and billing remain unchanged by this proposal.

## Evidence and current documentation

[Sanitized inventory/receipt](../evidence/abuse-controls-audit-20261112.json) · [QA sprint plan](https://app.notion.com/p/40d355a472bf8155a838c145acd61419) · [Current Auth/bot-protection contract](../auth-onboarding-activation.md).

Current provider references were read on 12 November: [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), [API security and pre-request scope](https://supabase.com/docs/guides/api/securing-your-api), and [Supabase changelog](https://supabase.com/changelog). The changelog includes CLI v3 behavior changes; this audit does not invoke migration/deployment commands or upgrade a client. Documentation samples and default quotas are not readings of this project's live configuration. Detailed administrative configuration and raw service readback stay in the private audit.
