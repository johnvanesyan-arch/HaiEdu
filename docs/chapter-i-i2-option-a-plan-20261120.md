# Chapter I, decision I-2 — option A build plan, revision 3 (for approval before building) — 20 November 2026

**Status:** plan only. Nothing is built, deployed or changed. **Out of scope:** readiness rule B and live activation.

**Revision 3** (later on 20 November):
- adopts John's Armenian wording;
- keeps the S07 practice recommendation as it is;
- makes today's Home and Course pages use the active rule's nine required skills;
- defines the normal-student-route staging journey;
- carries forward three findings explicitly (§2a).

**Revision 2** applied John's decisions of 20 November:
- an auditable database switch;
- the rule version **and its exact criteria** saved when each check starts;
- 15/18 shown as the score that decides the pass, with S07 shown separately;
- S07 kept in whole-chapter review and left out of targeted review after a failed I-2 attempt;
- Armenian labels that say which skills count toward passing.

## 1. Summary

Chapter I stays on its older adapter (`legacy-physics7-u01-v1`). Nothing moves to the versioned path. Inside the adapter:
- The pass and readiness rules, now repeated in four server functions, are read from **one place**.
- Every check **saves its rule version and the full criteria when it starts**, and is scored by those saved criteria when it finishes.
- Checks with no saved criteria (every check that exists today) are scored by today's rule.
- An **auditable database switch** decides which rule version new checks receive.

No new learning-model version and no new blueprints are needed. So the teacher evidence split seen in Chapter II is not expected here; staging must confirm it.

## 2. Data design (database)

Both items below are production changes needing John's approval. They are not part of this step.

**Rule registry** (`private.chapter_i_rule_versions`), immutable.
- One row per rule version: `phy7-u01-v1` (today's rule, recorded as it is) and `phy7-u01-i2-v1`.
- Each row stores the exact criteria as JSON, plus a fingerprint: scored skill codes, readiness skill codes, threshold and how it is compared, minimum per scored skill, review-target skills, reporting groups and labels, and the student-facing rule text.
- Rows cannot be updated or deleted. A change means a new version.

**Activation log** (`private.chapter_i_rule_activations`), append-only.
- Each switch records the rule version, effective time, who switched it and why.
- The newest row is the active version. Rollback is a new row naming the older version; nothing is edited or deleted.
- A service-only function returns the active version and its criteria.

**Saved with each check.** When a check starts, the session stores:
- `scoringRuleVersion`;
- the **complete criteria object** copied from the registry;
- the criteria's fingerprint.

On finish, `submit-mastery-answer` scores by the criteria **saved in the session**, never by the current switch. A check with no saved criteria is scored as `phy7-u01-v1`. A saved fingerprint that doesn't match its registry row is refused.

## 2a. Three findings carried forward (verified in code, 20 November)

1. **The database expects the raw score.**
   - **Fact:** for Chapter I checks (no policy binding), `finalize_mastery_check_atomic` refuses the save (`mastery_score_mismatch`) unless the stored percentage equals the rounded raw score over **all 20 questions**.
   - **Plan:** keep `answered_count`, `correct_count`, `score_percent` and the saved percentage **raw**. For example, 15/18 required plus 0/2 on S07 is saved as 15/20 = 75%, with `assessment_result = passed`.
   - The **pass score 15/18** is saved in the session's result record (`assessmentResultReporting.score`), and every page that shows a pass score uses that saved record when it exists.
   - Pages and endpoints that show the raw percentage today, and would switch to the saved pass score for I-2 results:
     - the mastery result screen (`mastery.js`);
     - the latest-attempt line on Progress (`progress.js`), from `get-mastery-check-status`;
     - the teacher panels (§4);
     - school admin (finding 2).
2. **School admin would mix the two rules.**
   - **Fact:** `school-performance-analytics.ts` groups results by school context plus the evidence contract (kind of work, blueprint, binding, model). None of these change under option A, so old and I-2 Chapter I results would land in **one group**: pass counts mixed, and pass scores and groups present for only some of them.
   - **Plan:** add the saved rule version to the grouping key. This is a generic field on the session (`scoringRuleVersion`), not Chapter I code. The rule version also goes into the group's data, so the school admin and master admin pages can name it.
   - The teacher's per-skill estimates stay as they are, because answer scoring doesn't change between versions.
3. **Personal-account teachers see only a raw percentage.**
   - **Fact:** the older `get-teacher-dashboard` and `get-teacher-student` paths return only pass or fail and `score_percent`. They don't read the saved result record.
   - **Fact:** the personal-account student panel in `teacher.js` already shows a saved result record when the endpoint supplies one, through the shared result display.
   - **Plan:** those two endpoints also return the saved `assessmentResultReporting` and `scoringRuleVersion`. **Layout unchanged.** For an I-2 result the existing check card then reads «Ստուգարքն անցած է · 15/18 · 83%» with the two group lines and the existing scope note. For older results it shows what it shows today.

## 3. Rules under each version

| | `phy7-u01-v1` (today) | `phy7-u01-i2-v1` |
|---|---|---|
| Questions delivered | 20, two per skill S01–S10 | Same 20, same selection |
| Score that decides the pass | Rounded percentage of all 20 ≥ 80% | **Exact fraction of the 18 questions for S01–S06, S08–S10 ≥ 80% (15/18)** |
| Minimum per skill | 1 correct in every skill | 1 correct in each of the nine scored skills; none for S07 |
| Readiness to start | All ten skills | The nine scored skills |
| Targeted review after a failure | Up to 3 weakest skills, S07 included | Up to 3 weakest **scored** skills; **S07 never targeted** |
| Whole-chapter review coverage | All ten skills | **All ten skills, S07 included** (unchanged) |
| S07 in the result | Counts like any skill | **Shown separately; cannot fail or rescue a pass** |
| Item grading (incl. numeric and quantity) | Unchanged | Unchanged |

## 4. What is shown

### Student pages and the teacher panel, for an I-2 result
- **Score that decides the pass:** «Ստուգարքն անցած է · 15/18 · 83%», read from the saved result record. The raw 15/20 stays in the database fields (§2a, finding 1).
- **Groups** (shared result display; the deciding group gets the existing suffix «· հաշվի է առնվում ստուգարքը հանձնելիս»):
  - «Պարտադիր և օժանդակ հմտություններ՝ 15/18 · 83% · հաշվի է առնվում ստուգարքը հանձնելիս»
  - «Լրացուցիչ վերջնարդյունք՝ 1/2 · 50%»
- **The overall 16/20** is not shown as the pass score. It stays in the saved record for audit.
- **Old results** keep today's display and rule text, because each result shows the rule saved with it.

### Armenian wording (decided by John, 20 November)
**Group labels (shared result display):**
- **«Պարտադիր և օժանդակ հմտություններ»** for the nine skills. The shared display adds its existing note «· հաշվի է առնվում ստուգարքը հանձնելիս».
- **«Լրացուցիչ վերջնարդյունք»** for S07. Its role is explained in the rule text.

**Rule text**, wherever the rule appears for an I-2 check (`mastery.html`, `assessment.html`, `mastery.js`, `mastery-dashboard.js`):
«Ստուգումն անցնելու համար պետք է ճիշտ պատասխանել պարտադիր և օժանդակ հմտություններին վերաբերող 18 հարցից առնվազն 15-ին։ Ինը հմտություններից յուրաքանչյուրի երկու հարցից առնվազն մեկին պետք է ճիշտ պատասխանել։ Չափման միավորների փոխարկման երկու հարցերին նույնպես պետք է պատասխանել։ Դրանց արդյունքը ներկայացվում է առանձին և չի ազդում ստուգումն անցնելու վրա։»

**Readiness, ready** (replaces «Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։» and the Progress reason line): «Ստուգմանը մասնակցելու համար անհրաժեշտ հմտություններն ամրապնդված են։»
- Places: `home-dashboard.js`, `assessment.js`, `progress.js` (two places), `mastery-dashboard.js`.

**Readiness, locked** (replaces «Ամրապնդեք բոլոր հմտությունները…» and the server's `skills_not_ready` message under I-2): «Ստուգումը բացելու համար նախ ամրապնդեք պահանջվող հմտությունները։»
- Places: `home-dashboard.js`, `assessment.js`, `physics-7.js`, and the `messageHy` of `start-learning-session` and `get-mastery-check-status`.

**Old results.** Each text is stored with its rule version in the registry: today's sentences under `phy7-u01-v1` and the sentences above under `phy7-u01-i2-v1`. Old results and checks keep today's wording.

**One terminology point, no change proposed.** The rule text says «ստուգումն անցնելու». The shared result display, used by every chapter, says «Ստուգարքն անցած է» and «հաշվի է առնվում ստուգարքը հանձնելիս». Both terms would appear on the same screen. Aligning them would be a separate, platform-wide wording change.

### Home and Course pages use the nine required skills
**Today (fact):**
- The older `get-student-dashboard` counts progress over all ten skills (`progress.completedSkills / totalSkills`).
- The Chapter I Course page (`physics-7.js`) shows «Պատրաստ է ստուգման» only when all ten are complete. Otherwise it shows «N/10 ընթացիկ չափանիշը բավարարած».
- Progress (`progress.js`) and the practice page (`app.js`) show the same count.

**Plan:**
- `get-student-dashboard` keeps the existing fields unchanged, for existing consumers and QA scripts.
- It **adds** a per-skill `requiredForReadiness` from the active criteria, plus `progress.requiredCompleted` and `progress.requiredTotal` (9 under I-2, 10 under today's rule).
- The Course page badge and the count text on Course, Progress and practice use the required counts.
- S07's row on the Course page shows the newer Course page's existing note «Չի սահմանափակում ստուգարքի հասանելիությունը». The same pattern is already used for chapters on the versioned path.
- Home already shows the check first whenever the server's readiness check says it is available. Under I-2 that check uses the nine skills.

### The student's next step when ready on the nine but weak on S07 (fact and design)
**Fact (code):**
- Home shows the check first whenever the check status says it is available («Պատրաստ եք յուրացման ստուգմանը», «Սկսել ստուգումը»), ahead of the practice recommendation.
- Under I-2 that status uses the nine skills, so this student **will see the check as available on Home**.
- The separate practice recommendation, shown on other pages, still picks the weakest unfinished skill. For this student that is S07, so it may suggest practising S07 at the same time.

**Decided (John, 20 November):** the S07 practice recommendation stays as it is. Sprint 12 froze the recommendation priority rules as a learning-model parameter.

### Teachers
| Where | Before activation | After, new attempt |
|---|---|---|
| School teacher row and panel (approved V12) | Pass or fail and the date; panel 17 / 20 · 85% | Pass or fail and the date; panel **15 / 18 · 83%** with the two groups above |
| School teacher Skills tab and support count | Separate estimates by kind of work | **Expected unchanged** (no new blueprint or model); to be confirmed |
| School teacher history | Old format | Old attempts unchanged; new attempts with groups |
| School admin and master admin | Old results | **Grouped by the saved rule version** (finding 2), so old and I-2 results are never counted together |
| Personal-account teacher | Today's layout: pass or fail and the raw percentage | **Same layout**; the existing check card shows the saved pass score 15/18 · 83% and the two group lines (finding 3) |

## 5. What changes, by component (when building)

| Component | Change |
|---|---|
| Migration | Registry, activation log, service read function; registry seeded with both versions; **activation log seeded with `phy7-u01-v1` only** (no live activation) |
| New `_shared/chapter-i-assessment-rules.mjs` | Validates criteria objects and computes readiness, pass, groups and review targets from a criteria object. Chapter I skill codes live in the registry rows, not in shared code |
| `start-learning-session` | Readiness from the active criteria; save version, criteria and fingerprint in the new check. Targeted review uses the last failed check's saved review-target rule; whole-chapter coverage unchanged |
| `submit-mastery-answer` | Score by the saved criteria (default `phy7-u01-v1`); save the result record with groups; review targets from the saved rule |
| `get-mastery-check-status`, `get-student-dashboard` | Readiness and next-check criteria from the active version; an open check reports its own saved criteria. Dashboard adds `requiredForReadiness` and required counts; status adds the saved result record of the latest check. Existing fields are unchanged |
| `school-performance-analytics.ts` (school admin, master admin) | Group key adds the saved `scoringRuleVersion`; the group data names it (finding 2) |
| Older `get-teacher-dashboard`, `get-teacher-student` (personal-account) | Also return the saved result record and rule version; layout unchanged (finding 3) |
| Student pages (files listed in §4) | Rule and readiness sentences from the server's criteria. Course, Progress and practice counts use the required skills, with S07 noted. The result screen and Progress show the saved pass score and groups for I-2 results |
| Teacher (school) pages | No code change expected (they already read the saved result record) |
| Production QA scripts | Update any that read the Chapter I rule text or result shape, in the same change |

## 6. Test plan

### A. Isolated tests with the real server functions
Uses a new legacy Chapter I fixture: ten `PHY7-U01` skills, the Chapter I pools, single-choice and numeric/quantity questions.
- **Pass rule:**
  - 15/18 with S07 at 0/2 passes;
  - 14/18 with S07 at 2/2 fails;
  - a scored skill at 0/2 fails at 16/18;
  - the result shows 15/18 as the deciding score and S07 separately.
- **Saved criteria:**
  - criteria and fingerprint are saved at start;
  - a tampered fingerprint is refused;
  - an unknown version is refused.
- **Review:**
  - targeted review after a failed I-2 attempt never includes S07;
  - whole-chapter review still serves S07 questions.
- **Readiness and next step:** ready on the nine with S07 weak → status available; the Home next step is the check.
- **Transitions:**
  - a check open at **activation** finishes under today's rule;
  - a check started under I-2 and open at **rollback** finishes under I-2;
  - after rollback, new checks get today's rule;
  - completed results are never recomputed;
  - attempts used, required reviews and unseen-form selection carry across;
  - the three-attempt limit holds across versions.
- **Audit:** every switch is a new activation row; registry rows cannot be changed.
- **Carried-forward findings:**
  - an I-2 pass with S07 at 0/2 is saved with the raw 75% and accepted by the database, while the result record holds 15/18;
  - school admin aggregates put v1 and I-2 sessions in separate groups;
  - the personal-account endpoints return the saved result record, and the existing panel shows it;
  - the dashboard's required counts are 9 under I-2 and 10 under today's rule, with the existing fields unchanged.
- **Regressions** that fail on today's source for each new behaviour.

### B. Local staging through the normal student route
Uses a legacy Chapter I curriculum added to the staging fixture. Activation and rollback are local and disposable; no live activation.

**Main journey: one student, via the normal pages** (sign in → Home → Course → check → Home):
1. **Before the local switch.** The student is ready on the nine skills and weak on S07. Home does not offer the check. The Course page shows «9/10…» and the locked text «Ստուգումը բացելու համար նախ ամրապնդեք պահանջվող հմտությունները։».
2. **After the switch.**
   - Home's next step is «Պատրաստ եք յուրացման ստուգմանը».
   - The Course page shows «Պատրաստ է ստուգման», the required count 9/9, and S07 with «Չի սահմանափակում ստուգարքի հասանելիությունը».
   - The ready text is «Ստուգմանը մասնակցելու համար անհրաժեշտ հմտություններն ամրապնդված են։».
   - The S07 practice recommendation may still appear (decided).
3. **Start the check from Home and fail it.** The result shows the saved pass score and «Լրացուցիչ վերջնարդյունք» separately.
4. **A required review blocks the retry.** Home shows the required review. The check page is locked with the review message. A direct start request is refused. Targeted review does not include S07.
5. **Complete the review through the normal page.** Home now offers «Կրկին փորձել». The retry starts, uses unseen questions, and keeps the attempt number.
6. **Pass the retry.** It shows «Ստուգարքն անցած է · 15/18 · 83%» while the database fields hold the raw 15/20 = 75%.

**Transition journeys:**
- **Open check through activation:** start under today's rule, switch, finish → today's rule, wording and raw score.
- **Open check through rollback:** start under I-2, switch back, finish → I-2, with 15/18 deciding and S07 separate. New checks after rollback get today's rule.

**Other pages:**
- **School teacher:** row, panel and history, plus the Skills tab and support count with practice before and after the switch. Chapter II's split should not appear.
- **Personal-account teacher:** existing layout showing the saved pass score and groups.
- **School admin:** old and I-2 results in separate groups named by rule version.

This container could not start the staging stack, so part B may need to run where Codex ran Chapter II.

### C. Before any pull request
`npm test`, the browser suite, the bundle, web-asset and QA-trigger checks; affected production QA scripts updated in the same change.

## 7. Decisions

**Decided** (20 November): wording (§4), the S07 recommendation (unchanged), Home and Course readiness on the nine skills, the three findings in §2a.

**Still open:**
- **Approval of this revision to build in isolation and staging.**
- **Optional:** whether to align «ստուգում» and «ստուգարք» across the platform later.

## 8. Effort and risk (my estimates, not measured)
| Part | Estimate |
|---|---|
| Isolated build and tests (§6A) | 3–4 days (revision 3 adds the school admin, personal-account and Course page changes) |
| Staging fixture and journeys (§6B) | 1–2 days, where staging runs |
| Documentation and QA scripts | 0.5–1 day |

**Risks:**
- More Chapter I-specific logic in an adapter that should eventually be retired.
- Four functions and the frontend must be deployed in order: migration, functions, pages.
- Missing one of the student sentences would show the wrong rule. The tests should check every place listed in §4.
