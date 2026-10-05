# Sprint 15B.10 — Ֆիզիկա 7, Գլուխ II-ի ութերորդ հարցերի ընտանիք

**Status:** Prepared and rollback-tested as learner-inactive draft content. Production deployment, human question review, protected current-version QA and approval remain pending. The guide, misconception definitions and external SME validation have separate gates.

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

## Reviewer action after deployment

Question Bank → Physics 7 → Chapter II → `PHY7-U02-S09`. Review `I01`–`I04`, their options, keys and mappings; save any revisions, run current-version QA, then approve. Review the guide and misconception definitions through their own governed workflows. Chapter II remains learner-inactive.
