# Sprint 15B.9 — Ֆիզիկա 7, Գլուխ II-ի յոթերորդ հարցերի ընտանիք

**Status:** Prepared and rollback-validated; production application is recorded separately below. Questions, misconception definitions and the remediation guide require the governed human review and current-version QA workflow. External SME validation remains pending.

## Scope and source

This is a subject-aware content extension using the existing subject-neutral `haiedu-evidence-blueprint-v1` contract. It changes no shared schema, API, UI, scoring rule or authorization path.

- Skill: `PHY7-U02-S08 — Մարմնի ջերմաստիճանը կապել մասնիկների շարժման արագության հետ`.
- Family: `PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION`.
- Template: `PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION`.
- Programme: Theme 2, mandatory outcome 1(5), «բացատրել, թե ինչով է պայմանավորված մարմնի ջերմաստիճանը (Հ9, Հ29)». The existing official-source transcription note is preserved: the source line lacks visible numbering and is recorded as the fifth mandatory outcome.
- Textbook: «Ֆիզիկա 7» (2023), Chapter II, §10 printed page 32 and §11 printed pages 33–35 (PDF pages 33–36).
- Recovered source SHA-256: `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`, identical to the established authoring source.

The source pages were extracted and visually inspected. The family assesses the temperature–characteristic molecular-speed relationship, its diffusion application, molecular motion at 0 °C, and a justified inference from the textbook's hydrogen/oxygen data. It does not require kinetic-theory formulae, gas laws, absolute-zero theory or thermometer operation. S09 remains a separate family.

## Evidence plan

| Item | Purpose | Student action | Canonical key |
|---|---|---|---|
| `PHY7-U02-S08-I01` | Core understanding | Relate heating the same substance without a phase change to increased characteristic particle speed | A |
| `PHY7-U02-S08-I02` | Application | Predict the faster copper-sulfate/water diffusion experiment at the higher temperature, with other conditions fixed | B |
| `PHY7-U02-S08-I03` | Misconception diagnosis | Reject the claim that 0 °C means no molecular motion | C |
| `PHY7-U02-S08-I04` | Transfer reasoning | Use the supplied hydrogen/oxygen speeds at equal temperatures to reject an invalid cross-substance temperature comparison | D |

Four single-choice questions are appropriate for this bounded outcome: the evidence operations differ even though the response format is shared. The authoritative template requires each of the four purposes once. Existing server-side option shuffling remains enabled.

Wording uses **բնորոշ արագություն** rather than asserting that every molecule has the same speed. I04 supplies both gas speeds and their common temperature; students need no unstated molecular-mass formula. The 20 °C/40 °C pair in I02 is an authored controlled comparison, not a claimed measured textbook dataset.

## Content and governance

- 4 draft questions, 16 options, 4 answer keys and 4 immutable version-1 snapshots.
- 12 incorrect responses each map to exactly one of 8 draft misconception definitions; no correct response maps to an error.
- 1 draft remediation guide with source provenance and an append-only authoring-version record.
- Each item has its primary Chapter II/programme scope, source hash, evidence purpose and semantic fingerprint.
- One direct family/outcome reconciliation and one family snapshot are added only to the existing draft candidate release.
- Existing gate decisions are preserved. A nested `sprint15B9` evidence object records this slice without replacing earlier gate evidence.

No assessment pool, pool membership, assessment blueprint, pilot activation, learner release or learner data is created. Previous question versions, approvals, releases and content remain unchanged. The preflight rejects pre-existing S08 content instead of overwriting it.

## S07 review checkpoint — 2026-10-05

Read-only production verification confirmed all four `PHY7-U02-S07-I01`–`I04` questions are `published / approved` at version 1, with passing current-version technical QA, zero errors and zero warnings. Approval timestamps are 07:59:42–08:01:14 UTC. All four remain disconnected from assessment pools. The S07 guide and six misconception definitions remain draft; the question-review checkpoint does not approve them or grant SME validation.

## Verification

The exact content migration ran inside a production transaction followed by `ROLLBACK`. Its executable assertions passed for the authoring profile, purpose coverage and uniqueness, item/option/key/mapping counts, semantic fingerprints, version snapshots, guide history, curriculum/outcome links and release boundaries. The probe also compared every pre-existing item, item-version and release row before/after and detected no change. A separate read verifies that the rollback retained zero S08 items.

These structural checks do not substitute for protected current-version QA, human content approval or SME review. Production deployment and CI evidence are appended after completion.

## Next reviewer action

Open the Question Bank and filter to Physics 7 / Chapter II / `PHY7-U02-S08`. Review all four prompts, options, answer keys and response mappings; save any edits, run current-version QA, then approve. Review the guide and misconception definitions under their own governed workflow. None of these actions alone opens the candidate curriculum release to students.
