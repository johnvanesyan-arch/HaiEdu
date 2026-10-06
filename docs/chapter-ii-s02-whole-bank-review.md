# S02 whole-bank comparison and I10 correction

**Date:** 2026-10-06. **Sprint:** 15B.13C. **Author:** Codex, automated authoring/review assistance at John's direction; this is not external SME validation or human question approval.

**Status:** Human review complete. John revised and approved I10 at v4, activated the new misconception and published his edited guide at runtime v2 on 2026-10-06. The v2 deployment and earlier review handoff below remain historical checkpoints. The full-bank review requirement is platform-wide; this content correction is a subject-aware Physics 7 extension.

## Finding and correction

The previous claim that purpose labels established the second S02 batch's distinctness was too strong. I10 v1 combined the same heated-wire and confined-gas explanations already required by I04/I07 and I08. Reusing figure 23 reinforced the overlap. Exact-text QA and a four-purpose family profile did not detect that substantive redundancy.

I10 v2 uses the textbook's water/alcohol mixing experiment to test a different inference: **a qualitative explanation does not supply an exact numerical measurement**. The textbook reports that mixing one litre of each produces less than two litres; it does not supply 1.5 litres or a formula from which that value follows. The learner must distinguish the supported explanation from invented precision. This is an authored application of the book's evidence, not a quoted textbook exercise or a new quantitative theory.

The scenario is shared with I02. The added demand is explicit: I02 asks why the volume is smaller; I10 asks whether that explanation justifies a particular unmeasured number. This is new reasoning coverage within the same learning outcome, not a new outcome, a new experiment, or a claim of psychometric independence. I11 remains intentional misconception practice. I09 and I12 retain their reviewed versions.

## Corpus and source

Production corpus read on 2026-10-06: all **12 current S02 items and 20 immutable saved versions**, across all three families/templates. Current versions: I01 v2, I02 v2, I03 v4, I04 v3, I05–I08 v1, I09 v2, I10–I12 v1. All twelve current questions are published/approved before this correction. No S02 retired items, protected-bank assignments, or learner exposure events exist. Historical versions contain wording, metadata or option-order changes; none adds the exact-versus-qualitative inference proposed for I10.

The shared programme outcome also maps to S03, so its four current items were inspected; they test atom/molecule/element distinctions and do not duplicate I10's reasoning. Related Chapter I S05/S06 banks (50 items, including protected entries) were inspected for evidence/measurement overlap, with a cross-bank search for the alcohol scenario. Their tasks concern stages of inquiry, testing a hypothesis, overgeneralization, units and instruments; no matching exact-volume-from-particle-gaps task was found. Two S09 alcohol-thermometer items found by that search assess thermal expansion, not mixing or exact-volume inference. Protected wording/answers are omitted from this report. This is a bounded collision review, not a retrospective certification of those banks' overall diversity.

Source: user's **Physics 7 (2023)**, §7, printed pages **24–26**, PDF pages 25–27; SHA-256 `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. I10 specifically uses the mixing observation on printed p25 and the particle-gap explanation on p26. Programme: Grade 7 Physics, Topic 2, mandatory outcome **1(1)**. The task requires no gas law, atomic-composition rule, concentration calculation or new measurement procedure. The quantity 1.5 litres is explicitly a student's unsupported claim, never a taught fact or expected experimental result.

The migration compares the complete S02 code/version/prompt/stimulus/ordered-option/answer inventory with this reviewed snapshot under row locks before changing anything. A changed, added or missing question makes the comparison stale and aborts the migration. Existing template and I10 version guards, draft-release and delivery/exposure checks also fail closed. Related-bank findings must be re-read at the final handoff; this one migration is not a new platform-wide semantic detector.

## Comparison matrix

“Practice variant” means useful reinforcement, not independent new reasoning coverage. Baseline rows describe pre-existing coverage rather than granting new approval.

| Item | Scenario and solution/inference | Nearest overlap | Disposition / contribution |
|---|---|---|---|
| I01 v2 | Salt in a full glass; infer spaces accommodate added particles | I02, I11 | Baseline: infer gaps from dissolution; no particle disappearance |
| I02 v2 | Water/alcohol mixture below summed volumes; explain interparticle spaces | I01 | Intentional practice variant: second textbook observation of the same gap-filling explanation |
| I03 v4 | Gas passing heated iron; infer gaps also in solids | I01/I02 | Distinct existing application to solids; no iron/gas transformation |
| I04 v3 | Heated/cooled wire; explain reversible change by mean separation | I06, I07, old I10 | Baseline: spacing rather than particle growth/creation |
| I05 v1 | Figure 22: compare weak liquid compression and stronger gas compression | I08, I11 | Distinct comparison of spacing/compressibility in two states |
| I06 v1 | Figure 24: heated water and confined air expand | I04 | Intentional practice variant: same spacing explanation applied to liquid/gas and two visible indicators |
| I07 v1 | Figure 23: reject “the image measures growth of each particle” | I04 | Additional inference: distinguish macroscopic observation from a microscopic-size measurement |
| I08 v1 | Closed syringe compresses and restores, no gas loss | I05, I04 | Intentional practice variant: reversible compression with explicit fixed count/identity and temperature |
| I09 v2 | Solid looks continuous to unaided eye | I03, I07 | New reasoning coverage: visibility/resolution cannot refute tiny particles and spaces; preserve John's revised wording/options |
| **I10 v1** | Combine heated wire and compressed syringe; separation increases/decreases | **I04/I07 + I08** | **Redundant—replace.** Combining familiar answers did not supply a sufficient additional demand |
| **I10 v2** | Same mixture as I02; evaluate unsupported exact 1.5-litre claim | **I02; I07's general observation/inference distinction** | **New reasoning coverage, reused scenario:** explain qualitative result without inventing a numerical prediction; exact volume needs measurement/data |
| I11 v1 | Figure 22: reject “hardly compresses ⇒ no spaces”; reconcile with mixing evidence | I05, I01/I02 | **Intentional misconception practice.** Do not count the reused experiment as a new scenario |
| I12 v1 | Closed compression versus gas leaving open syringe | I08 | New reasoning coverage: same macroscopic volume decrease can have different particle-count changes because boundaries differ |

## Question and illustration rationale

I10 v2 asks:

> Դասագրքի փորձում 1 լ ջուրը խառնում են 1 լ սպիրտի հետ և ստանում 2 լ-ից փոքր ծավալով խառնուրդ։ Սովորողն ասում է. «Քանի որ մասնիկների միջև ազատ տարածություններ կան, խառնուրդի ծավալը պետք է լինի ճիշտ 1,5 լ»։ Ո՞ր գնահատականն է հիմնավորված։

The correct response explains that the model accounts for a volume below two litres, but the value 1.5 litres does not follow from that explanation alone. Distractor A makes the unjustified exact-volume inference; B denies gaps in liquids; C claims alcohol particles disappear. The latter two retain accurate existing misconception mappings. A uses a new **draft** definition, `qualitative_model_implies_exact_volume` — **Որակական բացատրությունից ճշգրիտ ծավալ որոշելը**. It needs human review; no existing definition is stretched or rewritten to make metadata pass.

This is a verbal reasoning task with all relevant information in the prompt. The old heated-wire illustration is removed from the current I10 version because it no longer supports the task. Its historical version and image asset remain intact. No decorative replacement or new illustration is needed. Figure 22 remains justified for I11's explicit reading of the liquid-compression panel; its reuse is recorded above. A source image cannot by itself establish novelty.

## Inventory, review and preservation

Twelve authored S02 questions do **not** mean twelve independent scenarios or learning outcomes. Several intentional variants are documented above. The selected twelve-item target has not been raised or used to justify another clone. The broader 192-item Chapter II plan remains a planning target subject to source-grounded quality, protected-bank separation and John's decisions on any shortfall. Assessment delivery lengths/scoring/readiness and release gates are unchanged.

The correction increments only I10 to v2, resets its current approval, preserves v1 and all old reviews, and updates its template rationale to v2. All other current questions, including John's I09 edits, and all guide content/history remain unchanged. The template/version change makes old family QA fingerprints stale, so all four current I09–I12 variants require refreshed technical QA. A technical pass does not approve the new misconception or question.

After deployment, review the new misconception on [Թյուր պատկերացումներ](https://www.haiedu.am/content-misconceptions.html), then [I10 v2](https://www.haiedu.am/content-item.html?id=1a1c5d1b-aff5-441a-b7f1-3d63a4e9cadc). The separate [template guide](https://www.haiedu.am/content-guides.html?id=template%3A3e34388a-f088-4ac9-bdb2-20a2de495d4b) remains draft; its observation/inference strategy is compatible with this task and remains subject to human review. Its existing worked example is an analogy, not a solution to I10.

No pool, form, blueprint, release activation, learner history, dashboard, learning-engine rule or shared Edge/browser source is changed. The prior 32-question illustration audit, external SME, numeric readiness model, whole-chapter content and pilot/release gates remain open.

## Deployment verification

[PR #147](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/147) merged as `4454cbf3443334dae759c5fc600a4ec3d60e7ab7`. PR CI **#1247** and independent main CI **#1248** passed all five required jobs: **1,226 Node tests, 35 native Chromium tests**, both PostgreSQL jobs and aggregate Platform release checks. The two new focused tests exercise actual SQL/content-QA code with isolated auth/query doubles, not a live authenticated reviewer session.

Migration `sprint_15b13_s02_i10_diversity_revision` is applied at production version `20261006171437`, with statements exactly matching the reviewed repository migration (local CLI-generated filename version `20261006164457`). The production rollback preserved all 100 public-table checksums. Deployment plus QA changed only the expected eight tables: ten authorized current rows revised, one new version, one draft misconception and four technical QA records appended. All other existing rows and the other 92 complete tables are unchanged, including all approval/version histories and guides. Security/performance advisor findings are unchanged.

Fresh production readback passes the deployed-identical v11 evaluator for current I09 v2, I10 v2, I11 v1 and I12 v1, with no errors/warnings; the guide validator passes all four. The four append-only QA records carry automated provenance and null `run_by`; this was a fresh production-snapshot evaluator run, **not** an authenticated live Edge call or a human approval. Related-bank final version readback is unchanged. Production Vercel metadata and an independent HTTP 200 `release.json` read confirm implementation main.

Current inventory: **S02 11 approved + I10 v2 awaiting review; Chapter II 39 approved + one awaiting review, 40 authored total**. The new misconception is draft and the existing T03 guide remains draft. I10 v1's approval remains in history. [Machine-readable evidence](evidence/sprint-15b13-s02-diversity-20261006.json).

## Human-review closure

Readback at 18:21:23 UTC on 2026-10-06 confirms I10 **v4** approved/published, the new misconception active and the edited guide published at runtime **v2** (authoring v4). The runtime snapshot matches the user's saved guide. All twelve S02 questions and all 40 authored Chapter II questions are approved. The final I10 prompt changes only the word **գնահատականն** to **պնդումն** relative to deployed v2; answer/options, stimulus and reasoning demand are unchanged. The other eleven S02 content projections are unchanged, so the whole-bank/source disposition above remains applicable.

I10's newer version made the siblings' older QA family fingerprints stale. Four append-only technical QA records now pass for the current v2/v4/v1/v1 family state with explicit automated provenance; the edited guide passes all four variants. No user content, approval, history, model or release was rewritten by this refresh. The S02 practice/review review checkpoint is complete. Next is S03 source/whole-bank planning before its next batch. [Readback and QA evidence](evidence/sprint-15b13-s02-review-complete-20261006.json).
