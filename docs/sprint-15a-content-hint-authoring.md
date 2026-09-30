# Sprint 15A — Content and Hint Authoring Tools

## Status

**15A.1–15A.3 are deployed and the authenticated closure gate has passed.**

Bulk Chapters II–VI hint production may now begin through the governed workflow. This closure does not waive curriculum mapping, content review, SME review, pilot evidence or release gates.

## Existing foundation retained

The learner runtime already provides:

- error-specific item-template guide → default item-template guide → skill fallback resolution;
- allow-list-only interpolation of raw variant parameters;
- three-stage Practice support: Hint 1, Hint 2 and analogous worked example;
- immutable runtime guide snapshots and exact rendered-text evidence;
- no help in Diagnostic or Mastery Check.

Sprint 15A does not replace that resolver or change the learning model.

## 15A.1 implementation

### Append-only authoring workflow

`remediation_guide_authoring_versions` records every draft, review, publish and archive state with:

- guide scope and stable runtime source ID;
- monotonically increasing authoring version;
- exact content and reference metadata snapshot;
- parent version;
- actor ID, role and assurance level;
- timestamp and mandatory change rationale;
- bound runtime version for publish/archive actions.

Draft and review actions append authoring records only. The learner-facing runtime guide changes only inside the atomic service procedure during an AAL2 publish or archive action.

### Authorization

- Every API action requires a verified user, active live session and an active `content_admin` or `admin` profile.
- Browser roles receive no direct table or procedure access.
- Publish/archive require an AAL2 access token both in the Edge Function and the service-only database procedure.
- Optimistic version checks reject stale concurrent edits.
- Publishing rejects content that differs from the reviewed snapshot.

### Safety checks

- required Armenian fields;
- strict `{{rawParameter}}` syntax;
- placeholder allow-list enforcement;
- missing real-variant parameter detection;
- answer-like placeholder rejection;
- obvious Hint 1 / Hint 2 answer-leakage phrases;
- no live numeric placeholders in the analogous example;
- real stored-variant preview with no answer-key query or derived-answer evaluation;
- fallback availability check before archive.

### Reviewer workspace

`content-guides.html` is a dedicated Armenian workspace with:

- subject, grade, programme, unit, skill, scope and lifecycle filters;
- skill-level and item-template guide editing;
- reference metadata;
- real-variant preview and validation;
- draft, review, publish and archive actions;
- inline MFA step-up for actors who already have a verified factor;
- immutable version history.

## 15A.2 implementation

### Complete catalogue and real-variant selection

- Cascading subject → grade → programme → unit → skill → template filters keep the catalogue usable without assuming Physics or Grade 7.
- Every published stored variant is loaded in bounded 500-row pages rather than silently stopping at 50.
- Reviewers can search and filter real variants by assessment context, inspect the exact prompt and raw parameters, and explicitly select the variant used for preview.
- Diagnostic and Mastery variants remain preview-only; the authoring tool does not enable learner hints in those contexts.

### Reviewer comparison and MFA

- Any two immutable authoring snapshots can be compared side by side, with changed fields highlighted and reference metadata included.
- Publication and archive use a guided TOTP dialog: reviewers can enroll a first factor, step up with an existing verified factor, cancel incomplete enrollment safely and retain unsaved editor state during MFA token events.
- Factor labels are rendered with DOM-safe text nodes rather than interpolated HTML.

### Stronger content QA

- Shared server-tested validation rejects hard-coded reuse of live numeric parameters in analogous examples.
- Near-copy conceptual examples are rejected when token similarity is high and there is no genuine numeric variation.
- Hint validation rejects direct-answer phrases, option-letter leakage and obvious numeric conclusions.
- Reference URLs are restricted to safe HTTP(S) values for reviewer warnings.
- The Edge Function and tests share the same pure validation module; the learner resolver still receives only reviewed, published runtime content.

## Verification and deployment evidence

- 15A.1 targeted source/security suite: 7/7 passed;
- 15A.2 authoring-validation and workspace suite: 14/14 passed;
- PGlite lifecycle transaction test: passed;
- browser JavaScript syntax check: passed;
- Edge Function TypeScript parse check: passed.
- PR #65 full CI and institutional-concurrency jobs passed and merged as `ce78a1861c9bdd8fc3cc070191a54dd866ed23bb`;
- advisor correction PR #66 passed and merged as `78b9c438ecca4fb14e29cc9d2efc73aee862f251`;
- 15A.2 PR #69 passed the full CI and institutional-concurrency jobs and merged as `f71dc0fe95e0eb573f4f0880fe8a81968a94e024`;
- migrations `sprint_15a_remediation_authoring_foundation` and `sprint_15a_authoring_parent_index` applied successfully;
- `manage-remediation-guides` v4 is active with JWT verification, lifecycle-failure observability and the shared 15A.2 validation module;
- production backfill contains exactly 19 current published authoring versions for the existing 10 skill guides and 9 template guides;
- anon/authenticated roles cannot read authoring history or execute the lifecycle procedure; service role access and the immutable trigger are active;
- the database advisor's missing parent-FK-index finding was corrected;
- Vercel reported success for merge commit `f71dc0fe95e0eb573f4f0880fe8a81968a94e024`;
- production-delivered HTML, JavaScript and CSS contain the template filter, complete variant selector, immutable version comparison and guided MFA enrollment assets, with no browser `prompt()` fallback;
- the signed-out production render at `/content-guides` showed the protected Armenian entry surface with no application console errors;
- the production authoring inventory remained unchanged at exactly 10 skill guides and 9 template guides, all published at authoring version 1.

The database test proves that draft and review do not change runtime content, changed content cannot bypass review, AAL1 publication is denied, AAL2 publication updates the runtime exactly once, actor/rationale provenance is retained and authoring history rejects mutation.

## 15A.3 authenticated closure

### Production lifecycle matrix

- The Content Reviewer loaded all 19 guides, selected `PHY7-U01-S07-T-VOLUME-TO-L / missing_unit`, and previewed it against a real stored variant. Required validation passed; the preview exposed the required unit format without exposing the numeric answer.
- The first lifecycle write exposed and corrected a production-only `public.user_role` enum-to-text comparison defect. Migration `sprint_15a_authoring_role_cast` applies the explicit cast, refreshes the API schema and is covered by an enum-backed PGlite regression.
- Content Reviewer draft and review appended authoring versions 2 and 3 at AAL1 while the live specialization remained published at runtime version 1. The learner-facing content hash remained `5b69c5bbe367c01e74b17d5f21945656`.
- An AAL1 publish attempt opened the MFA gate and made no content change. First-factor TOTP enrollment and verification stepped the Content Reviewer session to AAL2; publish appended version 4 and runtime version 2 without changing the learner-facing hash.
- Archive appended version 5/runtime version 3 only after confirming both a published default template guide and published skill fallback. The specialization was then restored through draft, review and AAL2 publish. Final state is published at authoring version 8/runtime version 4 with the same learner-facing hash.
- The immutable history records the exact lifecycle states, parent chain, rationale, actor role and AAL. No history row was rewritten.
- Platform Admin independently passed role routing, catalogue/list, guide/get, real-variant preview and existing-factor AAL2 step-up. No Platform Admin content mutation was needed.

### Negative authorization and delivery evidence

- Authenticated workflow run `36776729692` passed 7/7 redacted checks: anonymous denial, QA School Admin sign-in, School Admin role denial, session revocation and revoked-token replay denial.
- Full CI run `36776729557` passed the test, typecheck, browser-syntax, core-parity, favicon and institutional-concurrency jobs for PR #71.
- Vercel reported a successful preview deployment for the PR head.
- `manage-remediation-guides` v4 was read back as active with JWT verification; the temporary diagnostic response fields are absent.
- Final Supabase advisors report the authoring table's no-client-policy RLS posture only as informational and no missing authoring parent-FK index. The newly created authoring indexes are informationally unused; unrelated pre-existing advisory warnings remain outside this slice.

## Closure disposition

Sprint 15A is complete. Bulk Chapters II–VI hint authoring, import and publication are no longer blocked by the authoring-tool gate, but every guide must still pass the same draft → review → AAL2 publish workflow and the remaining Sprint 15 curriculum, SME, pilot and release controls.
