# BF-17 — school-creation MFA release

14 November 2026 (Asia/Yerevan). The audit at merged source `bde9020ac1ae793dcadabe3dadbd97d3333994c5` found that the direct `bootstrap-school` endpoint omitted the explicit extra assurance check used by other sensitive administrator endpoints. Owner-approved PR482 adds that check and is now merged, deployed and source verified. The release checkpoint below preserves the original deployment evidence. A later owner-approved, owner-operated guard-only check now passes; successful live school creation and wider privileged acceptance remain open. Existing SEC-AAL scope remains independent; AUTH-REVIEW-01 only cleared access for an earlier walkthrough.

Owner usability acceptance: not given. Production QA not run (paused by owner).

## Owner-run live guard-only check — 14 November 2026

The owner approved a narrower, non-creation check using the existing protected Master Admin and normal extra sign-in verification in the same browser session. At reviewed frontend release `704dff2aa166d638755e73b8ca7f5fd20b175721`, the actual deployed function remained ACTIVE version 5 with gateway JWT verification enabled and all three package files matching reviewed source. Fresh read-only source proof preceded each phase; the browser helper also verified the frontend release and the token's own Auth user before calling the function.

| Phase | UTC observation | Actual response | Result |
| --- | --- | --- | --- |
| Before extra verification, AAL1 | 09:09:20 | 403 `mfa_required` | Pass: refused before parsing input |
| After normal extra verification, AAL2 | 09:18:57 | 400 `invalid_json` | Pass: passed the assurance guard and reached input validation |

Both requests used the fixed malformed JSON body `{`, without a school name or first-administrator payload. The supplied results match the approved run, pseudonymous account/session tags, reviewed commit, probe hash and runtime source hash. The before result is visible in the owner's Console screenshot; the after result was pasted by the owner. Record this as **owner-operated live evidence**, not independent agent-controlled browser observation or a whole production acceptance run. Later repeats were stopped locally as already started or stale; they do not replace the first passing before result.

This check created no account, school, membership or invitation and did not invoke a valid school-creation request. Normal owner sign-in/MFA has its ordinary Auth session effects. Tokens and raw account IDs stayed in the owner's browser; private receipts, account/session tags and browser-access links are not published. No application records require cleanup. The helper leaves only a redacted per-run `sessionStorage` marker in that tab until it is closed; no Auth storage removal or global logout was performed.

The original create-and-delete fixture plan was unsuitable: permanent Master Admin identity protection and the last-school-administrator/foreign-key guards do not provide ordinary disposable-record cleanup. Those protections were not bypassed. The owner approved only this existing-account guard check. **Successful live school creation was not tested or waived**, and the broader SEC-AAL and owner-usability gates remain open.

The TinyFish browser route could not complete Cloudflare, while the owner confirmed that the normal browser could. No TinyFish automation run was started. The actual helper/controller preparation had 31 isolated VM/controller checks; a further native Chromium check executed both standalone Snippet phases with synthetic Auth/HTTP replies under the production CSP, with every request intercepted. These preparation checks are separate from the owner-run live evidence. No CAPTCHA, account, role, rate-policy, billing or hosting setting changed. Production QA not run (paused by owner); affected suites: none. BF-16 enforcement remains off; paid stolen-password protection remains declined.

[Redacted check evidence](../evidence/school-bootstrap-mfa-guard-owner-check-20261114.json).

## Original verified release checkpoint

- [PR482](https://github.com/johnvanesyan-arch/HaiEdu/pull/482) merged at `b8dd46632c90a140b91f60f712831c4cb05b86cc` with the exact approved tree. The owner approved that merge and this single-function deployment and confirmed no other agent was merging or releasing.
- All five required [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43563299945) and [merged checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43564500953) pass: 1,847 code tests and 696 native browser checks, zero failures/skips/cancellations. The isolated PostgreSQL/scheduler and institutional concurrency jobs also pass.
- Only the reviewed `bootstrap-school` package was deployed. All three deployed files match source; both shared helpers are unchanged and gateway JWT verification remains enabled. Detailed deployment receipts and rollback source remain private.
- All three public addresses serve the merged source. Twelve fresh static release/manifest/sample/header checks pass. The full unchanged 29-page/127-asset build proof is reused only because those bytes retain their source. No manual promotion or domain-setting change was made.
- At this original release checkpoint, no production account had been signed in, no school had been created and no email had been sent. The later owner-run sign-in/guard check is recorded separately above. Production QA not run (paused by owner); affected production QA: none.

**Current remaining gates:** successful school creation, wider SEC-AAL review and owner usability acceptance. The bounded owner-run refusal/recovery check above is complete. Isolated handler tests, package readback and malformed-input checks do not certify successful creation. BF-16 limits stay off; real-classroom qualification and activation are separate.

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

The broader SQL transaction/identity-history and existing administrator MFA/browser evidence is reused only where source is unchanged. No production QA workflow was dispatched. At initial release, no signed-in production or designated-fixture check had been performed; the later owner-operated normal-account guard check is recorded above.

## Original release sequence (steps 1–3 completed)

1. Publish the candidate and pass all five required CI jobs on the exact, current-main-based head.
2. Obtain explicit PR approval and fresh no-other-merger/releaser confirmation before merging. Obtain specific approval for deploying the single changed Edge function.
3. Read back all deployed files and the JWT setting against the reviewed package. Verify merged-commit CI and automatic canonical release identity; no manual promotion is implied.
4. Record separately authorized privileged acceptance honestly. Source/isolated verification does not close the wider SEC-AAL or personal usability gates.

BF-16's new request limits remain off; its activation and real-classroom qualification remain separate. No CAPTCHA, SMTP, rate-policy, account or curriculum setting is changed by BF-17.

EAT: implementation, required checks, deployment and source readback are complete. The owner-run guard-only check is complete. A successful-creation acceptance route and its cleanup scope still need separate review; wider security review and owner acceptance remain separate.

[Technical and release evidence](../evidence/school-bootstrap-mfa-20261114.json).
