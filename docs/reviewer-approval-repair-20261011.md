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

Local Chromium installation is unavailable in this environment; required CI executes those native browser tests before release. Full CI, Edge deployment/readback and production frontend verification are pending at this source checkpoint. Authenticated human-browser acceptance is separate: the available cloud browser has no signed-in reviewer session. This repair must not create one, impersonate the owner or approve production content to obtain a passing test.
