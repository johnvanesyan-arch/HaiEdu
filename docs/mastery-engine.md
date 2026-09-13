# Mastery Engine v0.1

## Status

Provisional MVP algorithm. Transparent and testable, but **not psychometrically validated**.

## Model

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

## Provisional statuses

- fewer than 3 attempts -> `insufficient_evidence`
- mastery < 0.45 -> `needs_support`
- mastery < 0.72 -> `developing`
- mastery >= 0.72 -> `secure`

These thresholds are placeholders for pilot validation, not educational facts.

## Future validation

After real pilot data we should compare alternatives such as:

- Bayesian Knowledge Tracing
- Item Response Theory / Rasch-family approaches
- Elo-like skill estimation
- retention-aware evidence decay

No switch should be made merely because an algorithm is more sophisticated. It must improve diagnostic validity and usefulness for teachers.
