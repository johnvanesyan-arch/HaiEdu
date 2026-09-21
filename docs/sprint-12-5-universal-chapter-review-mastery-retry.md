# Sprint 12.5 — Universal Chapter Review & Mastery-Retry Lifecycle

**Status:** ⏳ Planned

**Placement:** After Sprint 12 calibration work and before Sprint 13 Chapter I production release

**Scope:** Platform-wide — all present and future grades, subjects, programmes, chapters/units

**Feature class:** Core academic policy + learner workflow + teacher analytics

## Sprint goal

Implement a universal chapter-level mastery lifecycle in which learners receive a maximum of **three Mastery Check attempts**, failed attempts require structured Chapter Review before retry, successful mastery makes Review optional, and Review remains permanently available for continued learning.

This sprint must establish the rule as a **versioned platform-level academic policy**, not as Physics 7-specific logic.

The canonical lifecycle is:

```
Chapter learning
      ↓
Mastery Check — Attempt 1
 ├── PASS
 │     ↓
 │  Mastery Confirmed
 │  Chapter Review optional
 │
 └── FAIL
       ↓
   Chapter Review required
       ↓
Mastery Check — Attempt 2
 ├── PASS
 │     ↓
 │  Mastery Confirmed
 │  Chapter Review optional
 │
 └── FAIL
       ↓
   Chapter Review required
       ↓
Mastery Check — Attempt 3
 ├── PASS
 │     ↓
 │  Mastery Confirmed
 │  Chapter Review optional
 │
 └── FAIL
       ↓
Mastery Not Demonstrated
No further Mastery Checks
Chapter Review remains available
```

---

## 12.5A — Global academic-policy model

Create a platform-level **Chapter Mastery & Review Policy**.

The policy must define at minimum:

```
maximum_mastery_attempts = 3

review_required_after_failed_attempts = [1, 2]

review_optional_after_pass = true

review_available_after_final_failure = true

additional_mastery_attempt_after_final_failure = false
```

The rule applies automatically to every supported academic context:

```
grade
→ subject
→ programme/version
→ chapter/unit
```

Individual schools, teachers, subjects, or chapters must **not silently override** the three-attempt lifecycle.

If the platform policy changes later, it must be introduced as a **new version**. Historical learner records retain the policy version under which they were created.

### Required provenance

Every relevant Mastery Check and Chapter Review record must preserve:

```
academic_policy_version
curriculum_release
programme/version
chapter/unit
assessment_blueprint
learning-model version
runtime-build provenance
```

### Acceptance criteria

-  One canonical policy applies across subjects/grades. 
-  Physics-specific constants are removed from the lifecycle logic. 
-  Historical policy versions remain reconstructable. 
-  No local school/teacher override exists unless explicitly introduced by a future governed feature. 

---

# 12.5B — Chapter mastery state machine

Implement an explicit server-authoritative lifecycle.

Recommended canonical states:

```
mastery_ready

review_required_attempt_2
mastery_retry_2_ready

review_required_attempt_3
mastery_retry_3_ready

mastery_passed

mastery_failed_final
```

The server, not the browser, determines transitions.

### Allowed transitions

```
mastery_ready
  ├── Attempt 1 PASS
  │      → mastery_passed
  │
  └── Attempt 1 FAIL
         → review_required_attempt_2


review_required_attempt_2
  └── qualifying Chapter Review completed
         → mastery_retry_2_ready


mastery_retry_2_ready
  ├── Attempt 2 PASS
  │      → mastery_passed
  │
  └── Attempt 2 FAIL
         → review_required_attempt_3


review_required_attempt_3
  └── qualifying Chapter Review completed
         → mastery_retry_3_ready


mastery_retry_3_ready
  ├── Attempt 3 PASS
  │      → mastery_passed
  │
  └── Attempt 3 FAIL
         → mastery_failed_final
```

Terminal Mastery Check states:

```
mastery_passed
mastery_failed_final
```

`mastery_failed_final` must prohibit a fourth Mastery Check.

### Critical invariant

A learner must never obtain:

```
mastery_attempt_number > 3
```

through:

-  UI; 
-  direct API invocation; 
-  stale browser session; 
-  race condition; 
-  duplicate request; 
-  admin/teacher UI accidentally reusing learner endpoints. 

---

# 12.5C — Chapter Review mode

Introduce a first-class learning-session mode:

```
chapter_review
```

It must remain separate from:

```
diagnostic
practice
mastery_check
```

Chapter Review is not ordinary Practice and must not contaminate evidence about how much Practice was required to initially reach mastery.

## Review contexts

Every Chapter Review session must record why it exists:

```
required_after_attempt_1_failure

required_after_attempt_2_failure

voluntary_after_mastery_pass

voluntary_after_final_failure
```

Potentially later:

```
teacher_assigned_review
scheduled_retention_review
```

but those are outside this sprint unless needed structurally.

---

# 12.5D — Mandatory Review completion rule

Failure of Attempt 1 or Attempt 2 must **not immediately unlock** the next Mastery Check.

The learner must complete a qualifying Chapter Review.

Merely:

-  opening the Review; 
-  answering one question; 
-  navigating away; 
-  generating a session; 

must **not** satisfy the gate.

The server must persist an explicit event such as:

```
chapter_review_requirement
required_after_attempt = 1
status = required
```

then:

```
chapter_review_completed
qualifying = true
```

and only then:

```
Mastery Attempt 2 unlocked
```

The same rule applies between Attempts 2 and 3.

### Completion definition

The exact Review-session length should be configurable at the platform-policy level.

Initial recommendation:

```
target questions per Review session: 12
```

with a bounded range if needed later.

A required Review should normally be completed by answering the configured number of eligible questions, unless the chapter pool is smaller.

Do **not** introduce another mastery threshold merely to decide whether the Review itself has been "passed."

The point is structured remediation.

---

# 12.5E — Whole-chapter rotational question selection

Chapter Review draws from the **entire eligible chapter assessment pool**.

However, a single Review session does not need to contain every question.

Instead introduce:

## Review Session

A bounded learner session.

Example:

```
12 questions
```

## Review Cycle

A longer-lived rotation through the chapter question bank.

Example:

```
Chapter eligible pool = 73 items

Review session 1 → 12 items
Review session 2 → 12 mostly different items
Review session 3 → 12 mostly different items
...
until the pool is reasonably covered

then begin next Review cycle
```

### Selection hierarchy

Within a Review cycle, prefer:

1.  skills failed in the latest Mastery Check; 
2.  skills with weak recent independent Review evidence; 
3.  unseen eligible questions in the current Review cycle; 
4.  least-recently seen questions; 
5.  variant diversity; 
6.  exact repeats only after appropriate pool exhaustion. 

The whole chapter must remain represented.

A failed skill should receive **additional weight**, not exclusive selection.

For example:

```
S01 ✅
S02 ✅
S03 ❌
S04 ✅
S05 ❌
```

Chapter Review still samples S01–S05, but S03 and S05 receive additional exposure.

---

# 12.5F — Review-cycle provenance

Persist enough state to reproduce Review selection.

At minimum:

```
chapter_review_session_id
chapter_id / unit_id
review_context
review_cycle_number
review_session_number
mastery_attempt_preceding_review
question/item identity
item version
template/family
skill
selection reason
prior exposure count
seen_in_current_cycle
exact-repeat indicator
pool-exhaustion indicator
hint usage
response time
correct / incorrect
independent / assisted
```

Review selection must remain deterministic/auditable to the same standard as current Practice and Mastery Check selection.

---

# 12.5G — Successful Mastery Check behavior

If the learner passes Attempt 1, 2, or 3:

```
mastery_status = passed
```

Store:

```
passed_on_attempt = 1 | 2 | 3
```

Any outstanding mandatory Review requirement is closed/not applicable.

Chapter Review immediately becomes optional.

The learner may use it indefinitely.

### Important invariant

Subsequent poor Chapter Review performance must **not revoke** the historical Mastery Check pass.

Represent separately:

```
Mastery:
Confirmed ✅

Current Review evidence:
Needs attention — S08
```

Do not silently transform:

```
mastery_passed
→ mastery_failed
```

because of later Review performance.

---

# 12.5H — Final failure behavior

If Attempt 3 fails:

```
mastery_status = mastery_failed_final
mastery_attempts_used = 3
mastery_attempts_remaining = 0
```

No further Mastery Check can be created.

Chapter Review remains permanently available.

### Student-facing language

Avoid:

> Permanently failed.

Use:

> **Յուրացման ստուգման փորձերն ավարտված են**

with explanatory text equivalent to:

> You have completed all three Mastery Check attempts for this chapter. You can continue reviewing the chapter and strengthening the skills that need attention.

### Teacher/admin language

Can be explicit:

```
Mastery: Not demonstrated
Attempts: 3 / 3
Further Mastery Check attempts: unavailable
```

---

# 12.5I — Administrative exception policy

Do not give teachers a casual "Reset attempts" button.

If exceptional circumstances eventually require an additional attempt, this must be a separately governed administrative override.

If implemented in this sprint, it must require:

```
authorized admin role
reason code
free-text justification
timestamp
actor identity
previous state
new state
audit log
```

A teacher should not silently create Attempt 4.

If there is no immediate operational need, defer the actual override UI and make Attempt 3 final.

---

# 12.5J — Student experience

## After first failure

Primary state:

> **Յուրացման ստուգումը դեռ հաստատված չէ**

Primary CTA:

> **Անցնել Գլխի կրկնություն**

Secondary:

> View results

Mastery Check Attempt 2 remains locked.

After qualifying Review completion:

> **Կրկին անցնել յուրացման ստուգումը**

---

## After second failure

Same flow:

> Chapter Review required

then:

> Final Mastery Check attempt available

The interface should make clear that this is:

> **Փորձ 3 / 3**

without punitive wording.

---

## After a pass

Show:

> **Գլխի յուրացումը հաստատված է**

Actions:

```
[Continue]
[Review Chapter]
[View results]
```

Chapter Review is secondary/optional.

---

## After third failure

Show:

> **Յուրացման ստուգման փորձերն ավարտված են**

Actions:

```
[Review Chapter]
[View results]
```

No Mastery Check CTA.

---

# 12.5K — Student Chapter Review experience

Provide a clear entry point:

> **Կրկնել գլուխը**

The Review screen should explain:

> Review questions are selected from across the chapter. Skills that need more attention may appear more often.

If mandatory:

> **Այս կրկնությունը պետք է ավարտեք՝ յուրացման ստուգումը կրկին անցնելու համար։**

If optional:

> **Լրացուցիչ կրկնություն**

Review completion should use natural messaging, not expose internal reasons such as:

```
review_requirement_satisfied
pool_exhausted
```

Internal reason codes remain telemetry only.

---

# 12.5L — Teacher dashboard analytics

Add chapter-level Review analytics beside existing learner analytics.

For each learner × chapter:

| FieldExample                |                                            |
| --------------------------- | ------------------------------------------ |
| Mastery status              | Confirmed / Not demonstrated / In progress |
| Mastery attempts            | 2 / 3                                      |
| Passed on attempt           | 2                                          |
| Required Reviews completed  | 1                                          |
| Optional Reviews            | 4                                          |
| Total Chapter Reviews       | 5                                          |
| Last Review                 | Sep 21                                     |
| Current Review cycle        | 2                                          |
| Current cycle coverage      | 37 / 61                                    |
| Review independent accuracy | 76%                                        |
| Hint-assisted responses     | 8                                          |
| Skills needing attention    | S03, S08                                   |

### Teacher drill-down

Clicking the chapter should reveal:

```
Mastery Attempt 1
→ FAIL

Required Review #1
→ 12 questions
→ S03 and S08 received extra exposure

Mastery Attempt 2
→ PASS

Optional Reviews
→ 4
```

Then per skill:

```
Skill
Review attempts
Independent correct
Hint-assisted
Recent Review performance
Last seen
Current attention status
```

---

# 12.5M — “Skills needing attention”

Do not reuse the lifetime mastery score for this indicator.

Create a **Review-specific attention model** based on recent Review evidence.

Inputs may include:

```
recent independent correctness
hint dependence
number of recent Review observations
Mastery Check skill failures
recency
repeat errors
```

Initial output states:

```
stable
monitor
needs_attention
insufficient_review_evidence
```

Do **not** invent hard thresholds inside implementation before explicitly defining them.

This sub-slice should first establish the model and telemetry.

Thresholds can be conservative/configurable and later calibrated from evidence.

---

# 12.5N — Separation from mastery/calibration evidence

This is a hard requirement.

All analytical systems must distinguish:

```
pre-mastery Practice
required post-failure Chapter Review
Mastery Check
optional post-pass Chapter Review
optional post-final-failure Chapter Review
```

A voluntary Review performed after mastery must never inflate:

> attempts required to reach mastery.

Likewise, required Review must not be mistaken for normal pre-Mastery Practice.

Add appropriate provenance fields/views before allowing Review evidence into analytics.

---

# 12.5O — Recommendation system integration

### After Mastery Check failure 1 or 2

"What to Do Next" must prioritize:

```
required Chapter Review
```

It must **not** recommend ordinary Practice or another Mastery Check ahead of the mandatory Review.

After required Review completes:

```
Mastery Check retry
```

becomes the primary recommendation.

### After Mastery Check pass

Primary recommendation may advance the learner to the next chapter/unit.

Chapter Review remains an optional secondary action.

### After final failure

Primary recommendation should not endlessly tell the student to retake Mastery Check.

It may recommend:

```
Review Chapter
```

or progression behavior defined by future programme policy.

---

# 12.5P — Mastery Check generation and attempt integrity

Every Mastery Check must store:

```
attempt_number = 1 | 2 | 3
preceding_required_review_id, where applicable
mastery_policy_version
```

Attempt 2 cannot exist without a completed qualifying Review after Attempt 1 failure.

Attempt 3 cannot exist without:

```
Attempt 2 failed
+
required Review completed
```

Concurrency must be protected.

Two browser tabs must not create:

```
Attempt 2
Attempt 2
```

or create Attempt 4.

Use server-side constraints/transactional locking where appropriate.

---

# 12.5Q — Assessment exposure rules

Mastery Checks should continue following protected assessment-integrity rules.

Chapter Review may expose chapter questions more broadly, so verify carefully that Review does not undermine subsequent Mastery Check integrity.

Recommended hierarchy:

```
Mastery Check
→ unseen protected items preferred

Chapter Review
→ broad chapter pool
```

If the same item pools are shared, Mastery Check selection must still favor unseen/least-exposed protected variants.

If necessary, designate:

```
review-eligible
mastery-check-eligible
both
```

at blueprint/item-scope level.

The Review feature must not make Attempt 2/3 trivial through exact question memorization.

---

# 12.5R — Hints

Chapter Review should support Hinting & Remediation v2.

Record:

```
hint level
pre-answer / post-error
guide scope
guide version
exact rendered content
```

As elsewhere, hinted and independent performance remain distinguishable.

Mastery Check remains hint-free.

---

# 12.5S — Review coverage analytics

Track chapter-bank coverage.

Per learner:

```
eligible chapter questions
unique questions seen this cycle
cycle coverage %
lifetime unique questions seen
exact repeats
pool-exhaustion events
```

Student-facing copy can be simplified:

> **Գլխի կրկնության առաջընթաց՝ 62%**

Teacher-facing analytics may expose exact counts.

Do not present coverage as equivalent to mastery.

---

# 12.5T — Database/data-model requirements

Likely structures include either new tables or explicit extensions for:

```
chapter_mastery_state
mastery_check_attempts
chapter_review_requirements
chapter_review_cycles
chapter_review_sessions
chapter_review_item_exposures
chapter_review_skill_analytics
academic_mastery_policy_versions
```

Exact schema should follow existing normalized architecture rather than duplicating data already held in:

```
learning_sessions
session_items
attempts
exposure events
assessment blueprints
mastery check records
```

Prefer extending canonical structures plus small state/policy tables over creating parallel duplicate evidence systems.

---

# 12.5U — Security and tenant boundaries

All existing authorization rules apply.

A learner can access only:

-  their own Mastery state; 
-  their own Review sessions; 
-  their entitled programme/chapter. 

Teachers see Review analytics only for assigned students/classes.

School administrators remain institution-bounded.

Central/platform roles remain governed separately.

Cross-tenant tests must include Chapter Review and Mastery-attempt records once multi-tenant infrastructure applies.

---

# 12.5V — Historical migration

Existing Physics 7 records must not be rewritten inaccurately.

Define migration rules explicitly.

Examples:

Existing passed Mastery Check:

```
→ mastery_passed
→ passed_on_attempt derived only if historically provable
→ Chapter Review optional
```

Existing failed check:

Do **not** infer Attempt 1/2/3 if history cannot establish it.

Use an explicit migration/provenance state such as:

```
legacy_attempt_history
```

where necessary.

No fabricated attempt history.

---

# 12.5W — Analytics and reporting invariants

Teacher/student analytics must separately report:

```
Mastery attempts
Required Reviews
Optional Reviews
Review cycles
Review item coverage
Review skill evidence
Final Mastery status
```

Never collapse:

```
Required Review + Optional Review
```

when the distinction matters.

Never use optional post-pass Review to reinterpret how mastery was initially obtained.

---

# 12.5X — QA matrix

At minimum test:

```
Pass Attempt 1
Fail 1 → Review → Pass 2
Fail 1 → Review → Fail 2 → Review → Pass 3
Fail 1 → Review → Fail 2 → Review → Fail 3
Attempt 2 blocked before Review
Attempt 3 blocked before Review
Attempt 4 impossible
Review optional after pass
Review available after final fail
poor optional Review does not revoke mastery
whole-chapter rotation
failed-skill weighting
pool exhaustion
hint use
review-cycle rollover
recommendation routing
teacher analytics
duplicate/race-condition protection
historical migration
mobile/desktop UX
```

Also test direct API calls, not just UI flows.

---

# 12.5Y — Acceptance criteria

Sprint 12.5 is complete only when:

-  universal versioned Chapter Mastery & Review Policy exists; 
-  policy applies independently of Physics 7 and supports future subjects/grades; 
-  maximum three Mastery Check attempts is enforced server-side; 
-  failures on Attempts 1 and 2 require a completed Chapter Review; 
-  a Review cannot be bypassed by opening/abandoning a session; 
-  passing on any attempt terminates the mandatory retry loop; 
-  Attempt 3 failure produces final `mastery_failed_final`; 
-  Attempt 4 is impossible through UI and API; 
-  Chapter Review remains available after pass and final failure; 
-  Chapter Review is a separate session mode; 
-  mandatory/voluntary Review contexts are distinguishable; 
-  whole-chapter rotational selection exists; 
-  failed/weak skills receive additional Review weight; 
-  exact repeats are bounded by exposure/pool rules; 
-  Review supports Hinting v2; 
-  Review does not alter a previously passed Mastery Check; 
-  Review evidence does not contaminate pre-mastery calibration evidence; 
-  teacher dashboard shows review counts, history, coverage and skills needing attention; 
-  "What to Do Next" follows the new state machine; 
-  learner copy is natural Armenian and exposes no internal codes; 
-  historical records are migrated without fabricated provenance; 
-  concurrency/race-condition tests pass; 
-  security/tenant boundaries pass; 
-  automated regression suite passes; 
-  browser QA passes on supported screen sizes; 
-  GitHub technical source of truth and Notion roadmap are synchronized. 

---

# Explicit non-goals

This sprint should **not** introduce:

-  automatic spaced-repetition scheduling; 
-  a fourth Mastery Check; 
-  teacher-controlled arbitrary attempt limits; 
-  school-specific mastery-policy overrides; 
-  AI-generated review questions; 
-  automatic revocation of previously confirmed mastery; 
-  empirical calibration of Review-attention thresholds; 
-  public leaderboard/gamification; 
-  cross-chapter cumulative exams. 

Those can be separate future work.

---

## Recommended roadmap placement

I would insert it as:

> **Sprint 12.5 — Universal Chapter Review & Mastery-Retry Lifecycle**

between the completion of Sprint 12 and the current **Sprint 13 — Chapter I Standards-Verified Production Release**.

That placement is important because **Chapter I should not become the reference production implementation until this universal mastery lifecycle is settled**. Otherwise Sprint 13 would certify a chapter workflow that we already know is incomplete.

So after current Sprint 12 work, the sequence should become:

```
Sprint 12
Learning-Model Calibration
        ↓
Sprint 12.5
Universal Chapter Review & Mastery-Retry Lifecycle
        ↓
Sprint 13
Chapter I Standards-Verified Production Release
```

This is substantial enough to deserve its **own sprint**, rather than being squeezed into 12A.5 or treated as a small UI enhancement.