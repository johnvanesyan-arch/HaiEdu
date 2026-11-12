# BF-15 — account policy and bot-protection preparation

**Subsequent release:** Owner-approved PR472 is merged, live and source verified. See the [12 November release record](auth-onboarding-release-20261112.md). The preparation and earlier-run evidence below remains historical.

Prepared 12 November 2026 (Asia/Yerevan), against merged baseline `9c326d1c5c1a8f53f268f1946f35e488d5baeff5`. This is a functional candidate, not a merged release or a live-settings change.

The owner approved a minimum of six actual characters, longer passwords allowed, and the remaining account-feedback, classroom-capacity and bot-protection preparation. The managed provider's character-counting limitation has a separately recorded owner disposition; identical Unicode enforcement by the provider is not claimed. Detailed configuration findings and that disposition remain in the private audit.

Owner usability acceptance: not given.

## Prepared behavior

Registration, invited-student setup and password recovery use a shared six-character check and matching Armenian hints. Unicode characters are counted as characters; passwords are not trimmed or truncated. Existing sign-in passwords pass through unchanged. Mismatched confirmations, weak-password replies, request/email limits, challenge problems and transport failures receive distinct Armenian feedback. Unknown provider details are not echoed. Pending form submissions are serialized, and failed requests restore explicit retry.

The shared account-security page uses the same feedback for every role. It retains its existing account-generation fence: old responses cannot replace a new account's messages, and earlier challenge tokens cannot be used for the current account.

Cloudflare Turnstile support is prepared for sign-in, registration, reset-email requests and shared account-page recovery. The public configuration defaults to disabled with no site key. The widget loads once per page when configured; retries, expiry, disposal, panel/account changes and token consumption have native-browser regressions. Pending invitation query tokens are removed from the address before any challenge provider can observe the page, while the Auth fragment is retained for SDK session establishment.

The enforcing browser policy adds only the reviewed provider origin for scripts and frames. Existing security headers and restrictions remain in the policy. Inactive configuration makes no provider request.

The student-invitation function prepares compatible server-owned delivery after its existing actor, active-session, role, assignment and recipient checks. Request/response contracts, token ownership, recipient-creation restrictions, partial outcomes and cleanup remain intact. Only this Edge Function needs a reviewed deployment; `_shared/auth.ts` is unchanged. A merged source file alone is not a deployed function.

Classroom email/shared-network capacity has a separate private planning record. No new live rate values have been selected, and BF-16's shared application limiter is not implemented here. Known-leaked-password rejection remains a separate owner plan decision; no subscription or billing change was made.

## Verification and release boundaries

The evidence receipt distinguishes local unit/integration results, native-browser fixtures, prior-source regression failures and a same-version isolated Auth/SMTP fixture. Native fixtures use synthetic accounts/replies and intercept provider requests; they are not signed-in production acceptance. The isolated service uses disposable PostgreSQL and local captured mail, not the production project. Real-key provider verification remains a later activation gate.

The original source reproduces both the old minimum-length constraint and misleading request-limit message. The first full root run also exposes omitted new shared dependency paths in two paused acceptance-workflow trigger lists; those paths are added without changing permissions, reviewed-main execution, fixture serialization or pause conditions. Earlier failed setup/verification records remain retained; they are not counted as passing evidence.

All existing required CI jobs and the aggregate release check remain required. Current validation and exact release status are recorded in the [candidate evidence](../evidence/auth-onboarding-20261112.json). Prepared code is not a claim of enabled CAPTCHA, qualified live limits, production email delivery or owner usability acceptance.

Production QA not run (paused by owner). No production sign-in, email, database write, schema change, Edge deploy, hosting setting change, CAPTCHA activation or billing action was performed while preparing this candidate.

Affected production QA includes shared account-entry/recovery and invitation consumers and browser acceptance that checks the shared security policy. Teacher feedback and institutional analytics gain the four new shared dependency paths. Existing acceptance scripts retain their locators and request/response contracts; the activation runbook separately requires review of trusted automation Auth consumers before future server CAPTCHA enforcement.

BF-01 independent review, BF-02 deferral, owner/content gates and subject-expansion decisions retain their separate scope.

[Configuration and activation sequence](../auth-onboarding-activation.md).
