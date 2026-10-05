# Sprint 15B.10 — Ֆիզիկա 7, Գլուխ II-ի ութերորդ հարցերի ընտանիք

**Status:** S09 question review, matching-version QA and approval verified complete on 2026-10-05. All four questions remain learner-inactive. The guide and nine misconception definitions remain draft; SME validation and curriculum-release gates remain open.

## Scope and source

This is a subject-aware content extension using the existing subject-neutral `haiedu-evidence-blueprint-v1` authoring contract. No shared schema, API, browser asset, scoring rule, analytics or authorization path changes.

- Skill: `PHY7-U02-S09 — Բացատրել ջերմաչափի աշխատանքի սկզբունքը`.
- Family: `PHY7-U02-S09-F01-LIQUID-THERMOMETER`.
- Template: `PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER`.
- Programme: Theme 2, **additional outcome 2(2)**, «բացատրել ջերմաչափի աշխատանքի սկզբունքը». This preserves the existing governed outcome classification; it does not relabel an additional outcome as mandatory.
- Official source: [Physics 7–12 programme](https://www.arlis.am/hy/acts/229331), existing governed source key `am_physics_grade7_programme_40n_36n`.
- Textbook: «Ֆիզիկա 7» (2023), Chapter II, §12, printed pages 36–37 (PDF pages 37–38), figure 34.
- Source SHA-256: `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`.

Both source pages were extracted and visually inspected. Scope is the liquid thermometer: thermal expansion, reservoir, capillary and liquid-column height. Scale conversions, electronic/infrared thermometers, molecular-speed assessment and clinical maximum-reading retention mechanisms are excluded. The family makes no claims about which thermometer types are most prevalent today and does not reproduce the textbook's device operating-range numbers as universal specifications.

## Evidence plan

| Item | Evidence purpose | Student action | Canonical key |
|---|---|---|---|
| `PHY7-U02-S09-I01` | Core understanding | Identify thermal expansion as the operating principle | A |
| `PHY7-U02-S09-I02` | Application | Predict and explain the falling column as an ordinary spirit room thermometer cools | B |
| `PHY7-U02-S09-I03` | Misconception diagnosis | Distinguish increased volume from creation of additional liquid inside an intact sealed thermometer | C |
| `PHY7-U02-S09-I04` | Transfer reasoning | Explain why the same extra liquid volume produces a larger height change in a narrower uniform tube | D |

Four questions provide distinct evidence for this bounded outcome. This is a family-specific authoring choice, not a core requirement that every skill have four items. The authoritative template declares all four purposes and enforces uniqueness. Existing server-side option shuffling remains enabled.

I02 explicitly uses an ordinary spirit room thermometer within its operating range, avoiding the retention mechanism of clinical maximum-reading thermometers. I03 specifies an intact sealed device. I04 supplies equal extra volumes and uniform tube widths, so the intended comparison does not require an unstated thermal-expansion coefficient, a formula, or a missing diagram. These are authored situations based on the source principle, not claimed textbook experiments or measured datasets.

## Content and governance

- 4 draft single-choice questions, 16 options, 4 answer keys and 4 immutable version-1 snapshots.
- 12 incorrect-response mappings covering every distractor exactly once, with 9 draft misconception definitions. Correct responses have no misconception mapping.
- 1 draft template remediation guide and its append-only authoring-version record.
- Exact skill/programme/unit/source provenance, evidence-purpose rationales and semantic fingerprints.
- One direct family/outcome reconciliation and one family snapshot in the existing draft candidate release.
- Existing gate decisions and prior evidence are retained; only a nested `sprint15B10` authoring checkpoint is appended.

The preflight requires S09's existing authoring disposition, the draft candidate release and approved S08 items with latest passing matching-version QA. It rejects existing S09 items, templates, misconceptions or the family instead of overwriting content. New IDs are resolved through governed codes and relational joins.

No assessment pool, pool membership, blueprint, pilot activation, learner release or learner evidence is created. Existing approvals and immutable versions remain unchanged. S09 question approval will not substitute for guide/misconception review, SME disposition or release readiness.

## Verification before deployment

The exact SQL migration was executed inside a repeatable-read production transaction followed by `ROLLBACK`. Its executable assertions passed for the template contract, four evidence purposes, item/option/key/mapping counts, fingerprint correctness and uniqueness, version snapshots, guide history, unit scope, outcome link and release boundaries.

Within that transaction, before/after fingerprints matched for every pre-existing item and item-version row, every curriculum-release row, all gate decisions and all prior gate evidence (excluding only the new nested checkpoint). A separate post-rollback read confirmed zero S09 items/families, the same fingerprints and all 28 preceding Chapter II questions still approved.

These database structural checks do not claim protected per-item QA, human content approval, external SME review or a new authenticated browser acceptance run. CI and production read-back will be recorded after completion.

## Question-review closure — 2026-10-05

Read-only production verification at 09:17:41 UTC on 2026-10-05 confirmed all four `PHY7-U02-S09-I01`–`I04` questions are `published / approved` at version 1. Each has passing latest matching-version QA, zero errors and zero warnings. Approvals span 09:14:21–09:16:32 UTC. All four retain `provisional_no_sme_review` and zero pool links. The S09 guide and nine misconception definitions remain draft. The candidate curriculum release remains draft with zero blueprints; the existing Chapter I release remains pilot.

The eight initial Chapter II families (S02–S09) now contain 32 approved questions. Live guide status is published for S02–S05 (version 2) and draft for S06–S09 (version 1). Forty misconception definitions across S03–S09 remain draft. The next bounded work is to close those content reviews and audit chapter-wide outcome and assessment coverage before defining learner-ready pools/blueprints. The initial family pass does not establish a sufficient protected Diagnostic/Practice/Review/Mastery bank. External SME, content-QA, pilot and release gates remain open.

[Machine-readable review checkpoint](evidence/sprint-15b10-review-20261005.json). Verification recorded existing production state and made no database or learner-data changes. The deployment evidence below preserves the earlier draft checkpoint.

## Production deployment — 2026-10-05

- [PR #117](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/117) merged as `8d888b48d7bab800a14f2a4fbcfd7105ec07d6a9` after [CI #1161](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/37287686491) passed 969/969 tests, typecheck, browser syntax/dependency checks, isolated browser regressions, institutional/content concurrency, PostgreSQL 17 checks and the aggregate Platform release checks job.
- Production migration `20261005090747_sprint_15b10_eighth_item_family.sql` applied successfully. Its repository filename matches the version assigned by the production migration service. SQL is byte-for-byte identical to the rollback-tested source originally generated by the CLI as `20261005085934`; SHA-256 `7d72dc2f2f1b22f5218687e51d42dbc54da49fc0394ff520eb4e892ddb523237`.
- Read-back at 09:07:58 UTC confirms 4 draft version-1 items, four distinct purposes, 16 options, A/B/C/D keys, 12 mappings, 9 draft misconception definitions, one draft guide and one guide authoring version. All four items have immutable snapshots and option shuffling enabled.
- All items have zero assessment-pool links. The candidate release remains draft with zero blueprints.
- All 28 preceding Chapter II questions remain approved. Fingerprints for pre-existing items, item versions, curriculum releases, gate decisions and prior gate evidence match the pre-deploy checkpoint.
- Security and performance advisor category counts are unchanged. [Database advisor reference](https://supabase.com/docs/guides/database/database-linter).
- This content-only deployment changes no shared runtime or browser asset and requires no Edge Function redeployment.
- [Machine-readable deployment evidence](evidence/sprint-15b10-20261005.json).

The S09 question review is complete. Review the remaining S06–S09 guides and the draft misconception definitions through their governed workflows; outcome and assessment coverage must still be audited before release.
