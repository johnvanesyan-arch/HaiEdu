# Sprint 4 — Diagnostic Results & Student Dashboard

## Objective
Turn raw diagnostic/mastery data into understandable learner guidance and a clear resume-learning flow.

## Implemented

### Dashboard API
`get-student-dashboard` returns:
- latest completed Chapter I diagnostic summary;
- skill-by-skill diagnostic result;
- current mastery evidence per skill;
- current completion state;
- any active learning session;
- a prerequisite-aware recommended starting skill;
- the recommended next action.

### Diagnostic bands
The current Chapter I diagnostic uses two items per skill, so the learner-facing bands are intentionally simple and provisional:
- `2/2` → **Strong**;
- `1/2` → **Developing**;
- `0/2` → **Needs support**;
- no completed diagnostic evidence → **Not assessed**.

These are guidance labels, not psychometric proficiency levels.

### Recommendation logic
The dashboard first considers unfinished skills with the weakest diagnostic evidence. Before recommending a downstream skill, it checks the skill prerequisite graph and redirects to an unresolved prerequisite when necessary.

Example:
`S09 Measurement error` depends on `S08 Scale reading`. If S09 is weak but S08 is still unresolved, the dashboard recommends S08 first.

### Student dashboard
The signed-in student now sees:
- latest diagnostic score;
- number of currently completed skills;
- a clear next-step recommendation;
- all ten Chapter I skills in a skill map;
- diagnostic band and score per skill;
- mastery percentage when evidence exists;
- an indicator for skills currently considered complete;
- buttons to retake the diagnostic or start recommended practice.

### Resume-learning flow
If the learner has an active diagnostic or practice session, the dashboard recommends resuming it and displays the current question count. Leaving a session for the dashboard no longer loses the session.

After a diagnostic or practice session finishes, the learner can return directly to the refreshed dashboard.

### Recommended-practice targeting
`start-learning-session` now accepts an optional validated `targetSkillId` for practice. This lets the dashboard start practice on its recommended skill instead of relying only on the generic first-incomplete-skill rule.

## Current limitation
The diagnostic has only two items per skill. A 2/2, 1/2 or 0/2 result is therefore a coarse signal. Sprint 5 will improve what happens after a gap is identified by adding structured remediation, hints, bridge questions and misconception-aware practice.
