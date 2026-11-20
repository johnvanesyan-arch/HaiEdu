# Chapter I, decision I-2 — option A build plan, revision 2 (for approval before building) — 20 November 2026

**Status:** plan only. Nothing is built, deployed or changed. **Out of scope:** readiness rule B and live activation.

**Revision 2** applies John's decisions of 20 November:
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
- **Score that decides the pass:** «Ստուգարքն անցած է · 15/18 · 83%». The shared result display already uses this pattern.
- **Groups** (shared result display; the deciding group gets the existing suffix «· հաշվի է առնվում ստուգարքը հանձնելիս»):
  - «Պարտադիր և օժանդակ հմտություններ՝ 15/18 · 83% · հաշվի է առնվում ստուգարքը հանձնելիս»
  - «Լրացուցիչ վերջնարդյունք (չի ազդում հանձնման վրա)՝ 1/2 · 50%»
- **The overall 16/20** is not shown as the pass score. It stays in the saved record for audit.
- **Old results** keep today's display and rule text, because each result shows the rule saved with it.

### Proposed Armenian labels (need John's acceptance)
| Use | Proposed | Alternative |
|---|---|---|
| The nine scored skills (group label) | **«Պարտադիր և օժանդակ հմտություններ»**, followed by the existing «· հաշվի է առնվում ստուգարքը հանձնելիս» | «Հանձնման համար հաշվվող հմտություններ» (says the same as the suffix, so it reads twice) |
| S07 (group label) | **«Լրացուցիչ վերջնարդյունք (չի ազդում հանձնման վրա)»** | «Լրացուցիչ վերջնարդյունք», relying on the missing suffix (less explicit) |

Why "Պարտադիր և օժանդակ": the 11J reconciliation maps six of the nine skills directly to mandatory outcomes and three (S02, S04, S05) as derived supporting skills of mandatory outcomes. The label says both, and the suffix says they count.

### Student-facing sentences that change under I-2
Today these sentences are fixed in the pages. They would be filled from the criteria the server returns, so old results keep today's wording.

| Where today | Today | Proposed under I-2 |
|---|---|---|
| Rule: `mastery.html`, `assessment.html`, `mastery.js`, `mastery-dashboard.js` | «Փորձնական անցողիկ կանոն՝ ≥80% ընդհանուր և առնվազն 1/2 յուրաքանչյուր հմտությունից» | «Փորձնական անցողիկ կանոն՝ պարտադիր և օժանդակ հմտությունների 18 հարցից առնվազն 15 ճիշտ պատասխան և յուրաքանչյուր այդ հմտությունից առնվազն 1։ Չափման միավորների փոխարկման 2 հարցը ներկայացվում է առանձին և չի ազդում հանձնման վրա։» |
| Ready: `home-dashboard.js`, `assessment.js`, `progress.js`, `mastery-dashboard.js` | «Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։» | «Հանձնման համար հաշվվող բոլոր հմտությունները պատրաստ են անկախ ստուգման։» |
| Ready, Progress (`progress.js:166`) | «Բոլոր ընթացիկ հմտությունները բավարարել են պատրաստվածության կանոնը։» | «Հանձնման համար հաշվվող բոլոր հմտությունները բավարարել են պատրաստվածության կանոնը։» |
| Not ready: `home-dashboard.js`, `assessment.js`, `physics-7.js` | «Ամրապնդեք բոլոր հմտությունները…» | «Ամրապնդեք հանձնման համար հաշվվող հմտությունները…» |

The "20 հարց" texts stay true: 20 questions are still delivered.

### The student's next step when ready on the nine but weak on S07 (fact and design)
**Fact (code):**
- Home shows the check first whenever the check status says it is available («Պատրաստ եք յուրացման ստուգմանը», «Սկսել ստուգումը»), ahead of the practice recommendation.
- Under I-2 that status uses the nine skills, so this student **will see the check as available on Home**.
- The separate practice recommendation, shown on other pages, still picks the weakest unfinished skill. For this student that is S07, so it may suggest practising S07 at the same time.

**Proposal:** keep that recommendation logic unchanged in this step.
- Sprint 12 froze the recommendation priority rules as a learning-model parameter, so changing them would go through the decision protocol.
- A practice suggestion for S07 alongside an available check is consistent with I-2: S07 is still taught and reviewed.

### Teachers
| Where | Before activation | After, new attempt |
|---|---|---|
| School teacher row and panel (approved V12) | Pass or fail and the date; panel 17 / 20 · 85% | Pass or fail and the date; panel **15 / 18 · 83%** with the two groups above |
| School teacher Skills tab and support count | Separate estimates by kind of work | **Expected unchanged** (no new blueprint or model); to be confirmed |
| School teacher history | Old format | Old attempts unchanged; new attempts with groups |
| School admin | Old results | Old and new reported separately |
| Personal-account teacher | Today's layout and percentage | Same layout; the percentage of new attempts is the deciding 15/18 figure (83%) |

## 5. What changes, by component (when building)

| Component | Change |
|---|---|
| Migration | Registry, activation log, service read function; registry seeded with both versions; **activation log seeded with `phy7-u01-v1` only** (no live activation) |
| New `_shared/chapter-i-assessment-rules.mjs` | Validates criteria objects and computes readiness, pass, groups and review targets from a criteria object. Chapter I skill codes live in the registry rows, not in shared code |
| `start-learning-session` | Readiness from the active criteria; save version, criteria and fingerprint in the new check. Targeted review uses the last failed check's saved review-target rule; whole-chapter coverage unchanged |
| `submit-mastery-answer` | Score by the saved criteria (default `phy7-u01-v1`); save the result record with groups; review targets from the saved rule |
| `get-mastery-check-status`, `get-student-dashboard` | Readiness and next-check criteria from the active version; an open check reports its own saved criteria |
| Student pages (files listed in §4) | Rule and readiness sentences from the server's criteria; the result screen shows groups for I-2 results |
| Teacher, school and personal pages | No code change expected (they read saved results) |
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
- **Regressions** that fail on today's source for each new behaviour.

### B. Local staging through the real pages
Uses a legacy Chapter I curriculum added to the staging fixture. Activation and rollback here are local and disposable.
1. **Ready on the nine, weak on S07:** after the local switch, the student page's next step shows the check available («Պատրաստ եք յուրացման ստուգմանը»); before the switch it does not.
2. **Open check through activation:** start, switch, finish → today's rule and wording.
3. **Open check through rollback:** start under I-2, switch back, finish → I-2, with 15/18 deciding and S07 separate.
4. **Retry after a required review:** under I-2, with unseen questions and S07 absent from targeted review.
5. **Teacher view:** school teacher row, panel and history; the **Skills tab and support count with practice before and after the switch** (Chapter II's split should not appear); personal-account view; school admin.

This container could not start the staging stack, so part B may need to run where Codex ran Chapter II.

### C. Before any pull request
`npm test`, the browser suite, the bundle, web-asset and QA-trigger checks; affected production QA scripts updated in the same change.

## 7. Decisions still needed

1. **Armenian wording:** the two group labels and the sentences in §4.
2. **The recommendation logic:** whether leaving it unchanged is acceptable (a practice suggestion for S07 can appear while the check is available), or whether to open a separate recommendation-rule change.

## 8. Effort and risk (my estimates, not measured)
| Part | Estimate |
|---|---|
| Isolated build and tests (§6A) | 2.5–3.5 days |
| Staging fixture and journeys (§6B) | 1–2 days, where staging runs |
| Documentation and QA scripts | 0.5–1 day |

**Risks:**
- More Chapter I-specific logic in an adapter that should eventually be retired.
- Four functions and the frontend must be deployed in order: migration, functions, pages.
- Missing one of the student sentences would show the wrong rule. The tests should check every place listed in §4.
