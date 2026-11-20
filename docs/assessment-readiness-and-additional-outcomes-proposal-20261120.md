# Assessment proposal: hinted answers and readiness; additional outcomes in Chapters I and II — 20 November 2026

**Status:** proposal only. Two decisions for John. Nothing is built, deployed or changed. The current formula, thresholds, three-attempt lifecycle and all recorded results stay as they are. Prepared by Claude Code after Codex's review of the [scoring concerns](teacher-workspace-design-review-20261113.md#appendix-d--class-row-and-student-panel-ready-passed-and-practice-evidence-19-november-2026).

**How the figures were checked.** "Code" means read in the repository source. "Computed" means calculated from the formula in `supabase/functions/_shared/mastery.ts` with a small script, not run through the live services. Pass rates use a simplified model: every question equally hard, answers independent, no learning between attempts. No real learner data was used; production has too few learners to measure either problem.

## Decision 1 — Should first-attempt readiness require some independent success?

### Facts

- **Two routes to "ready" (code).** A skill is ready for the first mastery-check attempt when **either**:
  - its release-wide score is at least 0.72 with at least 3 answers (score route); **or**
  - at least 4 of the last 5 answers are correct **without hints**, on at least 4 distinct questions (recovery route).

  Sources: `private.governed_skill_ready` in `supabase/migrations/20261006065508_sprint_15b12c_learning_runtime.sql` (newer chapters) and `skillComplete` in `supabase/functions/get-mastery-check-status/index.ts` (Physics 7 Chapter I).
- **Hints and the score route (code).** A correct answer after a hint adds 0.65 of the usual positive evidence (`mastery.ts`). The score route does not otherwise look at hints. The recovery route ignores hinted answers entirely.
- **Hinted answers alone can make a skill ready (computed):**

  | Difficulty | Hinted correct answers needed | Independent correct answers needed |
  |---|---|---|
  | 1 | 6 | 4 |
  | 2 | 5 | 4 |
  | 3 | 5 | 3 |
  | 4 | 5 | 3 |
  | 5 | 4 | 3 |

  A student can therefore reach the check having answered every question in that skill with help.
- **The check itself is hint-free (code).** A pass still requires independent answers. The risk is a premature first attempt, not an unearned pass. A failed attempt costs the student one of three attempts and a required chapter review.
- **Not known.** How often this happens. No real learner data exists to measure it.

### Options

| Option | What changes | For | Against |
|---|---|---|---|
| **A. No change** | Nothing | The hint-free check already protects the pass decision. No new rule before classroom evidence. | A hint-dependent student can be sent to the check and use up an attempt. The two routes treat hints differently. |
| **B. At least one independent correct answer** | The score route also requires at least one correct answer without a hint in that skill (same release). The recovery route is unchanged. | Smallest change that closes the "all with help" gap. No new threshold value; the formula and 0.72 stay. | Weak signal: one answer. Changes the readiness contract, so it needs a new model version and a consumer audit. |
| **C. Independent answers like the recovery route** | The score route also requires a minimum number of independent correct answers on distinct questions (for example the recovery route's own 4, or 2). | Stronger and consistent with the recovery route. | Introduces or reuses a number without classroom evidence. More practice before the check. |
| **D. Readiness from independent answers only** | Hinted answers count toward the displayed estimate but not toward readiness. | Clear separation of help and readiness. | Two scores per skill. Largest change, and new explanations for teachers and students. |

### Recommendation

**I recommend B.** It removes the specific gap Codex confirmed (readiness reached with no independent success) without changing the formula or any threshold, which Codex advised keeping until classroom evidence exists. A and B can both be revisited with the first cohort's data; C and D should wait for that evidence.

**What B would touch, if approved (not built):**
- the governed readiness function (a new SQL migration);
- the Chapter I readiness and practice-completion paths in `get-mastery-check-status`, `get-student-dashboard` and `start-learning-session`;
- a new versioned learning-model configuration declaring the extra condition, recorded through the [decision protocol](sprint-12a5-calibration-decision-protocol.md) as a rule change, not a calibration result;
- practice completion must use the same rule. Otherwise practice could say "done" while the check stays locked (the same kind of inconsistency fixed on 20 September, [12A.1](sprint-12-learning-model-calibration.md)).
- Existing sessions keep their original model version.
- My rough estimate: 1–2 days including tests. Not measured.

## Decision 2 — How should Chapters I and II report additional outcomes without letting them block a pass?

### Facts

- **Chapter I** (Physics 7, policy v1, active pilot; code and [11J reconciliation](sprint-11j-physics7-current-standard-reconciliation.md)):
  - 20 questions, 2 per skill for 10 skills. Pass: at least 16/20 and at least 1 correct in every skill. Readiness: all 10 skills.
  - Skill S07 «Չափման միավորների պարզ փոխարկումներ» maps only to the additional outcome «Լրացուցիչ 2(1)».
  - S06 maps to a mandatory outcome as well and is not affected.
- **Chapter II** (active provisional pilot; [decision packet](chapter-ii-assessment-decision-packet.md)):
  - 16 questions, 2 per skill for 8 skills (S02–S09). Pass: at least 13/16 and at least 1 correct in every skill. Readiness: all 8 skills.
  - S07 and S09 map to additional outcomes 2(1) and 2(2). S03 is a supporting decomposition of mandatory outcome 1(1).
  - **John chose this rule (Option B) on 6 October 2026**: the additional and supporting skills are consequential for readiness and passing. The packet's earlier draft (Option A) scored only the five directly mandatory skills (8/10). The packet says Option A needed a versioned scoring and readiness extension, which did not exist then.
- **Chapter III** (policy v2, approved 15 October): delivers all skills but passes on mandatory-outcome questions only (8/10, at least one correct in each required skill). Supporting and additional results are shown separately («Պարտադիր վերջնարդյունքներ», «Օժանդակ հմտություններ», «Լրացուցիչ վերջնարդյունքներ») and cannot rescue or fail a pass. [Contract](chapter-iii-assessment-contract-proposal.md), [policy v2](assessment-policy-v2.md).
- **The engine already supports this.** Policy v2 compares the exact scored fraction with the threshold. So with 80%: 15/18 = 83%, 10/12 = 83%, 8/10 = 80%.
- **Changing a pass rule is a change of learning criteria.** Under AGENTS.md it needs John's explicit decision. For Chapter II it would revise John's own 6 October decision.

### Options

**Chapter I**

| Option | Pass and readiness | Effect |
|---|---|---|
| **I-1. Keep** | 16/20, every skill, readiness all 10 | S07 can block a pass (0/2 on S07 fails regardless of the rest) and readiness |
| **I-2. Policy v2, S07 reported separately** | Same 20 questions delivered. Pass on 18 questions for nine skills: at least 15/18 (83%) and 1 correct in each. Readiness: nine skills. S07 shown as «Լրացուցիչ վերջնարդյունքներ». | S07 cannot block. **The bar for the other questions rises from 80% to 83%**, because 80% of 18 is not a whole number. |
| **I-3. Keep v1, drop only S07's per-skill minimum and readiness** | 16/20 over all 20; S07 no longer needs 1 correct; readiness nine skills | No new policy version. **S07 still counts in the 16/20**, so it can still turn a borderline result into a fail. |

**Chapter II**

| Option | Pass and readiness | Effect |
|---|---|---|
| **II-1. Keep (John's Option B)** | 13/16, every skill, readiness all 8 | S07 and S09 can block |
| **II-2. Policy v2, S07 and S09 reported separately** | Pass on 12 questions for six skills (S02–S06, S08; S03 stays, as in Option B): at least 10/12 (83%) and 1 correct in each. Readiness: six skills. | S07 and S09 cannot block. Keeps Option B's choice for the supporting skill S03. |
| **II-3. The packet's Option A** | Pass on 10 questions for the five directly mandatory skills: at least 8/10 and 1 correct in each. S03, S07 and S09 shown separately. Readiness: five skills. | Fully matches Chapter III. Also changes the supporting skill S03, which goes beyond this question. |

**Pass chance for one attempt (computed, simplified):**

| Student's accuracy on mandatory / additional questions | Ch I now | I-2 | Ch II now | II-2 | II-3 |
|---|---|---|---|---|---|
| 85% / 85% | 73% | 66% | 72% | 71% | 79% |
| 85% / 50% | 52% | 66% | 34% | 71% | 79% |
| 90% / 30% | 44% | 86% | 19% | 87% | 91% |
| 75% / 75% | 33% | 27% | 35% | 37% | 49% |

What the table shows (interpretation): with the current rules, weak results on additional outcomes cut the pass chance sharply even for strong mandatory performance (Chapter II: 19% at 90% mandatory accuracy). Options I-2 and II-2 remove that, but at 80% the effective bar for evenly able students rises slightly (Chapter I: 73% → 66%).

### Recommendation

**I recommend I-2 and II-2.** They answer exactly the question asked: additional outcomes stay visible and stop blocking. They use the existing, tested policy v2 instead of new engine work, keep the 80% threshold and the 16-question and 20-question forms, and keep John's 6 October choice on the supporting skill S03.

The cost is the slightly higher effective bar (83%) on the remaining questions.
- The alternative would be to lower the threshold to 77.8% (14/18, 9/12). That changes a threshold, which Codex advised against before classroom evidence.
- I would not use I-3: it leaves S07 able to fail a borderline student.
- II-3 is the right choice only if John also wants supporting skills (S03) outside the pass rule, as in Chapter III. That is a separate decision.

**Transition rules, if approved:**
- Recorded attempts and results are never re-scored.
- The new policy version applies to attempts started after activation.
- A student mid-lifecycle keeps their used attempts and any required review.
- A student who failed earlier only because of S07 or S09 is not retro-passed. Whether to offer them anything is a separate decision.

**What it would touch (not built):**
- new versioned policy configurations and bindings for Chapters I and II (production SQL writes, each needing John's approval);
- form re-binding without new questions;
- the result reporting groups on student, teacher and school pages (already used by Chapter III);
- the Chapter I and II pilot-read production QA suites (production QA stays paused unless John asks for a run).

## Not covered here

- **Supporting skills.** Chapter I's derived-supporting skills (S02, S04, S05) and Chapter II's S03. Chapter III leaves supporting skills outside the pass; Chapters I and II do not. That is a separate question.
- **Chapters IV–VI and English 7** were not checked for additional outcomes that block a pass.
- **Any change to the score formula, the 0.72 and 0.45 bands, the 80% threshold or the three-attempt lifecycle.** None is proposed.

## Decisions for John

1. Readiness and hints: **A**, **B** (recommended), **C** or **D**.
2. Chapter I: **I-1**, **I-2** (recommended) or **I-3**. Chapter II: **II-1**, **II-2** (recommended) or **II-3**.
3. If I-2 or II-2: accept the 83% effective bar on the remaining questions, or reopen the threshold.
