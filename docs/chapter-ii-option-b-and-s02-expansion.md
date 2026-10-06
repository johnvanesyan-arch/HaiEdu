# Chapter II — selected Option B and S02 expansion

**Decision date:** 2026-10-06. **Product-owner instruction:** “I think option B is better”.

The selection adopts Option B from the [assessment decision packet](chapter-ii-assessment-decision-packet.md). It applies to Physics 7 Chapter II and its draft candidate release. It is subject-aware configuration, never a platform default.

| Contract | Selected decision |
|---|---|
| Diagnostic | 16 questions; two per each of eight skills; one chapter baseline |
| Diagnostic reserve | 32 distinct questions, two disjoint 16-question forms |
| Mastery Check | 16 questions; two per each of eight skills |
| Passing | At least 80%: 13/16; also at least one correct answer in every skill |
| Initial readiness scope | All eight skills, including supporting S03 and additional S07/S09 |
| Practice and review reserve | 96 questions, 12 per skill; shared reserve |
| Protected mastery reserve | 64 distinct questions, eight per skill |
| Total target | 192; 32 existing approved questions proposed for practice, 160 new questions required |

This decision approves the scope, lengths, passing rule and authoring budget. It does not approve a Chapter II numeric readiness model, copy Chapter I parameters, publish individual content, bind pools/blueprints, authorize a pilot or open a learner release. Ordinary v1 policy/model/content binding remains required. The existing one-baseline and three-mastery-attempt lifecycle is preserved; this batch changes no runtime criterion.

## First bounded authoring batch — 15B.13

The new `PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS` family supplies four **practice/review questions**, I05–I08, now approved at version 1. They directly address mandatory outcome 1(1), using the prospective evidence-purpose contract. Existing S02 I01–I04, approvals, published guide and active misconception definitions remain intact. This batch does not complete the illustration audit of the 32 previously approved questions; any relevant image added to an older question must create and review a new version before chapter finalization.

| Item | Evidence purpose | Textbook illustration |
|---|---|---|
| I05 | Core understanding: compare liquid/gas compression | Figure 22, printed page 24 |
| I06 | Application: explain the heated systems' volume change | Figure 24, printed page 25 |
| I07 | Misconception diagnosis: distinguish macroscopic observation from particle-size claims | Figure 23, printed page 25 |
| I08 | Transfer reasoning: explain reversible compression in a sealed syringe | Verbal task; no figure needed |

Figures come from the user's *Physics 7 (2023)* PDF, SHA-256 `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. Extracted PDF artwork retains original labels; explanatory captions are excluded. Armenian alternative text describes the apparatus and visible states without supplying the model explanation. Crop coordinates, source and asset hashes are in [media provenance](evidence/chapter-ii-s02-textbook-media-20261006.json). These are practice stimuli; reuse in protected assessment requires a separate exposure decision.

Each wrong option maps to one of three existing active S02 misconception definitions. The four keys use A/B/C/D once, and runtime option shuffling stays enabled. A new template-specific remediation guide explains observation-to-model reasoning. The four questions have recorded content-review approvals, and the guide is now published at runtime version 2. Human review of this bounded batch is complete; external SME validation remains pending.

The shared reviewer preview now uses the learner's existing image/text stimulus renderer across subjects and grades. Unsupported or invalid media produces an Armenian message while preserving the question and options. Native Chromium tests cover images at desktop/mobile widths, replacement, invalid media, late item responses and logout. This is isolated browser verification with auth/network doubles, not an authenticated production content-review journey.

After the question approvals verified on 2026-10-06, Chapter II has **36 authored and approved questions**. The 192-question target leaves **156 questions un-authored**. The new template guide is published at runtime version 2. No pool membership, blueprint, assessment-policy/model binding or learner exposure is created. Chapter II remains draft.

## Deployment and reviewer handoff

[PR #140](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/140) merged as `8d37df4c487d0bec0ed88f8d7857c41eabf1024b`. PR and independent main CI passed all five jobs, including 1,222 Node and 35 native Chromium tests. Migration `sprint_15b13_s02_practice_expansion` is applied at production version `20261006140336`; its recorded source exactly matches the repository SQL. The actual production rollback probe preserved all 100 table hashes. After deployment, existing rows in all 14 appended tables and the other 86 complete tables are unchanged. Advisor findings are unchanged. [Evidence](evidence/sprint-15b13-option-b-20261006.json).

Fresh production catalogue readback passed the actual deployed v11 QA evaluator for all four version-1 questions, with no errors or warnings. At the deployment checkpoint, four technical QA records carried explicit automated-system provenance and no human approval had yet been recorded. This evaluator run used a read-only in-memory query adapter, not an authenticated live Edge call.

The approved questions remain available in the [review queue](https://www.haiedu.am/content-review.html), or open them directly:

- [S02 I05](https://www.haiedu.am/content-item.html?id=9f3d884d-2e79-4183-8823-4395c9dea482)
- [S02 I06](https://www.haiedu.am/content-item.html?id=75377509-1dd5-4c0a-b25e-413381325d4f)
- [S02 I07](https://www.haiedu.am/content-item.html?id=348cfa21-26ca-4352-b7e7-1073408c0a9d)
- [S02 I08](https://www.haiedu.am/content-item.html?id=cb09d26d-665e-4634-99ec-baf98ea06cb8)

## Question approval checkpoint — 2026-10-06

Read-only production verification at 15:18:59 UTC confirms all four version-1 questions are `published` / `approved`. Matching-version review records contain content approvals with a reviewer recorded, and latest QA passes without errors or warnings. Approval times were 14:21:49 UTC for I05, 15:03:09 for I06, 15:03:46 for I07 and 15:04:26 for I08. This is content approval, not external SME validation. [Readback evidence](evidence/sprint-15b13-question-approvals-20261006.json).

At this question-approval checkpoint, the separate guide **Ինչպե՞ս կապել դիտումը մասնիկային մոդելի հետ** (`d4e0d836-88b8-4c78-a013-7aad68f4d857`) was still authoring version 1 draft, with no published runtime version. Its subsequent review/publication is recorded below. Question approval does not imply guide approval. Chapter II's candidate release remained draft; this checkpoint performed no database or learner-release mutation.

## Guide publication checkpoint — 2026-10-06

Production readback at 15:36:13 UTC confirms the new template guide is **published at runtime version 2**. Its recorded authoring history progresses through draft version 2, review version 3 and published version 4; publication occurred at 15:34:55 UTC with an actor recorded. Published authoring version 4 references runtime version 2, and the runtime history records the publication. [Readback evidence](evidence/sprint-15b13-guide-publication-20261006.json).

The four-question/one-guide batch's human review is complete. Chapter II still contains **36 approved questions**, leaving **156 to author** toward the 192-question plan. The prior 32-question illustration audit, external SME review, numeric readiness/model approval, protected assessment banks, bindings, pilot and chapter-release gates remain separate. The candidate release is still draft. This verification changes documentation only.
