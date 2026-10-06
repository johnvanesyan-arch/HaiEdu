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

The new `PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS` family supplies four **practice/review drafts**, I05–I08. They directly address mandatory outcome 1(1), using the prospective evidence-purpose contract. Existing S02 I01–I04, approvals, published guide and active misconception definitions remain intact.

| Item | Evidence purpose | Textbook illustration |
|---|---|---|
| I05 | Core understanding: compare liquid/gas compression | Figure 22, printed page 24 |
| I06 | Application: explain the heated systems' volume change | Figure 24, printed page 25 |
| I07 | Misconception diagnosis: distinguish macroscopic observation from particle-size claims | Figure 23, printed page 25 |
| I08 | Transfer reasoning: explain reversible compression in a sealed syringe | Verbal task; no figure needed |

Figures come from the user's *Physics 7 (2023)* PDF, SHA-256 `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. Extracted PDF artwork retains original labels; explanatory captions are excluded. Armenian alternative text describes the apparatus and visible states without supplying the model explanation. Crop coordinates, source and asset hashes are in [media provenance](evidence/chapter-ii-s02-textbook-media-20261006.json). These are practice stimuli; reuse in protected assessment requires a separate exposure decision.

Each wrong option maps to one of three existing active S02 misconception definitions. The four keys use A/B/C/D once, and runtime option shuffling stays enabled. A new template-specific draft remediation guide explains observation-to-model reasoning. The guide and questions await human review; external SME validation remains pending.

The shared reviewer preview now uses the learner's existing image/text stimulus renderer across subjects and grades. Unsupported or invalid media produces an Armenian message while preserving the question and options. Native Chromium tests cover images at desktop/mobile widths, replacement, invalid media, late item responses and logout. This is isolated browser verification with auth/network doubles, not an authenticated production content-review journey.

After this batch, Chapter II has **36 authored questions: 32 approved and four new drafts**. The 192-question target leaves 156 questions un-authored, plus this batch's pending reviews. No pool membership, blueprint, assessment-policy/model binding or learner exposure is created. Chapter II remains draft.
