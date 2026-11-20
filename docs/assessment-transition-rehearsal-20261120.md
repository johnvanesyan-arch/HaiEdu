# Assessment rule change: isolated transition rehearsal — 20 November 2026

**Status:** isolated rehearsal only, with synthetic records in an in-memory PostgreSQL (PGlite) that rebuilds the governed schema from the real migration functions. No production read or write, no deployment, no product code change. Decisions under test: [proposal](assessment-readiness-and-additional-outcomes-proposal-20261120.md), "Decisions recorded".

| Phase | Decision | State |
|---|---|---|
| 1 | II-2 (Chapter II, versioned rules) | **Rehearsed; results below** |
| 2 | I-2 (Chapter I, older path) | Not started |
| 3 | B (readiness needs one independent correct answer), testable on its own | Not started |

The assessment code on `main` (`f7f39df`) has not changed since this branch split: `main` added failure reporting, BF-16 counter maintenance and staging tooling, but no assessment migration or function. The rehearsal therefore tests the same assessment code production runs.

## Phase 1 — Chapter II, II-2

**Test:** `tests/assessment-transition-chapter-ii.test.mjs` (5 tests).

**Setup.**
- **Synthetic Chapter II shape:** eight skills (S02–S09), three disjoint 16-question forms, two questions per skill.
- **Today's rule** as the existing v1 mastery blueprint: 80% with the rounded score (so at least 13/16), at least one correct answer in every skill, readiness on all eight skills.
- **II-2** as a second mastery blueprint in the **same curriculum release and unit**, reusing the same pool and forms. It uses policy v2:
  - delivered skills: all eight;
  - scored and readiness skills: S02, S03, S04, S05, S06, S08;
  - 80% on the exact fraction (10/12);
  - at least one correct answer in each scored skill;
  - reporting groups «Պարտադիր վերջնարդյունքներ», «Օժանդակ հմտություններ» (S03, scored) and «Լրացուցիչ վերջնարդյունքներ» (S07, S09, not scored).
- The shared JavaScript policy reader accepts the II-2 policy.

**Results (all pass):**

| Case | What was shown |
|---|---|
| New student | Ready on the six required skills only: refused by today's rule (`skills_not_ready`), admitted by II-2. With S07 and S09 at 0/4: **10/12 passes**; overall 10/16 is reported but does not decide. Groups: mandatory 8/10 and supporting 2/2 decide the pass; additional 0/4 does not. No further attempt after the pass (`mastery_check_not_allowed`). |
| Pass boundary | 9/12 fails even with S07 and S09 perfect. 10/12 with a required skill (S06) at 0/2 fails. |
| Check already open | Started under today's rule; II-2 activated mid-check. Starting again returns **the same open check** (resumed, still bound to the old blueprint); no second check is created. It finishes **under today's rule**: the same answers that pass II-2 fail (10/16, S07 and S09 at zero), with the v1 result shape. The student then owes a required review. |
| Between attempts | Attempt 1 failed under today's rule. After activation: attempt 2 is refused until the required review is done. After the review, attempt 2 starts under II-2 as **attempt number 2**, on a **different form**, with **no question from attempt 1**. It fails (6/12): attempts used 2, review required. Attempt 3, after a second review, uses the third form with no question from attempts 1–2, passes under II-2, and leaves 3 attempts used. |
| Attempt limit | Three failed attempts across the change (one old, two new) give the final state with 3 attempts used. With a fourth unused form available, a further start is refused by the limit itself (`mastery_check_not_allowed`). |

**Observations (no change made):**
1. **The refusal reason when all forms are used.** With exactly three forms and all three used, a further start is refused as `governed_mastery_forms_exhausted`, because the form check runs before the attempt-limit check. Today's system without any rule change gives the same reason (checked in the same fixture). The student is refused either way.
2. **Mixed history.** A student's history can now hold a v1 result (no groups) and later v2 results (with groups). The shared result renderer already handles both shapes; this phase did not exercise the teacher or student pages.

**Not yet rehearsed in Phase 1:**
- **Newest-version selection.** Which blueprint a new session gets is decided in the server layer (`governed-learning-runtime.mjs`: highest `version_number` among published pilot/production blueprints for the release, unit and mode; a tie is refused). The SQL rehearsal launches each blueprint explicitly. The PGlite fixture has no `version_number` or `published_at` columns, so the selection is verified by reading the code only. The local staging stack on `main` (BF-21) may be the right place to exercise it end to end.
- **Student and teacher pages** after the change (readiness display, mixed-history rendering).
- **The production procedure itself.** Inserting and publishing the new blueprint, binding it, form-selection binding, and release-governance records. Each is a production write needing John's approval.

**Rounding difference to note.** Today's v1 rule compares the rounded percentage (13/16 = 81.25% → 81). Policy v2 compares the exact fraction. At 10/12 (83.3%) both give the same answer; the difference matters only at boundaries such as 80% of 18 (Phase 2).

**Commands (local):**
```bash
node --test tests/assessment-transition-chapter-ii.test.mjs
```
```bash
node --test tests/assessment-v2.test.mjs tests/assessment-transition-chapter-ii.test.mjs tests/governed-learning-runtime.test.mjs
```
Result on 20 November: 50 of 50 pass. The full `npm test` was not run for this phase; only a test file was added.
