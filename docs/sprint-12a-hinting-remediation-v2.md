# Sprint 12A — Hinting & Remediation v2

**Status:** ✅ Foundation implemented; fixed-template expansion remains selective content work  
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

- [x] database supports versioned template-level guides and richer remediation telemetry;
- [x] 8 parameterized templates have published task-specific guides (9 published guide records including one error-specific repair);
- [x] `get-remediation-help` resolves error-specific template → default template → skill fallback;
- [x] safe raw-parameter interpolation works without derived-answer computation;
- [x] post-error help records grader error code when available;
- [x] Practice UI exposes the three pedagogically distinct levels clearly;
- [x] existing skill fallback remains the default for templates without v2 guides;
- [x] regression tests cover resolver precedence, parameter safety, fallback and UI copy;
- [x] Supabase deployment and database advisors verified; duplicate index introduced by the slice was removed in migration 0043.


## Implementation record — 2026-09-20

- Database migration: `0042_sprint_12a_hinting_remediation_v2.sql`.
- Cleanup migration: `0043_sprint_12a_hinting_v2_index_cleanup.sql`.
- Runtime: `get-remediation-help` deployed as Supabase Edge Function version **5**.
- Published v2 guide records: **9**.
- Covered item templates: **8**.
- Covered published parameterized variants: **80**.
- Error-specific guide records: **1** (`missing_unit` for volume-to-litres).
- Historical remediation events backfilled with context/template metadata where derivable: **21/21**.
- Existing mastery thresholds and the **0.65** assisted-positive evidence multiplier were not changed.
- No live AI/LLM call was added.

### Security/advisor disposition

`item_template_remediation_guides` is intentionally server-only: RLS is enabled, client grants are revoked, and the service role is used by the authenticated Edge Function. Supabase therefore reports the table as **RLS enabled with no policy** at INFO level; this is an intentional deny-by-default posture rather than an exposed table.

Other advisor findings (leaked-password protection, legacy unindexed foreign keys, auth RLS init-plan warnings, multiple permissive policies, unused indexes) predate this slice and remain in the broader hardening backlog.

### Content expansion rule

Do not mechanically add template-level guides to every fixed question. Add them where the task structure, likely error modes, or transfer demand benefits from more specific scaffolding. Otherwise retain the reviewed skill-level fallback.
