# Matching and ordering — 16.1B.3

2026-10-20. Owner direction: continue reusable capabilities one at a time. This slice implements matching/categorisation and exact ordering across authoring, governed delivery, private drafts, grading and existing points reports. The capability is deployed and verified: required PR/main CI passed 1,347 Node tests, 77 native Chromium checks and PostgreSQL 17.6/concurrency checks. [Production read acceptance](evidence/matching-ordering-production-read-20261020.json) passed 268/268, with two-school isolation 54/54. [Release evidence](evidence/matching-ordering-release-20261020.json) records exact source and preservation. English content, thresholds, release policy, audio and task sets remain separate work.

## Closed response contracts

These are subject-neutral opt-in response extensions. Each definition declares its locale; labels use that locale. The historical `promptHy` transport property continues to carry the authored prompt, including English. The response definition is public; answer keys are private. Each list contains 2–12 entries with unique lower-snake-case IDs (1–40 characters) and nonblank labels of at most 2,000 Unicode code points. Unknown fields, versions, IDs and malformed values fail closed in both JS technical QA and SQL authoring/runtime validation.

| Type | Public `items.config.responseDefinition` | Private `item_answer_keys.answer` | Response |
| --- | --- | --- | --- |
| `matching` | `schemaVersion: haiedu-matching-v1`, `locale`, `cardinality`, `sources: [{id,label}]`, `targets: [{id,label}]` | Same version and `pairs: {sourceId: targetId}` | Same version and every source ID mapped to one target ID or `""` |
| `ordering` | `schemaVersion: haiedu-ordering-v1`, `locale`, `segments: [{id,label}]` | Same version and `acceptedSequences: [[segmentId,…]]` | Same version and `sequence: [segmentId or "",…]`, one slot for every segment |

Matching declares `one_to_one` or `many_to_one`. One-to-one allows each target at most once and requires at least as many targets as sources; unused distractors are allowed. Many-to-one explicitly permits target reuse for categorisation. The key must answer every source without blanks. Every accepted ordering sequence must contain every segment exactly once; 1–20 distinct reviewed sequences are supported. This permits explicit valid alternatives without inventing a language rule or accepting an unreviewed permutation.

Blank response slots represent deliberate incompleteness and score zero for the applicable component. Missing slots, duplicate nonblank ordering IDs, duplicate one-to-one targets, extra pairs, out-of-domain IDs and client-supplied scores are invalid. No surplus response earns credit. An ordering task starts entirely blank, so merely submitting the display order cannot receive accidental credit.

## Authoring and presentation

The content editor provides editable labels and stable codes, matching cardinality and correct-target selectors, accepted ordering sequences, and an answer-free learner preview. Saving preserves full before/after versions and the private key, updates the semantic fingerprint with the public definition, and returns the item to `review / needs_review`. Existing permissions, current-version QA, content approval and source/whole-bank review remain mandatory. This engineering migration creates no questions or approvals.

Learners use native labelled selects. Ordering also provides keyboard/touch move-up and move-down buttons; dragging is not required. Selected targets are disabled elsewhere for one-to-one matching and ordering; categorisation allows reuse. Public labels are escaped before rendering. The authored IDs remain stable under presentation changes and must not encode answer positions.

`haiedu-stable-arrangement-v1` sorts matching targets or ordering segments by the MD5 of `sessionItemId | algorithmVersion | ID`, with an ID tie-breaker. The choice order is independent of the key and stable across resume; matching source order remains authored. Frozen item versions and the session assignment determine the presentation. `get-session-item` returns the presented public definition and `responsePresentationVersion`, never `pairs` or `acceptedSequences` from the answer key. Attempts retain presented IDs/version alongside response and component evidence.

## Drafts and API

Existing `submit-answer` and `submit-mastery-answer` accept the same governed envelope as typed responses: `sessionId`, `sessionItemId`, `itemId`, the versioned `response`, and `draftRevision`. Set `saveDraft: true` to save without scoring; the response is `{saved: true, draftRevision: nextRevision}`. Omit/false submits and scores once. `get-session-item` returns the student's own draft and revision. Stale revisions return `response_draft_conflict`; malformed responses return `arrangement_response_invalid`. Existing typed error names remain compatible.

Saves are serialized, changes are debounced, submission waits for pending saves, and failed saves preserve the visible response. Repeated submit cannot duplicate an attempt. The existing unsaved-navigation guard and stale-context suppression apply. Successful submission atomically deletes the draft. The existing service-only, RLS-protected `learning_response_drafts` table, privacy inventory and deletion cascades cover both formats. Unsubmitted work is not teacher-visible. All actions retain live account/session, school, enrollment, year, release/unit, exposure, immutable policy and frozen version checks. Structured versioned responses cannot fall through to legacy selected-response grading.

## Scoring and reporting

An explicit immutable `haiedu-assessment-policy-v3` snapshot must name the response type and its exact capability version in `responseCapabilities`; the map must contain exactly the declared nonlegacy capabilities. The registry admits typed fields, matching and ordering independently or together. V1/v2 remain selected-response-only. No existing snapshot, learning-model configuration, pass threshold or release is changed.

Matching scores each required source mapping 0/1; the item score is correct pairs divided by required pairs. Ordering scores the whole accepted sequence 0/1, with no partial-credit algorithm. `correct` means the whole item is correct. Every item has maximum weight 1, regardless of how many controls it contains. The already-bound learning model consumes this normalized score once.

Existing v3 reports retain `earned`, `possible`, fully correct item count and answered count. Thresholds use unrounded points percentage; declared per-skill complete-item minima remain enforced. Student, teacher and school reports share those semantics. Active diagnostics/mastery checks hide correctness and component scores until completion. Shared learner instructions explicitly distinguish matching/typed partial credit from exact ordering.

## Verification and release boundary

Synthetic JS/SQL tests cover valid alternatives, blanks, duplicate/extra IDs, cardinality, closed policies, private keys/drafts, stable presentation, stale revisions, repeated submission, context and role denials, normalized scores, mastery thresholds/minima and preservation of a completed v2 baseline. Native Chromium tests exercise the real learner modules through actual Edge handlers and isolated SQL, plus reviewer controls and previews; mobile and keyboard interactions, failed-save recovery and resume are covered. Required CI also runs these DB/authoring cases on PostgreSQL 17.6.

The migration only adds capability enum values and private helpers, and replaces three bounded existing functions. All twelve affected Edge consumers read back exactly, with existing JWT settings retained. Production acceptance verified the preserved Physics chapters, role access and writing workspaces against exact frontend commit `cc00ace03a1c9b3a6bc3c2beac44cd018fc465fd`. No matching/ordering task is activated in production by this slice; new-format submission flows use isolated fixtures. The production read-only checks and preservation snapshots are recorded separately from synthetic full-flow evidence.

The connector assigned canonical migration version `20261020153856`; the SQL body SHA-256 matches the tested migration exactly, and the filename/fixture path are reconciled. Its first request expired before execution; a read proved both migration and helper absent, then the retry succeeded. All eight SQL definitions match and remain inaccessible to direct anonymous/authenticated calls. Read-only production grading returned 0.5 for one correct matching pair and 1 for a reviewed ordering sequence. No new-format items, adopting blueprints or drafts exist in production. All 24 tracked complete-row snapshots remain unchanged through acceptance. Security advisors show no new findings.

The existing Vercel Production / Blocking configuration is independently attested in the [deployment-check evidence](evidence/vercel-deployment-check-verification-20261020.json); this deployment visibly held promotion while the required release check ran, then became Ready with current production domains. The comprehensive acceptance run's first queued attempt was displaced by the shared production-QA concurrency group before creating jobs; its second attempt completed against the same merged revision. Full matching/ordering submission flows remain isolated-fixture evidence, not a claim of activated English content.

Rollback, if needed, restores the prior three function bodies and twelve Edge bundles from the recorded base commit; unused additive enum values and private helpers can remain inert. This release performs no content or policy rewrite to reverse.
