# S02 whole-bank comparison and I10 correction

**Date:** 2026-10-06. **Sprint:** 15B.13C. **Author:** Codex, automated authoring/review assistance at John's direction; this is not external SME validation or human question approval.

**Status:** Prepared version-2 correction, pending deployment evidence and human review. The full-bank review requirement is platform-wide; this content correction is a subject-aware Physics 7 extension.

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
