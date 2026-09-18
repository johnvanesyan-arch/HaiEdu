# Grade 7 Physics — Chapter I Curriculum Architecture

Status: **CURRENT-STANDARD RECONCILED / EXTERNAL SME REVIEW REQUIRED**

This document defines the first real curriculum slice for the Armenian Curriculum Mastery Platform. It is intentionally conservative about what is called an **official 2026 learning outcome**.

## 1. Source hierarchy and provenance

### Current authoritative sources

1. **Armenian General Education State Standard** — current 2026 incorporation of Government Decision N 439-N, amended 21 May 2026 by N 699-N.
   - Source: https://www.arlis.am/hy/acts/225446
2. **Physics subject standard, Grades 7–12** — N 42-N, with its appendix replaced on 28 July 2026 by N 37-N, effective 14 August 2026.
   - Current amendment and replacement appendix: https://www.arlis.am/hy/acts/229259
3. **Physics programmes, Grades 7–12** — N 40-N as amended 28 July 2026 by N 36-N; current incorporation effective 14 August 2026.
   - Source: https://www.arlis.am/hy/acts/229331
4. **Pilot textbook** — Գագիկ Մելիքյան, Սոս Մաիլյան, *Ֆիզիկա 7*, Էդիթ Պրինտ, 2023.

### Important provenance rule

Sprint 11J extracted the current ARLIS DOCX appendices and stored their SHA-256 fingerprints in the live reconciliation record. The exact current 2026 Grade 7 Theme 1 outcomes are now present in `learning_outcomes`; the repealed 2022 programme remains historical context only.

The internal micro-skills are not represented as official wording. Each one is classified as either a direct operationalization or a traceable derived-supporting micro-skill, and external Physics SME validation remains pending.

## 2. First MVP unit

**Unit code:** `PHY7-U01`

**Armenian title:** Բնության ուսումնասիրության ֆիզիկական մեթոդները

**English working title:** Physical methods of studying nature

### Textbook coverage

| Topic code | Textbook section | Printed pages | Purpose in platform |
|---|---|---:|---|
| PHY7-U01-T01 | §1 Ֆիզիկայի ուսումնասիրման առարկան։ Ֆիզիկական երևույթներ | 5–8 | Physics domain, physical phenomena, body/substance/phenomenon distinctions |
| PHY7-U01-T02 | §2 Ֆիզիկոսներ։ Հայ անվանի ֆիզիկոսներ | 9–12 | Scientific contributors; Armenian physics context |
| PHY7-U01-T03 | §3 Ֆիզիկական երևույթների ուսումնասիրման մեթոդները։ Դիտումներ և փորձեր | 12–15 | Observation, experiment, hypothesis, evidence, conclusion |
| PHY7-U01-T04 | §4 Ֆիզիկական մեծություններ։ Ֆիզիկական մեծությունների չափումը | 15–19 | Quantities, units, instruments, scales, error, direct/indirect measurement |
| PHY7-U01-T05 | §5 Լաբորատոր աշխատանք 1 + §6 Խնդիրների լուծում | 19–22 | Measurement procedure, displacement volume, integrated problem solving |

## 3. Current 2026 programme crosswalk

The current N 40-Ն / N 36-Ն programme defines these Theme 1 outcomes:

| Locator | Level | Exact Armenian statement |
|---|---|---|
| Պարտադիր 1(1) | Mandatory | ներկայացնել ֆիզիկայի ուսումնասիրության առարկան (Հ9) |
| Պարտադիր 1(2) | Mandatory | ներկայացնել հայ անվանի ֆիզիկոսներին (Հ30) |
| Պարտադիր 1(3) | Mandatory | բերել ֆիզիկական երևույթների օրինակներ (Հ9) |
| Պարտադիր 1(4) | Mandatory | կատարել պարզագույն դիտումներ, չափումներ և փորձեր (Հ4, Հ28) |
| Պարտադիր 1(5) | Mandatory | չափումներ կատարելիս դրսևորել պատասխանատու վերաբերմունք, անհրաժեշտ հետևողականություն և ճշգրտություն (Հ4, Հ28) |
| Լրացուցիչ 2(1) | Additional | ներկայացնել ժամանակի, հեռավորության, ծավալի, զանգվածի չափման միավորները ՄՀ համակարգում |

The live mapping and per-family dispositions are documented in `docs/sprint-11j-physics7-current-standard-reconciliation.md`.

## 4. Micro-skill graph v0.1

These are **platform micro-skills**, not copied official outcomes.

| Skill code | Layer | Armenian skill name | Operational definition | Textbook anchor |
|---|---|---|---|---|
| PHY7-U01-S01 | Knowledge | Ֆիզիկական երևույթների ճանաչում և դասակարգում | Recognise physical phenomena and classify familiar examples by broad type where appropriate. | §1 |
| PHY7-U01-S02 | Knowledge | Ֆիզիկական մարմին, նյութ և երևույթ տարբերակելը | Distinguish a physical body/object, the material/substance it is made from, and a phenomenon/process. | §1 |
| PHY7-U01-S03 | Knowledge | Ֆիզիկոսներ և հայ ֆիզիկոսներ | Associate selected scientists in the textbook with their broad scientific contribution, with particular attention to Armenian scientists. | §2 |
| PHY7-U01-S04 | Application | Դիտումը և փորձը տարբերակելը | Given a scenario, determine whether it is observation or experiment and explain the essential difference. | §3 |
| PHY7-U01-S05 | Reasoning | Վարկած–փորձ–տվյալ–եզրակացություն շղթան | Use the textbook's inquiry cycle: observation/problem → hypothesis → experimental test → evidence/data → conclusion; select an appropriate next step and reject unsupported conclusions. | §3 |
| PHY7-U01-S06 | Knowledge | Ֆիզիկական մեծություններ, միավորներ և չափիչ սարքեր | Match common quantities to appropriate units and measuring instruments; identify core SI units introduced in the textbook. | §4 |
| PHY7-U01-S07 | Application | Չափման միավորների պարզ փոխարկումներ | Perform simple conversions used in Chapter I, especially length, time and volume relationships needed for measurement tasks. | §4–§5 |
| PHY7-U01-S08 | Application | Սանդղակի բաժանման արժեքը, չափման սահմանը և ցուցմունքը | Determine instrument scale division value, measurement limit and reading from labelled scales/diagrams. | §4 |
| PHY7-U01-S09 | Reasoning | Չափման սխալ և ճշգրտության գնահատում | Compute the textbook measurement-error convention (half a scale division), compare measurement precision, recognise poor instrument/eye positioning, and reason about direct vs indirect measurements. | §4 |
| PHY7-U01-S10 | Transfer | Չափման փորձի պլանավորում և անկանոն մարմնի ծավալի որոշում | Plan/interpret a simple measurement procedure, record results, and determine irregular-object volume by displacement using `V = V2 − V1`; transfer the procedure to an unfamiliar object/setup. | §5–§6 |

## 5. Prerequisite graph v0.1

Only meaningful dependencies are encoded; independent knowledge skills are not forced into an artificial chain.

```text
PHY7-U01-S01
      └──> PHY7-U01-S04
                └──> PHY7-U01-S05

PHY7-U01-S06
      ├──> PHY7-U01-S07
      └──> PHY7-U01-S08
                └──> PHY7-U01-S09

PHY7-U01-S05 ─┐
PHY7-U01-S07 ─┼──> PHY7-U01-S10
PHY7-U01-S08 ─┤
PHY7-U01-S09 ─┘
```

Initial required-mastery threshold for prerequisite routing: **0.65**. This is an engineering default for the pilot, not a validated psychometric cut score.

## 6. Initial item-family specification

### S01 — Physical phenomena

- Knowledge: identify whether an example is a physical phenomenon.
- Application: classify unfamiliar everyday examples as mechanical/thermal/electrical/magnetic/optical where appropriate.
- Diagnostic misconception: confusing biological or chemical changes with all physical phenomena.

### S02 — Body, material, phenomenon

- Knowledge: classify a word/image as body, material, or phenomenon.
- Application: identify body and material in a short real-life statement.
- Diagnostic misconception: treating the object's name and the substance it is made of as interchangeable.

### S03 — Physicists

- Knowledge: match textbook scientists with broad contributions.
- Application: select which scientist is relevant to a short historical/scientific description.
- Scope rule: keep this content proportionate; it should not dominate mastery time.

### S04 — Observation vs experiment

- Knowledge: identify defining features.
- Application: classify scenarios.
- Reasoning: explain why repeatability/control/measurement makes a described procedure an experiment rather than passive observation.

### S05 — Scientific inquiry chain

- Application: order investigation steps.
- Reasoning: choose what evidence would test a hypothesis; identify a conclusion not supported by the observations.
- Transfer: propose the next valid investigation step in a new context.

### S06 — Quantities, units, instruments

- Knowledge: quantity ↔ unit ↔ instrument matching.
- Application: choose a suitable instrument for a measurement goal.
- Diagnostic misconception: giving a number without a unit; confusing an instrument with a physical quantity.

### S07 — Unit conversion

- Application: m ↔ cm ↔ mm ↔ km; s ↔ min ↔ h; mL ↔ cm³ where used by the laboratory task.
- Transfer: choose a common unit before comparing two measurements.
- Diagnostic misconception: multiplying when division is required or converting the number but not the unit.

### S08 — Instrument scale reading

- Application: calculate division value using `(larger labelled value − smaller labelled value) / number of intervals`.
- Application: read a ruler/thermometer/measuring cylinder.
- Transfer: infer missing scale labels or choose the better instrument for a requested precision.
- Diagnostic misconception: counting scale marks instead of intervals.

### S09 — Measurement error and precision

- Application: compute the textbook convention `error = division value / 2`.
- Reasoning: compare two instruments/readings and identify which is more precise and why.
- Reasoning: detect parallax/incorrect eye position or incorrect ruler placement.
- Reasoning: distinguish direct from indirect measurement in examples.
- Diagnostic misconception: assuming more written decimal places automatically means a more accurate measurement.

### S10 — Integrated measurement investigation

- Application: identify V1 and V2 and calculate `V = V2 − V1`.
- Reasoning: identify invalid procedural steps (object not fully submerged, wrong eye position, unsuitable cylinder range).
- Transfer: design the minimum measurement plan for an unfamiliar irregular solid and interpret a results table.

## 7. Misconception → remediation rules v0.1

| Error / misconception | Remediation action |
|---|---|
| Observation and experiment treated as synonyms | Serve S04 contrast example + one classification pair before retry |
| Hypothesis accepted without evidence | Serve S05 “Which result would test this?” scaffold |
| Quantity/unit/instrument confusion | Route to S06 matching set |
| Unit-conversion error | Route to S07 conversion ladder using one dimension at a time |
| Counts scale marks rather than spaces | S08 annotated scale explanation, then a simpler scale |
| Measurement error equals full division value | S09 worked example: division value → half-division error |
| Chooses instrument with coarse scale for high precision | S09 compare-two-instruments task |
| Treats V2 as the object's volume | S10 visual sequence: initial volume V1 → final volume V2 → difference |
| Correct procedure but arithmetic subtraction error | Do not classify as physics-concept failure; flag calculation support separately |

## 8. Student-session logic for this unit

```text
Diagnostic item
    ↓
If foundational knowledge weak → S01/S02/S06 repair
    ↓
Measurement practice → S07/S08
    ↓
Scientific reasoning → S04/S05/S09
    ↓
Integrated transfer → S10
    ↓
Delayed retrieval/recheck
```

The system must distinguish a **physics misconception** from an **arithmetic/reading/measurement-procedure** error whenever the item design permits it.

## 9. First item-bank target

For the micro-pilot, target **60 teacher-validated items** before student testing:

- S01: 6
- S02: 5
- S03: 4
- S04: 7
- S05: 7
- S06: 7
- S07: 6
- S08: 7
- S09: 6
- S10: 5

At least 20% of the bank should use diagrams/scales/tables rather than text-only prompts. No student-facing generative AI is required.

## 10. Validation gate before publication

The Physics SME must review:

1. whether all ten skills are genuinely required/useful for the first unit;
2. whether any skill is too broad or too narrow;
3. prerequisite directions;
4. terminology used in Armenian school practice;
5. common misconceptions;
6. whether the planned transfer tasks remain appropriate for Grade 7;
7. exact textbook section/page mapping.

Only after this review should skills move from `review` to `published`.

## 11. Current-standard reconciliation status

Sprint 11J resolved the official-outcome blocker:

- six current Theme 1 outcomes are stored verbatim;
- all ten micro-skills have explicit direct or derived-supporting programme mappings;
- all 77 registered item families have a disposition and primary official-outcome trace;
- all 240 active variants are traceable through their family and existing unit scope;
- stable skills, items, sessions, attempts and learner evidence were not rewritten.

External Physics SME review remains a separate publication-quality gate. Until that review is complete, the internal skill graph remains in `review` status even though its current standards traceability is complete.
