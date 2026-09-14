# Sprint 5 — Adaptive Practice v2

## Objective

Build a bounded, pedagogically sensible remediation engine for Grade 7 Physics Chapter I.

## Implemented behaviour

### Session limits

Practice remains bounded to a maximum of 8 questions. A student can finish earlier when mastery or independent recent recovery is demonstrated.

### Skill targeting

Practice can target the skill recommended by the Sprint 4 dashboard. The recommendation layer remains prerequisite-aware.

### Difficulty adjustment

Base desired difficulty depends on the current mastery score. After one consecutive incorrect answer, the scheduler lowers the desired difficulty by one level. After two or more consecutive incorrect answers, it enters a bridge mode and lowers the desired difficulty by two levels (minimum difficulty 1).

### Varied item selection

The scheduler:

1. prefers unseen items;
2. avoids immediate repetition of the last two items;
3. prefers unresolved mistakes only after spacing;
4. caps repeated use of the same item at two appearances when alternatives exist;
5. falls back to spaced review when no unseen or unresolved items remain.

### Spaced remediation

An incorrectly answered item is not immediately repeated. The learner first receives another item, preferably unseen or easier. An unresolved item can return after at least two intervening items.

### Progressive help ladder

During practice, students can request help in three deterministic stages:

1. Hint 1 — conceptual cue;
2. Hint 2 — explicit strategy/formula;
3. Worked example — different numbers/context from the current question.

The current question's answer key is never sent to the browser.

Help can also be requested after an incorrect answer before moving to the next item.

### Independent mastery requirement

If help was used before submitting an answer, the server marks the attempt as assisted regardless of what the client sends. Positive mastery evidence is discounted by the existing mastery engine.

The recent-recovery completion rule now counts only correct answers completed without help. Assisted correctness therefore cannot by itself satisfy recovery.

## Remediation content

Ten provisional Armenian remediation guides are seeded, one for each Chapter I skill. Each contains:

- misconception/strategy code;
- strategy statement;
- first hint;
- stronger hint;
- worked example.

These guides are development content and still require later SME/content QA.

## New data structures

- `skill_remediation_guides`
- `remediation_events`
- `learning_session_items.hint_level_used`
- `learning_session_items.selection_reason`

## New/updated Edge Functions

- `get-remediation-help` — new, JWT protected;
- `get-session-item` — adaptive scheduler v2;
- `submit-answer` — server-authoritative help tracking.

## Scheduler selection modes

- `new_item`
- `remediation`
- `bridge`
- `spaced_review`

These values are stored on session items for later analytics.

## Current limitations

- Remediation guides are currently skill-level, not yet item-specific or answer-pattern-specific.
- Misconception codes are provisional and not yet empirically validated.
- The mastery threshold (0.72) and recovery rules remain pilot assumptions.
- Chapter I content has not yet received the deferred Physics SME review.

## Sprint 5 validation target

For a weak S08 learner, verify that:

1. a wrong answer does not cause the exact same question to return immediately;
2. the next question is different and can become easier after repeated errors;
3. the help button provides progressively stronger guidance;
4. a worked example uses different numbers and does not expose the current answer;
5. assisted answers are recorded as assisted;
6. repeated errors still end at the 8-question session limit;
7. independent correct answers are required for recovery.
