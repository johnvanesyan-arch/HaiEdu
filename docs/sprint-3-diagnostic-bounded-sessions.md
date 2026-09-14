# Sprint 3 — Diagnostic + Bounded Learning Sessions

## Objective

Separate assessment from adaptive practice and remove the possibility of an endless learner loop.

## Modes

### Diagnostic

- Fixed at **20 questions** for Chapter I.
- Samples **2 items from each of the 10 micro-skills**.
- Selected items are stored when the session starts.
- An item cannot be repeated inside the diagnostic session.
- A wrong answer does not add questions.
- Correct/incorrect feedback is deferred until the diagnostic ends.
- The UI always displays the current position, e.g. `7 / 20`.

### Adaptive practice

- Fixed maximum of **8 questions per session**.
- The target is the first Chapter I skill that is not yet complete under the provisional mastery/recovery rule.
- Unseen items are served before repeated items.
- Once all available items have been seen, unresolved wrong items are prioritised for remediation.
- A practice session can end early if the target skill reaches the mastery threshold or meets the recent-recovery criterion.
- The session always ends at the item limit even when mastery has not yet been reached.

## Completion rules

Diagnostic completion:

`answered_count == planned_item_count`

Practice completion occurs when any of the following is true:

1. model mastery reaches the provisional threshold (`>= 0.72`, with enough evidence);
2. recovery criterion is met (at least 4 of the most recent 5 correct after sufficient item variety);
3. the session reaches its maximum of 8 answered questions.

A new bounded practice session can be started later if the skill still needs work.

## Data model

Sprint 3 adds:

- `learning_sessions`
- `learning_session_items`
- `attempts.learning_session_id`
- `attempts.learning_session_item_id`
- `record_session_graded_attempt(...)`

Session writes remain server-side. Students can read only their own session records through RLS.

## Edge Functions

- `start-learning-session`
- `get-session-item`
- updated `submit-answer`

All require JWT authentication.

## Student UX

After login the learner chooses between:

1. **Ախտորոշում** — a fixed 20-question diagnostic;
2. **Վարժանք** — a bounded adaptive practice session of at most 8 questions.

The diagnostic does not reveal correctness question-by-question. Practice retains immediate feedback.

## Existing pilot history

Attempts made before Sprint 3 are preserved. New attempts are linked to explicit sessions so diagnostic and practice data can be separated in later analytics.

## Sprint 4 dependency

Sprint 4 should build a learner-facing diagnostic results dashboard: skill-by-skill performance, strengths, gaps, and recommended starting point. Sprint 3 only provides a basic completed-session score.
