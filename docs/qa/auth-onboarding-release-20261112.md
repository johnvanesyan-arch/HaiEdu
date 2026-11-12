# BF-15 — account policy release and inactive bot-protection support

12 November 2026 (Asia/Yerevan). Owner-approved [PR472](https://github.com/johnvanesyan-arch/HaiEdu/pull/472) is merged at `4f3ff0d19596f2de2304d03d88f321f2c83ddba2`. The merged tree is identical to the approved head `11a6335490cec01d79a9ff8c13ac626905f10a7b`. The initial implementation is live on both canonical domains, with the student-invitation service deployed and source verified. The remaining provider activation and capacity decisions stay open.

Owner usability acceptance: not given.

## Delivered scope

Registration, invited-student password setup and password recovery share the owner-approved minimum of six actual characters and matching Armenian hints. Longer passwords are accepted, and existing sign-in passwords pass through unchanged. The owner-approved managed-provider policy exception remains recorded privately; this release does not claim identical Unicode enforcement by the provider.

Account-entry and shared account-security flows now distinguish password-policy, email/request-limit, challenge and transport failures in Armenian. Failed submissions restore retry, pending submissions are serialized, and earlier account replies cannot replace the current account's feedback. Pending invitation query tokens are removed before a configured challenge provider can observe the address; Auth session establishment retains its required fragment.

Turnstile support is deployed as inactive preparation: `enabled: false`, no public site key, no real-key provider verification. The enforcing browser policy adds only the reviewed provider script/frame origin. Activation requires provider setup, compatible interactive and trusted automation consumers, reviewed verification and a separate owner decision.

`provision-student-account` is ACTIVE v5 with JWT verification retained. Its entrypoint and unchanged `_shared/auth.ts` read back byte-exact against the reviewed source. Existing actor/session, teacher, assignment and recipient authorization, request/response contracts and recipient/quota outcomes remain. The shared helper source is unchanged, and no other function was deployed. Source readback is not a claim of a fresh signed-in production invitation or live email delivery.

The classroom-capacity plan is prepared privately. Live Auth limits/settings and billing are unchanged. BF-16's shared application limiter is outside this release. Known-leaked-password rejection remains a separate optional paid-plan decision.

## Verification

All five [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43099044502) pass on attempt 1: 1,803 code/integration tests and 674 native Chromium cases, zero failures/skips/cancellations. All five [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43158316460) also pass on attempt 1 with the same counts and zero failures/skips/cancellations. All three [merged-source CodeQL analyses](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43158315976) pass; this is not a zero-findings claim. The candidate receipt retains the earlier local full/targeted runs, expected original-source regression failures and the repaired initial workflow-trigger omission; those records are not silently relabeled as passing.

The same-version isolated Auth service passed 22 checks with ten messages captured only by local SMTP. It verifies trusted invitation delivery and retained email limits under synthetic configuration. It does not verify real provider keys, Gmail throughput or live classroom capacity. Native account tests use synthetic Auth replies and intercepted challenge loading.

Both `haiedu.am` and `www.haiedu.am` serve the exact merged source and reviewed build. On each domain, all 29 HTML pages and 126 immutable assets match their manifest hashes, with reviewed MIME/cache/security headers and enforcing browser policy. Separate release reads bracket the byte-exact manifest and confirm HTTPS protection. The checks used 532 static-file requests including redirects and nine metadata requests; they executed no page scripts, signed in to no account and made no Supabase request. Domain assignment was automatic; no hosting setting, manual promotion or alias assignment was performed.

## Production QA and remaining gates

Production QA not run (paused by owner). All 13 triggered acceptance runs skipped, and no workflow was manually dispatched. Affected production QA: mobile browser, teacher feedback, resource assignments, Sprint 14 institutional actions, Sprint 14d analytics, Chapter II–VI pilot-read and English Unit 1–3 pilot-read suites. New shared dependencies are covered by the two adjusted trigger lists; reviewed-main, fixture, serialization, pause and activation guards remain. If the owner requests a later production check, start with the affected account-entry/recovery and student-invitation paths; no broad production run is authorized here.

BF-15 remains open for actual provider setup/verification and the separate activation/capacity decisions. Optional paid protection and owner usability acceptance remain open. BF-01 independent review, BF-02 deferral, content/owner gates and paused subject expansion retain their separate scope.

[Verification receipt](../evidence/auth-onboarding-release-20261112.json) · [Prepared-candidate history](auth-onboarding-20261112.md) · [Activation sequence](../auth-onboarding-activation.md).
