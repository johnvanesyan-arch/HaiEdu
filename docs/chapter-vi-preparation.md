# Chapter VI map — «Ճնշում։ Ճնշումն առօրյա կյանքում և տեխնիկայում»

**Preparation and authoring completed; release advanced through 15F.6 · 2026-10-20.** All 242 questions are approved, all 146 guides published and all 158 definitions active. The owner authorized deployment; the knowledge-only provisional pilot is active with D19/P8/M17/R12. Exact activation and authenticated production acceptance are verified; all 59 tracked tables are unchanged through QA. The planning and staging checkpoints below preserve their historical scope. [Current release](chapter-vi-pilot-release.md) · [Authoritative status](project-status.md).

## Source scope

The approved *Ֆիզիկա 7*, Գագիկ Մելիքյան / Սոս Մաիլյան, Էդիթ Պրինտ, 2023, covers Chapter VI in **§§40–55, printed pp.118–163 / PDF pp.119–164**. PDF SHA-256: `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. The chapter terminology, formulas, examples and all eleven available source crops come from this exact file; nine were prepared at planning and two more were added for Batch 2. Batch 3 reuses four exact crops from this verified set.

The [current official programme](https://www.arlis.am/hy/acts/229331), N 40-Ն as amended by N 36-Ն, is the incorporation effective 14 August 2026. Its [appendix](https://www.arlis.am/acts/files/363077/966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478) was downloaded and hash-verified for Chapter V on 18 October, then reused byte-for-byte: 248,283 bytes, SHA-256 `966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478`. Grade 7 Theme 6 has **eleven mandatory and four additional outcomes**. The programme also lists three laboratory activities and demonstrations. Later-grade pressure/fluids outcomes, including Bernoulli’s equation, are outside this Grade 7 map.

The [read-only catalogue](evidence/chapter-vi-catalogue-20261019.json) at **2026-10-19T15:04:26.750918+00:00** is the historical pre-staging checkpoint: it contained Physics units I–V and no `PHY7-U06` row. Sprint 15F.2 subsequently created the inactive U06 foundation and staged Batch 1; Sprint 15F.3 staged Batch 2; Sprint 15F.4 staged Batch 3. [Structured planning evidence](evidence/chapter-vi-preparation-20261019.json) preserves the exact outcome cell, source hashes, page ranges, budgets and crop provenance; [Batch 3 staging evidence](chapter-vi-batch-03-staging.md) records the current catalogue boundary.

## Outcome crosswalk

M1–M11 and A1–A4 are local source-order references, not official codes. The source wording is preserved below. Learner-facing Armenian will be edited separately against the textbook.

| Ref | Level | Exact programme statement | Proposed skills |
| --- | --- | --- | --- |
| M1 | Mandatory | ներկայացնել ճնշման ֆիզիկական իմաստը և հաշվարկել այն պարզ իրավիճակներում,(Հ4,Հ7,Հ9) | S01, S05 |
| M2 | Mandatory | ներկայացնել ճնշման մեծացման և փոքրացման եղանակները, բերել օրինակներ, (Հ4,Հ9) | S02 |
| M3 | Mandatory | բացատրել առօրյա կյանքում գազի և հեղուկի ճնշման դերը, (Հ29,Հ30) | S03, S05 |
| M4 | Mandatory | ներկայացնել Պասկալի և հաղորդակից անոթների օրենքները և կիրառել դրանք պարզ իրավիճակներում,(Հ9) | S04, S06 |
| M5 | Mandatory | նկարագրել ջրաբաշխական մամլիչի կառուցվածքը, աշխատանքի սկզբունքը և կիրառությունները, կատարել հաշվարկներ ուժի շահումը որոշելու համար,(Հ10,Հ29) | S07 |
| M6 | Mandatory | փորձի միջոցով հիմնավորել մթնոլորտային ճնշման գոյությունը, բացատրել դրա առաջացման պատճառը,   (Հ4,Հ28) | S08 |
| M7 | Mandatory | բերել արքիմեդյան ուժի դրսևորման օրինակներ, (Հ9) | S09 |
| M8 | Mandatory | ներկայացնել Արքիմեդի օրենքը,(Հ9) | S09, S10 |
| M9 | Mandatory | նախագծել և իրականացնել հեղուկներում և գազերում արքիմեդյան ուժի որոշման փորձեր,(Հ4,Հ28,Հ29) | S13 |
| M10 | Mandatory | արտածել հեղուկներում մարմինների լողալու պայմանները,(Հ9) | S11 |
| M11 | Mandatory | ներկայացնել արքիմեդյան ուժի դրսևորումները կենդանական աշխարհում,     նավագնացության և օդագնացության ոլորտներում:(Հ29,Հ30,Հ31) | S12 |
| A1 | Additional | 1) նշել ճնշման առաջացման մեխանիզմները պինդ, հեղուկ և գազային մարմիններում, | S03, S05, S14 |
| A2 | Additional | 2) բացատրել անոթի պատերի վրա ազդող գազի և հեղուկի ճնշման պատճառը, | S03, S05, S14 |
| A3 | Additional | 3) չափել գազի և հեղուկի ճնշումը, | S08, S15 |
| A4 | Additional | 4) նկարագրել մխոցավոր հեղուկային պոմպի աշխատանքը | S16 |

The crosswalk deliberately separates pressure calculation, pressure control, molecular gas pressure, Pascal transmission, hydrostatics, communicating vessels, the hydraulic press, atmosphere, Archimedes’ law, buoyancy calculations, floating and applications. S13 supports M9’s experimental reasoning but cannot establish performed competence. S14–S16 cover additional outcomes only.

## Skill map and authoring budget

**242 = 146 Practice + 38 Diagnostic + 58 Mastery candidate slots.** This is a provisional ceiling based on Chapter VI’s larger scope. It is not 242 distinct reasoning patterns, a student session length, an approved form design or qualified capacity. Whole-bank screening may reduce any row; do not pad a skill to meet its number.

| Skill | Armenian name | Role/outcome | Textbook printed pages | Practice | Diagnostic | Mastery | Batch |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| S01 | Ճնշման ֆիզիկական իմաստը, միավորը և հաշվումը | mandatory; M1 | 118–120, 137–138 | 12 | 4 | 4 | 1 |
| S02 | Ճնշումը մեծացնելու և փոքրացնելու եղանակները | mandatory; M2 | 118–120 | 8 | 2 | 4 | 1 |
| S03 | Գազի ճնշումը և դրա կախումը ծավալից | mandatory; M3, A1, A2 | 121–124 | 10 | 2 | 4 | 1 |
| S04 | Պասկալի օրենքը և ճնշման հաղորդումը | mandatory; M4 | 125–127 | 8 | 2 | 4 | 1 |
| S05 | Հիդրոստատիկ ճնշումը և p=ρgh կապը | mandatory; M1, M3, A1, A2 | 128–130, 137–138 | 12 | 4 | 6 | 2 |
| S06 | Հաղորդակից անոթները և հեղուկների հավասարակշռությունը | mandatory; M4 | 131–133, 137–140 | 10 | 4 | 6 | 2 |
| S07 | Ջրաբաշխական մամլիչի կառուցվածքը և ուժի շահումը | mandatory; M5 | 134–139 | 10 | 4 | 6 | 2 |
| S08 | Մթնոլորտային ճնշումը, դրա գոյության փորձերը և չափումը | mandatory; M6, A3 | 140–145, 162–163 | 10 | 2 | 4 | 2 |
| S09 | Արքիմեդյան ուժի առաջացումը և Արքիմեդի օրենքը | mandatory; M7, M8 | 148–151 | 10 | 4 | 4 | 3 |
| S10 | Արքիմեդյան ուժի հաշվումը և ուժաչափի ցուցմունքը | mandatory; M8 | 148–154, 162–163 | 12 | 4 | 6 | 3 |
| S11 | Մարմինների լողալու պայմանները | mandatory; M10 | 155–157 | 10 | 4 | 6 | 3 |
| S12 | Արքիմեդյան ուժը բնության մեջ, նավագնացությունում և օդագնացությունում | mandatory; M11 | 155–161, 162–163 | 8 | 2 | 4 | 3 |
| S13 | Արքիմեդյան ուժի փորձերի պլանավորումը և տվյալների մեկնաբանումը | performance-supporting; M9 | 152–154 | 8 | 0 | 0 | 3 |
| S14 | Ճնշման առաջացման մեխանիզմները տարբեր միջավայրերում | additional; A1, A2 | 118–130 | 6 | 0 | 0 | 1 |
| S15 | Գազի և հեղուկի ճնշման չափումը | additional; A3 | 123–124, 137–145, 162–163 | 6 | 0 | 0 | 2 |
| S16 | Մխոցավոր հեղուկային պոմպի աշխատանքը | additional; A4 | 146–147 | 6 | 0 | 0 | 2 |
| **Total** | | | | **146** | **38** | **58** | |

Plan up to **146 Practice guides**, each with a separately checked hint sequence and a worked example that does not reproduce its question. Misconception definitions follow useful distractors; there is no quota. S13 is Practice-only because selected responses cannot prove experimental performance. S14–S16 are additional Practice-only and do not create mandatory pass conditions.

### Three large authoring batches

| Batch | Scope | Skills | Practice | Diagnostic | Mastery | Total |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | Pressure foundations, gas pressure, Pascal law and cross-state mechanisms | S01, S02, S03, S04, S14 | 44 | 10 | 16 | **70** |
| 2 | Hydrostatics, communicating vessels, hydraulic press, atmosphere and measurement/pump extensions | S05, S06, S07, S08, S15, S16 | 54 | 14 | 22 | **90** |
| 3 | Archimedes’ law, calculations, floating, applications and experiment interpretation | S09, S10, S11, S12, S13 | 48 | 14 | 20 | **82** |

The batches are intentionally larger to reduce review and CI overhead. Each remains one frozen-corpus authoring/review unit. Large batches do not relax source, natural-Armenian, physics, hint-language, image-completeness, whole-bank overlap, answer-key or version checks.

The **96 Diagnostic/Mastery slots are unqualified**. They do not yet prove two Diagnostic forms, three Mastery forms, disjoint capacity, parallel equivalence or non-exposure. Session lengths, scoring, required-skill minima, attempts and reserve policy remain for a later concrete assessment contract; Chapter V’s numbers are not inherited.

## Teaching order and boundaries

| Skills | Needed prior concepts | Boundary |
| --- | --- | --- |
| S01–S02 | Force, weight, area and SI conversion | Pressure uses the normal pressure force and actual contact area. |
| S03–S04 | Particle model and force/area meaning | No ideal-gas equation; transmitted pressure is not multiplied. |
| S05–S07 | Density, gravity, equilibrium and ratios | Use vertical depth; state gauge/atmospheric boundary; hydraulic force gain follows area ratio. |
| S08 | Weight of air, pressure difference and measurement | “Vacuum pulls” is rejected; Torricelli height is not tube length. |
| S09–S11 | Resultant force, density, volume and weight | Use displaced-medium density and submerged volume; separate initial motion from final floating equilibrium. |
| S12 | S09–S11 | Supply any animal/ship/balloon facts needed; no untaught biology or thermodynamics. |
| S13 | Measurement, dynamometer reading and uncertainty | Questions assess planning/data interpretation only. |
| S14–S16 | Relevant core skill first | Additional practice cannot become a hidden required gate. |

## Practical work and gas-buoyancy scope decision

| ID | Source | Programme support | Current boundary |
| --- | --- | --- | --- |
| PRACTICAL-SOLID-PRESSURE | §40, printed p.120 | M1, M2 | Draft outline/rubric only; no learner performance. |
| LAB-COMMUNICATING-DENSITY | §47, printed p.139; programme Theme 6 practical work 1 | M4 | Draft outline/rubric only; no learner performance. |
| PRACTICAL-ATMOSPHERIC-EVIDENCE | §48, printed pp.140–145; programme M6 | M6 | Draft outline/rubric only; no learner performance. |
| LAB-BUOYANT-FORCE | §51, printed pp.152–153; programme Theme 6 practical work 2 | M9 | Draft outline/rubric only; no learner performance. |
| LAB-LIQUID-DENSITY | §52, printed p.154; programme Theme 6 practical work 3 | M9 | Draft outline/rubric only; no learner performance. |


**Owner scope decision — gas buoyancy (2026-10-19):** No separate learner procedure or teacher-observed gas-buoyancy workflow will be added to the Chapter VI MVP. The §50 demonstration may support conceptual, comparison, planning and supplied-data questions. The selected-response pilot will not claim that those questions establish physical performance of the gas portion of M9. This is a declared product-scope boundary, not an unresolved authoring or release gap. [Decision evidence](evidence/chapter-vi-gas-buoyancy-scope-decision-20261019.json).

The knowledge-only provisional pilot may assess concepts, plans and supplied data; it does not record practical completion for M6/M9.

## Candidate-brief queue

These **33 briefs** are planning prompts, not drafted questions or promised unique evidence. Each complete proposed batch must be compared internally and against the entire applicable bank before any staging.

| Brief | Skill | Armenian working title | Evidence intent | Screening boundary |
| --- | --- | --- | --- | --- |
| S01-C01 | S01 | Նույն ուժը՝ տարբեր մակերեսների վրա | Compare pressure for the same normal force over different contact areas. | Identify the actual contact area; do not treat object orientation as changing weight. |
| S01-C02 | S01 | Ճնշումը հաշվելիս ո՞ր մակերեսն է պետք | Calculate p, F or S after converting supplied units. | Use only the surface actually in contact; avoid untaught compound-shape inference. |
| S02-C01 | S02 | Ինչո՞ւ են դահուկները լայն | Explain pressure reduction through greater support area with force held comparable. | Do not rely on a memorized object name; require the force/area relationship. |
| S02-C02 | S02 | Ո՞ր կողմով դնել չորսուն | Choose an orientation that increases or decreases pressure. | State that the same body and support conditions keep the pressure force unchanged. |
| S03-C01 | S03 | Ինչո՞ւ է գազը ճնշում անոթի պատերին | Connect irregular molecular motion and wall collisions to pressure. | Do not introduce ideal-gas equations or microscopic quantities not supplied. |
| S03-C02 | S03 | Ի՞նչ է փոխվում գազը սեղմելիս | Predict the qualitative pressure change when the same enclosed gas occupies less volume. | Hold other relevant conditions comparable; do not claim an exact inverse law from the Grade 7 text. |
| S04-C01 | S04 | Ո՞ր ուղղություններով է հաղորդվում ճնշումը | Apply Pascal’s law to a supplied closed-fluid setup. | Distinguish the added pressure from hydrostatic pressure differences. |
| S04-C02 | S04 | Ի՞նչ ճնշում է հաղորդվել մյուս մխոցին | Compare the transmitted pressure at linked points before converting it to force. | Equal pressure does not imply equal force when piston areas differ. |
| S05-C01 | S05 | Ո՞ր կետում է ճնշումն ավելի մեծ | Compare liquid pressure at labelled depths in one liquid. | Use vertical depth below the free surface, not distance along a sloping wall. |
| S05-C02 | S05 | Խորությունն ու խտությունը միասին | Compare or calculate p=ρgh when depth and density both vary. | State whether atmospheric pressure is excluded; use the textbook’s hydrostatic pressure convention. |
| S06-C01 | S06 | Տարբեր ձև, նույն մակարդակ | Predict free-surface levels in communicating vessels containing the same stationary liquid. | Require open/comparable surface pressure and a connected liquid; capillarity is outside scope. |
| S06-C02 | S06 | Երկու հեղուկի սյուները հավասարակշռված են | Use column heights and one density to determine the other density. | Measure both heights from the common interface and keep the liquids immiscible. |
| S07-C01 | S07 | Փոքր մխոցից՝ մեծ ուժ | Explain why the larger piston produces a larger force at equal transmitted pressure. | Force gain comes from area ratio, not pressure multiplication. |
| S07-C02 | S07 | Ուժի շահումը ո՞ր հարաբերությամբ գտնել | Calculate an unknown force or area from the hydraulic-press relation. | State ideal/comparable-height assumptions when the supplied diagram requires them. |
| S08-C01 | S08 | Ինչո՞ւ ջուրը չի թափվում թղթով փակված բաժակից | Use inside/outside pressure differences to explain the textbook atmospheric-pressure demonstration. | Name all relevant sides and avoid saying that “vacuum pulls”. |
| S08-C02 | S08 | Ի՞նչ է ցույց տալիս սնդիկի սյան բարձրությունը | Interpret a supplied Torricelli/barometer reading. | Do not convert units unless the relation/data are supplied; distinguish height from tube length. |
| S09-C01 | S09 | Ինչո՞ւ է համազոր ուժը դեպի վեր | Explain buoyant-force direction from the pressure difference between lower and upper surfaces. | Use a supplied simple body model; avoid requiring calculus or arbitrary-shape derivation. |
| S09-C02 | S09 | Ի՞նչ հեղուկ կամ գազ է արտամղել մարմինը | Identify the displaced fluid/gas whose weight equals the buoyant force. | Do not substitute body weight or body density for the displaced-medium term. |
| S10-C01 | S10 | Արքիմեդյան ուժը՝ ընկղմված ծավալից | Calculate buoyant force from medium density and submerged volume. | Use submerged volume, not automatically the body’s full volume. |
| S10-C02 | S10 | Ինչո՞ւ է ուժաչափի ցուցմունքը փոքրանում | Relate the air and liquid dynamometer readings to buoyant force. | Specify equilibrium and neglect air buoyancy only when stated or appropriate to the model. |
| S11-C01 | S11 | Կլողա՞, կմնա՞, թե՞ կսուզվի | Decide initial motion from F_A versus F_g or density comparison. | Separate initial fully submerged motion from the final partially floating equilibrium. |
| S11-C02 | S11 | Լողացող մարմնի ո՞ր մասն է ընկղմված | Use F_A=F_g for a floating body to reason about submerged fraction. | Require a homogeneous body or supply the needed average density; no shape-based guess. |
| S12-C01 | S12 | Ինչո՞ւ է բեռնված նավն ավելի խոր նստում | Connect greater total weight to the displaced-water volume required for equilibrium. | Do not attribute floating to hollow space alone; use the whole ship’s average behavior. |
| S12-C02 | S12 | Օդապարիկը ե՞րբ կբարձրանա | Compare buoyant force in air with the total weight of gas, envelope, basket and load. | Use supplied densities/volume; hot-air thermodynamics beyond the text is excluded. |
| S12-C03 | S12 | Ձուկն ինչպե՞ս է փոխում իր լողալու վիճակը | Interpret a textbook-supported animal example through buoyancy and average density. | Avoid untaught anatomy; provide all biological function information needed in the prompt. |
| S13-C01 | S13 | Ուժաչափի երկու ցուցմունքից՝ արքիմեդյան ուժ | Plan/interpret the air-versus-liquid dynamometer method. | A selected answer can assess the plan or data only; it cannot certify that the learner performed the experiment. |
| S13-C02 | S13 | Ինչպե՞ս որոշել անհայտ հեղուկի խտությունը | Select measurements and calculate density using a verified liquid-lab method. | Preserve instrument precision and distinguish an experimental result from an expected value. |
| S14-C01 | S14 | Պինդ մարմնի և գազի ճնշումը նույնպե՞ս է առաջանում | Compare the source-level mechanisms without erasing their differences. | Intentional synthesis only; screen heavily against S01, S03 and S05. |
| S14-C02 | S14 | Ինչո՞ւ է հեղուկը ճնշում անոթի պատերին | Connect liquid weight/depth and force normal to a supplied wall segment. | Do not use molecular explanations beyond the chapter’s stated model as a required claim. |
| S15-C01 | S15 | Բարոմետրի ցուցմունքը կարդալը | Read a labelled barometer or aneroid scale and report the value with its unit. | The instrument image must be complete and legible; no memorized weather rule. |
| S15-C02 | S15 | Ո՞ր սարքով չափել ճնշումը | Choose a suitable supplied instrument/setup for a stated gas or liquid measurement. | Do not require apparatus absent from the source without fully describing it. |
| S16-C01 | S16 | Պոմպի ո՞ր փականն է բացվում ներծծման ժամանակ | Trace valve states during a labelled piston stroke. | Attach a complete pump diagram; avoid asking students to infer hidden connections. |
| S16-C02 | S16 | Մխոցը բարձրանալիս ջուրն ո՞ւր է շարժվում | Follow the liquid path and pressure change through one operating step. | Assess the textbook pump, not an unspecified modern pump design. |


## Textbook media

Eleven exact crops were visually inspected: the nine planning assets plus the Batch 2 manometer and piston-pump crops. They are teaching-exposed source references for explanations and Practice only. They are **not protected assessment stimuli**. Diagnostic/Mastery diagrams must be independently authored and compared for structural equivalence; changing labels or colors is insufficient.

| Asset | Printed page | Use |
| --- | ---: | --- |
| [pressure-contact](assets/chapter-vi-preparation/pressure-contact.png) | 118 | Նկ. 80․ նույն ճնշման ուժի դեպքում հպման տարբեր մակերեսներով սեղանիկների ազդեցությունը ավազի վրա։ |
| [pascal-law](assets/chapter-vi-preparation/pascal-law.png) | 126 | Նկ. 86․ Պասկալի օրենքը ցուցադրող փորձը՝ գնդաձև անոթի անցքերից ջրի շիթերով։ |
| [communicating-vessels](assets/chapter-vi-preparation/communicating-vessels.png) | 131 | Նկ. 91 և 92․ հաղորդակից անոթներում համասեռ հեղուկի ազատ մակերևույթների նույն մակարդակը՝ անկախ անոթների ձևից։ |
| [hydraulic-press](assets/chapter-vi-preparation/hydraulic-press.png) | 135 | Նկ. 99․ ջրաբաշխական մամլիչի սխեման՝ տարբեր մակերեսներով մխոցներով և նրանց վրա ազդող ուժերով։ |
| [torricelli](assets/chapter-vi-preparation/torricelli.png) | 143 | Նկ. 105 և 106․ Տորիչելիի փորձը և գործող սնդիկային բարոմետրը։ |
| [manometer](../web/assets/textbook/physics7-2023/p123-manometer.png) | 123 | Նկ. 84․ թաղանթավոր ճնշաչափի ամբողջական սխեման։ |
| [piston-pump](../web/assets/textbook/physics7-2023/p147-piston-pump.png) | 147 | Նկ. 108․ մխոցավոր հեղուկային պոմպի ամբողջական սխեման և կափույրները։ |
| [buoyant-force-measurement](assets/chapter-vi-preparation/buoyant-force-measurement.png) | 148 | Նկ. 109․ ուժաչափի ցուցմունքի փոփոխությունը մարմինը ջրում ընկղմելիս։ |
| [liquid-density-comparison](assets/chapter-vi-preparation/liquid-density-comparison.png) | 152 | Ուժաչափի/կշեռքի օգնությամբ ջրում և կերոսինում մարմնի վրա ազդող արքիմեդյան ուժերի համեմատման սխեման։ |
| [floating-conditions](assets/chapter-vi-preparation/floating-conditions.png) | 156 | Նկ. 113 և 114․ հեղուկում մարմնի վրա ազդող ուժերի և լողալու պայմանների պատկերումները։ |
| [ship-displacement](assets/chapter-vi-preparation/ship-displacement.png) | 159 | Նկ. 117․ նավի ընկղմված մասի ծավալը և ջրագիծը ցույց տվող լուսանկար։ |


## Mandatory comparison before authoring deployment

Freeze the complete current, draft, retired, historical, guide and exposure corpus for the proposed skills and related skills. Compare scenarios, diagrams, solution steps, required inference, answer and distractor logic, including within-batch pairs. The read-only catalogue does not close this gate. Intentional Practice reinforcement must be labelled; overlapping Diagnostic/Mastery candidates must be reworked or held. Untaught later-grade fluid mechanics is excluded.

## 15F.2 execution checkpoint

The owner accepted the retained 16-skill crosswalk, 242-slot ceiling, 70/90/82 batch split, S13/S14–S16 Practice-only non-gating roles and five practical records. The inactive foundation is committed. The frozen whole-bank comparison assessed all 70 Batch 1 candidates, and the defensible final set—44 Practice, 10 Diagnostic and 16 Mastery—was staged with 44 guides and 44 misconception definitions. Exact-source technical QA passed 70/70 questions and 44/44 guides. Ordinary exact-version review remains pending. No assessment contract, allocation, scoring rule, activation or learner release is authorized. [Comparison](chapter-vi-batch-01-comparison.md) · [Staging](chapter-vi-batch-01-staging.md).

## 15F.3 execution checkpoint

**Historical checkpoint; superseded by 15F.4.** Batch 2 was committed as **90 draft candidates: 54 Practice, 14 Diagnostic and 22 Mastery** across S05, S06, S07, S08, S15 and S16, with 54 Practice guides and 56 misconception definitions. The post-Batch-1 complete corpus supplied 5,511 retrieval profiles; all 4,005 within-batch pairs were assessed. After editorial rework, the final set has zero substantive overlaps and zero untaught-science holds. Exact deployed-source QA passed 90/90 questions and 54/54 guides with zero errors or warnings. Five exact textbook crops support Practice items only.

At this checkpoint, the cumulative inactive catalogue contained **160 questions: 98 Practice, 24 Diagnostic and 38 Mastery**, with 98 guides and 100 definitions. All remained draft, review-pending, provisional, non-visible and non-allocatable. Batch 1’s exact catalogue projections were unchanged, and Batch 3 retained 82 authoring slots. No assessment contract, allocation, scoring rule, activation or learner release is authorized. [Comparison](chapter-vi-batch-02-comparison.md) · [Staging](chapter-vi-batch-02-staging.md).

## 15F.5 review and image-correction checkpoint

**2026-10-20 11:29 Asia/Yerevan checkpoint:** 242 questions — **241 approved and only `PHY7-U06-S06-I01` v3 awaiting review**; **146 published guides**; **33 active and 125 draft misconception definitions**. These counts record the observed review checkpoint.

The owner supplied figure 92 alone for `PHY7-U06-S06-I01`. Version 3 uses `p131-communicating-vessels-v3.png` and an accessible description of the three connected-vessel pairs. The prompt, four choices, answer `C`, explanation, hints, mappings and v1/v2 history are preserved. The image is live and matches the supplied 1,619,301-byte PNG (1028 × 1024); the guarded save and current-version QA passed with zero errors or warnings.

The original October 19 nine-image delivery and S13 comparison remain recorded in the correction history. The new S06 file preserves the prior immutable images and snapshots.

Release `physics7_u06_2026_08_14_draft_r6` remains draft and never activated, with zero U06 pool, form, session or exposure rows. Exact-version review of S06-I01 v3 and the remaining definitions is still open. Assessment contract, qualification, allocation and learner release remain separate.

[S06 v3 evidence](evidence/chapter-vi-s06-image-v3-20261020.json) · [Correction record](chapter-vi-image-corrections.md).

## 15F.4 execution checkpoint

Batch 3 is committed as **82 draft candidates: 48 Practice, 14 Diagnostic and 20 Mastery** across S09–S13, with 48 Practice guides and 58 misconception definitions. The complete post-Batch-2 corpus supplied 5,909 searchable profiles; all 3,321 within-batch pairs were assessed. Two substantive near-duplicates were rewritten before staging. The final set has zero substantive overlaps and zero untaught-science holds. Exact deployed-source QA passed 82/82 questions and 48/48 guides with zero errors or warnings. Four exact textbook crops support Practice items only.

The accepted authoring ceiling is now fully staged: **242 questions: 146 Practice, 38 Diagnostic and 58 Mastery**, with 146 guides and 158 definitions. All remain draft, review-pending, provisional, non-visible and non-allocatable. S13 remains Practice-only and cannot establish performed laboratory work. Production has zero U06 pools, form links, reviews, learning-session items or exposures, and the release remains draft and never activated. No assessment contract, allocation, scoring rule, activation or learner release is authorized. [Comparison](chapter-vi-batch-03-comparison.md) · [Staging](chapter-vi-batch-03-staging.md) · [Evidence](evidence/chapter-vi-batch-03-staging-20261019.json).


## 15F.6 release checkpoint

**Sprint 15F.6 — Chapter VI knowledge-only provisional pilot activated:** all **242 questions are approved, 146 guides published and 158 definitions active**. Diagnostic 19 / Practice 8 / Mastery 17 / Review 12. Mastery requires **14/17 plus one correct in each of twelve required skills**, with three attempts. Two Diagnostic and three Mastery forms contain 89 distinct approved versions; seven approved Mastery questions remain unallocated. Rollback restored all 59 tracked tables; exact readback verifies 719 configuration rows and 61 preservation scopes. Authenticated six-chapter production acceptance passed **231/231**, with two-school isolation **54/54**, desktop/mobile chapter switching and all 59 tracked tables unchanged through QA. Specialist/exposure review and performed practical assessment remain deferred. **English Grade 7 is the next subject**, with textbook intake/preparation next; Sprint 16 Physics course integration remains open. [Release](chapter-vi-pilot-release.md).
