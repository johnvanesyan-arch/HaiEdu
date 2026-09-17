# Mastery Engine v0.2

## Status

Provisional MVP algorithm. Transparent and testable, but **not psychometrically validated**.

## Scope distinction

The learner model and the mastery-check assessment operate at different levels:

- `student_skill_mastery` = **skill-level evidence model**;
- diagnostic = **unit-level learning guidance** across the unit's skills;
- mastery check = **unit-level independent verification** across the unit's skills;
- course progress = aggregation of unit states.

A skill becoming `secure` does not by itself verify a unit. A unit becomes verified only through its unit-bound mastery check under the current provisional verification rule.

## Skill model

For each `(student, skill)` pair we maintain two positive evidence parameters:

- `alpha_evidence`
- `beta_evidence`

Initial prior:

```text
alpha = 2
beta = 2
mastery = 0.50
```

Each attempt contributes weighted success/failure evidence. Harder items provide slightly more weight. Correct answers obtained with a hint provide reduced positive evidence.

```text
mastery_score = alpha / (alpha + beta)
```

## Provisional skill statuses

- fewer than 3 attempts -> `insufficient_evidence`
- mastery < 0.45 -> `needs_support`
- mastery < 0.72 -> `developing`
- mastery >= 0.72 -> `secure`

These thresholds are placeholders for pilot validation, not educational facts.

## Unit verification

A unit mastery check samples the skills owned by that unit. Its blueprint is unit-specific rather than globally fixed to 10 skills.

For current `PHY7-U01` only:
- 10 skills;
- 2 mastery-check items per skill;
- 20 items total;
- provisional pass rule: >=80% overall and at least 1/2 correct for every sampled skill.

These are Unit I pilot settings, not permanent platform-wide rules.

## Future validation

After real pilot data we should compare alternatives such as:

- Bayesian Knowledge Tracing
- Item Response Theory / Rasch-family approaches
- Elo-like skill estimation
- retention-aware evidence decay

No switch should be made merely because an algorithm is more sophisticated. It must improve diagnostic validity and usefulness for teachers.
