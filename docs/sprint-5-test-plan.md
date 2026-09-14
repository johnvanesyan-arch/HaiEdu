# Sprint 5 test plan

Use an authenticated student account in a bounded practice session.

## Case A — progressive help

1. Start recommended practice.
2. On a question, click **Օգնություն** before answering.
3. Confirm Hint 1 appears and does not reveal the answer.
4. Click **Ավելի շատ օգնություն**.
5. Confirm Hint 2 appears.
6. Click again.
7. Confirm a worked example appears with different values/context.
8. Answer correctly.
9. Verify the attempt is stored with `hint_used = true`.

## Case B — mistake remediation

1. Answer a question incorrectly.
2. Confirm the learner can click **Բացատրել սխալը** before moving on.
3. Confirm the explanation does not reveal a protected answer key.
4. Move to the next question.
5. Confirm the same item is not immediately repeated.

## Case C — adaptive difficulty

1. Give two consecutive incorrect answers on the target skill.
2. Confirm the scheduler reports/records bridge selection when possible.
3. Confirm desired difficulty drops relative to normal practice.

## Case D — spacing and repeat control

1. Continue until all six items in a skill have been seen.
2. Confirm unresolved mistakes may return only after spacing.
3. Confirm the immediately previous item is not served again when alternatives exist.
4. Confirm a question is not served more than twice in one session while alternatives remain.

## Case E — bounded session

1. Continue making errors.
2. Confirm the practice session still ends at eight questions.

## Case F — independent recovery

1. Use hints on several correct answers.
2. Confirm hinted correctness does not independently satisfy the recent-recovery rule.
3. Produce four independent correct answers within the last five attempts across at least four unique items.
4. Confirm the session may end by independent recovery.
