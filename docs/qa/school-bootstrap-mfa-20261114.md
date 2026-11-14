# BF-17 — school-creation MFA candidate

14 November 2026 (Asia/Yerevan), prepared from merged source `bde9020ac1ae793dcadabe3dadbd97d3333994c5`. The direct `bootstrap-school` endpoint verifies the token, live session and active platform-admin role, but the reviewed source omits the explicit extra assurance check used by other sensitive administrator endpoints. This candidate adds that check. **It is not merged or deployed.** Existing SEC-AAL review/release and separately authorized privileged acceptance remain open; AUTH-REVIEW-01 only cleared access for an earlier walkthrough.

Owner usability acceptance: not given. Production QA not run (paused by owner).

## Behavior and boundary

After Auth verifies the token and the existing session/admission/admin-role checks pass, the handler requires `aal=aal2`. An administrator without that assurance receives HTTP 403 with `mfa_required` before request parsing, invitee lookup or the school-creation business RPC. An authorized AAL2 administrator retains the existing request and response contract. The actor is taken from the verified Auth user; body flags cannot supply authority or upgrade assurance. Missing or rejected identity, revoked/missing sessions and non-admin/inactive accounts remain denied.

The token payload is decoded only after the existing verified-token/live-session checks. Its decoding and error pattern match the established administrator endpoints. The caller completes the existing extra sign-in verification, obtains its fresh token and may explicitly retry the non-mutating refusal. This does not add automatic write retries or change post-write acknowledgement semantics.

Only [the bootstrap entrypoint](../../supabase/functions/bootstrap-school/index.ts) changes at runtime (candidate SHA-256 `5a9aecf1d1cd030f9db375427fe903b7d34f12429352c41a202d5fa890572c28`). Shared Auth/rate helpers, database schemas/grants, learning/content rules and browser assets retain their existing source. The service bootstrap and lookup RPCs are not directly executable by browser roles. Source/boundary read-only audit receipts are retained privately; no account, school or production record was modified.

## Consumer audit

The repository has no browser or production acceptance caller of the direct `bootstrap-school` endpoint. Its direct API clients receive the established MFA error code. The separate staff-provisioning path already checks the platform administrator's assurance before issuing the school-admin invitation. Its recipient acceptance uses the stored invitation authorization and existing service-only SQL/identity-history invariants; that delegated flow is preserved. This is shared institutional core behavior, with no subject, grade or school exception.

Only `bootstrap-school` needs a candidate Edge deployment, with its two unchanged dependencies. No shared helper is edited, so there is no new stale shared-code consumer. Existing role, session, gateway and per-person admission boundaries remain in scope for deployment readback. A merged source change alone does not update the deployed function.

## Verification

- **1847/1847 local code tests pass**, with zero failures/skips/cancellations.
- **30/30 focused checks pass**, covering bootstrap, administrator operations and staff invitation/provisioning behavior.
- Running the new regressions against the previous source produces **four expected failures in 22 tests**: the endpoint inventory and three real-handler MFA/refusal/recovery cases. The handler returns 201 where the new security cases require 403. These are actual prior-source failures, not a waived fixture error.
- The HTTP fixture loads the actual TypeScript handler and shared live-session helper, with isolated Auth/profile/RPC replies. Its assertions cover six invalid/missing assurance variants, denied roles/account states, failed session checks, Auth rejection, payload spoofing, fresh-token recovery, unchanged rate 429/503 responses, validation and method/preflight handling. These checks are not real-provider login, actual school creation or privileged live acceptance.
- Browser-QA dependency coverage passes. Affected production QA: **none**; no direct caller is routed by this server-only change. The full required exact-head CI, including its browser suite and aggregate release gate, remains mandatory before merge.

The broader SQL transaction/identity-history and existing administrator MFA/browser evidence is reused only where source is unchanged. No production QA workflow was dispatched, and no signed-in production or designated-fixture check was performed.

## Release and remaining work

1. Publish the candidate and pass all five required CI jobs on the exact, current-main-based head.
2. Obtain explicit PR approval and fresh no-other-merger/releaser confirmation before merging. Obtain specific approval for deploying the single changed Edge function.
3. Read back all deployed files and the JWT setting against the reviewed package. Verify merged-commit CI and automatic canonical release identity; no manual promotion is implied.
4. Record separately authorized privileged acceptance honestly. Source/isolated verification does not close the wider SEC-AAL or personal usability gates.

BF-16's new request limits remain off; its activation and real-classroom qualification remain separate. No CAPTCHA, SMTP, rate-policy, account or curriculum setting is changed by BF-17.

EAT: candidate implementation/isolated checks are complete; review, release and readback require about 30–60 active minutes plus required CI and merge coordination. Privileged acceptance timing depends on a separately authorized route.

[Candidate technical evidence](../evidence/school-bootstrap-mfa-20261114.json).
