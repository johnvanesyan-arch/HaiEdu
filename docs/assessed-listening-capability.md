# Assessed listening — Sprint 16.1C.12

**22 October 2026. Owner approved; deployed and source-verified after required CI.** Shared core capability; no course is implicitly opted in. English remains draft/inactive with its existing 116 approvals and 60/56/84 bank plan.

## Accepted behavior

| Context | Allowance | Question visibility |
| --- | --- | --- |
| Practice / Chapter Review | Unlimited replay; existing per-question completion gate | Existing ordered player |
| Reviewer preview | Unlimited | Existing authoring/reviewer view |
| Diagnostic / Mastery with v4 | English’s approved policy specifies 2 total plays, including the initial play; shared across every question using the recording in this assessment | All assigned questions/options for that recording appear before playback; answers remain sequential |

Normal speed; no assessment seeking, transcript or translation. A failed transfer consumes no play. Pause/resume retains the same play ID and position. Refresh/reopen and moving to another question cannot reset the recording allowance. After one completed listen, answers unlock; the second listen is optional. Answer submission is disabled while playing.

The browser acknowledges progress every 750 ms; an interruption may repeat the short unacknowledged tail. A five-second server lease prevents another tab taking an active play; the player stops when acknowledgments stall. State operations time out after four seconds; a full-file download may take up to sixty seconds. Recovery never resets completed plays or the saved position. Controls govern the supported player; delivered bytes are not DRM, and completion events do not prove attention.

A technical failure permits **end without assessment scoring**. The server records whether failure originated in media verification or a client report. Cancellation abandons the session and any active Mastery attempt, retains prior responses, playback history and all item/source exposures, and leaves the scored attempt count unchanged. Replacement requires a governed, unused form. Exhausted forms stay exhausted. A withdrawn recording cannot be delivered, but its already served assessment may still end unscored. Client-reported failure is explicitly an audit claim, not a verified equipment diagnosis.

## Versioned contract and API

`haiedu-assessment-policy-v4` inherits v3 normalized item scoring and v2 delivered/scored/readiness/reporting scopes. It is valid only for Diagnostic/Mastery and requires this closed object:

```json
{
  "audioPlayback": {
    "schemaVersion": "haiedu-assessed-audio-v1",
    "maximumPlays": 2,
    "playbackRate": 1,
    "transcriptAvailable": false,
    "scope": "session-recording",
    "questionVisibility": "whole-recording",
    "interruption": "resume-or-unscored-v1"
  }
}
```

The core accepts an explicit integer count from 1–10, with no implicit course default. English's owner-approved value is 2. No existing policy snapshot is rewritten or automatically adopted.

`get-learning-audio` retains its existing API and adds requests with `playbackPolicy: "assessed-recording-v1"`, `sessionId`, `sessionItemId` and one of `state`, `load`, `begin`, `progress`, `complete`, `pause`, `failed`, `cancel`. Begin/progress/complete/pause additionally require UUID `clientId`, UUID `playId` and integer `positionMs`. Other fields are rejected. The Edge handler alone sends internal `fetched`/`unavailable` actions after private-bucket, byte-length, SHA-256 and renewed live authorization checks. Loading returns authenticated whole-file bytes, never a Storage/signed URL.

The server-owned ledger `learning_assessed_audio` is keyed by session/audio version. Row locking serializes competing tabs; completion IDs are idempotent. Monotone progress and elapsed-time bounds reject backwards/instant completion. Answers carry `haiedu-audio-evidence-v2`, including source family, bound playback policy, completed count and completion time. The read projection exposes the same stable option/arrangement presentations used when each question is answered. It records every previewed item's exposure before returning the group, without revealing keys or explanations.

RLS and privilege revocations block anonymous/authenticated table and RPC access; only the authenticated Edge service can invoke the RPC. Existing live-session, student ownership, enrollment, programme/release/unit, immutable assignment, version, publication/pool and revocation checks remain. The privacy inventory includes recording ledger counts; account/session erasure cascades. Abandoned Mastery attempt records retain their IDs/history; a partial unique index permits replacement at the same uncharged attempt number while retaining uniqueness for active/completed attempts.

## Verification and deployment boundary

- Local full suite: **1,368 passing tests**; six new SQL/Edge cases cover shared counts, retry idempotency, interruption, withdrawal, unscored Mastery replacement, multiple subjects and service-only authorization.
- Native Chromium 153: **7/7 focused audio tests**, including three new assessed cases: real WAV playback, all questions visible, count preservation across refresh/question changes, double-click handling, normal speed/no seeking, checkpoint resume, unscored exit, late response disposal and 390/1365 px layout.
- Four independent-connection PostgreSQL concurrency checks pass in required PostgreSQL 17.6 CI. Local PostgreSQL startup is unavailable in this container; no local native-PostgreSQL result is claimed.
- Core parity, typecheck, browser syntax and browser QA dependency coverage pass. Existing unchanged question/source/audio and owner playback evidence is reused.
- Thirteen affected Edge entrypoints are deployed and read back; their versions and hashes are recorded in the release evidence. Required CI passed and includes the native PostgreSQL 17.6 and Chromium jobs and aggregate Platform release checks.
- No new production assessment browser acceptance or English learner readiness is claimed. New course policy binding, qualified unseen forms, remaining 84 questions, guides/writing, SME/rights and release acceptance remain separate gates. Speaking stays classroom-assessed.

The [delivery record](evidence/assessed-listening-release-20261022.json) captures the tested implementation source, required CI, migration, deployed bundle hashes and preservation readback. The final merged closure source is independently read back before synchronizing Notion. The extended authenticated production read probe remains bound to the exact deployed frontend, designated fixtures and run-owned session cleanup; its post-closure result is retained in GitHub Actions and the source-verified Notion handoff. No new assessed English learner flow is activated by these boundary probes.
