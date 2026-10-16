# Chapter III preparation — «Մեխանիկական շարժում»

**Current checkpoint — 2026-10-17 / 15C.24:** 168 questions authored: 166 current versions approved and two v2 revisions awaiting review. There are 80 published guides, 339 active definitions and five definition drafts. The assessment contract is approved/implemented; conditional form coverage is addressed by the two pending revisions. Independent qualification and release remain open. [Authoritative status](project-status.md) · [Revisions and review handoff](chapter-iii-trajectory-revisions-20261017.md). All counts, queues and next steps below preserve dated historical evidence.

**Prepared:** 2026-10-13 · **Sprint:** 15C.1. **Current update:** John accepted the plan, planning budget and eight offline drafts; [15C.2](chapter-iii-batch-01-staging.md) records completed fresh comparison, committed staging and QA; ordinary site workflow remains pending. The original preparation proposal and its then-open gates are retained below as the historical baseline; acceptance does not create a final assessment/readiness contract.

John authorized Chapter III preparation while Chapter II deployment is paused. The requested source policy is binding: use the supplied Physics 7 textbook for factual content and natural Armenian, and use its illustrations where the task needs them. The [current status register](project-status.md) remains authoritative.

## Verified sources and boundaries

The supplied *Ֆիզիկա 7* by Գագիկ Մելիքյան and Սոս Մաիլյան (Էդիթ Պրինտ, 2023) is the same byte-identical edition used for Chapter II. Chapter III spans **printed pp.42–59 / PDF pp.43–60, §§14–18**. Its source hash is `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`.

The [current official programme](https://www.arlis.am/hy/acts/229331), N 40-Ն as amended by N 36-Ն, effective 14 August 2026, was freshly checked. Its [DOCX appendix](https://www.arlis.am/acts/files/362742/966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478) matches the previously registered SHA-256 `966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478`. Cached older attachment routes returned 404; the fresh incorporation page supplied the working route. This is a retrieval-path change, not an observed programme revision.

The programme defines **five mandatory outcomes and one additional outcome** for Theme 3. Local references M1–M5 preserve mandatory source order; A1 identifies the printed additional outcome. These labels are preparation references, not issued official codes. Exact source wording is retained below, including punctuation; learner-facing prose is edited separately for natural Armenian.

## Official outcome crosswalk

| Ref | Level | Exact source statement | Proposed skills |
| --- | --- | --- | --- |
| M1 | mandatory | բերել մեխանիկական շարժման օրինակներ, տարբերակել հավասարաչափ և անհավասարաչափ շարժումները,(Հ8, Հ9), | S01, S04 |
| M2 | mandatory | բերել շարժման հարաբերականությունը լուսաբանող օրինակներ,(Հ9, Հ30), | S01 |
| M3 | mandatory | մեկնաբանել շարժման հետագիծ և ճանապարհ հասկացությունները,(Հ8, Հ9), | S02, S03 |
| M4 | mandatory | դասակարգել մեխանիկական շարժման տեսակները՝ ըստ հետագծի տեսքի (ուղղագիծ և կորագիծ), (Հ8, Հ29), | S03 |
| M5 | mandatory | կատարել արագության միավորների ձևափոխություններ,(Հ9, Հ29), | S05, S06 |
| A1 | additional | 1) փորձով և հաշվարկներով որոշել հավասարաչափ շարժումը բնութագրող ֆիզիկական մեծությունները՝ ճանապարհային արագություն, ճանապարհ, ժամանակ: | S05, S07, S08 |

The additional outcome is explicitly marked additional in the programme, although formula work and the laboratory exercise also appear in its content/practical activities. This preparation does not silently turn every supporting or additional skill into a mandatory mastery gate. S02's point model and S05's direction vocabulary are textbook support, not newly invented official outcomes.

## Proposed skill map

All codes below are **proposed labels only**. No database identities, curriculum release or prerequisite gates have been created.

| Skill | Natural Armenian label | Assessable scope | Trace | Source |
| --- | --- | --- | --- | --- |
| S01 | Մեխանիկական շարժումը և հաշվարկման մարմինը | Recognize a changing position and explain rest/motion relative to an explicitly named body. | M1, M2; direct | §14, pp.42–45 |
| S02 | Մարմինը որպես նյութական կետ | Decide whether body dimensions matter for the stated question; never define a point model by small physical size alone. | M3; derived_supporting | §15, pp.45–46, 48 |
| S03 | Շարժման հետագիծը և անցած ճանապարհը | Identify straight/curved trajectories, distinguish the line from its traversed length, and distinguish path length from endpoint distance. | M3, M4; direct | §15, pp.46–48 |
| S04 | Հավասարաչափ և անհավասարաչափ շարժում | Use equal-time distance records and the arbitrary-equal-interval definition; distinguish compatible observations from a proof for every instant. | M1; direct | §16, pp.49–50, 53 |
| S05 | Ճանապարհային արագության իմաստը | Interpret distance per unit time. Treat the textbook introduction to direction as supporting vocabulary and distinguish numerical value from direction. | A1, M5; derived_supporting | §16, pp.50–52 |
| S06 | Արագության միավորների ձևափոխում | Convert m/s, km/h and cm/s, then compare speeds expressed in different units. | M5; direct | §16, pp.51, 53; §17, p.54 |
| S07 | Արագության, ճանապարհի և ժամանակի հաշվում | Choose and apply v=s/t, s=vt and t=s/v with compatible units and an explicit uniform-motion premise. | A1; direct_additional | §16, p.52; §17, pp.54–57 |
| S08 | Արագության որոշումը չափումներով | Choose a path interval and measure its matching elapsed time; record units and interpret repeated measurements. MCQs assess planning and interpretation, not performed laboratory competence. | A1; direct_additional | §18, pp.57–58 |

### Prerequisites

Chapter I quantity/unit knowledge, conversions, scale reading and measurement planning supply the principal prerequisites. S01 supports S02/S03; S03 supports S04; S03/S04 support speed meaning; speed meaning and earlier conversions support S06; S04–S06 support S07; S04/S07 plus Chapter I measurement skills support S08. Exact proposed edges are in the manifest.

Chapter II's particle model is not a necessary prerequisite for these mechanics tasks. Chapter order is navigation, not evidence for imposing a Chapter II mastery lock. Existing chapter-access and diagnostic rules are unchanged. No runtime cross-release prerequisite support is claimed by this conceptual graph.

## Chapter-specific assessment proposal

The following is a **planning budget**, not an authorized final contract or a claim that 168 diverse questions already exist. Counts follow the proposed evidence breadth; they do not copy Chapter II's 192-item plan. Reassess after the first complete whole-bank comparison and source-based family feasibility review.

| Skill | Practice/review budget | Items per proposed diagnostic/mastery form | Rationale |
| --- | ---: | ---: | --- |
| S01 | 10 | 2 | Reference choice and relative-rest contexts. |
| S02 | 6 | 1 | Supporting modeling decision; narrower evidence demand. |
| S03 | 12 | 3 | Classification, path versus distance, and traversed-length interpretation. |
| S04 | 10 | 2 | Definition plus time/distance evidence. |
| S05 | 8 | 2 | Per-unit-time meaning plus carefully labeled supporting direction task. |
| S06 | 10 | 2 | Single conversion and comparison after conversion. |
| S07 | 14 | 3 | Separate v, s and t demands; compatible units and bounded two-step applications. |
| S08 | 10 | 1 | One planning/data item; performed experiment assessed separately. |
| **Total** | **80** | **16** | Unequal weights are deliberate. |

- **Diagnostic:** two disjoint 16-item forms = 32 candidates; one learner baseline attempt remains the existing policy intent. No form has been built or qualified.
- **Mastery:** three disjoint 16-item forms = 48 candidates, plus one reserve per proposed skill = 8 reserve candidates; 56 total. Eight individual reserves are not a fourth complete form.
- **Overall proposed bank:** 80 practice/review + 32 diagnostic + 56 mastery = **168 questions**, plus one separately assessed practical task.
- **Owner decision before implementation:** final counts/weights, treatment of supporting/additional skills in readiness and per-skill pass rules, and the explicit Chapter III assessment contract. Existing 80% scoring and lifecycle rules are not changed by this proposal; no new threshold is activated. Do not assume the Chapter II all-eight-skill pass rule carries over.
- **Quality boundary:** a budget is not permission to add number-swapped questions to protected forms. The Chapter II bounded parallel-variant disposition and deferred-SME pilot authorization do not extend to Chapter III. If ordinary protected qualification cannot support these forms, record the capacity shortfall for a decision.

### Family coverage to develop

| Skill | Candidate families / evidence demands | Protection and scope boundary |
| --- | --- | --- |
| S01 | Compare positions; select a reference body; explain simultaneous rest and motion relative to different bodies. | Familiar train/passenger recall is practice; a new vehicle alone is no protected novelty. |
| S02 | Decide whether body length matters for a stated measurement or journey. | Supporting practice; do not pad with vehicle substitutions. |
| S03 | Classify trajectories; distinguish trajectory from its length; count traversed segments; compare path length and endpoint distance. | Physical image scale cannot depend on browser zoom. Give numerical lengths or a calibrated internal scale for numerical tasks. |
| S04 | Equal-time traces; unequal intervals; identify what coarse observations can and cannot establish. | Explicit equal-time premise; finite records support the sampled claim only. |
| S05 | Interpret m/s; compare equal distances/times; separate numerical value from direction. | No vector algebra, velocity-displacement formula or acceleration. |
| S06 | Convert both numerator and denominator units; order speeds after conversion; diagnose a faulty conversion. | Different numbers alone remain intentional practice. |
| S07 | Solve for v/s/t; convert units before substitution; link two uniform segments with clear conditions. | Meeting/catch-up examples in §17 are later enrichment, not a new compulsory skill. Do not introduce Grade 8 average-speed/acceleration assessment. |
| S08 | Match measured distance to elapsed time; choose instruments; interpret equal-interval records; record an actual supervised measurement. | MCQ results never certify performed laboratory competence. |

### Practical task draft

Use the textbook §18 bubble experiment under teacher supervision. Record equal-time bubble positions, the chosen travel interval, distance and elapsed time with units, calculated speed, and a conclusion limited to the recorded observations. Proposed teacher checklist: appropriate setup and measurement; matching distance/time interval; recorded values/units and calculation; explanation of the observed evidence. Record four separate observations, not an automatically inferred skill pass. No class assignment or teacher UI is created here.

## Armenian and physics authoring rules for this chapter

- Prefer the book's terms: **հաշվարկման մարմին, շարժման հետագիծ, անցած ճանապարհ, հավասարաչափ շարժում, ժամանակամիջոց, վայրկենաչափ, նյութական կետ**. Use complete natural questions; avoid literal English structures and needless multi-clause qualification.
- Use **ճանապարհային արագություն** for the numerical distance/time quantity when distinction matters. The book also introduces direction: say **արագության թվային արժեքը** and **շարժման ուղղությունը** separately. Uniform speed does not by itself mean fixed direction.
- State the reference body and uniform-motion assumption where they affect the answer. Do not infer a speed change from position pictures without timing information.
- Correct obvious textbook/OCR typos rather than copying them into learner text. Keep verbatim official outcome transcription separate from edited question prose.
- Re-solve each correct answer; explain why each distractor fails. Check Armenian independently after the physics check. Automated author review does not count as human or SME approval.

## Textbook media and first batch

The [first practice batch](chapter-iii-preparation-batch-01.md) contains **eight offline drafts across all eight proposed skills**. Three require source figures: figure 36 (p.43), figure 40 (p.47), and the three drop traces in p.53 question 3. Exact crops retain relevant labels and omit answer-revealing captions. Each question has source pages, two draft hints, an answer explanation, distractor rationales, and Armenian alt text or an explicit no-image rationale.

The manifest records source/crop coordinates and hashes. The images are source extractions, not generated reconstructions. Other useful assets identified for later authoring are figures 38–39 (p.47), the ruler/path tasks (p.48), figure 41 (p.49), figure 42 (p.52), and figures 43–45 (pp.55–56). They are not all attached indiscriminately. Figure 37's Earth context and advanced §17 examples need especially careful scope/overlap checks.

## Comparison and handoff status

The first batch is **not eligible for staging yet**. An offline current/history corpus from 2026-10-12 was used for a preliminary related-skill screen; it predates later Chapter II additions and editorial changes. It is not represented as a fresh exhaustive semantic audit. Existing unit-conversion and measurement tasks are relevant even under other chapter codes. The 28 within-batch pairs and preliminary nearest-demand findings are recorded in the [comparison note](chapter-iii-preparation-comparison.md).

Next, after service recovery: refresh all applicable current/retired/history questions, related outcome mappings, guides and protected exposure evidence; complete the semantic comparison; confirm the plan; create the governed Chapter III foundation; and stage reviewed candidates on the existing Content Reviewer pages. Until then, no new QA, approval, pool, model, policy, release or learner record is written. Chapter II remains separately paused.

[Machine-readable preparation manifest](evidence/chapter-iii-preparation-20261013.json).

[Offline author checks and rendering limitations](evidence/chapter-iii-preparation-qa-20261013.json).
