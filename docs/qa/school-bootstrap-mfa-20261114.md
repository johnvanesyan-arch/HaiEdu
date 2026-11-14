# BF-17 — school-creation MFA release

14 November 2026 (Asia/Yerevan). The audit at merged source `bde9020ac1ae793dcadabe3dadbd97d3333994c5` found that the direct `bootstrap-school` endpoint omitted the explicit extra assurance check used by other sensitive administrator endpoints. Owner-approved PR482 adds that check and is now merged, deployed and source verified. The release checkpoint below distinguishes deployed-file verification from the separately authorized privileged live acceptance that remains open. Existing SEC-AAL scope remains independent; AUTH-REVIEW-01 only cleared access for an earlier walkthrough.

Owner usability acceptance: not given. Production QA not run (paused by owner).

## Verified release checkpoint

- [PR482](https://github.com/johnvanesyan-arch/HaiEdu/pull/482) merged at `b8dd46632c90a140b91f60f712831c4cb05b86cc` with the exact approved tree. The owner approved that merge and this single-function deployment and confirmed no other agent was merging or releasing.
- All five required [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43563299945) and [merged checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43564500953) pass: 1,847 code tests and 696 native browser checks, zero failures/skips/cancellations. The isolated PostgreSQL/scheduler and institutional concurrency jobs also pass.
- Only the reviewed `bootstrap-school` package was deployed. All three deployed files match source; both shared helpers are unchanged and gateway JWT verification remains enabled. Detailed deployment receipts and rollback source remain private.
- All three public addresses serve the merged source. Twelve fresh static release/manifest/sample/header checks pass. The full unchanged 29-page/127-asset build proof is reused only because those bytes retain their source. No manual promotion or domain-setting change was made.
- No production account was signed in, no school was created and no email was sent. Production QA not run (paused by owner); affected production QA: none.

**Remaining:** separately authorized signed-in administrator refusal/recovery and successful school creation, wider SEC-AAL review and owner usability acceptance. Isolated handler tests and exact deployed-file readback do not certify these live journeys. BF-16 limits stay off; real-classroom qualification and activation are separate.

## Behavior and boundary

After Auth verifies the token and the existing session/admission/admin-role checks pass, the handler requires `aal=aal2`. An administrator without that assurance receives HTTP 403 with `mfa_required` before request parsing, invitee lookup or the school-creation business RPC. An authorized AAL2 administrator retains the existing request and response contract. The actor is taken from the verified Auth user; body flags cannot supply authority or upgrade assurance. Missing or rejected identity, revoked/missing sessions and non-admin/inactive accounts remain denied.

The token payload is decoded only after the existing verified-token/live-session checks. Its decoding and error pattern match the established administrator endpoints. The caller completes the existing extra sign-in verification, obtains its fresh token and may explicitly retry the non-mutating refusal. This does not add automatic write retries or change post-write acknowledgement semantics.

Only [the bootstrap entrypoint](../../supabase/functions/bootstrap-school/index.ts) changes at runtime (reviewed SHA-256 `5a9aecf1d1cd030f9db375427fe903b7d34f12429352c41a202d5fa890572c28`). Shared Auth/rate helpers, database schemas/grants, learning/content rules and browser assets retain their existing source. The service bootstrap and lookup RPCs are not directly executable by browser roles. Source/boundary read-only audit receipts are retained privately; no account, school or learner record was modified.

## Consumer audit

The repository has no browser or production acceptance caller of the direct `bootstrap-school` endpoint. Its direct API clients receive the established MFA error code. The separate staff-provisioning path already checks the platform administrator's assurance before issuing the school-admin invitation. Its recipient acceptance uses the stored invitation authorization and existing service-only SQL/identity-history invariants; that delegated flow is preserved. This is shared institutional core behavior, with no subject, grade or school exception.

Only `bootstrap-school` needed an Edge deployment, with its two unchanged dependencies; all three files are now read back against reviewed source. No shared helper is edited, so there is no new stale shared-code consumer. Existing role, session, gateway and per-person admission boundaries remain in scope for deployment readback. A merged source change alone does not update the deployed function.

## Verification

- **1847/1847 local code tests pass**, with zero failures/skips/cancellations.
- **30/30 focused checks pass**, covering bootstrap, administrator operations and staff invitation/provisioning behavior.
- Running the new regressions against the previous source produces **four expected failures in 22 tests**: the endpoint inventory and three real-handler MFA/refusal/recovery cases. The handler returns 201 where the new security cases require 403. These are actual prior-source failures, not a waived fixture error.
- The HTTP fixture loads the actual TypeScript handler and shared live-session helper, with isolated Auth/profile/RPC replies. Its assertions cover six invalid/missing assurance variants, denied roles/account states, failed session checks, Auth rejection, payload spoofing, fresh-token recovery, unchanged rate 429/503 responses, validation and method/preflight handling. These checks are not real-provider login, actual school creation or privileged live acceptance.
- Browser-QA dependency coverage passes. Affected production QA: **none**; no direct caller is routed by this server-only change. The full required exact-head CI, including its browser suite and aggregate release gate, remains mandatory before merge.

The broader SQL transaction/identity-history and existing administrator MFA/browser evidence is reused only where source is unchanged. No production QA workflow was dispatched, and no signed-in production or designated-fixture check was performed.

## Original release sequence (steps 1–3 completed)

1. Publish the candidate and pass all five required CI jobs on the exact, current-main-based head.
2. Obtain explicit PR approval and fresh no-other-merger/releaser confirmation before merging. Obtain specific approval for deploying the single changed Edge function.
3. Read back all deployed files and the JWT setting against the reviewed package. Verify merged-commit CI and automatic canonical release identity; no manual promotion is implied.
4. Record separately authorized privileged acceptance honestly. Source/isolated verification does not close the wider SEC-AAL or personal usability gates.

BF-16's new request limits remain off; its activation and real-classroom qualification remain separate. No CAPTCHA, SMTP, rate-policy, account or curriculum setting is changed by BF-17.

EAT: implementation, required checks, deployment and source readback are complete. Privileged live acceptance is approximately 20–40 active minutes once a route and specific authorization are available; wider review and owner acceptance are separate.

[Technical and release evidence](../evidence/school-bootstrap-mfa-20261114.json).
