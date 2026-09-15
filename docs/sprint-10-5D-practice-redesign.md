# Sprint 10.5D — Dedicated Adaptive Practice Experience

## Status

**Implemented.**

Sprint 10.5D extracts adaptive practice from the Home page into a dedicated focused route while preserving the existing Sprint 5 learning engine, deterministic grading, remediation ladder, server-owned hint evidence, bounded sessions and session watchdog.

No database migration or Edge Function deployment was required.

---

## 1. Route change

Practice now has a canonical student route:

`/practice.html`

Optional targeted entry:

`/practice.html?skill=<skill-id>`

The skill id is validated against the authenticated student's Chapter I dashboard data before a session is started.

### Entry points

- Home recommended practice → `practice.html`
- Home secondary practice CTA → `practice.html`
- Mastery-check remediation → creates/resumes the required practice session, then opens `practice.html`
- Physics 7 skill action → `practice.html?skill=<skill-id>`
- Existing active practice session → `practice.html`

Diagnostic remains in the existing Home state machine temporarily and will be extracted in Sprint 10.5E.

---

## 2. Focused learning layout

The dedicated Practice page suppresses the normal browsing navigation through the existing `data-focused-task="true"` student-shell contract.

The visual priority is now:

1. skill context;
2. bounded-session position/progress;
3. question/stimulus;
4. answer controls;
5. help;
6. immediate feedback;
7. next-question action;
8. mastery estimate as secondary information.

There is no speed timer or speed score.

---

## 3. Existing adaptive engine preserved

Sprint 10.5D does not reproduce scheduler truth in the browser. It continues to use:

- `start-learning-session`
- `get-session-item`
- `submit-answer`
- `get-remediation-help`

The server remains authoritative for:

- target skill;
- session limit;
- current item;
- difficulty adjustment;
- new/remediation/bridge/spaced-review selection;
- grading;
- hint state;
- mastery evidence;
- early completion;
- completion reason.

The browser only renders the state returned by those functions.

---

## 4. Adaptive question messaging

The Practice page translates scheduler selection reasons into learner-facing language:

| Server selection mode | Learner-facing framing |
| --- | --- |
| `new_item` | New question |
| `bridge` | Step-by-step / more accessible bridge question |
| `remediation` | Repair the difficult idea in another form |
| `spaced_review` | Revisit an earlier idea after spacing |

These labels explain why the next question feels different without exposing internal mastery calculations.

---

## 5. Remediation behavior

The existing deterministic remediation ladder remains unchanged:

1. Hint 1
2. Hint 2
3. Worked example

The shared `remediation.js` is used directly on the new page.

Help use is still stored server-side on the session item. `submit-answer` determines whether the answer was assisted from the server-side hint state, so the browser cannot falsely mark a hinted answer as independent.

### Feedback states

**Independent correct**

The learner is told the response counts as independent positive evidence.

**Correct with help**

The learner is told that later independent confirmation is still required.

**Incorrect**

The learner can open the post-error explanation or continue to the next adaptive question. The UI does not promise or force immediate repetition of the same item.

---

## 6. Session safety

Direct navigation to Practice does not silently replace another important activity.

If an active diagnostic exists:

- Practice is blocked;
- the diagnostic remains intact;
- the learner is sent back to resume it.

If an active Mastery Check exists:

- Practice is blocked;
- the check remains intact;
- the learner can resume the check.

If an active practice session exists:

- the dedicated Practice page resumes it.

The Physics 7 browser also routes same-skill active practice directly to the dedicated page.

---

## 7. Bounded completion states

The existing server completion rules remain authoritative.

The Practice completion screen explains these current completion reasons:

- `mastery_reached`
- `independent_recovery`
- `item_limit_reached`
- generic completed state

The 8-question maximum remains intact. Early completion is allowed when the server's provisional mastery/recovery rule is satisfied.

The completion page offers:

- **See next step** → Home
- **Return to Physics 7** → subject browser

---

## 8. Freeze/watchdog protection

`session-watchdog.js` remains loaded on the dedicated Practice page.

If question loading remains stuck on the loading state for too long, the learner receives a retry action instead of a permanently frozen page.

The remediation MutationObserver continues to observe application-state nodes only, avoiding the previous self-triggering observer loop.

---

## 9. Files

### Added

- `web/practice.html`
- `web/practice.css`
- `web/practice.js`
- `web/home-practice-router.js`

### Updated

- `web/home-dashboard.js`
- `web/physics-7.js`
- `web/remediation.js`
- `tests/student-shell.test.mjs`
- `.github/workflows/ci.yml`

---

## 10. Transitional architecture note

The old shared question panel still exists inside `index.html` because Sprint 10.5E has not yet extracted Diagnostic.

In 10.5D:

- Home continues to own Diagnostic temporarily;
- a transition adapter (`home-practice-router.js`) intercepts Home practice entry/resume actions and sends them to the dedicated Practice route;
- Physics 7 routes practice directly to the dedicated route;
- the legacy Home practice implementation is therefore no longer the intended student practice path.

Sprint 10.5E can remove the remaining diagnostic/question responsibilities from Home and simplify `app.js` substantially.

---

## 11. Acceptance criteria

- [x] Dedicated authenticated Practice route
- [x] Focused question-first layout
- [x] Shared Sprint 10.5 design system
- [x] Bounded session progress
- [x] Adaptive selection messaging
- [x] Immediate practice feedback
- [x] Hint 1 → Hint 2 → Worked Example retained
- [x] Server-authoritative assisted evidence retained
- [x] Mastery estimate remains secondary
- [x] Active practice resume flow
- [x] Home practice handoff
- [x] Physics 7 practice handoff
- [x] Diagnostic/mastery-check collision protection
- [x] Dedicated completion state
- [x] Session watchdog retained
- [x] Regression tests added
- [x] Browser syntax checks added

## Next phase

Sprint 10.5E extracts and redesigns **Assessment**: Assessment hub + dedicated Chapter I Diagnostic + shared-shell Mastery Check presentation.
