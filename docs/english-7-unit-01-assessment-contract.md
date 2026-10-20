# English 7 Unit 1 — proposed assessment contract

**Status: concrete design draft, 16.1A.2, 2026-10-20; not an active policy.** This specifies response handling and a reviewable writing option for the [Unit 1 map](english-7-unit-01-preparation.md). John subsequently authorised implementation of the teacher-review route under [16.1B.1](written-work-workspaces.md). This draft still does not set the final task/rubric, unit mastery thresholds or English release.

## Recommended first-unit scope

Reading, listening, vocabulary and grammar use automatically scored tasks where a reviewed key is sufficiently bounded. Include controlled writing within the language target it actually demonstrates. For extended writing, **recommend one teacher-reviewed 80–100-word response per student for the unit**, combining S13 description with S14 written communication where the prompt genuinely elicits both. The teacher records separate evidence against each target, but this remains one response, not two independent samples.

This keeps the programme's real writing outcome and limits the initial review queue. The owner authorised the teacher-review capability on 2026-10-20; no teacher assignment or deadline is created by that implementation decision. If teacher-reviewed writing is not selected, explicitly decide between unassessed writing practice and a separately validated automated grading route. Automatic multiple choice cannot stand in for the written outcome.

## Response capabilities

This table records the proposed English contract. Teacher-marked writing is deployed under 16.1B.1. Bounded typed fields have an implemented [16.1B.2 capability/API contract](typed-fields-capability.md), deployed with exact source and production read verification. Matching/ordering are deployed under [16.1B.3](matching-ordering-capability.md); protected replayable audio is deployed and verified under [16.1B.4](protected-audio-capability.md). Shared task sets are deployed and verified under [16.1B.5](shared-task-sets-capability.md); final English listening conditions remain proposals. Use the existing governed choices through their current contract. New response/scoring capabilities require a versioned policy and compatible authoring, validation, delivery, grading and reporting before activation.

| Capability | Student response | Private grading information | Proposed score handling |
| --- | --- | --- | --- |
| Choice | Stable option ID | Correct option ID | Existing 0/1 behaviour |
| Bounded typed fields | Map of stable field IDs to strings | Accepted alternatives and explicit normalisation per field | Each required field 0/1; report correct/required and item-normalised score |
| Matching/categorisation | Source ID to target/category ID | Correct mapping; declared reuse/cardinality rules | Each required source mapping 0/1; correct/required, never bonus credit for surplus pairs |
| Ordering | Ordered stable segment IDs | Reviewed accepted sequences | Exact sequence 0/1 initially; no undeclared partial-credit algorithm |
| Extended text | Plain text and immutable submitted version | Rubric version, permitted assessor scope, outcome mapping | Pending review, then criterion scores; no automatic final grade |

Word-bank gaps reuse bounded fields with a declared option set. Categorisation can allow several sources in the same target category; matching may require unique targets. These are explicit task rules, not assumptions inferred from the UI.

A multi-part item's score is `sum(correct required components) / count(required components)` for the proposed equal-weight form. Its item weight remains explicit and is not multiplied by the number of controls. Other weights require their own reviewed configuration. Keep component evidence, item score and mastery evidence distinct. Proposed fractional scores must not be fed into the existing binary policy without a compatible policy/result contract.

An intentionally submitted blank required field receives zero for that component. A task never delivered because of an audio failure is invalid/unavailable, not a wrong answer. Reject malformed or extra IDs without accepting a partial forged response. Unknown capability versions fail closed with a usable error; no silent conversion to single choice.

## Accepted-answer rules

Store original input and the normalised comparison. Only apply transformations declared by the task: trim outer whitespace; optionally collapse internal spaces or normalise typographic apostrophes; case sensitivity and punctuation remain target-specific. Do not universally ignore articles, spelling, tense, word order or contractions. Accepted British/American forms and contractions must be explicit where relevant.

Use constrained fields where valid alternatives are enumerable. For example, an instruction-reporting task can supply the reporting clause and ask for its missing infinitive phrase; an unrestricted whole-sentence response may have too many valid paraphrases for exact-string grading. Open semantic answers use the review route. A response outside a supposedly closed key that exposes a valid alternative becomes a content-quality issue with governed correction/regrading, not a client-side fuzzy match.

Illustrative engineering checks, not authored assessment questions: with trim enabled, ` blue ` can match `blue`; `bl ue` must not. `more slowly` must not match `most slowly`. Blank input must not accidentally mean 'zero article': use an explicit zero-article control or token. These checks protect the intended language target.

## Passage/audio task sets and assistance

Bind a task set to one immutable passage/recording version, with source-family and exposure identifiers. Linked questions share the stimulus but keep declared skill mappings. Allocation must protect the entire source family across Practice, Diagnostic and Mastery, not just item IDs. A learner who has read a transcript has encountered the source even if the later item plays audio.

Proposed listening conditions for the first pilot: Practice permits replay and reveals the transcript only through an explicitly recorded support action; Diagnostic/Mastery allow two complete plays at normal speed, questions visible, no transcript or translation. These are recommendations awaiting the assessment contract's acceptance. The runtime must distinguish a failed start from a completed play and declare the technical-interruption/resumption rule before use; otherwise restart with equivalent unexposed material without charging a failed attempt. Browser seeking, playback rate, refresh and retry must not silently alter recorded conditions.

The 16.1B.4 infrastructure permits replayable Practice/Chapter Review only, with transcript reveal disabled. It rejects assessment audio rather than implementing these proposed two-play conditions. It preserves source-family identity; cross-task-set allocation/exposure protection is deployed and verified under 16.1B.5. The learner still sees one question at a time and completes playback per question; set-wide playback accounting and simultaneous question display have no accepted contract. No English recording or item is activated.

Every response records actual assistance. Transcript-supported completion may support reading/language practice; it cannot satisfy an audio-only listening target. Hints guide the process without exposing the target word, answer-bearing phrase or required inference. Content and task language are explicit; shared Armenian navigation is retained.

## Writing task and draft rubric

**Proposed task shape:** a new classmate asks about your preferred clothing style. Write an **80–100-word note** describing the clothes/style you prefer, giving reasons, and responding politely to the classmate's stated suggestion. Supply the short incoming note in the prompt. Allow an imagined preference so personal disclosure is unnecessary. Do not require the student to share or send the note to anyone.

The prompt combines the programme's descriptive outcome and the current standard's written-interaction outcome. It is a task specification, not an approved final question. A source-linked model and independent practice prompt must be created and reviewed without exposing the final response. Summary and picture-story writing remain useful extension practice, not replacements for this outcome.

Proposed rubric: four criteria, each **0–3**, total **0–12**. These descriptors and weights are design choices, not official ministry scoring rules. Criterion-level evidence is more informative than the total; no passing score is activated here.

| Criterion | 3 — secure for this task | 2 — mostly meets it | 1 — limited evidence | 0 — no assessable evidence for the criterion |
| --- | --- | --- | --- | --- |
| Task and audience | Describes the preferred style, supplies relevant details/reasons and responds to the classmate; fulfils the 80–100-word brief | Main purpose and audience clear, with a minor omission or length deviation | Partly addresses the purpose; important content or response to the audience missing | Does not address the task or supplies no relevant assessable content |
| Organisation | Ideas form a coherent note with clear order and suitable basic links | Generally easy to follow, with occasional abrupt links or repetition | Mainly disconnected ideas; reader must reconstruct connections | No assessable connection between ideas |
| Vocabulary | Suitable clothing/style vocabulary expresses the intended ideas clearly | Generally adequate; occasional inappropriate choices do not obstruct the main message | Restricted/repetitive or inaccurate choices often make meaning unclear | Insufficient meaningful vocabulary to communicate the task |
| Grammar and written clarity | Taught structures communicate clearly; occasional errors do not obstruct meaning | Meaning remains generally clear despite recurring grammar/spelling/punctuation errors | Frequent errors obscure parts of the message | The response cannot communicate the intended message sufficiently to judge this criterion |

Word count gives transparent guidance and a review flag, not an automatic overall failure or bonus for verbosity. Explain the configured counting convention, including contractions and hyphenated words. Missing, still-draft, technically failed and pending-review submissions are states, not rubric zeros. A zero is an assessor's criterion judgment on a valid submitted response, with a reason where needed. Do not score wealth, preferred style, agreement with school uniforms or personal disclosure.

## Review workflow and evidence

1. The student edits an autosaved draft. Submission freezes the task, response, rubric and assistance versions.
2. The item enters `pending_review`; automatic tasks can show their own completed results. Pending writing is neither a pass nor zero.
3. An authorised teacher assigned to the student's actual school/year/class/subject evaluates the response. Content Reviewer approval of an item is a different permission from grading a student's work.
4. The teacher records criterion scores and concise feedback. Server-side validation checks authority, rubric IDs/ranges, submission version and current state.
5. Revisions and regrades preserve previous evidence and identify what they supersede. Offboarding/reassignment changes review authority without losing the submission/history. No cross-class or cross-school read is enabled for convenience.

The initial UI should show separate vocabulary, grammar, reading, listening and writing evidence. Within writing, distinguish controlled language production from reviewed extended text. Speaking is labelled classroom-assessed and has no platform denominator. A teacher's assessment of a sample is not an independently calibrated writing-proficiency certification.

## Bank and mastery boundaries

Before release, review the bank's actual independent coverage and then approve Diagnostic/Mastery item counts, skill minima, weighting, attempt limits and readiness thresholds. Do not copy Physics's 80%, per-skill counts or item budgets merely because those values already exist in code. The existing diagnostic-before-practice rule remains in force; the English diagnostic must be executable and able to complete without being indefinitely blocked by a teacher queue. Recommended initial route: automatic diagnostic plus a separately tracked writing baseline, with its non-gating status explicit.

No single 'English mastered' badge is proposed while a required writing/listening outcome is unassessed. A future unit decision must name its declared assessed scope. Pending review must remain distinguishable from failed assessment, while unrelated completed practice results remain usable. Familiar-source reading/listening evidence is labelled honestly and never presented as an unseen independent form.

## Implementation and verification boundary

First implement the reusable contracts and editors needed by the mapped tasks; the owner-authorised writing queue is deployed and verified under 16.1B.1. Use the existing versioned subject extension boundary and server authority. Shared APIs must carry explicit locale, response type/version, stimulus/task-set version and result/review state without branching on an English ID. Preserve the legacy Armenian content adapter and all active Physics policies/evidence.

Required implementation checks: accepted/rejected linguistic variants; stable IDs under option shuffling; mapping cardinality; partial-credit arithmetic; duplicate submission/resume without lost text; protected keys; unavailable audio and replay limits; transcript assistance; teacher authorization/reassignment/revocation; pending-review and regrade projection; two-school and cross-subject isolation; authenticated desktop/mobile operation on the exact deployed source. Existing production-release gates remain applicable. No runtime test suite is newly written or run locally for this design document.

**Owner decision recorded:** implement student writing submissions and teacher marking (2026-10-20). The final Unit 1 task, rubric and workload schedule still need content/release acceptance. The remaining automatic-capability implementation and source preparation can proceed independently. Final content and scoring-policy acceptance still precede English learner activation.
