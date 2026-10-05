# Dedicated misconception review workspace — 15B.11A

Date: 2026-10-05. Status: implementation complete; hosted release checks and production verification pending.

The 40 Chapter II definitions previously required a Markdown review packet and governed migration to activate. The new **Թյուր պատկերացումներ** page makes each definition and its linked responses reviewable from the Content Reviewer navigation at `/content-misconceptions`.

## Behavior and boundaries

- Admin and content-admin accounts can browse every governed subject, grade, chapter and skill. Definitions use stable IDs, codes and skill references; no Physics-specific routing or counts exist in the implementation.
- Draft titles and descriptions may be edited with a recorded reason. Request changes records a decision and leaves the definition draft. Approval is individual, requires an explicit acknowledgment, reason and MFA (`aal2`), and activates exactly the selected current draft.
- Already-active and retired definitions are read-only to preserve historical interpretation. Creation, deletion, retirement, moving skills and bulk approval are outside this bounded slice.
- Each event stores the actor, role, assurance, reason, monotonic revision, before/after definition and exact linked response snapshot. History is append-only; existing content receives no invented historical event.
- Definition approval does not alter question QA/approval, mappings, guide publication, assessments, SME state, curriculum releases or learner history. Existing question revision saves continue to preserve an already-attached draft mapping. Once a definition is active, existing authoring rules may offer it for new mappings within the same skill.

## Enforcement and compatibility

New `manage-misconception-reviews` Edge Function authenticates the JWT, verifies the live session and current active profile, and restricts access to admin/content-admin. The mutation RPC rechecks role/session and requires `aal2` for approval. Anonymous and authenticated database roles cannot call the service-only RPCs or write definitions directly. The service-only catalog uses `security_invoker`; audit history has RLS and no client grants.

The expected review token covers the definition revision and linked item/response metadata. A changed definition, mapping, item version or prior decision rejects the old token with HTTP 409. Parent-row locking serializes reviews and mapping writes without adding item locks to the review path, preserving the existing item-write lock order. A double click cannot issue a second pending UI mutation. Auth/detail/list epochs discard late responses after a selection or identity change. MFA verification never automatically approves content.

Affected consumers audited: content-quality dashboard, item revision/mapping editor and RPC, mapping integrity triggers, remediation-guide authoring and learner help, prospective misconception evidence. Existing Edge helpers and their deployed consumers are unchanged; only the new endpoint adds a new shared handler. Shared `role-layout.js` adds the link to every Content Reviewer page and the new page configuration. Student, teacher and school-admin navigation and learning algorithms are unchanged.

## Validation

Local checks: 6 new API/SQL tests pass, 16 existing workspace architecture/identity regressions pass, browser JavaScript syntax passes, browser-QA dependency coverage passes. SQL uses PGlite locally; it is not evidence of independent PostgreSQL concurrency or live authentication. The isolated browser suite uses native Chromium with mocked service/auth responses. Hosted CI additionally runs independent-connection races on real PostgreSQL, including 17.6, and the existing content revision path. Production acceptance must keep reviewed-main and designated-fixture guards; PR tests never receive production credentials.

Before release, verify full CI and aggregate Platform release checks, new native-browser regressions, existing role/layout browser tests and both PostgreSQL concurrency jobs. Apply the migration and deploy/read back the new Edge bundle, confirm no content rows changed, compare Supabase advisors, verify exact frontend commit and the persistent Vercel production Deployment Check separately. Do not perform real content approval as a test.

## Release evidence

Pending hosted and production results. Forty draft definitions and thirteen active definitions form the pre-release baseline; deployment must not change their status.
