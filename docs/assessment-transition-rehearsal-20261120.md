# Assessment rule change: isolated transition rehearsal — 20 November 2026

**Status:** isolated rehearsal only, with synthetic records in an in-memory PostgreSQL (PGlite) that rebuilds the governed schema from the real migration functions. No production read or write, no deployment, no product code change. Decisions under test: [proposal](assessment-readiness-and-additional-outcomes-proposal-20261120.md), "Decisions recorded".

| Phase | Decision | State |
|---|---|---|
| 1 | II-2 (Chapter II, versioned rules), database level | **Rehearsed; results below** (revised the same day after Codex's review) |
| 1b | II-2 through the real app in disposable local staging | **Passed in Codex's local staging** (reported 20 November; see "Phase 1b"). Blocked in this container. |
| 2 | I-2 (Chapter I, older path) | Option A scoped for approval: [build plan](chapter-i-i2-option-a-plan-20261120.md); not built |
| 3 | B (readiness needs one independent correct answer), testable on its own | Not started |

The assessment code on `main` (`f7f39df`) has not changed since this branch split: `main` added failure reporting, BF-16 counter maintenance and staging tooling, but no assessment migration or function. The rehearsal therefore tests the same assessment code production runs.

## Phase 1 — Chapter II, II-2

**Test:** `tests/assessment-transition-chapter-ii.test.mjs` (7 tests).

**Setup.**
- **Synthetic Chapter II shape:** eight skills (S02–S09), three disjoint 16-question forms, two questions per skill.
- **Today's rule** as the existing v1 mastery blueprint: 80% with the rounded score (so at least 13/16), at least one correct answer in every skill, readiness on all eight skills.
- **II-2**, introduced the way the database requires a release to do it (revised after Codex found that the first version edited a learning-model record the real database locks):
  1. a **new learning-model version** with identical learning settings, whose contracts add the new policies; the existing model record is unchanged (asserted);
  2. **new versions of all four Chapter II blueprints** in the **same curriculum release and unit**: diagnostic, practice and chapter review with unchanged rules (only the model id and policy version change), and the mastery check with II-2, reusing the same pool and forms;
  3. each bound with the release binding function `service_bind_assessment_policy`;
  4. the release unit's **runtime binding switched** to the new model.

  The mastery policy uses v2:
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
| Review open at activation | A required review started before the change can be finished afterwards, satisfies the requirement, and the retry starts under II-2 as attempt 2 with no question from attempt 1. |
| Procedure | After the runtime switch, an **old-version** blueprint cannot start a new session (`assessment_policy_runtime_incompatible`): a student owing a review could not start it unless the review blueprint is re-versioned too. The new versions work. The diagnostic completed before the change still counts (no second diagnostic; practice allowed). |

**What the procedure findings mean for a real release (interpretation):**
- A rule change on one mode of a chapter is **a release of the whole chapter unit**: new model version, four new blueprint versions, four bindings and the runtime switch. If they are not activated together, students can be blocked: for example, a required review that cannot start.
- Sessions already open keep their original binding and finish normally, because the runtime check runs only when a session is created.
- The whole set should be prepared inactive, rehearsed, and switched in one transaction. That production step needs John's approval.

**Observations (no change made):**
1. **The refusal reason when all forms are used.** With exactly three forms and all three used, a further start is refused as `governed_mastery_forms_exhausted`, because the form check runs before the attempt-limit check. Today's system without any rule change gives the same reason (checked in the same fixture). The student is refused either way.
2. **Mixed history.** A student's history can now hold a v1 result (no groups) and later v2 results (with groups). The shared result renderer already handles both shapes; this phase did not exercise the teacher or student pages.

**Not yet rehearsed in Phase 1 (moved to Phase 1b):**
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

## Phase 1b — through the real app in local staging (blocked)

**Asked:** run II-2 in the disposable local staging setup from `main` (BF-21): the normal student page selects II-2 by itself; an open check finishes under its original rule; a retry keeps its required review and gets an unseen form; the student and teacher pages show the old 13/16 and new 10/12 results with the additional outcomes separate; save the tested publication steps.

**What was done (20 November):**
- A clean working copy of `main` (`f7f39df`) was prepared in the session's scratchpad. Its JavaScript and pinned Python test requirements are installed.
- A Docker daemon was started in this container.
- Network:
  - John approved a personal environment "HaiEdu" for this session. Its allowed hosts are Amazon's public-registry CDN (`d2glxqk2uabbnd.cloudfront.net`), `dl-cdn.alpinelinux.org` and `codeload.github.com`.
  - PostgREST and storage downloaded from Amazon's registry.
  - The edge runtime was refused there with "Data limit exceeded", Amazon's anonymous-download quota. The identical image (same content digest, `sha256:362e9177…`) was taken from Docker Hub instead and labelled locally with the name the stack expects. This was a content-identical substitute for a quota refusal, not a bypass of the network policy.
  - GoTrue and Mailpit came from Docker Hub.
- The staging database image (PostgreSQL 17.6 with pg_cron 1.6.7) cannot be built by the fixture's own command here, because containers have no route out. It was built by hand through the proxy, as the proxy README describes (`--network host` with explicit proxy settings).

**Blocker.** That build downloads the pg_cron source from `codeload.github.com/citusdata/pg_cron`. This session's GitHub access allows only attached repositories, and the request to attach `citusdata/pg_cron` (read-only) was refused by the session's permission check. The source was **not** fetched from any other place, because that would get around the refusal. Until John allows it (or chooses another route), the staging stack cannot start and Phase 1b has not run. Nothing on production was touched.

**Prepared for Phase 1b.** The database-level rehearsal above now follows the procedure the staging journey must reproduce: new model version, four new blueprint versions, bindings and runtime switch.

### Phase 1b result — Codex's local staging (recorded 20 November)

**Source and status.** Reported by Codex through John; recorded here as local staging evidence. The detailed record is in Codex's **local, unpushed** commit `af36e0a4` on `codex/chapter-ii-ii2-rehearsal`. Claude Code has not seen that commit or its evidence files, so this summary is the handoff until it is pushed. Fictional students only; temporary services cleaned up; production and the hosted test project untouched; production QA stays paused.

**Reported results:**
- **Open check.** A student with an open check resumed the same check and received 10/16 under the old rule. The second attempt stayed locked until the required review was completed.
- **Retry.** The retry automatically picked II-2, used a form with no repeated questions, and passed with 10/12 on the required skills; the 0/4 on additional skills appeared separately.
- **New student.** Ready on only the six required skills, they could start after the switch using their existing diagnostic.
- **Pages.** The student and teacher pages showed both the old and new score formats correctly.
- **Follow-up:**
  - An open practice session resumed at question five and finished under its original rule.
  - The school admin page showed the old and new mastery results separately, with the additional skills separate under II-2.
  - All four assessment versions switched in one database transaction.
  - The updated Chapter II QA check passed locally.
- **Confirmed side effect.** Teacher evidence splits at the switch.
  - The first practice answer after the switch created a separate estimate with too little evidence to classify. After five correct answers that new estimate turned green.
  - The older red estimate stayed red, and the student still counted as needing support.
  - The student's own page kept one skill record with answers from both versions.
  - Practice was covered by the browser test. Review was checked by reading the shared grouping code, not run.

**Open Chapter II decision (John):** whether to accept the older red estimate continuing to count towards support during the pilot. Codex recommends keeping estimates separate and explaining the behaviour to teachers. No release decision has been made.

## Chapter I — read-only investigation (decision I-2)

**Facts (code and records):**
- Chapter I runs on the registered **legacy adapter** `legacy-physics7-u01-v1`, not on the versioned (governed) path. Its pass rule is hard-coded in `supabase/functions/submit-mastery-answer/index.ts`:
  - `PASS_PERCENT = 80` on the rounded percentage of all answered questions;
  - `MIN_CORRECT_PER_SKILL = 1` for every skill delivered.
- Its readiness rule is hard-coded in `get-mastery-check-status`, `start-learning-session` and `get-student-dashboard` and covers all ten skills. The adapter has no policy versions, bindings or reporting groups.
- **Chapter I's checks contain numeric and quantity questions** ([BF-09 record](qa/numeric-answer-format.md): "The active legacy Physics 7 Chapter I adapter serves numeric and quantity items in Practice, Chapter Review, Diagnostic and Mastery Check").
- The versioned path grades single choice and true/false (policy v1 and v2), and typed fields, matching and ordering (v3), but **not numeric or quantity** (`assessment-policy.mjs`; [API contract](api-contract.md)).
- The chapter state (attempts used, required reviews) is shared by both paths and keyed by student, release and unit.

**Options for using versioned scoring in Chapter I, from smallest to largest:**

| Option | What it takes | Preserves results, open checks, retries? | Risks |
|---|---|---|---|
| **A. Rule version stamped inside the legacy adapter** | When a check **starts** after activation, record a rule version (for example `phy7-u01-i2-v1`) in the session. When a check **finishes**, score by the recorded version: unstamped checks keep today's rule; stamped checks pass on S01–S06 and S08–S10 (15/18, at least one correct in each) and save S07 separately in the same result format Chapter III uses, so the existing pages show groups. Readiness after activation excludes S07. | Yes, by construction: history is never recomputed, open checks are unstamped, and the shared chapter state is untouched. Must be shown in the same three cases as Chapter II. | Adds Chapter I-specific logic to an adapter meant to be retired. The "version" is a stamp, not a governed binding, so it has no immutable policy record unless one is added. Several Edge Functions need coordinated deployment. |
| **B. Move Chapter I to the versioned path** | A numeric and quantity response capability on the versioned path (a shared core change), Chapter I blueprints, forms and bindings in its existing release, the student pages switched from the legacy pages, and legacy open sessions left to finish on the adapter. | Possible: the chapter state is shared. A larger transition surface. | The largest change: core grading, every Chapter I page, and both learning paths in parallel during the transition. |
| **C. Defer I-2** | Keep today's Chapter I rule until B exists. | Nothing changes. | S07 keeps blocking passes in the meantime. |

**Assessment (interpretation).**
- **A is the smallest safe way.** It changes only the Chapter I adapter, and the stamp protects open checks and history by construction.
- It should be built only after Phase 1b has passed. Phase 1b exercises the same pages and result display that A would rely on.
- B is the right long-term direction, but it is a separate core decision.

**Readiness rule B** stays separate: nothing in this rehearsal changes readiness. Chapter II's readiness changes here only because II-2 narrows the readiness skill set.


## Chapter I option A — isolated build and tests (§6A), 20 November 2026

**Status:** built and tested in isolation only, on branch `claude/ecstatic-goodall-fpmil4`. Nothing is deployed. Production is unchanged. No rule was activated anywhere except inside in-memory test databases. Plan: [option A, revision 3](chapter-i-i2-option-a-plan-20261120.md).

### What was built
- **Registry and switch** — `supabase/migrations/20261120120000_legacy_mastery_rule_registry.sql`:
  - immutable rule versions with a database-computed fingerprint;
  - an append-only activation log, seeded with today's rule `phy7-u01-v1` only;
  - service-only reads and a service-only switch, `service_activate_legacy_mastery_rule(unit, version, actor, reason)`. Rollback is a new row naming the older version.
- **Today's Home and Course dashboard** — `supabase/migrations/20261120120100_legacy_mastery_rule_dashboard.sql` redefines `service_student_learning_dashboard`. For a registered legacy unit with an active registry rule:
  - each skill's `requiredForReadiness` comes from that rule;
  - the per-skill minimum lists only the scored skills;
  - the mastery spec names the rule version.
  Every other unit is unchanged.
- **Shared rules module** — `supabase/functions/_shared/legacy-mastery-rules.mjs`:
  - validates a criteria object;
  - computes readiness, the pass decision, the saved result record (the existing `haiedu-assessment-result-v2` shape) and review targets.
  It holds no skill codes or wording; those live in the registry rows.
- **Edge functions:**
  - `get-mastery-check-status`: readiness from the active rule; an open check reports its saved rule; the latest check returns its saved result record and rule version.
  - `start-learning-session`: readiness from the active rule; each new check saves its version, criteria and fingerprint.
  - `submit-mastery-answer`: scores by the saved criteria (default `phy7-u01-v1`); stores the raw percentage the database requires; saves the result record for I-2.
  - `get-student-dashboard` (older pages): adds `requiredForReadiness`, `progress.requiredCompleted` and `progress.requiredTotal`, and `masteryRule`.
  - `get-teacher-dashboard` and `get-teacher-student`: return the saved result record and rule version.
  - `school-performance-analytics.ts`: results whose saved record names a rule version get their own group, with `ruleVersion` in the group data.
- **Older Chapter I pages:**
  - `mastery`: rule text from the server and the saved pass score. The result shows the two groups. S07's per-skill badge is neutral for I-2 results.
  - `assessment`, `physics-7`, `progress` and `app.js`: the ready text comes from the server; counts use the required skills; S07 is noted «Չի սահմանափակում ստուգարքի հասանելիությունը» on the topics page.
  - Today's wording stays wherever the server sends none (every `phy7-u01-v1` case).
- **Trigger lists:** the Chapter III–VI pilot-read workflows now list the new shared module (`check-browser-qa-triggers` passes).

### Departures from plan revision 3 (for John)
1. **Today's Home and Course read a different dashboard than the plan named.** Home (`multi-subject-home.js`) and Course (`course-page.js`) use the SQL `service_student_learning_dashboard`, not the older Edge `get-student-dashboard`. These pages already honour `requiredForReadiness: false`, so no page change was needed there. The SQL function had to change, hence the second migration. The older Edge dashboard was changed as planned for the older pages.
2. **Table and function names** are `legacy_mastery_rule_*`, keyed by unit code, not `chapter_i_*`. This keeps chapter names out of the shared dashboard SQL. The Chapter I content stays in the rows.
3. **Today's rule row stores no wording and no result record.** The pages keep today's wording exactly. Storing a single copy of today's sentences would have changed several slightly different existing sentences. The I-2 row stores John's sentences verbatim.
4. **The school admin group key** uses the rule version named in the saved result record, not the session's version stamp. Today's results from before and after the registry therefore stay in one group, while I-2 results get their own. The admin pages do not yet display the version name; showing it would be a design change.
5. **Two design-level choices to confirm or revert:**
   - On the result screen, S07's 0/2 badge is neutral, not red, under I-2.
   - The existing label «ընթացիկ չափանիշը բավարարած» now counts the required skills, so it reads 9/9 under I-2. The wording is unchanged.
6. **Not changed:**
   - `home-dashboard.js` and `mastery-dashboard.js` are loaded by no page.
   - The new Course page's mode card shows no I-2 rule sentence (it shows the threshold and the nine per-skill minima).

### Isolated test results (20 November)
| File | What runs | Result |
|---|---|---|
| `tests/legacy-mastery-rules.test.mjs` | Rules module against the seeded registry rows. Today's rule is compared with today's code on all 59,049 per-skill results of a 20-question check | 8/8 |
| `tests/legacy-mastery-rule-registry.test.mjs` | Registry migration in PGlite: immutability, append-only log, activation and rollback, refusals, client-role denial. Dashboard SQL on the full governed fixture: required skills before, after and on rollback | 5/5 |
| `tests/legacy-chapter-i-i2-transition.test.mjs` | Real legacy handlers (status, start, submit, dashboard) and real lifecycle SQL on a reduced fixture. Covers: ready on nine with weak S07 (locked under v1, available under I-2); pass 15/18 with S07 0/2 saved as raw 75%; failed I-2 → review required blocks the retry with nine skills ready → review completes → retry on unseen questions → pass; open check through activation and through rollback; three-attempt limit across versions; tampered or unknown saved rule refused; older unsaved checks scored by v1 | 7/7; **all 7 fail on today's source** |
| `tests/legacy-chapter-i-i2-reporting.test.mjs` | School admin aggregation: v1 and I-2 groups kept apart; governed groups unchanged. Personal-account endpoint fields (source checks) | 3/3 |
| `tests/legacy-chapter-i-i2-pages.test.mjs` | Every page place in plan §4 reads the server rule or saved record, with today's fallback (source checks; pages not rendered) | 4/4 |

**Full suite and browser checks (same commit):**
- `npm test`: 1,887/1,887.
- Native Chromium suites that load the changed pages, run one at a time:
  - learning acceptance 12/12;
  - student course page 11/11;
  - student home 46/46;
  - student workspace 69/69;
  - keyboard focus 23/23;
  - learning context 9/9;
  - built web 35/35;
  - request count 4/4.
- `check:web-assets`, `check:teacher-bundle`, `check-web-syntax` and `check-browser-qa-triggers` pass.

**Two older tests were updated, with the reason:**
- `enrolment-mastery-regression` runs `get-mastery-check-status` in a VM. It now injects the rules module and returns today's registry row.
- `sprint-12-5-mastery-retry-eligibility` matches the not-ready message line. That line now reads the active rule's text, with today's text as fallback. The precedence check is unchanged.

**Fixture limits:**
- The reduced fixture keeps only the columns these handlers use.
- Doubles are used for course access, curriculum resolution, rate budgets, answer receipts and the upstream answer grader. Real numeric and quantity grading was not exercised.
- The chapter review was finalized by the real lifecycle function, but its questions were not served through the handler. Review targeting was checked through the saved `failedSkillIds` that the handler reads.
- The teacher endpoint handlers and the older pages were not run.

### Staging handoff (§6B, for the environment where Codex ran Chapter II)
1. Apply both migrations to local staging. Deploy `get-mastery-check-status`, `start-learning-session`, `submit-mastery-answer`, `get-student-dashboard`, `get-teacher-dashboard`, `get-teacher-student` and `get-school-performance-analytics`. Serve this commit's `web-build`.
2. Use a Chapter I student ready on S01–S06 and S08–S10 and weak on S07. Before the switch: Home does not offer the check; the Course page shows S07 as required; the check page is locked.
3. Switch locally: `select service_activate_legacy_mastery_rule('PHY7-U01','phy7-u01-i2-v1','staging','I-2 staging');`. Then:
   - Home's next step is the check;
   - Course shows 9/9 required, with S07 noted;
   - the check page opens with the I-2 rule text.
4. Start from Home and fail the check. The result shows the saved pass score and «Լրացուցիչ վերջնարդյունք» separately.
5. Check that the required review blocks the retry on Home and on the check page, and that a direct start is refused, while all nine skills stay ready.
6. Complete the review through the normal page. Check that the retry opens, uses unseen questions and keeps the attempt number.
7. Pass the retry. The result shows «Ստուգարքն անցած է · 15/18 · 83%» while the database holds 15/20 = 75%.
8. Transitions:
   - open a check under v1, switch, finish (v1);
   - open a check under I-2, roll back with `phy7-u01-v1`, finish (I-2);
   - the next check gets v1.
9. Other pages:
   - school teacher row, panel, history, Skills tab and support count (no split expected);
   - personal-account teacher (existing layout with groups);
   - school admin (separate groups).

**Production QA:** not run (paused by owner). Suites whose explicit dependency lists include changed files:
- Chapter III–VI pilot-read;
- teacher feedback.

Suites triggered by wildcard paths:
- English Units 1–3 pilot-read;
- mobile browser QA;
- resource assignments;
- Sprint 14 actions;
- Sprint 14D analytics.

None of these scripts read the changed Chapter I texts or fields.
