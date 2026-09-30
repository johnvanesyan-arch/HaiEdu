# Sprint 15A — Content and Hint Authoring Tools

## Status

**15A.1 governed authoring foundation and 15A.2 reviewer ergonomics: deployed and technically verified.**

Sprint 15A remains open until the full authenticated closure gate passes. Bulk Chapters II–VI hint authoring, import and publication remain blocked.

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
- `manage-remediation-guides` v2 is active with JWT verification and the shared 15A.2 validation module;
- production backfill contains exactly 19 current published authoring versions for the existing 10 skill guides and 9 template guides;
- anon/authenticated roles cannot read authoring history or execute the lifecycle procedure; service role access and the immutable trigger are active;
- the database advisor's missing parent-FK-index finding was corrected;
- Vercel reported success for merge commit `f71dc0fe95e0eb573f4f0880fe8a81968a94e024`;
- production-delivered HTML, JavaScript and CSS contain the template filter, complete variant selector, immutable version comparison and guided MFA enrollment assets, with no browser `prompt()` fallback;
- the signed-out production render at `/content-guides` showed the protected Armenian entry surface with no application console errors;
- the production authoring inventory remained unchanged at exactly 10 skill guides and 9 template guides, all published at authoring version 1.

The database test proves that draft and review do not change runtime content, changed content cannot bypass review, AAL1 publication is denied, AAL2 publication updates the runtime exactly once, actor/rationale provenance is retained and authoring history rejects mutation.

## Remaining 15A work

### 15A.3

- authenticated Content Reviewer and Platform Admin browser matrix;
- unauthorized, stale-session and AAL1 denial evidence;
- learner regression showing draft/review invisibility and exact published rendering;
- publish/archive/fallback/history production probes;
- final advisor and deployment evidence.

Only after 15A.3 passes may bulk Chapters II–VI hint authoring or publication begin.
