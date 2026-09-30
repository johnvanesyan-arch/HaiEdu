# Sprint 15A — Content and Hint Authoring Tools

## Status

**15A.1 governed authoring foundation: deployed and technically verified.**

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

## Verification and deployment evidence

- targeted source/security suite: 7/7 passed;
- PGlite lifecycle transaction test: passed;
- browser JavaScript syntax check: passed;
- Edge Function TypeScript parse check: passed.
- PR #65 full CI and institutional-concurrency jobs passed and merged as `ce78a1861c9bdd8fc3cc070191a54dd866ed23bb`;
- advisor correction PR #66 passed and merged as `78b9c438ecca4fb14e29cc9d2efc73aee862f251`;
- migrations `sprint_15a_remediation_authoring_foundation` and `sprint_15a_authoring_parent_index` applied successfully;
- `manage-remediation-guides` v1 is active with JWT verification;
- production backfill contains exactly 19 current published authoring versions for the existing 10 skill guides and 9 template guides;
- anon/authenticated roles cannot read authoring history or execute the lifecycle procedure; service role access and the immutable trigger are active;
- the database advisor's missing parent-FK-index finding was corrected;
- Vercel reported a successful production deployment, and the signed-out production render at `/content-guides` showed the protected Armenian entry surface.

The database test proves that draft and review do not change runtime content, changed content cannot bypass review, AAL1 publication is denied, AAL2 publication updates the runtime exactly once, actor/rationale provenance is retained and authoring history rejects mutation.

## Remaining 15A work

### 15A.2

- richer version comparison and explicit reviewer approval ergonomics;
- Content Reviewer MFA enrollment/recovery flow, not only step-up for an existing factor;
- stronger semantic analogous-example and answer-leakage QA;
- scale-oriented server pagination/search as the guide catalog grows.

### 15A.3

- authenticated Content Reviewer and Platform Admin browser matrix;
- unauthorized, stale-session and AAL1 denial evidence;
- learner regression showing draft/review invisibility and exact published rendering;
- publish/archive/fallback/history production probes;
- final advisor and deployment evidence.

Only after 15A.3 passes may bulk Chapters II–VI hint authoring or publication begin.
