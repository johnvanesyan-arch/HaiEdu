# Chapter V map — «Աշխատանք և հզորություն»

> **Execution update — 15E.6, 2026-10-19:** the owner adopted the exact contract and knowledge-only pilot. All 152 questions remain approved, 88 guides published and 108 definitions active. Five forms and four v2 contracts are provisionally activated; rollback and exact 458-row readback pass. Authenticated acceptance passed 191/191 with two-school isolation 54/54; all 59 tracked tables were unchanged through QA. Specialist/exposure review and performed laboratory assessment are deferred. [Current release](chapter-v-pilot-release.md). The preparation-time observations below are historical.

**Sprint 15E.1 · 2026-10-18 · Preparation complete; proposed plan awaiting owner acceptance.** The proposal is **10 skills, 152 questions in three large batches, and two separately tracked laboratory activities**. This is subject-aware content planning. No content has been staged or approved and no database, shared-core, API or learner-runtime change is included. The [project status register](project-status.md) remains authoritative.

## Source scope

The supplied *Ֆիզիկա 7*, Գագիկ Մելիքյան / Սոս Մաիլյան, Էդիթ Պրինտ, 2023, covers this chapter in **§§32–39, printed pp.99–117 / PDF pp.100–118**. The freshly checked PDF SHA-256 is `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`.

The [current official programme](https://www.arlis.am/hy/acts/229331), N 40-Ն as amended by N 36-Ն, is the incorporation effective 14 August 2026. Its [appendix](https://www.arlis.am/acts/files/363077/966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478) was freshly downloaded on 18 October: 248,283 bytes, SHA-256 `966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478`, unchanged from the earlier source. Grade 7 Theme 5 has **four mandatory and two additional outcomes**, followed separately by two laboratory activities. The similarly titled later-grade Theme 9 is outside this map.

The [read-only catalogue](evidence/chapter-v-catalogue-20261018.json) at **19:00:05 UTC** contains the four existing Physics pilot releases; no PHY7-U05 unit, skill or release exists. This is an identity/scope checkpoint, not fresh browser acceptance or whole-bank comparison. Chapter VI remains unmodeled. [Structured planning evidence](evidence/chapter-v-preparation-20261018.json) preserves the exact outcome cell, source hashes, page ranges, budgets and crop provenance.

## Outcome crosswalk

M1–M4 and A1–A2 are local source-order references, not official codes. Source wording is preserved below; M1's separate `(Հ4)` line is displayed on the same table line. Learner wording is edited separately.

| Ref | Level | Source statement | Proposed skills |
| --- | --- | --- | --- |
| M1 | mandatory | ներկայացնել «մեխանիկական աշխատանք»,  «հզորություն», մեծությունների ֆիզիկական իմաստը, հաշվարկման բանաձևը, չափման միավորները  (Հ4) | S01, S02, S03 |
| M2 | mandatory | բացատրել պարզ մեխանիզմների (լծակ, անշարժ և շարժական ճախարակներ, թեք հարթություն) կառուցվածքը և աշխատանքի սկզբունքը,(Հ8, Հ10) | S04, S06, S07 |
| M3 | mandatory | սահմանել լծակի կանոնը, գրել նրա հավասարակշռության պայմանը,(Հ9, Հ10) | S05 |
| M4 | mandatory | հաշվարկել պարզ մեխանիզմների օգտակար գործողության գործակիցը (Հ7, Հ30) | S08 |
| A1 | additional | 1) ներկայացնել ձիաուժը՝ որպես հզորության չափման միավոր, | S09 |
| A2 | additional | 2) բերել կենցաղում և տեխնիկայում, կենդանի օրգանիզմների հենաշարժողական համակարգում պարզ մեխանիզմների օգտագործման օրինակներ: | S10 |

M1 requires **both** work and power, with meaning, formula and units; a few arithmetic items cannot stand for its whole claim. M2 requires lever, fixed pulley, movable pulley and inclined plane, including structure and operating principle. M3 needs the lever rule and equilibrium condition. M4 needs efficiency calculation, including identifying the two relevant works. These claim distinctions must survive final form design even where outcomes share a skill. Eight proposed skills primarily cover mandatory outcomes; S09/S10 are optional additional strands.

## Skill map and question budget

**152 = 88 Practice + 24 Diagnostic + 40 Mastery candidates.** These are provisional authoring ceilings, not 152 independently distinct reasoning patterns, a student session length, an approved bank target or qualified capacity. A narrow additional topic receives only two Practice slots. Richer formula, graph, mechanism and experimental-data skills receive more. Each eventual slot must earn its place through the whole-bank review; reduce the budget instead of padding it.

| Skill | Armenian name | Outcome | Textbook printed pages | Practice | Diagnostic | Mastery | Batch |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| S01 | Մեխանիկական աշխատանքի իմաստը և միավորը | M1 | 99–101 | 8 | 2 | 4 | 1 |
| S02 | Մեխանիկական աշխատանքի հաշվում | M1 | 99–101, 114–115 | 10 | 2 | 4 | 1 |
| S03 | Հզորության իմաստը, միավորը և հաշվումը | M1 | 102–104, 114–115 | 12 | 4 | 6 | 1 |
| S04 | Լծակի կառուցվածքը և ուժի բազուկը | M2 | 105–107 | 8 | 2 | 4 | 2 |
| S05 | Լծակի հավասարակշռության պայմանը | M3 | 106–109, 115 | 10 | 4 | 6 | 2 |
| S06 | Անշարժ և շարժական ճախարակներ | M2 | 109–111, 115 | 10 | 4 | 6 | 2 |
| S07 | Թեք հարթությունը և մեխանիկայի «ոսկի կանոնը» | M2 | 111–113, 116–117 | 10 | 2 | 4 | 3 |
| S08 | Օգտակար գործողության գործակիցը | M4 | 112–117 | 12 | 4 | 6 | 3 |
| S09 | Ձիաուժը՝ որպես հզորության միավոր | A1 | Programme A1; see source limit below | 2 | 0 | 0 | 1 |
| S10 | Պարզ մեխանիզմների կիրառությունները | A2 | 105–107, 109–111 | 6 | 0 | 0 | 3 |
| **Total** | | | | **88** | **24** | **40** | |

Plan up to **88 Practice guides**, each with a separately checked hint sequence and worked example. Definitions follow the actual useful distractors; there is no invented misconception-definition quota. Additional S09/S10 have **zero Diagnostic/Mastery slots** in this proposal and confer no mandatory pass conditions.

**Source limit for S09:** the programme explicitly requires recognition of horsepower as an additional power unit. The printed chapter has a supplementary-reading QR on p.104 but no extracted horsepower conversion. That linked supplement has not been retrieved. The two slots are limited to unit meaning and intentional reinforcement; no conversion constant or advanced engine facts are assumed. Any later numerical conversion needs a verified primary reference, the exact convention and supplied conversion data.

### Three proposed authoring batches

| Batch | Scope | Skills | Practice | Diagnostic | Mastery | Total |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | Work, power and optional horsepower | S01, S02, S03, S09 | 32 | 8 | 14 | **54** |
| 2 | Levers and pulleys | S04, S05, S06 | 28 | 10 | 16 | **54** |
| 3 | Inclined planes, efficiency and optional applications | S07, S08, S10 | 28 | 6 | 10 | **44** |

Assess each complete batch before its deployment. Keep guides and useful misconception definitions in the same authoring/review handoff. One primary agent, one frozen corpus per unchanged batch, one cohesive staging change and required CI preserve the agreed economical cadence. Large batches do not waive source, Armenian, physics, overlap or version-bound review checks.

The **64 assessment candidates are unqualified**. Their budgets are not a promise of two Diagnostic/three Mastery forms, disjoint capacity, parallel equivalence or non-exposure. Before drafting them, screen claim/stimulus families against the proposed Practice and guides as well as the existing bank. No protected-parallel exception from Chapters II–IV carries over. Session lengths, scoring, required-skill minima, attempts and reserve policy remain for a later concrete contract; do not inherit Chapter IV's numbers.

## Prerequisites and teaching order

| Proposed skill(s) | Needed concepts | Boundary |
| --- | --- | --- |
| S01–S02 | Chapter I units; Chapter III path; Chapter IV force, mass/gravity | Introduce work before asking for work calculations. Supply g when needed. |
| S03 | S01–S02; time units; Chapter III uniform motion | Teach A/t and its units before graph or N=Fv applications. |
| S04–S05 | Chapter IV force/application point; measurement; proportionality | Teach support and perpendicular arm before the equilibrium rule. |
| S06 | S04–S05; S01–S02 | Explain the mechanism before force/travel calculations. |
| S07 | S01–S02, S06; same-height comparison | Exact golden-rule equality only for the stated ideal model. |
| S08 | S02, S07; fractions/percentages | Identify useful and total work before division. |
| S09, S10 | S03; S04/S06/S07 respectively | Optional; never prerequisites for required completion. |

These are conceptual teaching dependencies, not runtime graph edges or readiness thresholds.

## Initial candidate briefs

The **20 briefs** below make the scope reviewable. They are not complete questions, approvals or semantic-diversity findings. They do not fill the 152 slots by themselves. The manifest records each brief's detailed screening boundary.

| Brief | Armenian working title | Evidence intent |
| --- | --- | --- |
| S01-C01 | Ուժ կա, իսկ աշխատանք կա՞ | Distinguish pushing a stationary cabinet from moving a body along a stated force. |
| S01-C02 | Ի՞նչ է նշանակում մեկ ջոուլը | Interpret the force-distance meaning of 1 J. |
| S02-C01 | Տարբեր ուժեր, նույն աշխատանքը | Compare two force-distance products, including inverse reasoning for equal work. |
| S02-C02 | Որքա՞ն աշխատանք է պետք բեռը բարձրացնելու համար | Combine a supplied mass, g and vertical rise for uniform lifting. |
| S03-C01 | Նույն աշխատանքը՝ տարբեր ժամանակներում | Compare power, then distinguish equal power from equal total work. |
| S03-C02 | Հզորությունը՝ աշխատանքի գրաֆիկից | Read a supplied straight work-time graph and calculate A/t. |
| S04-C01 | Որտե՞ղ է հենման կետը | Identify the support and the two forces in a clearly labelled lever. |
| S04-C02 | Ո՞ր հատվածն է ուժի բազուկը | Choose the perpendicular distance from support to line of action. |
| S05-C01 | Կհավասարակշռվի՞ լծակը | Compare force-arm products and decide a balance condition. |
| S05-C02 | Փորձի գրառումներն ի՞նչ են ցույց տալիս | Check a table from several measured lever balances. |
| S06-C01 | Ո՞ր ճախարակն է շարժվում բեռի հետ | Distinguish the two pulley arrangements and explain their use. |
| S06-C02 | Ուժի շահումը և պարանի ճանապարհը | Link a single movable pulley to half the load force and twice the rope travel. |
| S07-C01 | Նույն բարձրությունը՝ տարբեր ճանապարհներով | Compare ideal ramps reaching the same height. |
| S07-C02 | Ուժի մեջ շահելը աշխատանքի մեջ շահե՞լ է | Evaluate a claim that a simple machine reduces both input force and input distance for the same useful task. |
| S08-C01 | Ո՞ր աշխատանքն է օգտակար | Identify useful lifting work and total pulling work before calculating efficiency. |
| S08-C02 | Ինչո՞ւ է ստացվել 100%-ից մեծ ՕԳԳ | Audit supplied incline measurements and identify a specified recording/calculation error. |
| S09-C01 | Ձիաուժով ի՞նչ են չափում | Identify horsepower as a power unit from the official additional outcome. |
| S09-C02 | Միավորի սխալ ընտրությունը | Correct a statement confusing a power unit with a force or work unit. |
| S10-C01 | Ինչպե՞ս է աշխատում մկրատը | Locate support and applied forces in a supplied scissors or balance illustration. |
| S10-C02 | Լծակը մարդու ձեռքում | Interpret a supplied arm model with joint, muscle force and load already labelled. |

S09-C02 is deliberately marked practice reinforcement of C01, not independent reasoning. S04/S05/S10 and S06/S07/S08 have related claims; cross-skill coding does not make their variants independent.

## Laboratory activities and proposed evidence

These are the two programme activities, **not two extra mandatory outcome rows**. Neither has been implemented or performed. MCQs may assess planning and interpretation; they cannot establish apparatus handling or authentic observations. A later release proposal must explicitly resolve practical delivery and how its limits are reported.

### LAB-LEVER — §35, pp.108–109; supports M2/M3

Learner wording: «Լծակը նախ հավասարակշռե՛ք հորիզոնական դիրքում։ Մի կողմում կախե՛ք երկու նույնական բեռ։ Մյուս կողմում հերթով կախե՛ք մեկ, երկու և երեք նույնական բեռ՝ ամեն անգամ գտնելով հավասարակշռության դիրքը։ Չափե՛ք ուժերի բազուկները և գրանցե՛ք արդյունքները։ Համեմատե՛ք F₁l₁ և F₂l₂ արտադրյալները»։

Use the textbook laboratory lever, ruler and force gauge; record the measured weight of one load rather than assume it. Prebalance the unloaded lever, keep the support fixed, measure from the pivot to the force line, and record at least the three source arrangements. Save force/arm units and actual observations. Compare within instrument resolution; do not alter readings to force exact equality.

Draft rubric: (1) stable, freely moving and initially balanced setup; (2) correct force and arm measurements; (3) an authentic three-trial table; (4) correct products or inverse ratios with units; (5) a conclusion supported by measurements and their precision. A human observer must verify setup and handling if performance credit is awarded.

### LAB-INCLINE — §39, pp.116–117; supports M2/M4

Learner wording: «Ուժաչափով չափե՛ք չորսուի կշիռը։ Չորսուն ուժաչափով հավասարաչափ քաշե՛ք թեք հարթության երկայնքով և գրանցե՛ք քարշի ուժը։ Չափե՛ք անցած ճանապարհը և այն բարձրությունը, որով բարձրացել է չորսուն։ Հաշվե՛ք օգտակար ու լրիվ աշխատանքները, ապա՝ թեք հարթության ՕԳԳ-ն»։

Keep the pull parallel to the plane and approximately constant during uniform travel. Read the running force rather than the starting peak. Measure the **vertical change of the same point between start and finish**, and the corresponding distance travelled along the plane; an absolute height of the block's upper edge can be wrong. Record P, F, h, l, Aօգ=Ph, Aլր=Fl and η=100Aօգ/Aլր. Repeat with different loads while retaining the ramp geometry; report each result and, if an average is used as in the book, what trials it averages.

Draft rubric: (1) stable apparatus and aligned uniform pull; (2) authentic force, path and vertical-rise measurements; (3) correct useful/total work; (4) correct efficiency and percent; (5) plausible interpretation with uncertainty/error checks. A result over 100% triggers checking readings, units and procedure, not silently replacing data. Performance credit needs observed execution, not a correct table-choice answer.

## Natural Armenian, hints and physics

Use «մեխանիկական աշխատանք», «հզորություն», «ջոուլ», «վատտ», «լծակ», «հենման կետ», «ուժի ազդման գիծ», «ուժի բազուկ», «անշարժ ճախարակ», «շարժական ճախարակ», «թեք հարթություն», «օգտակար աշխատանք», «լրիվ աշխատանք» and «օգտակար գործողության գործակից» consistently with the book. Keep «չորսու» spelling consistent. Prefer short, direct sentences; remove translated filler. Check each stem, option, explanation, hint and worked example for language **and then separately for physics**.

Hint exemplars, not approved guides:

- Power: «Համեմատի՛ր ոչ միայն կատարված աշխատանքը, այլև դրա համար ծախսված ժամանակը»։ Then: «Յուրաքանչյուր դեպքում կատարված աշխատանքը բաժանի՛ր համապատասխան ժամանակին»։
- Lever: «Ուշադրություն դարձրո՛ւ նաև ուժերի բազուկներին»։ Then: «Յուրաքանչյուր ուժ բազմապատկի՛ր իր բազուկով և համեմատի՛ր արդյունքները»։
- Efficiency: «Ո՞ր աշխատանքն է ծախսվում բեռը բարձրացնելու համար, և որքա՞ն է ծախսված ամբողջ աշխատանքը»։ Then: «Օգտակար աշխատանքը բաժանի՛ր լրիվ աշխատանքին, ապա արդյունքն արտահայտի՛ր տոկոսով»։

The first hint directs attention; the second gives the next operation without supplying the numerical answer. A worked example must not expose a reserved assessment stimulus or solution sequence without recording the dependency.

| Topic | Authoring condition |
| --- | --- |
| Work | Name the force and body. Use A=Fs only for a constant force along the stated motion. Zero resultant does not imply every individual force does zero work. Do not extend the chapter's simplified prose into that claim. |
| Power | Use N=A/t for the stated interval, A=Nt for a stated constant/interval-average power, and N=Fv in the taught constant aligned-force/uniform-motion setup. Distinguish variable N from the Armenian force unit Ն. |
| Lever | Arms are perpendicular distances, not automatically the whole lever length. State opposing turning effects, negligible friction and a prebalanced/negligible lever weight where its own weight is omitted. |
| Pulley | F=P and F=P/2 require their stated ideal arrangements and uniform lifting. Include the full rope path; a movable pulley has two parallel supporting segments in this scope. Do not generalize to arbitrary multi-pulley systems. |
| Incline | Distinguish length from vertical rise. For ideal comparisons specify same load/height, negligible friction and parallel uniform pulling. No force-component trigonometry. |
| Efficiency | Real losses make useful work smaller than total; an explicitly ideal loss-free model can have 100% efficiency. Apply the same useful task and input/output definitions when comparing systems. |
| Additional content | Horsepower means power, not force. Applications use supplied labels and taught mechanisms, not presumed anatomy or modern engine specifications. |

Exclude signed-work/cosine formulas, kinetic/potential-energy theorems, rotational acceleration, friction coefficients, advanced biomechanics and engine thermodynamics from hidden prerequisites.

## Source cautions checked on the page

The source remains unchanged. Preserve the original record and qualify authored examples where necessary.

- **p.115, problem 3:** the book writes an approximate 250 N. Its stated 150 kg, g=9.8 N/kg, 0.3 m and 1.8 m give **245 N** before rounding. This is explicitly an approximation, not an exact arithmetic answer. State any rounding rule; never put both 245 and 250 among options without clarifying it.
- **pp.112–113:** the real-machine discussion says η<100%; the loss-free golden rule uses ideal equality. Retain that model distinction instead of making either assertion universal.
- **pp.116–117:** h must be the vertical rise over the same travel used for l; the wording about the block's upper edge needs that reference made explicit. Average trial efficiencies only with an explicit description of the tested loads.
- **p.104:** the work-time graph reaches 100 J at 4 s, so its constant power is 25 W. This is a publicly taught source example, not a protected assessment asset. The incorrect unit expression in the true/false question is a distractor, not a textbook formula to copy.

## Source illustrations

Five exact PDF crops retain the relevant arrows, labels and scales. These are preparation/reference assets for potential Practice use, not live dependencies or protected assessment assets. Full extraction provenance and Armenian alt text are in the manifest. No drawing has been generated or reconstructed.

| Asset | Printed page | Intended use |
| --- | ---: | --- |
| [work-time-graph](assets/chapter-v-preparation/work-time-graph.png) | 104 | Work-time graph, S03 |
| [fig71-lever](assets/chapter-v-preparation/fig71-lever.png) | 106 | Lever support/arms, S04–S05 |
| [fig75-76-pulleys](assets/chapter-v-preparation/fig75-76-pulleys.png) | 110 | Fixed/movable arrangements, S06 |
| [fig78-incline](assets/chapter-v-preparation/fig78-incline.png) | 116 | Incline force/path/rise, S07–S08 |
| [fig79-incline-lab](assets/chapter-v-preparation/fig79-incline-lab.png) | 116 | Apparatus for LAB-INCLINE |

If a question depends on a diagram, attach the actual image and inspect its final phone-width rendering and alt text before staging. The laboratory picture is not a source for invented force-gauge readings. The paired pulley asset can be split into exact panels when phone-width legibility requires it, retaining complete rope paths and labels.

## Comparison and next sprint

Before authoring/deployment, freeze the full applicable current, draft, archived/retired, immutable historical, guide/teaching, protected and exposure corpus. Compare across the complete batch and related skills, using scenario, diagram, solution steps, inference, key and distractor logic. New U05 codes do not create a clean bank. The [assessment evidence policy](assessment-evidence-blueprint-policy.md) governs dispositions.

Priority related scopes: Chapter I S04–S10 (experiments, quantities, units, scale reading, errors); Chapter III S03–S08 (path, motion, speed and measurements); Chapter IV S01/S03/S05/S06/S09–S13 (balance, density calculations, forces, gravity, gauge, weight, friction and resultant). The manifest preserves exact codes. Include all historical versions and any additional equivalent mappings discovered during the freeze. A changed number in a ratio, a relabelled graph or a new context for the same inference is not automatically new reasoning.

**Preparation handoff: 15E.2 — plan acceptance, governed inactive foundation and Batch 1 (now recorded in the execution update above).** Start with the 54-slot work/power scope, refresh comparison evidence and assess the briefs before writing complete Armenian questions/options/explanations/guides and useful definitions. The next two proposed batches are 54 and 44. Keep assessment qualification, practical delivery, final policy and Chapter-V-specific release authorization separate. At this preparation checkpoint only mapping was complete. The execution update above records subsequent authoring; approvals and release remain open.
