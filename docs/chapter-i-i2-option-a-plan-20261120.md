# Chapter I, decision I-2 — option A build plan (for approval before building) — 20 November 2026

**Status:** plan only. Nothing is built, deployed or changed. Decision I-2 (S07 reported separately; pass on the other nine skills at 15/18 with at least one correct answer in each; readiness on the same nine) was chosen for an isolated rehearsal on 20 November. Readiness rule B stays separate and is not part of this plan.

## 1. Summary

Chapter I stays on its older adapter (`legacy-physics7-u01-v1`). Nothing moves to the versioned path. Two things change inside the adapter:
- **Consolidation.** The pass and readiness rules, today repeated as constants in four Edge Functions, move into **one shared Chapter I rule module** that holds two rule versions:
  - `phy7-u01-v1`: today's rule;
  - `phy7-u01-i2-v1`: decision I-2.
- **Stamping.** A check records its rule version **when it starts**, and is scored by that recorded version **when it finishes**.

Checks without a stamp (every check that exists today) are scored by today's rule. That is what protects completed attempts and open checks. An activation setting decides which version new checks receive, so the change can be switched on, and back off, without redeploying.

Unlike Chapter II, Chapter I needs **no new learning-model version and no new blueprints**. The teacher's estimates are grouped by blueprint, binding and model (`analytics-evidence.mjs`), and none of these change. So the evidence split Codex confirmed for Chapter II **should not occur** here. This has to be confirmed in testing, not assumed.

## 2. What changes, by component

| Component | Today | Change |
|---|---|---|
| New `supabase/functions/_shared/chapter-i-assessment-rules.mjs` | The rules are constants in `start-learning-session`, `submit-mastery-answer`, `get-mastery-check-status` and `get-student-dashboard` | Defines both rule versions in one place. For each: scored skills, readiness skills, threshold and how it is compared, minimum per scored skill, which skills can become review targets, reporting groups. Chapter I skill codes live here as adapter configuration, not in the shared core. |
| New migration: activation setting | None | A small append-only private table of which rule version new Chapter I checks receive, from when, and who switched it, read through a service-only function. **Production change; needs John's approval.** |
| `start-learning-session` (mastery check) | Readiness: all ten skills. Stores `passPercent` and `minCorrectPerSkill` in the session. | Reads the active version. Checks readiness against that version's skills (nine under I-2). Stores `scoringRuleVersion` with the criteria. Question selection, forms and the lifecycle call are unchanged. |
| `submit-mastery-answer` | 80% of the rounded score over all answered questions, at least one correct in every delivered skill, up to 3 weakest skills as review targets | Scores by the session's recorded version; **no stamp means `phy7-u01-v1`**. Under I-2: the exact fraction over the 18 scored questions (15/18 passes, 14/18 fails), at least one correct in each scored skill; S07 can never fail or rescue a pass; review targets come from scored skills only. Saves an `assessmentResultReporting` record in the shape Chapter III uses, so existing teacher and school pages show the groups. Item grading, numeric and quantity included, is unchanged. |
| `get-mastery-check-status` | Readiness on all ten; fixed `passCriteria` | Readiness and criteria for the **next** check come from the active version; an open check reports the criteria of its own stamp. |
| `get-student-dashboard` | Readiness on all ten | Readiness and the next step use the active version. |
| Student pages: `mastery.js`, `mastery.html`, `mastery-dashboard.js`, `assessment.html` | The rule text «≥80% ընդհանուր և առնվազն 1/2 յուրաքանչյուր հմտությունից» is fixed in five places | The text comes from the criteria the server returns. Each result shows the rule it was scored by, so old results keep their old wording. The result screen shows the groups for I-2 results, reusing the shared result display. **New Armenian wording needs John's acceptance.** |
| Teacher (school), school admin and personal-account pages | Read saved results | **No code change expected.** They already display `assessmentResultReporting` when present. The personal-account view keeps its layout (decided 20 November), but its percentage for new attempts changes meaning (see decision 2). |
| Production QA scripts | The Chapter I pilot reads may check the rule text or result shape | Find and update them in the same change, using `scripts/check-browser-qa-triggers.mjs`. Production QA stays paused. |

**Edge Functions to deploy together:** the four named above, each read back after deployment. The migration goes first; the functions work before activation because the default is `phy7-u01-v1`. The frontend comes last.

## 3. Transition behaviour (what the tests must prove)

| Situation | Expected behaviour |
|---|---|
| Completed attempts | Never recomputed. Old results keep their percentage, pass decision and wording on every page. |
| Check open at activation | Has no stamp, so it finishes under today's rule, even if finished after activation. |
| Between attempts (failed under today's rule) | Attempts used and the required review stay as they are; the next check needs the completed review. It is stamped I-2, uses the existing unseen-first selection, and counts as the next attempt number. |
| New check after activation | Stamped I-2. A student ready on the nine skills but not S07 can start. |
| Three-attempt limit | Unchanged, counted across both versions. |
| Required review open at activation | Can be finished and unlocks the retry. |
| Practice or review open at activation | Continues normally; their scoring does not change. |
| Switching back (rollback) | New checks are stamped `phy7-u01-v1` again. Checks already stamped I-2 still finish under I-2. History is unchanged. |

## 4. What teachers see, before and after

| Where | Before activation | After, for a new attempt |
|---|---|---|
| School teacher, row and panel (approved V12 design) | «Անցած է» / «Չի անցել» and the date; panel box 1: 17 / 20 · 85% | Same pass or fail and date; panel box 1: 15 / 18 · 83% for the required skills, with S07 shown separately and labelled as not deciding the pass |
| School teacher, Skills tab and support count | Separate estimates by kind of work | **Expected unchanged:** no new blueprint or model, so no new separate estimate. To be confirmed in staging with practice before and after the switch. |
| School teacher, history | Old attempts in the old format | Old attempts unchanged; new attempts with groups |
| School admin | Old results | Old and new results reported separately, as Codex confirmed for Chapter II |
| Personal-account teacher | Today's layout: result and percentage | Same layout. The percentage of new attempts is the required-skills percentage (decision 2). |

## 5. Test plan

**A. Isolated tests with the real Edge handlers** (in-memory PostgreSQL).
- **Fixture.** A new connected fixture for the legacy Chapter I adapter: ten `PHY7-U01-S01…S10` skills, the Chapter I pool codes, single-choice **and numeric/quantity** questions, two per skill per check. Today's fixtures cover the versioned chapters only.
- **Cases (every row in §3, plus):**
  - 15/18 with S07 at 0/2 passes;
  - 14/18 with S07 at 2/2 fails;
  - a required skill at 0/2 fails at 16/18;
  - review targets never include S07 under I-2;
  - numeric and quantity questions are graded as before;
  - an unknown stamp is refused;
  - every stored result reloads unchanged.
- **Regressions** that fail on today's source for each new behaviour, as the repository rules require.

**B. Local staging through the real pages** (`scripts/run-local-staging.py`, as Codex ran for Chapter II).
- **Setup.** Add a legacy Chapter I curriculum to the staging fixture, since it has none today.
- **Journeys:**
  - a new student;
  - an open check across activation;
  - a retry after a required review;
  - practice before and after activation, then the **teacher's Skills tab and support count** (the Chapter II finding);
  - the school admin page;
  - the personal-account teacher page;
  - rollback.

  Each journey checks the student and teacher pages.
- **Environment.** This container could not start the staging stack (the pg_cron source download was refused), so this part may need to run where Codex ran Chapter II, or in CI.

**C. Before any pull request** (repository rules).
- `npm test`, the native browser suite, the bundle, web-asset and QA-trigger checks.
- The affected production QA scripts, updated in the same change.

## 6. Decisions needed before building

1. **Activation mechanism.** A database setting (recommended: reversible without redeploying, and auditable) or a code switch at deployment.
2. **Percentage on new I-2 results.** Required-skills percentage (recommended; matches Chapter III) or overall percentage. This affects the personal-account view's figure.
3. **Group labels for Chapter I.** Proposed: «Պարտադիր վերջնարդյունքներ» for the nine scored skills (all trace to mandatory outcomes, some as derived supporting skills) and «Լրացուցիչ վերջնարդյունքներ» for S07. Needs John's acceptance.
4. **Review targets.** Exclude S07 from the review targets after a failed I-2 check (recommended; matches policy v2). S07 still appears in whole-chapter review coverage.
5. **The new student-facing rule wording** on the four Chapter I pages.
6. **A permanent rule record.** Whether the two rule versions should also be stored as an immutable database record (stronger audit; one more table) or live only in the shared module and the stamp.

## 7. Effort and risk (my estimates, not measured)

| Part | Estimate |
|---|---|
| Isolated build and tests (§5A) | 2–3 days |
| Staging fixture and journeys (§5B) | 1–2 days, if a working staging environment is available |
| Documentation, QA scripts, deployment notes | 0.5–1 day |

**Risks:**
- More Chapter I-specific logic in an adapter that should eventually be retired (option B).
- Four functions must be deployed together.
- The student pages' rule text exists in five places today, so missing one would show the wrong rule.

**Not included:** readiness rule B; the Chapter II release decision; retiring the legacy adapter.
