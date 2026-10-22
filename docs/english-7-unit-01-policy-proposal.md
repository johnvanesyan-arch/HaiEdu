# English 7 Unit 1 — scoring, readiness and retry proposal

**Current disposition — C25:** John’s numerical acceptance and learner-source-use/activation direction are recorded. The exact C22 configuration is now active as the provisional Unit 1 pilot; independent specialist review remains pending. [Pilot release and acceptance](english-7-unit-01-pilot-release.md). The original proposal below remains historical.

**Historical disposition — C22:** John approved this complete contract, finite replacement and 58-core/2-optional split on 22 October 2026. The [acceptance record](evidence/english-7-unit-01-policy-acceptance-20261022.json) binds the unchanged machine-readable proposal to its source hash. [Exact configuration preparation](english-7-unit-01-release-preparation.md) has passed rollback rehearsal; no learner activation occurred. The proposal and requested-decision text below are retained as the historical C21 brief, not a repeated approval request. C23 completes scoped result wording and prepares the [learner/writing acceptance handoff](english-7-unit-01-learner-acceptance.md).

**Historical Sprint 16.1C.21 · 22 October 2026 · Roadmap 4.47 · Prepared and technically checked; owner policy approval pending.**

I recommend the contract below for the provisional MVP. It fits the accepted five 28-question forms, keeps writing separate from automatic scoring, and makes finite replacement capacity explicit. These are proposed product rules, not ministry pass marks, calibrated proficiency thresholds or a new content review. No policy, learner model, form or release has been activated.

John's acceptance of all 200 questions, recordings, guides and the writing/rubric/workload package stands. C20's existing-bank exposure disposition and formal curriculum registration are complete. Speaking remains classroom-assessed. The six-unit textbook sequence and the 60 Practice / 56 Diagnostic / 84 Mastery bank remain unchanged.

## Proposed rules for approval

| Area | Recommended rule | Why and practical limit |
| --- | --- | --- |
| Diagnostic | One completed 28-question baseline selected from DA/DB, with scores for guidance and no pass/fail threshold. No hints or timer. Completion unlocks automatic Practice. | Establishes learning guidance without making the teacher writing queue a prerequisite. Two forms are alternatives, not two completed baselines. |
| Item scoring | Each question is worth one point. Required gaps/mappings share that point; ordering requires a complete accepted sequence. | A question with two fields must not count twice. All 28 responses are required; no negative marking. |
| Automatic Mastery pass | At least 80% of 28 points, plus at least one fully correct question in each two-question skill and two fully correct questions in each three-question skill. | Stronger areas cannot hide a completely missing skill. A partial response contributes points but does not count as fully correct. This is a provisional course criterion. |
| First Mastery readiness | Each of S01–S12 meets either the configured evidence-model route or the recent-recovery route below. | Readiness is permission to attempt the assessment, not proof of mastery. Writing does not block it. |
| Practice | Up to eight questions per session, with existing early completion, whole-source groups and unseen-first selection. Proposed initial core pool: 58 questions; retain the two optional extensions separately. | The accepted bank remains 60. The optional-scope issue below needs an explicit delivery decision before allocation. |
| Required review | Twelve-question Chapter Review after scored failure 1 or 2, using the core Practice pool and existing completion/help rules. | Review is remediation; it has no extra pass percentage. Unused assessment sources never enter review. |
| Mastery attempts | At most three scored attempts, using three separate eligible forms. Required review separates scored failures. | No automatic fourth attempt. This is a maximum, not a guarantee when forms are lost to technical exits. |
| Technical failure | Resume saved state first. A persistent supported audio failure may end unscored; retain responses, playback and exposures. Replace only from an unused complete eligible form. | No scored-attempt charge for that exit. No form reset, exposed-content recycling, shortened test or automatic failure when capacity runs out. |
| Writing | Keep the accepted 80–100-word note and four 0–3 criteria, reported separately out of 12. No numerical writing pass threshold or automatic gate in this MVP contract. | Pending review is neither zero nor failure. S13/S14 share one sample; automatic passing cannot certify writing or all English outcomes. |
| Audio | Retain the accepted two plays per assessed recording, shared across its questions; normal speed, no transcript/translation/seeking. Practice/Review replay stays unlimited. | No new playback decision is requested. |

## Scores and skill minima

All twelve automatic targets are explicitly included in the proposed course assessment and readiness scope. This includes S04's taught adjective/adverb foundation and S12's listening-detail support. Their source-map classification is retained: making them course criteria does not rename supporting mappings as standalone mandatory national outcomes. S03 assesses requests/instructions only; broader reporting extensions do not become required.

| Skills | Questions per form, per skill | Fully correct minimum, per skill |
| --- | ---: | ---: |
| S01 vocabulary; S06 too/enough; S07 comparisons; S08 articles | 3 | 2 |
| S02 word formation; S03 requests/instructions; S04 adjective/adverb; S05 -ed/-ing; S09–S10 reading; S11–S12 listening | 2 | 1 |

The proposed reporting groups are vocabulary **5**, grammar **15**, reading **4** and listening **4**, totaling **28 points**. These are task counts, not equal area weights or psychometric weights. Shared-passage/recording pairs remain dependent observations. The existing v3/v4 result contract can report these groups separately.

The pass decision uses the unrounded score. The mathematical cutoff is 22.4 points; the current five forms have whole and half-point increments, so the lowest attainable passing score is **22.5/28**, provided every skill minimum is also met. With only whole-point results, 23/28 passes and 22/28 does not. A result of 26/28 can fail if both questions for one two-question skill are wrong. Two half-correct responses in that skill also fail its fully-correct minimum, even if the overall score is high.

I recommend 80% plus these minima because it allows some errors while requiring evidence across the declared course targets. The minimum of two in a three-question skill samples more than one of its distinct demands. Neither this threshold nor the form difficulty has empirical validation. A lower overall cutoff would accept more gaps; requiring every response correct would make a single error decisive. Changing thresholds later requires a prospective version and preserves prior evidence.

## Explicit English readiness model

Use a separate immutable English model, bound to this exact programme/release/unit. Do not modify another subject's configuration or copy a live model identity.

1. **Model route:** evidence score at least **0.75**, with at least **three evidence records** for that skill in the release.
2. **OR recent-recovery route:** at least **three distinct items encountered** for that skill in the release, and the **latest three responses all fully correct without hints**.

The model starts at alpha = 2 and beta = 2. A response with normalized item score s adds s to positive evidence and 1−s to negative evidence. Hinted positive evidence is multiplied by **0.65**; negative evidence is not discounted. Use a flat item-evidence weight of **1** because authored difficulty bands are not calibrated measurement weights. Difficulty may still guide selection. Below three records the state is insufficient evidence; after that, below 0.50 needs support, 0.50–below 0.75 is developing, and at least 0.75 is secure within this preparation model.

Four completely correct unhinted items reach 0.75 from the neutral prior; three recent clean answers can use the recovery route sooner. The smallest core Practice bank, S05, contains only three items. A three-item recovery rule fits that capacity without requiring a four-distinct-item Practice session; the prior global readiness implementation can also count Diagnostic items, so the earlier four-item setting was not an absolute global deadlock.

The existing readiness function counts distinct item IDs across the skill/release history, then checks its recent answer window. It does **not** require the three recent answers themselves to have distinct IDs or source families. A shared source is not independent evidence, and a hint-free response does not prove absence of outside help. This limitation is explicit; a stronger distinct-recent-source rule would require a separate shared-core capability. The model route may include hinted or partial-credit evidence. Diagnostic responses and valid earlier answers retained after an unscored technical exit remain evidence; the abandoned session receives no overall assessment score.

All twelve readiness conditions are joined with AND; the two routes inside each skill are joined with OR. This applies to the first Mastery attempt. Later attempts follow the existing required-review lifecycle, not a newly invented second readiness gate. Unchanged Practice repetition and help controls remain in force. No requirement to finish all 60 questions is introduced.

## Two optional Practice questions need a delivery disposition

The accepted authoring packet expressly marks **ENG7-U01-P10 and P11** as optional wider reported-speech work. Both share S03 with core request/instruction reporting. The current evidence model aggregates by skill and cannot distinguish those optional answers from required S03 evidence merely from an authoring note.

For the initial MVP, I recommend allocating the **58 core questions** to automatic Practice and required Chapter Review, while retaining P10/P11 as approved optional content outside those allocations. Their content, IDs, versions and approvals remain intact. They are not silently deleted or remapped, and the accepted bank remains 60/56/84. This means those two questions would not yet be delivered as automatic exercises in the initial core release. A later optional route must exclude their results from core readiness and required review through an explicit, tested contract.

This is the smallest implementation: it uses existing governed pool membership. Serving all 60 automatically while keeping those two non-gating would instead require a bounded shared evidence-scope capability. Making them core requirements would contradict the accepted textbook-extension disposition. The proposed 58-core/2-optional split therefore needs John's approval alongside the numerical rules.

## Attempts, replacement and capacity

The two Diagnostic forms support one completed baseline and, when needed, one replacement opportunity if the other full form remains eligible. Mastery has **three forms and no fourth complete reserve**.

| Complete Mastery forms lost to technical exits before scoring | Maximum remaining scored attempts from this bank |
| ---: | ---: |
| 0 | 3 |
| 1 | 2 |
| 2 | 1 |
| 3 | 0 |

An actual count also depends on forms already used, source exposure and qualification. Whole-form allocation and exposure checks remain authoritative. Previewing grouped audio questions records exposure before an answer, so zero answers does not mean an unused form. On exhaustion, keep a capacity-blocked state and request a governed content/release decision; do not turn the technical loss into a scored failure or promise another form. The existing-bank public-exposure disposition stands and requires no new privacy decision.

An interrupted assessment normally resumes the same saved session. Existing automatic unscored cancellation is specifically the assessed-audio mechanism. It does not establish a general device-failure diagnosis, administrator reset, content-error appeal or retroactive invalidation workflow. A disputed key or valid unlisted answer follows governed content correction and any separately authorized regrading; this contract does not invent that capability.

## Writing and truthful result scope

Retain the accepted note, the one-sample S13/S14 mapping, Unicode-whitespace word counting and criterion descriptors. No 8/12, average criterion score or other passing threshold is inferred. Draft, submitted, returned and reviewed remain distinct states. Teacher feedback and revisions preserve prior judgments; no deadline or measured workload is introduced here.

The automatic result means that the declared **vocabulary, grammar, reading and listening assessment** passed. It must not be shown as evidence that every English outcome, writing or speaking has been mastered. Writing is separately visible through its existing workspace and review state. No combined unit-completion or writing-competence badge is implemented by this proposal. Before release, verify that student, teacher and school labels express the scored scope; any necessary shared wording/configuration change belongs to implementation, with all affected consumers checked.

No timer is proposed. Recording duration is known, but complete-form learner timings have not been measured. The accepted writing workload remains an estimate, not a timed test or assigned classroom deadline.

## Technical preparation and next handoff

The [machine-readable recipe](content/english-7-unit-01-policy-proposal.json) supplies four explicit policy modes: v4 Diagnostic/Mastery and v3 Practice/Chapter Review, normalized item scoring, reporting groups, the English model and lifecycle rules. Model/lifecycle identities are deliberately null, and activation/allocation are disabled. Approval and qualified bindings are required before those recipes become valid stored policies.

The [offline check](../scripts/content/prepare-english-7-unit-01-policy.mjs) uses the existing JavaScript policy reader and exact SQL scoring/readiness function bodies in in-memory PGlite. **27 checks pass**, covering all four closed mode shapes, unbound-recipe rejection, model compatibility, cutoff and per-skill cases, readiness boundaries, cross-release evidence exclusion, optional-bank counts and finite-form arithmetic. All five authored component shapes match the reused C19 preflight. No real answer keys are regraded and no live learner records or credentials are used. These are narrow synthetic decision checks, not a new allocator/browser/concurrency/SME acceptance claim. [Evidence](evidence/english-7-unit-01-policy-proposal-20261022.json).

No production rows, policies, content, shared runtime or permissions are changed. Existing CI/runtime, content, approval, QA and playback evidence is reused for its unchanged scope. The required merged-source CI/deployment results and final source stamp are recorded in the [Notion sprint map](https://app.notion.com/p/3df355a472bf813585aac229c27f8f9c).

**Decision requested:** approve the proposed numerical contract, finite-replacement rules and 58-core/2-optional initial delivery split. AGENTS.md preserves explicit learning-criteria and release gates; the instruction to prepare this next slice is not treated as approval of previously unspecified numbers. Once approved, the next slice can prepare exact English model/lifecycle/pool/form bindings and resolve the remaining specialist/source-reuse and learner-release gates. Approval of this contract alone does not activate English or approve unrelated subjects.
