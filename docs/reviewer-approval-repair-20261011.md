# Reviewer approval after passing QA — 2026-10-11

## Incident and evidence

The owner reported that **Հաստատել** stayed unavailable after running QA. Read-only production investigation found four passing QA runs on `PHY7-U02-S02-M02` at 19:15:01, 19:15:30, 19:16:11 and 19:16:42 UTC. The last two belong to the current saved version, v2. The incident window (19:14–19:19 UTC) contains no approval POST or item-review insertion. These observations do not authorize approving the question on the owner's behalf.

The bank contained 382 items and 654 QA rows. Deployed `get-content-quality-dashboard` v6 matched repository source. Its four related reads built 15,055–15,070-character REST URLs from every item UUID; each dashboard refresh produced four REST attempts and took about 8.5–9.9 seconds. Database REST logs recorded 200 responses, but the handler ignored returned subquery errors and converted null data to empty arrays. The dashboard then interpreted unavailable QA as missing, disabling approval. Oversized request/response headers are the probable transport trigger, consistent with [Supabase's documented URL/header limit](https://supabase.com/docs/guides/troubleshooting/fixing-520-errors-in-the-database-rest-api-Ur5-B2). The exact transport exception was not retained by v6; a specific 520 response was not observed. Public, anonymous requests did not independently reproduce the authenticated Edge transport error.

A regression executes the real Edge handler with a simulated upstream failure for a large UUID filter. Before the fix, all 382 passing results disappeared from a successful response. Each individual QA/review/version/mapping read failure also incorrectly returned HTTP 200. These are isolated transport doubles, not live authenticated acceptance.

## Correction and consumers

This is shared, subject-neutral infrastructure. It has no subject, grade, chapter, evidence-purpose or role exceptions.

- Split related reads into at most 80 item IDs per request; page every dashboard collection in stable 500-row pages, including history beyond the API row cap.
- Reject an incomplete result with HTTP 500 instead of returning a false QA-missing state. Log the failing read without question content, answers or credentials.
- Select latest QA/review within the current saved version, using deterministic tie ordering.
- Preserve failed-refresh messages after save, QA, approval and lifecycle actions instead of overwriting them with success. The shared client gives an Armenian refresh instruction.
- Preserve authentication, live-session and content-role checks, explicit save → QA → human approval, atomic family fingerprints, immutable versions, SME and release gates.

Affected readers: Content Reviewer home, queue, bank, item workspace, curriculum coverage and evidence workspaces through `content-workspace.js`; the legacy item console also uses the corrected editor flow. Guides and misconception pages import the shared client, but their own endpoint behavior is unchanged. Only `get-content-quality-dashboard` requires an Edge redeployment. Its `_shared/auth.ts` dependency is unchanged and must be compared during readback. No migration or content DML is required.

## Verification and deployment boundary

Seven endpoint regressions cover the 382-item incident pattern, 1,105 items, 1,101 mappings, current-version selection, all four subquery failures, transport rejection and authorization denial. Existing identity/dirty-state/session tests pass. Native Chromium regressions exercise QA → refresh → approval, recovery from a failed refresh without rerunning QA, duplicate-click suppression and settled UI observers with the actual dashboard response shape and offline services.

CI [#1346](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/38168422318) passed all five required jobs on implementation commit `dac47ab3a3df7e191c4afc3ea981c76fcb83ec29`: 1,247 Node tests, 65 native Chromium tests, both PostgreSQL jobs and the aggregate release check. The two new browser scenarios passed. Typecheck, mirrored-core parity, browser syntax and QA dependency coverage passed. Local Chromium installation was unavailable; these are CI browser results. Automatic PR review completed without findings.

At 19:38:52 UTC, `get-content-quality-dashboard` v7 was deployed ACTIVE with JWT verification enabled. Both bundled files were read back and matched exact repository bytes; the authentication helper is unchanged. Entry SHA-256: `2e0b8930a0114cd1a1828d408394aeb326c5a18732a1f0db456873e727a663a9`; auth SHA-256: `5595e91bfac44077715a4401b1243b68e221930ac09ca0e2cd08009d42e62dd0`.

The owner signed into the browser during this task. Before refreshing the affected production item, its QA tab incorrectly said QA had not run and **Հաստատել** was disabled. After one explicit refresh against v7, it displayed **✓ QA անցած · v2** and the approval control was enabled. DOM `isEnabled()` confirmed true. No QA or approval action was clicked. A read-only database check at 19:40:42 UTC confirmed v2 still `needs_review`, zero review records, the same latest QA timestamp (19:16:42 UTC), and both current-version passing runs retained. This establishes live authenticated read/display recovery; the approval mutation is covered by isolated tests, not a production content decision.

[Signed-in QA/approval state](evidence/reviewer-approval-enabled-20261011.jpg) · [Machine-readable evidence](evidence/reviewer-approval-repair-20261011.json).

The frontend error-display improvement was released through PR #188 at merged commit `7036dd00e9136053d9cc8f2766fa923895498f20`. Final CI [#1347](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/38169139287) and the main-branch release run passed all five required jobs. Production `release.json` served that merged commit, and both modified JavaScript files matched its source byte for byte. These post-merge results were recorded in the roadmap mirror on 2026-10-11 and reconciled here with the next content checkpoint. The Vercel management connector denied this project's scope and no CLI was installed, so this task does not re-attest the persistent Deployment Check setting. GitHub CI and exact production source checks are the release evidence; a Vercel READY label is not substituted for browser tests. No database migration, content write, permission change, release activation or approval was performed by this repair.
