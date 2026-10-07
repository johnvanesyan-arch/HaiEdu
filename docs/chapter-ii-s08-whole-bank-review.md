# Chapter II S08 — textbook and whole-bank review

15B.13I · 2026-10-07 UTC · `haiedu-whole-skill-review-v1`

## Bounded decision

Prepare **two** practice/review drafts, I05–I06, **three** new draft misconception definitions and a separate draft guide. S08 reaches **six authored of twelve planned**, leaving **six slots open**. I05 adds an assessed distinction between characteristic speed and every individual molecule's speed. I06 is an **intentional practice variant** applying the existing temperature–motion relation to evaporation; it is not counted as a new independent outcome or solution path. The original guide already explains non-uniform molecular speeds: I05 adds question coverage, not an untaught concept.

The existing four approved questions already cover same-substance heating, temperature-dependent diffusion, motion at 0 °C and the invalid comparison of different gases by speed alone. Additional heating/cooling paraphrases, temperature permutations, another zero-Celsius claim and another hydrogen/oxygen ranking were omitted. A delayed-smell task was rejected because S05 I04 already assesses the same collision/path explanation. No quota is filled with those repetitions.

This is subject-aware content within the existing subject-neutral governance contract. There are no shared-schema, runtime, dashboard, scoring, assessment-length, authorization, readiness or release-behavior changes. Authorship and semantic comparison are automated Codex work. Human content review and external SME are separate gates. S03/S04/S05/S06/S07 shortfalls remain open; no smaller overall bank is approved by this bounded slice.

## Source and frozen corpus

The supplied *Ֆիզիկա 7 (2023)* PDF has SHA-256 `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. Section 11, printed pp.34–35 (PDF pp.35–36), was read and visually inspected. Page 34 explicitly describes faster and slower molecules within a gas, a characteristic/probable speed, and faster evaporation of water at higher temperature. Page 35 supplies the oxygen datum of approximately 585 m/s at 200 °C. The question supplies this datum; no numeric recall, speed formula, kinetic-energy relation, probability calculation or evaporation-rate law is required.

The evaporation task is an **authored controlled application** of the textbook's puddle example: identical open vessels, equal initial water amounts and exposed surface areas, maintained water temperatures of 20 °C and 35 °C, and otherwise equal surrounding-air conditions. It asks only for the qualitative temperature–motion explanation. It does not predict drying times, infer boiling, compare different substances or attribute a real outdoor observation solely to temperature.

The direct official mapping is Theme 2 **mandatory outcome 1(5)**, explaining what determines a body's temperature. The current official mapping and outcome text were read along with all related mappings; no other skill carries the same mapping. S05's random-motion tasks, S06/S07 diffusion, S09 thermometer operation and Chapter I methods/thermal-phenomenon classifications were inspected as related content.

The fresh complete catalogue contains **312 current items, 155 immutable snapshots and 19 skill records**, including draft, approved, archived/retired states, current templates, related mappings and all assessment purposes. [The manifest](evidence/chapter-ii-s08-corpus-manifest-20261007.json) records versions, snapshot hashes and protected-purpose membership without copying protected prompts. The four S08 v1 questions match their immutable prompts, ordered options and answers. Related historical versions preserve the previously reviewed scientific demands; human wording/answer-order edits and the superseded S02 I10 repetition are included in the comparison.

The frozen source was read at **2026-10-07 16:39:39 UTC**, with catalogue fingerprint `068b217afaba620a4dbfb4f8d7bd80bd`. This is the original 12-table content fingerprint. A fresh read at 17:04:04 UTC confirmed the complete content fingerprint and all 280 pool / 80 form memberships unchanged. Following PR #163 review, the atomic guard was expanded to lock and fingerprint both membership tables as well as official outcome text and mappings; the 14-table fingerprint is `3e84f404e9a6b75a1ac790e79d1fad8f`. A changed bank, historical snapshot, guide, definition or mapping blocks application and requires renewed comparison. Fingerprints verify freshness, not semantic novelty.

## Candidate comparison

| Candidate | Nearest current/historical material | Scenario, inference and distractor comparison | Disposition |
|---|---|---|---|
| S08 I05 · misconception diagnosis | S08 I01 v1 (characteristic speed under heating), I03 v1 (zero Celsius), I04 v1 (different substances); original S08 guide v2; S05 I01–I04 v1 (random motion and paths) | Evaluate a student's universal claim that the supplied characteristic speed is every oxygen molecule's exact speed at every moment. Distinguish a gas-level characteristic from individual speeds and from bulk vessel motion. I04 instead compares different substances; S05 instead asks about direction/path. The current guide already teaches the distinction, but no existing question directly assesses it. Wrong answers require identical speeds at a given temperature, assign thermal speed to the vessel, or claim differing molecular speeds prevent a defined gas temperature. | **New reasoning coverage in the question bank**, within the existing outcome and taught guide; no new programme outcome claimed. |
| S08 I06 · application | S08 I01/I02 v1 (heating and diffusion), Chapter I thermal/process classification and controlled-experiment tasks, S09 I01's boiling distractor | Use explicitly equal conditions and maintained temperatures to connect faster molecular motion with faster evaporation. The context and boiling misconception provide useful practice beyond the diffusion example, but the temperature → motion → faster process chain is substantially shared with I02. It does not repeat the earlier questions' classification/method-selection demand. | **Intentional practice variant**; not a new independent reasoning path or outcome. |

The two candidates assess different demands: representative-versus-individual speed and qualitative application to evaporation. The same oxygen value is supplied in the existing guide; that is acknowledged instructional reuse, not independent novelty. Protected Chapter I tasks were screened without reproducing their prompts here. Their thermal examples/method questions do not require either selected inference. Chapter II diagnostic/mastery banks remain absent and must still be authored independently; these practice scenarios must be treated as exposed during future protected-bank comparison. Existing pool/form/exposure separation remains authoritative.

## Illustrations, definitions and guide

Both tasks have an explicit **no-image rationale**. Figure 33 depicts a molecular broken path without equal-time markers or a speed distribution; it cannot establish the individual-speed claim. The evaporation paragraph has no matching textbook illustration. Figures 30–32 concern diffusion and do not depict the maintained-temperature evaporation setup. Attaching them would add an irrelevant or misleading stimulus. No fabricated textbook diagram or decorative asset is added.

I05 uses two new definitions: `same_gas_temperature_requires_equal_speeds` (two distinct wrong claims sharing the same misconception) and `thermal_speed_is_bulk_motion`. I06 reuses active `heating_slows_motion` and `temperature_unrelated_to_motion`, and adds draft `evaporation_requires_boiling`. Every wrong option has exactly one scoped mapping; correct options have none. The canonical answer keys are C and D; the unchanged server-side shuffle controls delivered positions. A two-item family is not evidence of platform-wide position balance.

The separate guide explains characteristic versus individual speed and supports qualitative temperature applications. Its worked example uses diffusion, not a verbatim answer to the target evaporation task. The original approved S08 questions, active definitions and published guide v2 are preserved.

## S07 review closure

Fresh readback confirms all five S07 questions approved, including I05 v1; both expansion definitions active; and the user's edited expansion guide published at runtime v2 / authoring v4 with matching immutable text. A read-only replay of the exact deployed v11 evaluator and guide validation pass. No duplicate QA row was inserted and no human content or decision was modified. Evidence PR #162 was merged as `14f5a98fcf262c22987cf9312778c56bcb99dd09` after all five CI #1283 jobs passed; its tree exactly matches the reviewed tree. The targeted Notion v3.13 closeout was fetched and verified against the expected edits, preserving all unrelated content and native references. [S07 completion evidence](evidence/sprint-15b13-s07-review-complete-20261007.json).

## Verification and handoff gates

Before deployment: isolated execution of the real migration and QA evaluator against pseudonymized fixtures, additive preservation, rollback, stale-corpus/history/guide/official-mapping/outcome/assessment-purpose-membership/release rejection, current-guide validation, required PR CI and independent main CI. Before/after production evidence must confirm exact migration SQL, current QA, guide compatibility and unchanged pre-existing rows. No new authenticated production browser acceptance is claimed by isolated fixture tests or a production-catalogue QA replay.

After verified deployment, review the two questions, three new definitions and separate guide. Publish the questions before final guide publication. Chapter II remains draft and learner-inactive. With this batch it has 54 authored questions toward the unchanged 192-question plan, leaving 138 unauthored. S08's six-slot gap, earlier shortfalls, protected assessment banks, numeric readiness/model approval, the older illustration audit, SME, pilot and release authorization remain open. The next authoring slice after human review is S09 textbook/whole-bank comparison.

## Predeployment verification — 2026-10-07

All 1,238 local Node tests pass, including two focused S08 migration/quality tests. The real production transaction rollback added the intended two drafts inside the transaction and then restored all rows/hashes across all 100 public tables. Fresh gate readback confirms zero Chapter II pool/form/session/attempt/student-exposure/review-exposure links, zero candidate blueprints and an inactive draft release. Required hosted PR/main checks and actual deployment remain separate gates.


## Verified deployment and review handoff — 2026-10-07

[PR #163](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/163), CI #1286 and independent main CI #1287 passed all five jobs. Main `a247748d29ab676c38d3f388ab6eba5c102a259d` matches the corrected, reviewed tree. The assessment-purpose membership review finding is fixed and covered by stale-evidence regressions. Production migration `20261007173858` matches the reviewed SQL exactly. Both questions pass current technical QA without errors or warnings, and the guide validates both variants. Every pre-existing row is preserved across 15 appended and 85 unchanged tables; advisors are unchanged. Production `/release.json` verifies the implementation commit. [Full evidence](evidence/sprint-15b13-s08-expansion-20261007.json).

- Review [PHY7-U02-S08-I05 v1](https://www.haiedu.am/content-item.html?id=3abbf485-6ff6-4116-acd7-0d750dc763d5&from=review).
- Review [PHY7-U02-S08-I06 v1](https://www.haiedu.am/content-item.html?id=06c995bb-7dca-4d31-8732-a96b090ae97c&from=review).
- Review the three new definitions in [Թյուր պատկերացումներ](https://www.haiedu.am/content-misconceptions.html): `evaporation_requires_boiling`, `same_gas_temperature_requires_equal_speeds`, `thermal_speed_is_bulk_motion`.
- After approving/publishing the questions, review [the separate draft guide](https://www.haiedu.am/content-guides.html?id=template%3A43c51f8b-5371-4cab-9fa1-719bfc9f4730).

S08 has six authored questions and six open planning slots. Chapter II has 54 authored questions: 52 approved and these two drafts, with 138 unauthored toward the unchanged 192 plan. All original questions, definitions, guides and approvals are preserved. Chapter II remains draft, with zero pool/form/learner/exposure links and no release activation. After human review, proceed to S09 textbook/whole-bank comparison.
