# Sprint 12A — Hinting & Remediation v2

**Status:** 🟡 Implementation in progress  
**Opened:** 2026-09-20

## Goal

Replace the current one-guide-per-skill Practice help experience with deterministic, progressively scaffolded, task-aware remediation while preserving the existing skill guide as a guaranteed fallback.

No live LLM generation is introduced.

## Pedagogical contract

Practice help follows three levels:

1. **Orient** — direct attention to the relevant quantities/concept without giving the operation result.
2. **Strategy** — state the procedure or reasoning rule needed for the current task.
3. **Analogous worked example** — demonstrate the method on different values/context; never solve the learner's live item.

After help, independent evidence remains required for recovery/mastery confirmation.

Diagnostic and Mastery Check continue to expose no hints.

## Resolution hierarchy

At runtime:

```text
published template + error-specific guide (post-error only)
  -> published template default guide
      -> published skill guide fallback
```

The system must never fail a Practice question merely because a template guide is missing.

## Answer-safety

Template guides may interpolate only explicitly allow-listed **raw variant parameters** from the current deterministic item.

The renderer does not evaluate expressions, formulas, or derived values. Therefore it can insert values such as the current sheet count or source unit, but cannot calculate the live correct answer.

Worked examples use different authored values.

## Telemetry

Every help event records:

- pre-answer vs post-error context;
- hint level/stage;
- template identity;
- guide scope (template/skill);
- guide source id/version;
- grader error code when available.

No learner response is duplicated into remediation telemetry; response data remains in the authoritative attempt record.

## Initial rollout

Author task-specific guides for all 8 current parameterized Chapter I templates:

- PHY7-U01-S07-T-LENGTH-TO-M
- PHY7-U01-S07-T-TIME-TO-S
- PHY7-U01-S07-T-VOLUME-TO-L
- PHY7-U01-S08-T-SCALE-DIVISION
- PHY7-U01-S08-T-SCALE-READING
- PHY7-U01-S09-T-MEASUREMENT-ERROR
- PHY7-U01-S10-T-DISPLACEMENT-VOLUME
- PHY7-U01-S10-T-SHEET-THICKNESS

These 8 templates currently cover 80 published deterministic variants.

The remaining fixed/authored templates continue using skill-level fallback until reviewed and given template-specific guides where pedagogically valuable.

## UI contract

Practice labels progress as:

- Level 1 button: **Հուշում**
- Level 2 button: **Հաջորդ հուշումը**
- Level 3 button: **Տեսնել նման օրինակ**
- after Level 3: no additional help

The UI tells the learner that help use is recorded and later independent confirmation is required.

## Non-goals for this slice

- no change to mastery threshold;
- no change to the current 0.65 assisted-positive evidence multiplier;
- no live AI hint generation;
- no automatic psychological misconception inference from generic wrong answers;
- no hints in Diagnostic or Mastery Check.

## Acceptance criteria

- [ ] database supports versioned template-level guides and richer remediation telemetry;
- [ ] 8 parameterized templates have published task-specific guides;
- [ ] `get-remediation-help` resolves template-specific guide first and skill guide fallback second;
- [ ] safe raw-parameter interpolation works without derived-answer computation;
- [ ] post-error help records grader error code when available;
- [ ] Practice UI exposes the three pedagogically distinct levels clearly;
- [ ] existing skill fallback still works for templates without v2 guides;
- [ ] regression tests cover resolver precedence, parameter safety, fallback and UI copy;
- [ ] Supabase deployment and database advisors verified.
