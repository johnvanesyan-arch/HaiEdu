# B.12.3 — Account and session recovery

2026-10-29 · Shared core, all subjects/grades and affected roles. Implementation prepared; required native/production verification is pending. B.12.3/B.12 remain open and subject expansion stays paused.

## Outcome contract

Every interactive logout uses `account-signout.mjs`: one operation per Auth client, disabled duplicate controls, existing role-specific destination or inline signed-out panel and existing global scope. After either a returned error or a rejection, read the local session. Confirmed local clearing can navigate, but a remote failure carries a precise notice that other-device revocation was not confirmed. A retained session exposes an explicit logout retry. An unreadable outcome exposes a focused read-only status check and keeps logout disabled; it never automatically repeats the mutation. A newer sign-in prevents the old controller from clearing state, reporting an old result or navigating. No access/refresh token is stored in a recovery record or message.

Learner writing participates in a cancelable asynchronous leave guard: flush the existing draft before logout; a failed save or unknown submission remains in the current writing recovery flow. Teacher feedback publication with a pending/unknown receipt blocks logout until its existing status recovery resolves. Existing private-feedback/editor discard confirmations remain. The shared account page also confirms discarding unsaved name, email or privacy choices.

The account page clears old identity fields/input on account change and fences late profile/privacy/email/password results and button state by actor/generation. A successful privacy save updates its acknowledged preference snapshot; a later edit remains distinguishable from the saved choice.

The legacy Practice, Progress and Physics overview startup checks no longer turn temporary identity-check failures into logout. They expose an explicit retry, while confirmed terminal errors retain existing local cleanup. A stale terminal error cannot target a newer snapshot. Shared terminal-auth cleanup reads back the local session and never falls back to deleting an assumed SDK storage key; an unreadable/current session cannot be reported as signed out.

## Consumer audit

| Consumer | Integration |
| --- | --- |
| Student Home and all student-shell utility entry points | Existing `student-signout.mjs` delegates to the common controller and retains confirmed local cache cleanup. Header/sidebar share one operation. |
| Teacher Home, Classes, Today and Review | Common controller plus existing private-feedback leave guard; mounted writing prevents logout during an unresolved feedback publication. |
| Shared account page, all supported roles | Common controller, unsaved account-input confirmation, actor/generation fences and old-field clearing. |
| School overview and teacher detail | Both controllers use the common outcome/redirect logic. |
| Master admin and security | Existing explicit global scope and account-access destination retained. |
| Question bank/item/review | Common controller; pending workflow blocks exit and unsaved content requires confirmation. Existing inline signed-out panel is retained. |
| Guide authoring | Common controller; generation-scoped in-flight workflow counter and unsaved-content confirmation. Existing inline signed-out panel is retained. |
| Unit material reviewer | Existing `canLeave` plus busy guard retained before common logout. |
| Misconception reviewer | Existing discard/MFA factor cleanup and inline signed-out panel retained before common logout, with actor recheck afterward. |
| Shared content-workspace consumers | Common logout and confirmed cache cleanup. Existing role/session listeners still close private views. |
| Blocked-role router | Common logout; navigation follows confirmed local outcome. |
| Legacy learner startup checks and shared UX health | Explicit transient/terminal distinction and stale-snapshot protection. |
| Login destination | Reads only an allowlisted, nonpersonal notice code after partial remote failure. |

The helper does not replace Auth, change scopes, grant access, revoke tokens by itself or promise that an already issued JWT is invalidated. Backend live-session and tenant/recipient checks remain authoritative. It does not change curriculum, audio, scoring, SQL, Edge functions or storage. The pinned teacher SDK remains 2.118.0; existing CDN imports are unchanged, and the helper reconciles outcomes rather than assuming a CDN implementation version.

## Verification scope and remaining work

The pinned SDK is exercised against isolated HTTP 401/500 responses, separately from mocked browser Auth. Required native regressions exercise the actual thirteen nonstudent logout bindings with isolated surrounding controller state, all five roles on the real account controller, returned/thrown errors, repeated failed status reads, duplicate controls, new-account races, account-input discard, stale profile/email completions and 390 px/computed 200% text. These binding fixtures are not full authenticated admin/reviewer journeys. Existing real Home, teacher Today and actual-SQL writing journeys cover their functional integrations. No production learner submission or grade may be manufactured for verification.

Current docs consulted: [Supabase sign-out reference](https://supabase.com/docs/reference/javascript/auth-signout), [scope guide](https://supabase.com/docs/guides/auth/signout), current changelog and local pinned `@supabase/auth-js` 2.118.0 `_signOut` implementation. The October TLS notice does not change this client outcome contract. The SDK HTTP fixture proves that a remote 500 may coexist with local clearing; remote failure is not proof of an active local session or successful revocation on other devices.

Next after verified delivery: focused process-simplicity review of teacher assign → student find/open, student writing → submit/status, teacher review → send feedback, and student feedback → revision/return. Reuse unchanged content approvals/evidence. UX-ASSIGN-04, the unconfirmed historical UI-ERROR-01 and DEMO-01 retain explicit dispositions. Custom teacher writing creation and PDF-response submissions remain separate future capabilities. Final B.12.3 acceptance belongs to John.
