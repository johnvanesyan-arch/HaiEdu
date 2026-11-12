# BF-15 — Turnstile activation candidate and limited Gmail pilot

12 November 2026 (Asia/Yerevan), based on verified main `04e84efe4f78768805f982d71660bfd7dbd511f5`. This follow-up is a prepared frontend candidate, not a merged release or confirmed server-settings change. The owner chose free Turnstile, supplied its public site key, requested exact steps in existing dashboard tabs, and selected the existing Gmail sender for a limited first pilot.

Owner usability acceptance: not given.

## Candidate behavior

The public configuration enables the Turnstile adapter for sign-in, registration, reset-email requests and recovery from the shared account page. Only the public site key enters the browser build. The secret stays in Supabase Auth. Signed-in password changes retain the existing authenticated path. No password-policy, schema, Edge Function, authorization, content or billing change is included.

Account entry now waits for initial Auth processing before showing a challenge. The shared adapter removes Auth-link query values and fragments before provider loading for account entry and every shared-account role. An explicit valid classroom-join return code is preserved. Returning from registration cannot reintroduce a removed invitation value. Repeated persisted page transitions invalidate old widgets; returning to account entry restores one fresh challenge and retains form input. Old callbacks cannot supply tokens or multiply submissions.

The compiled build is `470d8aa7b00f04e2f08f0649878d6640ad18262e1322456c1a1d318bbd6e400a`: 29 pages and 126 current immutable assets. New archive output is committed; previously published archives are retained. The teacher bundle inputs and Edge service source are unchanged.

## Owner-approved display revision

The owner confirms the first real-key preview completes and supplies a Success-state screenshot, resolving the earlier domain-authorization error. The screenshot shows the initial square display as too bulky. After current native phone/desktop and doubled-text audit, the owner chooses item 2 of the proposed options: always show a thin horizontal bar. The candidate now requests the provider-supported 300 × 65 size with always-visible appearance in the common adapter. The full provider branding and controls remain intact, with no scaling, clipping or hidden-widget mode. Narrow-phone spacing and full-width shared-account containers keep the bar inside its card.

Native fixtures model the selected provider dimensions, then verify page reflow and full card containment at 320, 375 and 1,280 pixels with normal and doubled text across account entry and all five shared-account roles. The preceding square source fails the horizontal-display regression. The first layout attempt exposes a shared-account intrinsic-width problem; its failure and diagnostic are retained privately, and the corrected layout is checked again. Owner approval of the display option is not final usability acceptance.

## Verification and limits

The candidate receipt records 1,803 current-source code/integration tests, 86 isolated native Auth/account cases and 90 compiled-page/security cases. Auth browser fixtures cover every affected form and all five shared-account roles; synthetic replies and provider callbacks are intercepted. Lifecycle regressions dispatch native page-transition events and do not qualify actual browser-cache navigation. The previous source fails the added initial-Auth, link-cleanup, enabled-configuration and repeated-lifecycle regressions. Earlier setup/test failures remain in the private audit.

Three real Cloudflare Siteverify calls with official public dummy keys pass the expected success, invalid-response and duplicate-token cases. The owner confirms real-widget completion on the first preview; the real server key pair is not verified. The workspace browser's external widget attempts fail with a certificate error; that limitation was reported to the owner, without bypassing TLS verification. Preview review of the approved horizontal-bar revision remains open. Server enforcement and real-key server verification follow only after the approved frontend is live.

The limited pilot proposes a 200-account-email hourly budget. An isolated instance of the reported Auth version captures 200 accepted invitations locally and rejects the 201st at the configured cap. A separate 100-password-sign-in test succeeds when paced over about 159 seconds from one simulated school address; an instant 100-request burst is throttled. Initial signup and email-link verification are separate and are not qualified for simultaneous classroom use. Invite students and finish first-time setup before lessons, then stagger classroom sign-ins. No real Gmail delivery or throughput is claimed; Gmail's separate daily sending limit still applies. Live settings have not changed, and other counters are proposed unchanged for the pilot.

## Production QA and rollout

Production QA not run (paused by owner). Affected production QA: mobile browser, teacher feedback, resource assignments, Sprint 14 institutional actions, Sprint 14d analytics, Chapter II–VI pilot-read and English Unit 1–3 pilot-read suites. The dependency checker covers the existing shared paths without workflow changes; reviewed-main, fixture, serialization, isolation and cleanup guards remain.

The owner explicitly directed that production QA be disregarded for this work and kept paused. The audit finds 17 direct password-login scripts used by 18 workflows that cannot sign in unchanged after server CAPTCHA enforcement. This excluded area is not qualified or marked passed. A compatible sign-in setup must be reviewed before any later resumption; no privileged sign-in bypass or production dummy secret is introduced. Required isolated CI remains mandatory.

Before merge: all five exact-head required checks, final horizontal-bar preview review, specific PR approval and fresh release coordination. After merge: all five main checks and source/build verification on both canonical domains. Only then should the owner enter the secret directly into Supabase, enable Turnstile, save and read back the provider, and complete the real-key server check. The proposed email budget requires its own owner-assisted save/readback. No production QA workflow is authorized.

BF-15 stays open until those activation and pilot-setting checks are recorded. Paid stolen-password protection is still undecided; no upgrade is included. Independent review, owner usability, content and subject-release gates retain their separate scope.

[Verification receipt](../evidence/auth-bot-activation-20261112.json) · [Dashboard sequence and pilot limits](../auth-onboarding-activation.md) · [Initial released implementation](auth-onboarding-release-20261112.md).
