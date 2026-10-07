# Chapter II S07 — textbook and whole-bank review

15B.13H · 2026-10-07 UTC · `haiedu-whole-skill-review-v1`

## Bounded decision

Prepare **one** practice/review draft, I05, two draft misconception definitions and a separate guide. S07 reaches **five authored of twelve planned**, leaving **seven slots open**. This is an **intentional practice variant** of existing solid-diffusion content, not an independent new reasoning path or new outcome. Its benefit is applying the very slow rate to an observation-duration error rather than repeating a true/false statement. The numeric target does not authorize padding.

The existing four questions cover the state ordering, textbook examples, diffusion in solids and the particle-spacing explanation. Other proposed additions repeated that ordering or mechanism, required a quantitative diffusion law not supplied by the book, or crossed into S08 temperature reasoning. They were omitted. S03's four-slot, S04's five-slot, S05's six-slot and S06's six-slot gaps remain open. Further expansion requires defensible content or John's separate bank-plan decision; approval of a bounded batch does not approve a smaller overall plan.

This is subject-aware content under the existing subject-neutral governance contract. No shared schema/runtime, dashboard, assessment length, scoring, model, authorization or release behavior changes. Authorship and semantic comparison are automated Codex work. Human question/guide/definition approval and external SME remain separate.

## Source and comparison corpus

The supplied *Ֆիզիկա 7 (2023)* PDF has SHA-256 `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. Printed pp.30–33, §10, were read and pp.32–33 visually inspected. Page 32 gives the lead–gold observation: polished solid plates at 20 °C penetrate by 1 mm over five years, illustrated in **figure 32**. The same page states that diffusion in solids is much slower than in liquids. Page 33 summarizes the state comparison. The one-day observation is an explicitly authored application: absence of a visible short-term change cannot establish absence of the much slower process. No daily penetration amount, onset time, constant diffusion speed, diffusion coefficient or depth–time law is inferred.

The direct official mapping is Theme 2 **additional outcome 2(1)**: characterize diffusion rates in gases, liquids and solids and give examples. It is not mandatory outcome 1(4), which belongs to S06 diffusion recognition. No other current or archived skill shares the S07 outcome mapping. S05 motion, S06 diffusion recognition/transfer, S08 temperature and Chapter I scientific-method reasoning were compared as related content. Temperature effects remain outside this S07 batch.

The fresh corpus contains **311 current items, 154 immutable snapshots and 19 skill records**, across states, purposes, templates and releases. [Version manifest](evidence/chapter-ii-s07-corpus-manifest-20261007.json) records exact observation time, versions and snapshot hashes without exposing protected prompts. Compared with the previous 309-item/150-snapshot source corpus, 308 current rows and all 150 old snapshots are unchanged; S05 I06 is revised, S06 I05–I06 have been added and four snapshots added. Those changes and the complete applicable S07 family were inspected. S07 I01–I04 v1 match their historical prompts, ordered options and answers.

The full-catalogue fingerprint is `46d0f52d162e3dc95214f27530c4a137`. SHARE locks over items, options, answers, mappings, versions, templates, definitions, skills/outcomes and guides make comparison/application atomic. Deployment rejects a changed fingerprint and requires renewed semantic review. Official skill/outcome mappings were inspected separately. Fingerprints establish freshness, not semantic diversity.

## Candidate comparison

| Candidate | Nearest current and historical matches | Scenario, solution and distractor comparison | Disposition |
|---|---|---|---|
| S07-I05 · misconception diagnosis | S07-I02 v1 includes the same lead–gold datum among three examples; S07-I03 v1 rejects absence of diffusion in solids; S05-I05 v1/v2 rejects no visible change implying no motion; S06-I06 v1 distinguishes an explicitly blocked transfer path | Use figure 32 and the stated five-year result to assess a student's conclusion after one day with no visible change. The solution applies slow diffusion to insufficient observation duration. Existing S07 content already teaches that solids diffuse, so the figure and extra story are not treated as independent new coverage. Wrong answers claim impossibility in solids, a five-year waiting period before onset, or mandatory melting. S06's divider question has an explicit impossibility condition; this task does not. | **Intentional practice variant**, useful for evidence interpretation. No new independent outcome/solution path is claimed. |

There is only one candidate, so no within-batch pairwise collision. The bank screen includes the approved S05/S06 edits and their earlier snapshots, the S02 gas-through-iron example and S08's temperature-dependent mixing example. Chapter I method/hypothesis tasks provide general evidence reasoning but do not ask this state-dependent observation-duration question. Protected Chapter I items were included in the screen without copying their prompts into this report. Chapter II protected diagnostic/mastery banks remain unauthored; their absence is not approval. Future protected authoring must treat this practice scenario as exposed.

Rejected alternatives include additional state-order permutations, perfume/liquid/metal noun substitutions, another particle-spacing recall, a same-temperature/same-speed misconception, temperature-control tasks better reserved for S08, numeric extrapolation from 1 mm in five years and a claim that diffusion begins only after a fixed delay. No alternative is inserted to fill the remaining seven slots.

## Illustration, mappings and guide

Figure 32 is an unmodified rectangular render from the supplied PDF, with both materials and the 1 mm marker retained. [Media provenance](evidence/chapter-ii-s07-textbook-media-20261007.json). The asset was visually inspected; the prompt states the relevant conditions in words, and Armenian alternative text is supplied. Students need not measure the screen or distinguish colours. The illustration is new to this asset collection but the experiment already appears in S07-I02; artwork is not claimed as new reasoning.

The existing active `diffusion_absent_in_solids` definition is reused accurately. Two new definitions cover mistaking the observation period for a waiting period before onset, and requiring melting for diffusion between solids. Each of the three incorrect options has exactly one scoped mapping; the correct option has none. Both new definitions remain draft. Canonical answer A is a storage key; the existing server-side shuffle remains authoritative. A one-item family cannot demonstrate answer-position balance and is not presented as doing so.

The separate draft guide distinguishes absence of visible change from absence of diffusion, and a measurement time from the start of the process. Its worked example uses the textbook's gradual mixing of water and copper-sulfate solution rather than the target metal plates. It warns against inferring a quantitative time law from one observation. The original S07 guide remains published runtime v2, unchanged.

## Completed S05/S06 review checkpoint

Production readback confirms all twelve S05/S06 questions approved: S05 I05/I06 v2; S06 I05 v2 and I06 v1. The five new definitions are active. Both edited expansion guides are published at runtime v2 / authoring v4, with matching immutable content; original guides remain v3. Prompt/option edits preserve the intended answers and misconception logic. Four current-family automated QA refreshes pass, and each guide validates both variants. These append-only technical QA records do not create human approvals or change content. [Review completion evidence](evidence/sprint-15b13-s05-s06-review-complete-20261007.json).

## Verification and handoff

Isolated tests execute the real migration and quality endpoint against a pseudonymized catalogue with real column/constraint contracts; only the expected corpus hash is substituted. They check additive preservation, current family QA, source-media bytes, guide compatibility, all distractor mappings, rollback and stale source/history/guide/related-bank/release rejection. Full CI, independent main CI, real production rollback, exact migration readback, production-catalogue QA replay, row preservation, advisor comparison and public asset readback precede handoff. QA replay is not an authenticated live Edge call or human review.

After deployment, review the one question, two definitions and separate guide. Approve/publish the question before publishing the guide so the workspace can load its published variant. Chapter II remains draft and learner-inactive. Protected banks, numeric readiness/model approval, the older 32-item illustration audit, SME, pilot and release authorization remain open. This bounded slice does not close S07's seven-slot bank-plan gap.
