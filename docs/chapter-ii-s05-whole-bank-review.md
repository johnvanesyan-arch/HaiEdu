# Chapter II S05 — textbook and whole-bank review

15B.13F · 2026-10-07 UTC · `haiedu-whole-skill-review-v1`

## Bounded decision

Prepare **two** practice/review drafts, I05–I06, a separate guide and two draft misconception definitions. This brings S05 from four approved questions to six authored questions, with **six planning slots still open**. S03 remains 8/12 and S04 7/12. No smaller bank plan is inferred from completion of human review. Further expansion requires defensible source-supported demands or John's separate bank-plan decision; twelve is not permission to pad.

This subject-aware content extension uses the existing subject-neutral governance contract. Its two purposes are misconception diagnosis and transfer reasoning. It changes no schema, runtime, dashboard, scoring, assessment length, model binding or release authorization. Authorship and the semantic comparison are automated Codex work; human content review and external SME review remain separate.

## Source and comparison corpus

The supplied *Ֆիզիկա 7 (2023)* PDF, SHA-256 `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`, was read at printed pp.30–33, with p.40 problem 3 checked for existing trajectory coverage. Figures 30 and 31 on p.31 show bulk mixing and particle distribution. The p.31 explanation explicitly distinguishes departures and returns while the initial distribution is unequal. Pages 30, 32 and the p.33 summary establish continuous random motion. Continued motion after visible uniformity is an authored application of that stated principle, not an additional physical law. No equilibrium equation, Brownian-motion lesson, diffusion coefficient, probability calculation or chemistry of dissolved ions is introduced.

The approved direct mapping is mandatory outcome **1(3)**: describing atomic/molecular motion in matter. No other current or archived skill has an equivalent mapping. Adjacent S06 diffusion, S07 state-dependent diffusion and S08 temperature-speed content were compared because their scenarios overlap. The new questions focus on the motion model; they do not replace those skills' outcomes.

The complete database read at **06:51:52 UTC** contains **307 current items, 147 immutable snapshots and 19 skill records**, across states, templates, releases and purposes. The manifest records versions/fingerprints without exposing protected prompts. S05 I01–I04 are approved v1 with four corresponding original snapshots; its original guide is published runtime v3. The current and historic S05 prompts, options, answers and distractor logic were inspected. Related Chapter II items and revisions were compared; Chapter I banks were screened for overlapping scenarios and inference demands. Chapter I classification/research/measurement tasks, including protected forms, do not assess these particle-motion inferences. S06-I02 and S08-I02 share the copper-sulfate experiment, so that reuse is explicitly recorded below rather than counted as novelty from artwork.

The database full-catalogue fingerprint is `0e8854cd860768290caf4fa3ca070c02`. The migration takes SHARE locks over items, options, answers, mappings, versions, templates, definitions, skills/outcomes and guides, then rejects any changed fingerprint. Fresh revalidation is required immediately before deployment. Exact fingerprints only guard freshness; they do not prove semantic diversity.

## Candidate comparison and source fidelity

| Draft | Nearest current and historical matches | Scenario, solution and additional demand | Decision |
|---|---|---|---|
| I05 · misconception diagnosis | S05-I01 v1 continuous-motion definition; S06-I02 v1 explanation of initially separated liquids mixing; S08-I03 v1 motion at 0 °C | Uses figure 30's final uniform stage. Distinguish a stable visible colour from particles stopping; apply the continuous-motion principle after the visible change has ended. Existing items ask for the definition, mixing mechanism or a temperature misconception, not this inference about the endpoint. Correct answer: continued random motion. Wrong options diagnose stopping at uniformity, external activation and ordered motion. | **New reasoning coverage** within the existing outcome; shared source experiment, not a new scenario. |
| I06 · transfer reasoning | S05-I02/I03 v1 collision/direction/path; S06-I02 v1 mutual penetration; S07-I02 v1 relative rates; S08-I02 v1 heating the same liquids | Uses figure 31 and an explicitly unequal initial distribution compared over equal volumes. Reconcile motion in both directions with more departures than returns from the initially richer layer, as stated on p.31. Existing items do not ask how random individual motion coexists with unequal aggregate transfer. Wrong options diagnose all particles moving upward, mandatory equal crossing counts and external activation. | **New reasoning coverage**, not another definition of diffusion or speed ranking. |

The within-batch comparison separates two conditions: I05 concerns the final visibly uniform state; I06 concerns the initial unequal distribution. Neither asks the learner to count drawn circles or infer measured concentrations from a schematic. I06's two-way motion is qualitative, not a claim that equal crossing counts occur in every short interval. Keys B/A occupy distinct positions; the shared runtime shuffle remains authoritative.

Rejected alternatives: another perfume/benzine delay, another broken-path description, a stationary cup with moving particles (too close to S05-I01's existing distractor), another temperature-zero question (S08-I03), generic mixing without stirring (S06-I02), and solid-particle vibration or random-walk calculations not taught in this bounded source. Adding different nouns or illustrations would not repair those repetitions.

## Media, guide and protected content

Both diagrams are unmodified rectangular renders of the supplied textbook. Figure 30 retains labels ա–ե; figure 31 retains all three particle panels. Both were visually inspected and carry Armenian alternative text and source/hash metadata. The prompt supplies the relevant condition in words, so colour perception, screen measurement and tiny labels are not prerequisites. [Media provenance](evidence/chapter-ii-s05-textbook-media-20261007.json).

The new definitions address motion stopping at uniformity and random motion supposedly forcing equal transfer counts. Existing external-activation and ordered-motion definitions are reused without alteration. Each incorrect option has one accurate scoped mapping; correct options have none. The new guide distinguishes particle motion from bulk appearance and uses a separate transparent-room-air example. It must validate against both drafts. The original approved items, definitions and published guide remain untouched.

All accessible protected bank assignments were included in the corpus; no protected particle-motion task collides with these candidates. Chapter II diagnostic/mastery banks are still absent, not implicitly approved. These public practice scenarios must be considered exposed when those protected banks are authored. Assessment pools, forms, blueprints and learner/exposure records receive no additions in this slice.

## Verification and handoff

Isolated tests execute the real migration and quality endpoint against a pseudonymized catalogue with real column/constraint contracts. Only the expected corpus hash is substituted for the smaller fixture. Tests check additive preservation, source-media hashes, all distractor mappings, guide validation, rollback and rejection of stale current/history/guide/related-bank evidence and a non-draft release. A separate production rollback probe exercises unchanged SQL against the real schema. Automated QA is not a human approval or authenticated live Edge call.

After verified deployment, review the two S05 questions, the two definitions, then the separate guide. Publish/approve the questions before publishing the guide so the workspace can load their published variants. Chapter II remains learner-inactive. Open work includes the six S05, five S04 and four S03 planning slots, S06–S09 expansion, protected banks, numeric readiness/model approval, the older 32-item illustration audit, external SME, pilot and release authorization.


## Deployment checkpoint — 2026-10-07 07:12 UTC

[PR #157](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/157), CI #1273 and independent main CI #1274 passed all five jobs (1,232 Node / 63 Chromium). Main `fc5b91d50696798b86a26bd37964c636fedd81ef` matches the reviewed tree. Vercel is READY at that commit; `/release.json` and both public images verify the intended bytes. Production migration `20261007071149` matches reviewed SQL verbatim. Both drafts pass fresh current-family technical QA, and the guide validates both variants. All existing rows are preserved: 15 tables receive expected additions and 85 remain unchanged. Advisor findings are unchanged. Chapter II has 49 authored items (47 approved, two drafts), zero learner/pool/form/exposure links and a draft release. [Full evidence](evidence/sprint-15b13-s05-expansion-20261007.json).

- [PHY7-U02-S05-I05 v1](https://www.haiedu.am/content-item.html?id=12e86241-becd-43b3-bf81-f0d28025a8ab&from=review)
- [PHY7-U02-S05-I06 v1](https://www.haiedu.am/content-item.html?id=23d9df58-9745-44b6-bba3-92f765b7759f&from=review)
- Review the two new S05 definitions in [Թյուր պատկերացումներ](https://www.haiedu.am/content-misconceptions.html).
- After publishing the questions, review [the separate draft guide](https://www.haiedu.am/content-guides.html?id=template%3A7d5e2e67-a1e8-4168-b4f5-4a3b73505679).

## Combined-review update — 2026-10-07 08:09 UTC

I05 is now edited and approved at v2; I06 remains draft v1. The two new definitions and separate guide are still draft. Both current-family technical QA refreshes and guide validation pass, preserving the human edit/approval. John authorized preparing S06 while reviewing both batches together. [Combined review links and S06 checkpoint](chapter-ii-s06-whole-bank-review.md#deployment-checkpoint--2026-10-07-0809-utc). This supersedes the earlier two-pending-question handoff, without closing S05's six-slot planning gap.
