# Dedicated misconception review workspace — 15B.11A

Date: 2026-10-05. Status: implemented and deployed through PR #124; session-handling closure is included in the follow-up release.

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

[PR #124](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/124) merged as `cb8141a6dd9ea924310118905856dffc48e06b5c`. PR CI #1181 and main CI #1182 passed: **990/990 Node tests**, **19/19 native Chromium tests**, typecheck, syntax, trigger coverage, both PostgreSQL concurrency jobs and aggregate **Platform release checks**. The first PostgreSQL 17 attempt identified a cluster-wide fixture-role collision; idempotent role creation fixed the fixture without changing production SQL.

The migration is applied under Supabase history version `20261005165520` (repository source timestamp `20261005162651`, same named migration). The new Edge Function is active at version 1 with JWT verification; all three deployed source files match repository content. Service-role catalog reads return exactly 40 drafts and 13 active definitions. History has zero events. Anonymous/authenticated direct mutation and RPC grants are denied; history RLS is enabled.

All 18 before/after content and release table counts and checksums match, including questions, mappings, approval/QA history, guide versions, assessment pools/blueprints and release gates. Supabase advisors remain at the same baseline (2 security, 4 performance notices), with no new findings. [Readback evidence](evidence/misconception-review-release-20261005.json).

The persistent Vercel project setting was independently read in the dashboard: GitHub **Platform release checks**, target **Production**, behavior **Blocking**, visibly selected. The new public route renders its protected signed-out boundary. Existing main-only institutional action and analytics workflows retain exact-frontend and designated-fixture guards.

The automatic review identified two session gaps after the initial CI pass: a missing standard sign-out hook and interrupted MFA-enrollment cleanup. The closure adds the standard sidebar sign-out, keeps only workspace-owned pending factor IDs across identity changes/reloads, and cleans an unverified factor only under its owning session. Verified and unrelated factors are preserved. Three additional native Chromium regressions exercise actual sidebar logout, cross-account interrupted enrollment and preservation of already-verified factors. They run in the same mandatory browser/release gates.

Production definition approval was deliberately not performed: it is John's content decision. Positive reviewer actions/MFA are covered with isolated native-browser auth/service doubles and real SQL fixtures; live production mutation acceptance is not claimed. No content or curriculum gate was opened.
