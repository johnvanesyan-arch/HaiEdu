# Chapter VI Batch 3 whole-bank comparison

**Sprint 15F.4 · 2026-10-19 Asia/Yerevan · final candidate set before staging**

## Decision

Retain **82 draft candidates: 48 Practice, 14 Diagnostic and 20 Mastery** across S09–S13. The final set contains no substantive duplicate of a current, historical, retired, guide, misconception or exposure-linked record and no untaught-science hold. It remains an authoring catalogue only: ordinary exact-version review and independent specialist review are pending, and no item is learner-visible or allocatable.

| Skill | Practice | Diagnostic | Mastery | Total |
| --- | ---: | ---: | ---: | ---: |
| S09 — Արքիմեդյան ուժի առաջացումը և Արքիմեդի օրենքը | 10 | 4 | 4 | 18 |
| S10 — Արքիմեդյան ուժի հաշվարկ և ուժաչափային չափումներ | 12 | 4 | 6 | 22 |
| S11 — Մարմինների լողալու պայմանները | 10 | 4 | 6 | 20 |
| S12 — Արքիմեդյան ուժը բնության մեջ և տեխնիկայում | 8 | 2 | 4 | 14 |
| S13 — Փորձի պլանավորում և տվյալների մեկնաբանություն | 8 | 0 | 0 | 8 |
| **Total** | **48** | **14** | **20** | **82** |

S13 is intentionally Practice-only and non-gating. Its selected-response tasks can check planning and supplied-data interpretation; they do not establish that a learner performed the laboratory work. The owner’s gas-buoyancy scope decision remains unchanged: no separate learner or teacher-observed procedure is required for the MVP.

## Corpus and method

The comparison froze the complete production bank after Chapter VI Batch 2:

- 1,169 current items;
- 1,054 immutable historical item versions;
- 2,711 current/historical/authoring guide records;
- 975 misconception definitions;
- **5,909 searchable profiles in total**.

Every candidate was compared across scenario, required steps, inference, keyed answer, distractor logic, explanation, stimulus and guide. Character n-gram retrieval supplied nearest-neighbour leads; each lead was then judged semantically. All **3,321 within-batch pairs** were also compared. Repeated concepts were retained only when the task purpose or reasoning path differed; a repeated surface context is not counted as independent capacity.

The highest surviving existing-corpus similarity is **0.443236** (`PHY7-U06-S10-M03` versus historical `PHY7-U06-S06-I06`); one solves density from force-loss ratios and the other uses communicating-liquid equilibrium, so their complete reasoning paths differ. The highest surviving within-batch similarity is **0.580971** (`PHY7-U06-S12-I05` versus `I06`); the pair deliberately tests inverse submarine operations—taking water in to dive and expelling water to rise.

## Rework caused by the comparison

Two candidates were rewritten before staging:

1. S12-I02 originally repeated S11-I10’s “metal sheet versus hollow box” reasoning. It now interprets ship displacement from a stated 12,000 t water displacement; its nearest production profile score is 0.142881.
2. S13-I06 originally repeated S10-M03’s unknown-liquid density calculation. It now interprets three repeated dynamometer readings qualitatively, without calculating an exact density; its nearest production profile score is 0.184988.

After regeneration and a second full comparison, all 82 dispositions are `stage_as_draft_candidate`, with **0 substantive overlaps** and **0 untaught-science holds**.

## Authoring-quality checks

- 82/82 prompts are unique.
- 48/48 worked examples are unique and do not reuse the prompt’s number set.
- Answer positions are balanced: A 21, B 21, C 20, D 20.
- All 32 explicitly numerical answer keys were independently asserted.
- Hints contain no keyed-answer leak.
- No hidden characters or mixed-script prose were found.
- Four Practice items use exact textbook crops; no Diagnostic or Mastery item uses an exposed teaching image.
- Armenian wording, terminology and physics claims were checked against *Ֆիզիկա 7* (Մելիքյան–Մաիլյան, 2023), §§50–55, printed pp.148–163. Textbook SHA-256: `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`.

## Reproducibility

- Candidate specifications SHA-256: `4486182e5661c17ee551bf4b77274d9b25c63e4b81f3fa3d916d907bee3ea90e`
- Authoring audit SHA-256: `a8f0d68f637c6aad9c269528e92b24807bd244044d72e7bdfa30cf4dd6e4f429`
- Comparison decisions SHA-256: `2e067e47a8931320b16ccd08732d7072b33eab5c003add346bdee77164e6312c`
- Retrieval evidence SHA-256: `3631e338c58979363891e71786e6e117eb420946ff7f5d4d3b097f221d1f6de4`
- Within-batch pairs SHA-256: `8fe0282ff1ac44459fb7328b680f69403703ad07a289029538460d0cf76fa1c4`
- Corpus proof SHA-256: `0a7952dbd17ab12bd6712c7bac15c8f7aa91e258ec541ba4de145ec4f7be3f46`

This comparison authorizes draft staging only. It does not approve the content, qualify protected candidates, define a form, or authorize assessment allocation or release.
