# English 7 assessment framework — Sprint 16.1A

**16.1C.27A current handoff:** Unit 1 provisional activation and full learner/audio/writing verification are complete under C25/C26. Unit 2 source/activity/audio preparation is complete; [its map](english-7-unit-02-preparation.md) preserves all 34 activities and proposes fifteen targets without adopting a bank budget. John excludes Do-Re-Mi; an [original dialogue replacement](english-7-unit-02-music-replacement.md) is retained at activity 2; its owner-supplied recording passes technical/script checks under C27A and awaits listening review/registration. Next: full applicable-bank comparison and a bounded question/assessment proposal. The implementation audit and draft counts below are historical; current status is in [project status](project-status.md).

**16.1C.5 historical authoring update — 2026-10-21:** [Diagnostic A and Mastery A](english-7-unit-01-assessment-batch-a.md) now supply 56 protected drafts (28 each; 48 text / eight audio-held), four reading texts and four unrecorded listening scripts. The accepted bank is 116/200 drafted: 60 Practice, 28 Diagnostic and 28 Mastery. Next is the accepted 84-question DB + MB + MC batch. All content remains private and unapproved; actual recordings, human/SME/exposure review, final assessment policy and learner release remain open. No qualified form or live audio is claimed.

**16.1C.4 acceptance and authoring update — 2026-10-21:** John accepted the 60/56/84 bank, bounded assessment authoring manifest and playable-audio integration plan. The [15 Practice additions](english-7-unit-01-practice-additions.md) bring the draft bank to 60 (50 text / ten audio-held); original content is preserved. That accepted 56-question DA + MA batch is now drafted under C5; the next batch is 84 for DB + MB + MC. Actual content/SME review, source/voice rights, audio audition, final assessed-playback/scoring policy and English release remain separate. Earlier proposal/acceptance statements below describe their dated checkpoints.

**16.1C.3 audio follow-up — 2026-10-21:** John requires all possible and strategically relevant course recordings to be included as playable audio. The [course inventory](english-7-course-audio-inventory.md) identifies 20 MP3s across 18 QR routes, including the original five for Unit 1. All are retained as core/support candidates; one needs a reviewed smaller delivery version. Audition, permissions, exact source binding and production playback remain open. No bank proposal, assessed-playback policy or English release is approved by this direction.

**Status: design proposal, 2026-10-20.** The owner has excluded platform speaking assessment and assigned it to classroom teachers. The remaining framework is proposed for implementation; this document creates no English curriculum release, scoring policy, response capability or learner assessment. The current standard/programme and Unit 1 outcomes are now reconciled in [16.1A.2 preparation](english-7-unit-01-preparation.md); the [concrete draft contract](english-7-unit-01-assessment-contract.md), final scoring/bank and implementation remain open.

## Scope and source

The platform scope is reading, listening, vocabulary, grammar and writing, including written interaction under the current standard. Speaking, pronunciation grading, microphone access, learner voice recording, spoken interaction and a classroom speaking-score entry workflow are outside this slice. The owner did not request recording teachers' speaking marks in the platform. Speaking remains visible in the curriculum coverage map as **classroom-assessed / not assessed by the platform**, never as passed or failed by platform evidence.

The uploaded source is Lusine Grigoryan, *English 7*, Zangak, Yerevan 2023, ISBN 978-9939-99-035-4; 176 PDF pages and six units. SHA-256: `9118c0f8847672eab33e4a2a78087d7097566cb347c83b5912036e091a7b9ab9`. The initial 16.1A inspection covered contents and representative tasks. The subsequent 16.1A.2 checkpoint maps all Unit 1 activities and the current sources, while a full-book editorial audit remains open. The source PDF is not republished in this repository.

Observed examples establish the capability needs: p.6 includes matching, word-bank completion and listening; p.16 a chronological summary; p.23 categorisation and an opinion paragraph; p.65 a picture-based story and written advice. The contents list audio scripts from p.144. The book directs readers to publisher/QR-linked audiovisual materials. At 16.1A.2 all five Unit 1 MP3s were retrieved and decoded; exact audio/script alignment, final delivery arrangements and production playback remain to be verified. A printed transcript alone does not provide listening evidence.

Unit 1, “Me in the World,” is the proposed first implementation slice because its sampled tasks exercise several required capabilities. Its proposed 14-skill map and prerequisite/extension boundaries are now recorded; final bank counts and pass rules remain open. Teacher review is authorised under [16.1B.1](written-work-workspaces.md).

## Owner authoring direction — 2026-10-20

John authorises improving the English learning material's correctness, naturalness, clarity and educational quality while preserving the coursebook's structure, unit order, within-unit sequence and topics. Correct source errors and improve task wording, examples, options, explanations and hints within the taught outcomes and progression. Rewriting is permitted; copying an error merely to match the printed wording is not required.

Keep every adapted task linked to its book unit, page/activity and intended outcome, with the reason for any substantive adaptation. Supplementary material must support the same topic at the relevant point in the book; it must not introduce an untaught requirement or replace the course with a different syllabus. Preserve the coursebook's sequence where official programme topic numbering differs, retaining both identifiers for traceability. Skill IDs and reporting groups organise evidence; they do not set lesson order. Speaking activities keep their classroom-assessed disposition in the source map.

This authoring direction does not approve the proposed teacher-marking workload, final rubric/pass rules or runtime activation. Whole-bank comparison, content review, version history and release gates remain applicable.

## Evidence areas and task formats

The five reporting areas are a design organisation, not official outcome codes. Each task must be mapped to the reconciled programme before release. A response format is separate from the skill it measures: choosing an answer can test comprehension, but does not itself demonstrate extended writing.

| Area | Candidate formats | Evidence and grading boundary |
| --- | --- | --- |
| Vocabulary | Choice, matching, categorisation, word-bank and typed gaps | Meaning, contextual use or word formation must be explicit. A distractor supports an error hypothesis; one response does not diagnose a stable misconception. |
| Grammar | Choice, ordering, gap-fill, bounded sentence transformation and correction | Automatic checking only when the required form and acceptable alternatives can be specified and reviewed. |
| Reading | Passage-linked questions, matching headings, sequencing, short answers | Record whether the target is gist, detail, inference or another mapped outcome. Do not award writing credit merely because a reading answer is typed. |
| Listening | Recording-linked questions, matching, sequencing, short answers | Bind the exact recording and delivery conditions. Transcript-supported work has a separate evidence classification and cannot silently satisfy an audio-only requirement. |
| Writing — controlled | Word/sentence completion and bounded transformation | Measures the declared language target. Exact or rule-based scoring requires accepted variants and explicit treatment of spelling, case and punctuation. |
| Writing — extended | Description, summary, opinion paragraph and picture-based story | Requires criterion-level judgment. Submission or automated feedback alone is not an assessed writing outcome. |

## Current implementation and necessary additions

The inspected repository baseline is `71a641350f8aed01364d0c84cfb0e7802e1d06f1`. This is a source audit, not a fresh deployment-parity audit of every runtime bundle.

| Capability | Current evidence | Planned work |
| --- | --- | --- |
| Governed choice grading | `assessment-policy.mjs` accepts `single_choice`, `true_false` and `selected-response-v1`; the learner player supports the same two response types | Reuse through the exact governed release and policy. Do not introduce a new subject-specific bypass. |
| Text/image presentation | `learning-stimulus.mjs` renders text or image stimuli; present content fields and true/false labels include Armenian-specific assumptions | Introduce explicit content/instruction locale and compatible presentation contracts. Preserve existing Armenian releases and their fields through a versioned adapter. |
| Typed gaps and short responses | Not enabled by the governed policy/player | Add a typed response contract, authoring fields, private accepted answers, server grading and evidence projection. |
| Matching, categorisation and ordering | No native response capability in the inspected governed player | Add accessible keyboard/touch editors and stable semantic IDs. Display order must not become the answer identity. |
| Shared passages/recordings | No complete grouped-task/audio capability in the inspected path | Add versioned stimulus sets, linked task delivery, source/exposure tracking and audio lifecycle handling. |
| Extended-writing assessment | Initial audit gap; 16.1B.1 implementation now recorded separately | 16.1B.1 implements the submission/review flow; final task acceptance, English policy integration and release verification remain required. |

Adding an item-type label alone is insufficient: authoring, validation, protected storage, delivery, response editor, server grading, result projection and analytics must all support it. The legacy numeric adapter is not a route around governed capability checks.

## Reusable framework contract

Implement reusable response, stimulus and scoring capabilities under the [subject-neutral core invariant](subject-neutral-core.md). English-specific curriculum, language rules and mastery settings belong in versioned programme/release configuration. Other subjects and languages may use the same supported capabilities; shared code must not branch on an English course ID.

Each capability must declare its stable identifier/version, response shape, renderer/editor, validator, grader or review route, supported modes and compatibility constraints. This is a proposed contract, not a claim that the registry is already implemented.

For each task/session freeze the authorised programme, release, unit and skill mapping; item and stimulus versions; response/grading capability version; accepted-answer or rubric version; instruction/content language; assistance and delivery conditions; and applicable assessment policy. Clients submit responses, not scores, accepted-answer sets or rubric authority. Existing authorisation, answer-key protection, review/version history and tenant isolation remain mandatory.

Tasks may share a passage, picture or recording. They form a declared task set with grouping and exposure policy. Several answers about one familiar passage are dependent evidence and cannot automatically count as independent demonstrations of the same skill. Unseen assessment forms must account for shared source material and source familiarity, not only different question IDs. Programme skills remain distinct even when tasks share content.

## Scoring and review

### Deterministic responses

Use explicit accepted answers or bounded, versioned rules. Record the original response and the normalised comparison separately. Normalisation is task-specific: whitespace or typographic apostrophes may be irrelevant, while tense, spelling, word order, case or punctuation may be the target. Contractions and British/American variants are accepted only where the task's reviewed rules allow them. Do not apply universal fuzzy matching or silently remove meaningful differences.

Matching and multi-gap tasks need declared component weights and partial-credit rules. The number of response controls must not accidentally multiply skill credit. Cross-skill tasks need an explicit score-to-skill mapping; do not award the same evidence to several mastery counters without a reviewed rule.

Only genuinely bounded tasks use automatic final grading. An unexpected but potentially valid response in an open language task needs a review/unsupported disposition; it must not receive arbitrary semantic credit or a false automatic failure from an exact-string matcher. The first implementation should constrain tasks enough to keep this exception manageable.

### Extended writing

Keep controlled-writing results separate from extended-writing evidence. A proposed rubric covers task fulfilment, organisation/cohesion, vocabulary and grammatical control; spelling/punctuation enter only as the task specifies. Descriptors and expected length must come from the mapped outcome and taught work. These are proposed dimensions, not approved levels, weights or passing thresholds.

The framework must be able to store a submission, its task/rubric version, criterion-level judgments, feedback and the assessor identity/provenance. Recommended initial final-grading route: an authorised teacher applies the reviewed rubric. This is a recommendation, not a teacher workload commitment approved by the owner. Automated feedback may be a later optional aid; model-generated judgments must remain distinguishable from reviewed results.

The owner authorised implementing teacher-reviewed writing on 2026-10-20. Its reusable workspace is deployed and verified under 16.1B.1; the final English task/rubric remains separate. If it is deferred, retain the outcome as unassessed and make no full-writing or full-English-mastery claim. A framework that stores drafts/feedback can handle writing activity without pretending it has validated writing proficiency.

Before any automated writing grader can determine mastery, define an agreed rubric, validate judgments against reviewed samples, test valid linguistic variants and adversarial/unreliable responses, record model/rubric versions, handle uncertainty and re-review, and bound operating cost. No model service, recurring spend, automated high-stakes decision or AI-derived final grade is enabled by this plan.

### Result states and mastery

Proposed evidence states must distinguish not started, submitted, pending review, assessed, invalid/unavailable and outside platform scope. The existing session lifecycle does not already support all of these states; adding review states requires a separately validated lifecycle design. Pending review is neither zero nor a pass. Speaking's classroom disposition never creates a fabricated platform score.

Reading, listening, vocabulary/grammar and the two writing evidence categories must remain distinguishable in teacher and learner reporting. Weights, denominators, minimum evidence, partial credit, mastery thresholds and readiness rules need an English-specific, versioned contract before release. Existing Physics values, skill counts and item budgets are not automatic defaults. Maintain the platform's diagnostic-before-practice policy unless a separate explicit decision changes it; this proposal changes no live scoring or lifecycle rule.

## Language, hints and media

Assessed English passages, responses and language examples use natural, textbook-appropriate English. Shared platform navigation remains natural Armenian under existing policy. Instruction and hint language must be explicit for each task and mode. Supporting translation must not reveal the meaning being assessed; a hint must guide the process without supplying the target word, sentence or inference. Assessment modes retain their configured assistance restrictions.

Audio requires a source/version, transcript for authorised authoring/review, task linkage and declared listening conditions. Define replay/transcript availability before scoring; do not silently change those conditions mid-session. Media failure or interruption must not be recorded as an incorrect answer. Accessible alternative delivery must be labelled by the evidence it actually supports. No microphone or voice upload is required for listening.

## Implementation sequence and acceptance

| Stage | Concrete deliverable | Completion evidence |
| --- | --- | --- |
| 16.1A — sources and assessment design | Exact official-programme reconciliation, textbook/audio inventory, Unit 1 skill/evidence map, task-format shortlist, writing-review disposition and proposed assessment contract | Each intended outcome has suitable evidence or an explicit scope disposition. Final unit scope and scoring decisions are reviewed; question counts follow defensible coverage. Current status: 16.1A.2 source reconciliation and Unit 1 map prepared, five MP3s technically checked and a concrete contract/rubric drafted; teacher review is now authorised; final scoring/bank decisions remain open. |
| 16.1B — reusable capabilities | The minimal required typed/matching/ordering, task-set/audio and writing-submission/rubric components across authoring, runtime and reporting | Server-authoritative grading, answer protection, accepted-variant and partial-credit cases, review-state correctness, keyboard/mobile media behaviour and regression coverage. Long-writing final grading stays disabled until its route and rubric are accepted. |
| 16.1C — one complete English unit | Whole-bank-compared content, appropriate hints, approved source assets and a governed unit release | Content review and QA, representative assessment coverage, role/two-school/cross-subject isolation, exact deployment verification and authenticated desktop/mobile use. Existing Physics evidence/scoring must remain unchanged. Then use larger content batches for later units. |

No new tests or production calls are required for this documentation-only proposal. Implementation will need tests for the concrete risks above, including answer retries, resumption without lost typed work, unavailable audio, score leakage, pending-review handling and cross-subject isolation. Formal four-subject integration, specialist review and school-pilot gates are not closed by the framework.

## Decisions still open

- Final item-level evidence coverage against the reconciled 2026 standard, programme and proposed Unit 1 map.
- Audio audition, source protection, hosting/delivery conditions and production playback; the 16.1C.3 inventory has technical evidence for all 20 linked files (five reused checks, fifteen new). Nineteen originals fit existing limits and one needs a reviewed delivery derivative.
- The first release's final writing task/rubric and workload schedule; teacher review capability is authorised under 16.1B.1.
- Item/component counts, weights, partial credit, accepted alternatives and English mastery/readiness criteria.

These decisions are prerequisites to an English learner release. They do not block drafting the framework or the source/evidence map. See the [authoritative status register](project-status.md), [roadmap](sprint-roadmap.md) and [current API contract](api-contract.md).
