# Chapter II — assessment policy and content-expansion decision packet

**Prepared:** 2026-10-06  
**Status:** preparation complete; options and recommendation await John's explicit decision.  
**Scope:** Physics 7, Chapter II, candidate release `b83dc4a4-f5c2-486a-82a6-d7489e7e6407`. These are subject-aware proposals, never platform defaults.  
**Reviewed source:** `c3007f87c0568573cea8a0f56483915169a9562e`.  
**Evidence:** [fresh read-only inventory and compatibility analysis](evidence/chapter-ii-policy-preparation-20261006.json).

## Current readiness

The next actionable work after 15B.12E's isolated acceptance is Chapter II assessment-policy decisions and approved content expansion. The remaining live second-release learner-switching gate stays open. This packet does not start Sprint 16 course-integration acceptance or create a second authorized release.

Fresh production reads confirm 32 approved, published current questions, all with passing latest matching-version QA; one QA run retains recorded warnings. All eight template remediation guides are published (S02–S06 version 3, S07–S09 version 2). All 43 misconception definitions are active, with zero drafts. The guides were checked through the governed authoring catalogue; the legacy skill-fallback table is not their inventory.

Chapter II has zero pool memberships and zero learner session-item links. Its candidate release remains draft with zero blueprints, zero model/runtime bindings, and zero prospective assessment bindings. Chapter I remains pilot. Approval of individual questions and misconceptions does not complete the chapter's assessment, outcome/SME, content, pilot or release gates.

| Chapter II skill | Programme relationship | Proposed treatment in Option A |
|---|---|---|
| S02 — particle structure | Direct mandatory 1(1) | Counts toward passing and initial mastery readiness |
| S03 — atoms, molecules and elements | Supporting decomposition of 1(1) | Report separately; no independent pass or readiness gate |
| S04 — molecular sizes | Direct mandatory 1(2) | Counts toward passing and initial mastery readiness |
| S05 — particle motion | Direct mandatory 1(3) | Counts toward passing and initial mastery readiness |
| S06 — diffusion examples | Direct mandatory 1(4) | Counts toward passing and initial mastery readiness |
| S07 — diffusion across states | Direct additional 2(1) | Report separately; no pass or readiness gate |
| S08 — temperature and motion | Direct mandatory 1(5) | Counts toward passing and initial mastery readiness |
| S09 — thermometer principle | Direct additional 2(2) | Report separately; no pass or readiness gate |

S01 stays archived because it duplicated the existing cross-unit prerequisite. No new S01 family is proposed. The supporting treatment of S03 and the consequential treatment of additional outcomes are explicit policy choices requiring approval; their labels alone do not select a scoring rule.

## Decisions for John

**Recommended draft: Option A.** Deliver 16 diagnostic questions and 16 mastery questions, two per each of eight skills. Score mastery passing on the ten questions for the five directly mandatory skills: at least 8/10, plus at least one correct answer in each of those five skills. Report S03/S07/S09 independently. They cannot rescue a failed mandatory score or cause a mandatory pass to fail. Initial mastery readiness uses the same five required skills.

This recommendation is an inference from the governed outcome categories and the intended distinction between required and additional evidence. It is not an approved educational or psychometric rule. The 80% threshold, supporting-skill treatment, readiness scope, lengths and bank budget all require explicit approval.

| Option | Diagnostic | Mastery delivery and passing | Initial mastery readiness | Distinct bank budget | Engine compatibility |
|---|---|---|---|---:|---|
| **A — recommended draft** | 16, two per all eight skills | 16 delivered; mandatory 8/10 plus one correct in each of five mandatory skills; six supporting/additional answers reported separately | Five mandatory skills | **192** | Requires a prospective, versioned scoring/readiness extension |
| **B — all skills consequential** | 16, two per all eight skills | 16 delivered; at least 13/16 plus one correct in every one of eight skills | All eight skills | **192** | Fits v1's declared capabilities after ordinary policy/model/content binding |
| **C — mandatory-only mastery** | 16, two per all eight skills | 10 delivered, two per five mandatory skills; at least 8/10 plus one correct in each required skill | Five mandatory skills | **168** | Fits v1 if the mastery blueprint contains only those five skills |

Option B makes the additional outcomes and supporting decomposition compulsory for both readiness and passing; that consequence needs explicit approval. Option C retains their diagnostic/practice evidence but collects no protected mastery evidence for S03/S07/S09. Analytics must show that distinction instead of implying they passed an independent mastery check.

If John prefers 20 questions, the additional four slots need an outcome/evidence allocation before a revised budget can be prepared. Chapter I's 20-question assessments are unchanged by any Chapter II option.

### Why zero per-skill minima are insufficient

The deployed v1 SQL uses all answered assessment questions as the percentage denominator. Initial mastery readiness checks the entire blueprint skill scope. The v1 parser has no registered score-scope or readiness-scope fields and rejects undeclared fields.

For example, a student correctly answers all ten directly mandatory questions and none of the six supporting/additional questions. Their mandatory result is 100%, but v1 records 10/16, displayed as 63%, and fails an 80% overall threshold even if the other three per-skill minima are zero. Those same included skills still participate in first-attempt readiness. Merely changing `minimumCorrectBySkill` cannot implement Option A.

The fresh readback matches four deployed SQL function bodies to their latest repository definitions. An isolated probe executed the actual v1 JavaScript parser for Options B/C and rejection of undeclared fields. Arithmetic was calculated across all 65,536 binary answer patterns for the proposed 16 slots. This is compatibility and arithmetic analysis, not a real authenticated learner journey or a new policy binding.

## Proposed content expansion

| Bank | Option A/B inventory | Option C inventory | Existing questions proposed for allocation | New authoring under A/B | New authoring under C |
|---|---:|---:|---:|---:|---:|
| Practice and Chapter Review | 96: 12 per all eight skills | 96 | 32 | 64 | 64 |
| Diagnostic | 32: two disjoint 16-question forms | 32 | 0 | 32 | 32 |
| Protected mastery | 64: eight per all eight skills | 40: eight per five mandatory skills | 0 | 64 | 40 |
| **Total** | **192** | **168** | **32** | **160** | **136** |

Review shares the practice bank. It does not add a fourth content reserve. Six protected questions per assessed skill are the arithmetic minimum for three disjoint two-question attempts; eight leave two spare, provided all remain eligible and protected. Bank size does not establish equal difficulty, reliability or parallel-form equivalence. Twelve practice questions per skill do not guarantee two unseen eight-question sessions: review and prior exposure also consume coverage.

After a policy/budget decision, start with new practice evidence for S02. Plan reviewable batches by outcome and evidence value; four-item equivalents are budget arithmetic, not a universal family-size rule. Extend the existing observation-to-explanation evidence with new observations and particle representations. Continue S03–S09 in their documented outcome priorities. Each new family declares the prospective evidence-purpose profile, passes current-version QA and human review, and revalidates guide applicability and misconception mappings. Existing approvals are not rewritten merely to make their profiles uniform.

Diagnostic/mastery banks require separate questions and stimuli. Do not repurpose the already-practised 32 questions as protected assessment items or create cosmetic variants that disclose the same protected reasoning/answer. Check item-ID and semantic/stimulus exposure separation.

Relevant illustrations from the applicable source textbook are required platform-wide wherever they support or are necessary for the task. Each authored version must record edition/page/figure, preserve scientific meaning and labels, provide Armenian alternative text and pass desktop/mobile and answer-disclosure checks. No specific figure or crop has been selected by this preparation packet. Protected stimulus reuse needs exposure review. [Illustration policy](question-illustration-policy.md) · [Prospective evidence-purpose contract](assessment-evidence-blueprint-policy.md).

## Runtime and dashboard work after a decision

For Option A, implement a registered prospective extension that explicitly declares score and readiness scope. The precise schema/version/capability names are to be designed and approved in that implementation slice; the analysis does not register a new capability.

The extension must validate that required skills belong to the exact release/unit and delivered allocation; calculate the required score and per-skill gates on the declared scope; keep reporting evidence for every delivered skill; preserve immutable original contracts for old sessions; and distinguish required readiness from optional evidence. Student instructions, progress and Teacher/School Admin/Master Admin analytics must display the correct denominator and outcome category without collapsing evidence types.

Audit the shared parser, authoritative policy binding, readiness, answer finalization, session results, status/instructions and every affected dashboard/analytics consumer. Add isolated multi-subject, multi-unit and two-school acceptance for both v1 compatibility and the new capability; run native Chromium and real PostgreSQL race checks where those behaviours change. Deploy every affected importing Edge bundle and verify readback. No subject, grade or skill-code branch belongs in the shared core. Options B/C need ordinary governed configuration and content binding, not an assumed permission to launch.

All options preserve the approved baseline and retry lifecycle: one completed chapter diagnostic regardless of score, practice/review blocked until it is complete, no second baseline; at most three mastery attempts, qualifying review after failures 1 and 2, optional review after passing and available review after final failure, and no fourth attempt. Existing registered practice/hint/review parameters are a comparison for a prospective chapter model, not permission to copy a model across releases. Any proposed adoption of readiness thresholds (0.72 with three evidence records or recent recovery using four unique items and four independent correct answers in the last five), eight-question practice, 12-question review or 0.65 positive hinted-evidence weighting must be explicit in the new approved versioned model and compatible lifecycle; this packet does not approve those parameters for Chapter II.

## Release sequence and remaining gates

1. John decides the assessment option, thresholds/readiness, length and content budget. Record the exact subject-aware decision separately from this proposal.
2. Implement and verify any required prospective capability; freeze an approved Chapter II model/policy only through its normal governance.
3. Author and review the approved expansion with illustrations, misconception mappings, guide applicability and protected-bank separation.
4. Construct governed pools, diagnostic forms and immutable blueprints; validate sufficient eligible content and exact model/lifecycle bindings.
5. Refresh actual gate inventories without erasing historical notes. Obtain the required outcome/SME, assessment, full content, pilot and release dispositions. All four currently pending candidate gates remain pending in this packet.
6. Once a second release is authorized and deployed, run the authenticated governed learner-switching acceptance remaining in 15B.12E and Sprint 14.

The preparation slice is complete when the inventory, compatibility analysis and options are durable and the roadmap accurately records the decision prerequisite. No production content, assessment rule, model, pool, blueprint, user, learner evidence or release gate is changed. Sprint 16 course integration and the four-subject school MVP retain their separate entry gates.
