# Account policy and bot-protection preparation

The owner-approved account rule is a minimum of six Unicode characters for new or changed passwords, with longer passwords accepted within the authentication provider's normal limits. The website adds no twelve-character maximum. Sign-in passes the existing password unchanged. Password setup, recovery and invitation flows use matching hints and validation.

Account entry and shared account-security feedback distinguish password-policy problems, request/email limits, challenge failures and transport errors in Armenian. Unknown provider messages are replaced with safe local text. Shared account changes retain actor/generation cancellation so an earlier account's reply cannot overwrite the current account.

## Current preparation state

`web/auth-challenge-config.mjs` contains public configuration only. The deployed integration remains `enabled: false` with an empty site key. In that state the challenge code does not load a provider script or add a challenge to the page.

When deliberately configured, the adapter covers sign-in, registration, reset-email requests and password-reset requests from the shared account page. Signed-in password updates use their existing authenticated path. Challenge tokens are single-use; expiry, errors, panel changes and account changes require a fresh check. Loading is shared once per page, failures permit explicit retry, and old widget callbacks cannot supply a token to a newer panel/account. Compact provider rendering fits narrow forms.

The only added provider origins in the browser policy are `https://challenges.cloudflare.com` for scripts and frames. The loader URL is fixed in source, and the rest of the enforcing policy is preserved. This candidate prepares Cloudflare Turnstile; it does not enable the live Supabase switch or provision a provider account.

The server-owned student-invitation email path has a corresponding compatibility change. Its existing verified-session, active teacher, exact assignment, recipient and authorization checks remain before delivery. Its request/response shape, one-time invitation ownership, recipient creation rule, rollback and quota outcomes are retained. The approved preparation deployed only `provision-student-account` v5 and read back both files byte-exact; the shared Auth helper is unchanged. See the [release record](qa/auth-onboarding-release-20261112.md).

## Activation sequence

1. Review the implementation, exact required checks and intended rollout. Obtain the project's specific merge/deployment approvals and fresh release-coordination confirmation.
2. Configure a Turnstile widget with the intended exact application hosts. Use provider test keys for isolated development; preview access or Auth activity needs its own applicable authorization. Keep the provider secret in Supabase Auth's provider configuration. The browser receives only the public site key.
3. Put the public site key in `web/auth-challenge-config.mjs` and deliberately enable the browser integration in a reviewed change. Verify real-key challenge loading, expiry, retry and token verification for the affected flows. Synthetic tests do not establish production-key operation.
4. Confirm the approved student-invitation function and its entrypoint/shared files still match the reviewed source; deploy only if a separately approved change makes that runtime stale. Verify the frontend source on both canonical domains. A source merge alone does not deploy an Edge Function.
5. Before live enforcement, review every trusted automation Auth consumer as well as interactive consumers. Direct password-based automation must have a compatible, explicitly reviewed setup. Existing production-QA reviewed-main, fixture, isolation, pause and cleanup guards remain in force. This inactive preparation does not claim to qualify those workflows with server CAPTCHA enabled.
6. Only after compatible frontend/backend/provider verification and a specific owner decision, configure and enable CAPTCHA in Supabase. Record the owner-assisted setting readback and deployed verification. Do not describe disabled or merely prepared protection as enforced.

Each production-setting, deployment and billing action follows the existing approval policy. The present implementation adds no database migration or new learning/content behavior. Production QA remains paused by the owner; no manual production workflow is authorized by this document.

## Capacity and paid-feature decisions

Classroom planning must include every invitation email, public registration confirmation, resend, recovery and staff message, plus the provider's delivery quotas and cooldowns. Email batches do not override the overall email budget. Shared school internet addresses also group learners into the authentication provider's per-IP request limits; plan peak classes and retries before choosing new numbers. Current settings and the private capacity assessment remain in the local audit. This preparation selects no new live limits and does not implement BF-16's shared application limiter.

Supabase's known-leaked-password rejection is a separate paid-plan feature. It checks proposed passwords against known breached-password lists. Length rules and CAPTCHA do not replace that check. No subscription upgrade, billing change or claim of enabled leaked-password protection is part of this implementation.

## Verification boundaries

Required CI includes code/integration, native Chromium, isolated PostgreSQL/concurrency and aggregate release checks. Browser fixtures exercise the actual controllers with synthetic Auth replies and intercepted provider loading. A same-version isolated Auth service checks the trusted-server delivery and email-limit contract; its local SMTP messages go only to a disposable capture service. Neither kind of test is signed-in production acceptance or a real-key provider verification.

Owner usability acceptance: not given.

[Supabase password security](https://supabase.com/docs/guides/auth/password-security) · [CAPTCHA integration](https://supabase.com/docs/guides/auth/auth-captcha) · [Turnstile client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) · [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
