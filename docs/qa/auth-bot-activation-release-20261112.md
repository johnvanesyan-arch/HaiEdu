# BF-15 — live bot-protection release and limited pilot settings

12 November 2026 (Asia/Yerevan). Owner-approved [PR474](https://github.com/johnvanesyan-arch/HaiEdu/pull/474) is merged at `b3cc1dce2bbca8a31803b59c2866c1688e608d7a`. Its tree is identical to the approved head `18c0cf36ede512f806c32c400869ca580183f95a`. The website update is live on both canonical domains and the public Vercel address. Free server-side bot verification is enabled and its negative and positive checks pass.

Owner usability acceptance: given for the horizontal security-bar display only; not given for broader account flows.

## Delivered behavior

Sign-in, registration, reset-email requests and recovery from the shared account page use the reviewed Turnstile integration. The owner-selected display is an always-visible 300 × 65 horizontal bar, replacing the 150 × 140 square. Narrow-phone spacing preserves the complete provider bar, branding and controls without scaling or clipping. The source and native fixtures cover every affected form and all five shared-account roles, including normal and doubled text at 320, 375 and 1,280 pixels.

Account entry waits for initial Auth processing before loading the challenge. Shared address cleanup removes Auth-link values before provider loading, preserves valid classroom-join return codes and prevents panel navigation from restoring removed invitation values. Repeated persisted page transitions invalidate stale widgets and restore one fresh account-entry challenge. The existing six-character password rule, longer-password support and separately accepted provider limitation retain their earlier scope.

The browser contains only the public site key. The owner entered the private Secret Key directly in Supabase. No private key was received by the agent, committed or published. No schema, Edge Function, authorization, learning/content, package, workflow or billing change is included in this functional release.

## Verification

All five [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43194654488) and all five [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43198563333) pass on attempt 1: 1,803 code/integration tests and 679 native Chromium cases, with zero failures, skips or cancellations. Native fixtures use intercepted Auth/provider responses. Persisted-lifecycle tests dispatch native page-transition events; actual browser-cache eligibility is not claimed. The earlier failed source regressions, layout attempt and external-browser certificate attempts remain retained in the private audit.

All three public addresses serve exact source `b3cc1dce2bbca8a31803b59c2866c1688e608d7a` and build `470d8aa7b00f04e2f08f0649878d6640ad18262e1322456c1a1d318bbd6e400a`. On each address, 29 HTML pages and 126 current immutable assets match the reviewed hashes, MIME/cache rules and security headers. The browser policy remains enforcing. Fresh verification used 719 static-file requests and 12 release/manifest requests, including redirects. Those reads executed no page scripts, signed in to no account and made no Supabase request. Domain assignment was automatic; no manual promotion or alias setting was changed.

The existing `provision-student-account` service is still ACTIVE v5 with JWT verification retained. Its entrypoint and unchanged shared Auth helper read back byte-exact against the reviewed source. No function was redeployed. This source readback is not a fresh production invitation or email-delivery check.

## Server verification and owner configuration

The owner confirms CAPTCHA enabled with Cloudflare Turnstile and the matching widget Secret Key saved. Administrative configuration could not be independently read through the connection. Functional behavior was then verified separately: missing and invalid challenge tokens on password authentication and a missing token on recovery each return `400 / captcha_failed`, without a session.

For the positive check, the owner loaded the live reset form, completed a fresh real Cloudflare challenge and submitted a reserved address independently confirmed to have no account. The expected conditional recovery confirmation appeared. A bounded gateway-log query independently confirms one successful live-site SDK recovery request with no privileged authorization; the three corresponding rejection controls remain `400`. The reserved identity still has zero matching accounts after the check. This verifies accepted real-provider validation without a password, sign-in, new account or real email recipient.

Earlier real-token rejections are retained separately. The owner re-saved the matching Secret Key and used a fresh page before the successful final check; the exact earlier configuration cause was not independently established. The first direct-checker attempt also misread the numeric status field as the provider error code; that harness failure is retained beside the corrected results. No earlier failed attempt is relabeled as passing.

The owner selected the existing Gmail sender for a limited first pilot and confirms saving the agreed project email budget. Detailed live settings and dashboard readback stay private. The earlier reported-version isolated service captured the proposed test email budget locally and demonstrated paced access for 100 password sign-ins. Those tests isolate rate behavior with CAPTCHA disabled; they do not qualify live Gmail throughput, simultaneous first-time setup or combined classroom load. Invite and finish initial setup before lessons, then stagger classroom sign-ins. The provider's separate sending limits still apply.

## Production QA and remaining gates

Production QA not run (paused by owner). All 13 triggered production acceptance runs skipped; none was manually dispatched. Affected production QA: mobile browser, teacher feedback, resource assignments, Sprint 14 institutional actions, Sprint 14d analytics, Chapter II–VI pilot-read and English Unit 1–3 pilot-read suites. Shared dependency coverage and reviewed-main, fixture, serialization, isolation and cleanup guards are preserved.

The owner explicitly excluded production QA from this work. The recorded direct-password automation consumers remain unqualified with server CAPTCHA; review a compatible sign-in setup before any later resumption. No privileged automation bypass is introduced. The bounded non-account Auth checks above are separate from production QA workflows and do not use designated QA accounts.

The free bot-protection activation and selected pilot settings are delivered within these verification limits. BF-15 remains open for the optional paid stolen-password decision and wider real-email/classroom qualification and account-flow usability. No paid upgrade was made. BF-16's shared application limiter, independent review, BF-02 deferral, content gates and paused subject expansion retain their separate scope.

[Verification receipt](../evidence/auth-bot-activation-release-20261112.json) · [Candidate and retained history](auth-bot-activation-20261112.md) · [Configuration sequence and pilot limits](../auth-onboarding-activation.md).
