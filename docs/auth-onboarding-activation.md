# Account policy and bot-protection preparation

The owner-approved account rule is a minimum of six Unicode characters for new or changed passwords, with longer passwords accepted within the authentication provider's normal limits. The website adds no twelve-character maximum. Sign-in passes the existing password unchanged. Password setup, recovery and invitation flows use matching hints and validation.

Account entry and shared account-security feedback distinguish password-policy problems, request/email limits, challenge failures and transport errors in Armenian. Unknown provider messages are replaced with safe local text. Shared account changes retain actor/generation cancellation so an earlier account's reply cannot overwrite the current account.

## Current activation candidate

The 12 November follow-up candidate enables `web/auth-challenge-config.mjs` with the owner's public Turnstile site key. It is not yet a released or server-enforced change. The last verified production release still has the browser integration disabled. The provider secret belongs only in Supabase Auth and must never enter source, chat, screenshots or a public record.

When deliberately configured, the adapter covers sign-in, registration, reset-email requests and password-reset requests from the shared account page. Signed-in password updates use their existing authenticated path. Challenge tokens are single-use; expiry, errors, panel changes and account changes require a fresh check. Loading is shared once per page, failures permit explicit retry, and old widget callbacks cannot supply a token to a newer panel/account. Compact provider rendering fits narrow forms.

Account entry waits for the initial Auth session read before loading the provider. The shared adapter then removes Auth-link values from the address for every affected page, while preserving an explicit valid classroom-join code. Panel navigation cannot restore a removed invitation value. Repeated persisted page transitions dispose old widgets; account entry restores a fresh widget when the page returns.

The only added provider origins in the browser policy are `https://challenges.cloudflare.com` for scripts and frames. The loader URL is fixed in source, and the rest of the enforcing policy is preserved. The owner has created the widget and supplied its public key; its dashboard configuration has not been independently read back. This candidate does not enable the live Supabase switch.

The server-owned student-invitation email path has a corresponding compatibility change. Its existing verified-session, active teacher, exact assignment, recipient and authorization checks remain before delivery. Its request/response shape, one-time invitation ownership, recipient creation rule, rollback and quota outcomes are retained. The approved preparation deployed only `provision-student-account` v5 and read back both files byte-exact; the shared Auth helper is unchanged. See the [release record](qa/auth-onboarding-release-20261112.md).

## Activation sequence

1. Review the implementation, exact required checks and intended rollout. Obtain the project's specific merge/deployment approvals and fresh release-coordination confirmation.
2. Use the free Turnstile plan, Managed mode and pre-clearance off. Allow `haiedu.am` (which also covers its subdomains). For a protected preview check, add that deployment's exact hostname to the same widget. Use only public provider test keys for isolated development. The browser receives only the public site key.
3. Verify the reviewed frontend in the owner's normal browser before release. Confirm real-key challenge loading, completion and explicit retry on sign-in, registration and reset views without submitting credentials or sending mail. The workspace browser cannot currently complete the external widget because of a certificate error; synthetic browser tests and real Siteverify calls with public dummy keys do not qualify the owner's key pair. Finish real-key server verification after the frontend is live and before treating activation as complete.
4. Confirm the approved student-invitation function and its entrypoint/shared files still match the reviewed source; deploy only if a separately approved change makes that runtime stale. Verify the frontend source on both canonical domains. A source merge alone does not deploy an Edge Function.
5. The consumer audit identifies 17 direct password-login scripts used by 18 production workflows. These bootstraps are incompatible with CAPTCHA enforcement as written. The owner has explicitly excluded production QA from the current work and kept it paused; this is an excluded, unqualified area, not passing coverage. Do not dispatch those workflows or resume automatic runs until a compatible sign-in setup is reviewed. Preserve reviewed-main, fixture, isolation, serialization and cleanup guards. Do not add service-role sign-in bypasses or use dummy provider secrets in production.
6. After the approved frontend is verified on both canonical domains, the owner can open Supabase Auth → Bot and Abuse Protection, enable CAPTCHA, select Cloudflare Turnstile and paste the real Secret Key directly from Cloudflare into Supabase. Keep it out of chat. Save, read back the enabled provider without exposing the secret, and complete a separately recorded real-key check. The owner has requested this free activation; the specific frontend PR still requires merge approval. Do not enable server enforcement while the deployed frontend is still disabled.

Each production-setting, deployment and billing action follows the existing approval policy. The present implementation adds no database migration or new learning/content behavior. Production QA remains paused by the owner; no manual production workflow is authorized by this document.

## Capacity and paid-feature decisions

The owner chose the existing Gmail sender for a limited first pilot of 100 or more students. The proposed project email budget is 200 per hour, allowing roughly 100 invitations plus headroom for resends and recovery. This is a proposal, not an applied or qualified live limit. It covers all account email together. Standard Gmail's published daily sending limit applies separately; the local tests do not establish delivery speed or actual account capacity.

An isolated instance of the reported Auth version accepted 200 invitations, rejected the 201st at the proposed cap, and captured all mail locally. A separate 100-password-sign-in test succeeded when paced over about 159 seconds from one simulated school address. An instant 100-request burst was throttled. Initial signup and email-link verification use separate limits and were not qualified for 100 simultaneous learners. Invite students and finish first-time setup before class, then stagger classroom sign-ins. Keep other live Auth counters unchanged for this initial pilot. The exact current-settings snapshot and detailed capacity receipt remain private; BF-16's shared application limiter is not implemented here.

Supabase's known-leaked-password rejection is a separate paid-plan feature. It checks proposed passwords against known breached-password lists. Length rules and CAPTCHA do not replace that check. No subscription upgrade, billing change or claim of enabled leaked-password protection is part of this implementation.

## Verification boundaries

Required CI includes code/integration, native Chromium, isolated PostgreSQL/concurrency and aggregate release checks. Browser fixtures exercise the actual controllers with synthetic Auth replies and intercepted provider loading. Persisted-lifecycle regressions dispatch native page-transition events; they do not qualify actual browser-cache navigation. The isolated Auth service uses disposable PostgreSQL and captured local SMTP mail. None of these tests is signed-in production acceptance, Gmail delivery or real-key provider verification. See the [follow-up candidate record](qa/auth-bot-activation-20261112.md).

Owner usability acceptance: not given.

[Supabase password security](https://supabase.com/docs/guides/auth/password-security) · [CAPTCHA integration](https://supabase.com/docs/guides/auth/auth-captcha) · [Turnstile client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) · [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Gmail sending limits](https://support.google.com/mail/answer/22839?hl=en).
