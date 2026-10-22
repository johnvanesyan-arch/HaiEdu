# Assessment scope model — v1.1

## Purpose

HaiEdu separates course-level progress from unit-level assessment and skill-level practice.

## Canonical hierarchy

```text
course / subject program
  -> unit
      -> skills
          -> practice evidence
      -> diagnostic / learning guidance
      -> mastery verification
```

## Scope rules

### Diagnostic = unit-bound learning guidance
A diagnostic belongs to one unit and samples the skills defined for that unit. It answers: **what does the learner currently know, and what should they work on next?**

A diagnostic:
- has no pass/fail meaning;
- may be taken before or during learning;
- produces per-skill evidence used for recommendations;
- must store/resolve a `unit_code`;
- must not be interpreted as course completion.

### Practice = skill-bound learning activity
Practice targets one skill inside one unit. Practice evidence updates the learner model for that skill and can contribute to readiness for that unit's mastery verification.

### Mastery check = unit-bound verification
A mastery check belongs to one unit and samples the skills explicitly declared by its saved policy. It answers: **has the learner met this check's thresholds for its declared assessed skills?**

A mastery check:
- is gated by unit readiness rules;
- has a pass/fail outcome under a provisional rule;
- verifies the declared assessed scope within the unit, not every unit outcome or the entire course;
- reports the saved pass/fail decision and assessed groups; a displayed rounded percentage does not override a failed skill minimum;
- excludes separately assessed work unless an explicit future contract includes it; writing and performed outcomes are not inferred from an automatic pass;
- must store/resolve a `unit_code`;
- must not be used as a course-level final assessment.

### Course progress = aggregation
Course progress aggregates evidence from its units. Example: `1 of 6 unit checks passed`. This is a count of checks, not certification of every course outcome.

Shared learner results, teacher history and school evidence groups use the same scope notice. Historic policy versions retain their original denominators and groups. The registered Physics Unit I extension labels its result as a passed unit check; per-skill learning-model bands remain separate. English's approved configuration reports vocabulary, grammar, reading and listening, while its teacher-marked writing result remains separate and speaking stays classroom-assessed. No English IDs or domain names are embedded in shared UI logic. See [C23 learner acceptance preparation](english-7-unit-01-learner-acceptance.md).

A future cumulative/final course assessment, if added, is a distinct assessment type that may sample skills across multiple units. It must not reuse the semantic meaning of a unit diagnostic or unit mastery check.

## Variable skill counts

There is no invariant that every unit has 10 skills.

```text
Unit A -> 8 skills
Unit B -> 10 skills
Unit C -> 12 skills
```

Assessment blueprints must derive coverage from the unit's defined skills and assessment form. The current Grade 7 Physics Unit I happens to have 10 skills and currently uses 2 items per skill, producing a 20-item diagnostic and a 20-item mastery check. Those numbers are properties of the current Unit I blueprint, not global platform constants.

## Data invariant

Every student-facing recommendation, assessment session, practice session and mastery-verification result must be resolvable through:

```text
student -> course/program -> unit -> skill
```

`learning_sessions.unit_code` is the current session-level scope key. Future multi-unit/cumulative assessment work may add a separate course-level scope, but it must be explicit rather than inferred.

## Current Physics 7 mapping

```text
Physics 7
  -> PHY7-U01 / Chapter I
      -> S01-S10
      -> unit diagnostic (learning guidance)
      -> skill practice
      -> unit mastery check (verification)
```

Chapters II-VI will each receive their own unit skill set, diagnostic blueprint, practice evidence and mastery-verification state as they are implemented.
