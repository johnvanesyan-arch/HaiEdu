# Prospective Assessment Evidence-Blueprint Policy

**Policy version:** `haiedu-evidence-blueprint-v1`  
**Adoption date:** 2026-10-02  
**Scope:** all new item templates and question families created after adoption  
**Legacy treatment:** existing templates, items, versions, approvals and learner evidence are unchanged

## Purpose

Question-family planning must describe what evidence each item contributes before the family can pass technical QA. This prevents a nominally varied set of questions from repeatedly testing the same recall operation while preserving the existing authoring, review, versioning, approval, release and learner-runtime architecture.

The policy is subject-neutral. A subject extension may define suitable stimulus, response formats, scoring and misconceptions, but it may not replace the shared evidence-purpose vocabulary or bypass the existing governance gates.

## Shared evidence purposes

| Machine value | Authoring meaning | Natural Armenian label |
|---|---|---|
| `core_understanding` | Identify or explain the central concept | Հիմնական ըմբռնում |
| `application` | Use the concept in a represented, practical or observed situation | Կիրառում |
| `misconception_diagnosis` | Distinguish the concept from a plausible misconception | Թյուր պատկերացման բացահայտում |
| `transfer_reasoning` | Apply or explain the concept in a changed context | Տեղափոխում և հիմնավորում |

These values classify evidence purpose, not item type. A multiple-choice, true/false, numeric, quantity or future governed response type may serve any appropriate purpose.

## Prospective authoring contract

Every new item template must declare:

1. `authoringProfileVersion = haiedu-evidence-blueprint-v1`;
2. `evidenceBlueprintPolicy = distinct-purpose-v1`;
3. one or more `requiredEvidencePurposes` selected from the shared vocabulary;
4. an outcome-appropriate family size rather than a platform-wide fixed item count.

Every non-retired item attached to that template must declare one valid `evidencePurpose`. Technical QA evaluates the whole active family and fails when a required purpose is absent, an item lacks a purpose, or an unknown purpose is used.

Approval re-evaluates the current active family instead of trusting only a stored per-item QA pass. If a sibling was retired, restored or otherwise changed after that QA run, approval fails closed and requires QA to be run again against the current family state.

Templates may set `enforceUniqueEvidencePurposes = true` when each required purpose must occur exactly once. This is appropriate for the four-item Sprint 15B.8 family. Larger or otherwise justified families may repeat a purpose; they still must cover every declared required purpose.

## What does not change

- Existing question families are not backfilled, rewritten or re-approved solely because of this policy.
- The policy does not publish content, create an assessment pool or blueprint, or make an item learner-visible.
- Existing semantic fingerprints, immutable item versions, misconception mappings, current-version QA, human approval, SME gates and curriculum-release gates remain authoritative.
- The shared server-side answer-option shuffle remains the delivery safeguard; evidence purpose does not determine answer position.
- Subject-aware content decisions remain explicit extensions built on the shared contract.

## Enforcement layers

The database rejects new templates that omit the prospective profile and rejects items attached to profiled templates when their authoring profile or evidence purpose is missing or invalid. The protected content-quality function then performs family-level coverage checks and records the evidence blueprint in the QA result.

This two-layer design prevents malformed writes while keeping contextual family-quality judgments in the governed QA process.

## Adoption test

The policy is considered adopted when:

1. legacy templates remain valid without modification;
2. a new unprofiled template is rejected;
3. an item with no valid evidence purpose is rejected for a profiled template;
4. QA reports the required purposes, actual counts and any missing/invalid entries;
5. approval re-checks the current active family and rejects stale passing QA after a family-membership change;
6. the first adopted family remains learner-inactive until the ordinary review and release gates are completed.
