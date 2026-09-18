# Sprint 11J — Physics 7 Current-Standard Reconciliation

## Status

**Complete — 2026-09-18.**

The existing Grade 7 Physics Chapter I implementation is now reconciled to the current normative chain without changing any learner-history-bearing skill, family, item, session or attempt identifier.

## Authoritative baseline

| Layer | Current source | Effective baseline used |
|---|---|---|
| National framework | Government Decision N 439-Ն, current incorporation amended by N 699-Ն | 2026-05-22 |
| Physics subject standard | Order N 42-Ն, appendix replaced by N 37-Ն | 2026-08-14 |
| Physics Grades 7–12 programme | Order N 40-Ն, appendix replaced/reissued by N 36-Ն | 2026-08-14 |

Official pages:

- framework: `https://www.arlis.am/hy/acts/225446`;
- Physics standard: `https://www.arlis.am/hy/acts/229259`;
- Physics programme: `https://www.arlis.am/hy/acts/229331`.

The current standard and programme appendices were extracted from the DOCX attachments linked by ARLIS. Their SHA-256 values are recorded in `curriculum_reconciliation_runs.source_snapshot`:

- subject-standard appendix: `619a30f43ca972d138e738dbfff0797d17f8bb12ff533894490b88af99537397`;
- programme appendix: `966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478`.

## Current official Chapter I outcomes

The current programme defines five mandatory outcomes and one additional outcome for Theme 1, `Բնության ուսումնասիրության ֆիզիկական մեթոդները`.

| Locator | Level | Exact Armenian statement |
|---|---|---|
| Պարտադիր 1(1) | Mandatory | ներկայացնել ֆիզիկայի ուսումնասիրության առարկան (Հ9), |
| Պարտադիր 1(2) | Mandatory | ներկայացնել հայ անվանի ֆիզիկոսներին (Հ30), |
| Պարտադիր 1(3) | Mandatory | բերել ֆիզիկական երևույթների օրինակներ (Հ9), |
| Պարտադիր 1(4) | Mandatory | կատարել պարզագույն դիտումներ, չափումներ և փորձեր,(Հ4, Հ28), |
| Պարտադիր 1(5) | Mandatory | չափումներ կատարելիս դրսևորել պատասխանատու վերաբերմունք, անհրաժեշտ հետևողականություն և ճշգրտություն,(Հ4, 28), |
| Լրացուցիչ 2(1) | Additional | ներկայացնել ժամանակի, հեռավորության, ծավալի, զանգվածի չափման միավորները ՄՀ համակարգում |

The programme also explicitly includes physical quantities and their measurement, simple measuring instruments, laboratory measurement of volume/mass/length/temperature, and problems involving instrument scale division and measurement error.

All six rows were absent from `learning_outcomes` before 11J. They are now stored verbatim with the disposition `new_official_outcome_missing`, meaning a discovered baseline gap that this sprint resolved—not a remaining open gap.\n\nThe current appendix prints mandatory outcome 1(5)'s final reference as `(Հ4, 28)`. Sprint 11J preserves that printed form and records a transcription note; it does not infer a missing `Հ` or silently normalize official text.

## Skill reconciliation

No skill required deletion, renaming, splitting, merging or a material scope rewrite. The missing work was explicit programme mapping. All ten stable skill IDs were retained.

| Skill | Primary programme trace | Type | Disposition | Decision |
|---|---|---|---|---|
| PHY7-U01-S01 | Պարտադիր 1(3) | Direct | mapping updated | Examples/classification operationalize recognition of physical phenomena. |
| PHY7-U01-S02 | Պարտադիր 1(1) | Derived supporting | mapping updated | Body/material/phenomenon is a textbook-grounded distinction supporting what physics studies. |
| PHY7-U01-S03 | Պարտադիր 1(2) | Direct | mapping updated | Directly assesses the Armenian-physicists outcome. |
| PHY7-U01-S04 | Պարտադիր 1(4) | Derived supporting | mapping updated | Distinguishing observation from experiment supports valid performance of the practical outcome. |
| PHY7-U01-S05 | Պարտադիր 1(4) | Derived supporting | mapping updated | The bounded inquiry chain supports simple experiments plus the subject-standard research practices. |
| PHY7-U01-S06 | Պարտադիր 1(4) + Լրացուցիչ 2(1) | Direct | mapping updated | Quantity/unit/instrument matching supports measurement and the named SI-unit outcome. |
| PHY7-U01-S07 | Լրացուցիչ 2(1) | Derived supporting | mapping updated | Simple transformations apply the named units and match the programme's algebra intersubject link. |
| PHY7-U01-S08 | Պարտադիր 1(4) | Direct | mapping updated | Scale division and readings are explicit practical/problem-solving content. |
| PHY7-U01-S09 | Պարտադիր 1(4) + 1(5) | Direct | mapping updated | Measurement error is explicit content; precision/responsibility is an explicit outcome. |
| PHY7-U01-S10 | Պարտադիր 1(4) | Direct | mapping updated | Bounded measurement planning, volume and indirect-length procedures remain within simple laboratory measurement. |

`skill_outcomes` now exposes the same current-outcome links used by the detailed reconciliation tables. Skills remain in `review` status because standards traceability does not substitute for external Physics SME approval.

## Item-family and assessment reconciliation

Every registered Chapter I item family has an explicit primary official-outcome trace:

| Result | Count |
|---|---:|
| Registered families reconciled | 77 / 77 |
| Direct families | 45 |
| Derived-supporting families | 32 |
| Families with unresolved trace | 0 |
| Family disposition | 77 × mapping updated |

Active blueprint coverage was recomputed from the actual relation `assessment pool → enabled item → item template → item family → reconciled outcome`:

| Active pool | Purpose | Enabled items | Skills | Active families | Official outcomes reached |
|---|---|---:|---:|---:|---:|
| PHY7-U01-PRACTICE-BASELINE | Practice | 120 | 10 | 55 | 6 |
| PHY7-U01-DIAGNOSTIC-BASELINE | Diagnostic | 40 | 10 | 15 | 6 |
| PHY7-U01-MASTERY-PROTECTED-A | Mastery check | 80 | 10 | 34 | 6 |

All 240 active variants have both a reconciled family path and an existing `PHY7-U01` curriculum scope. No pool membership, answer key, item wording, validation state or historical attempt was changed.

## Database implementation

Migration `0036_sprint_11j_physics7_current_standard_reconciliation.sql`:

- adds source-document, source-locator and requirement-level provenance to `learning_outcomes`;
- stores the six current official outcomes;
- adds an auditable reconciliation run linked to the registered framework, standard, programme and unit;
- records normative context for each official outcome;
- records one disposition per skill and explicit direct/derived skill-to-outcome mappings;
- records one primary trace and disposition per item family;
- snapshots active assessment-pool coverage;
- enables RLS with completed-run read access and admin/content-admin writes;
- fails closed unless all six outcomes, ten skills, every current family, all three active pools and every active item are traceable.

Migration `0037_sprint_11j_reconciliation_advisor_hardening.sql` adds the foreign-key access-path indexes identified during the post-DDL advisor pass.\n\nMigration `0038_sprint_11j_preserve_official_outcome_wording.sql` preserves the programme's exact printed punctuation and records the `(Հ4, 28)` source anomaly without editorial repair.

Reconciliation key: `physics7_u01_2026_08_14`.

## Verification

Live post-migration assertions and independent read-back confirmed:

- reconciliation status: `complete`;
- current official outcomes: 6;\n- exact printed form for mandatory 1(5): preserved with an explicit transcription note;
- reconciled skills: 10 / 10;
- reconciled item families: 77 / 77;
- active assessment pools: 3 / 3;
- active variants with no trace: 0 / 240;
- Chapter I skills without a current programme mapping: 0;
- Chapter I families without a disposition: 0;
- new-table security advisor findings: 0;
- new-table actionable performance findings: 0; fresh indexes appear only in the expected unused-index informational list.

The project-level advisor still reports pre-existing items outside 11J: `item_curriculum_scopes` has RLS enabled with no client policy (therefore client access is denied), leaked-password protection is disabled, and older tables/policies retain historical performance advisories. None was introduced by the reconciliation migration.

## Exit decision

Sprint 11J satisfies its exit criterion: every current Chapter I skill and assessment family is traceable to the current Physics 7 programme, either directly or as an explicitly justified supporting micro-skill.

The next governance step is Sprint 11K. It must version curriculum releases and bind historical learner evidence to the release/blueprint under which it was produced; 11J deliberately did not silently reinterpret historical evidence.
