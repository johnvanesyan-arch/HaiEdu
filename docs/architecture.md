# Architecture — v0.3

## Principle

The platform's core learning engine must not depend on generative AI.

The platform core is subject-neutral and has no default, reference or privileged subject. Physics is one subject taught and assessed through the same governed contracts as every other subject. Identity, tenancy, enrollment, curriculum versioning, learning sessions, evidence provenance, authorization, navigation and shared analytics operate from governed data and stable contracts. Subject-specific content models, response renderers, scoring strategies, mastery policies and terminology belong in explicit, versioned extensions. The normative boundary and acceptance criteria are defined in `docs/subject-neutral-core.md`.

```text
Student UI
   |
   v
Supabase Auth + PostgreSQL
   |
   v
submit-answer Edge Function
   |
   +--> deterministic grading engine
   +--> attempt storage
   +--> mastery engine
   +--> prerequisite / recommendation engine
   |
   +--> optional AI gateway (future; only when needed)
```

## Learning scope model

```text
Course / subject program
  -> Unit
      -> Diagnostic          = learning guidance for that unit
      -> Skills
          -> Practice        = learning activity for one skill
      -> Mastery check       = independent verification of that unit
```

Course-level progress aggregates the states of its units. A future cumulative/final course assessment is a separate explicit assessment type; it must not be represented as a unit diagnostic or unit mastery check.

The number of skills in a unit is variable. Assessment blueprints derive their coverage from the unit's skill set/form definition. The current `PHY7-U01` configuration happens to contain 10 skills and 2 assessment items per skill; those values are not global architecture constants.

For the existing learning-session modes, `unit_code` is the authoritative assessment/learning scope. Practice may additionally target one `target_skill_id` within that unit.

## Backend responsibilities

### Grading engine
Determines whether a structured answer is correct. Initial supported types:
- single-choice
- true/false
- numeric
- physical quantity with unit conversion

### Mastery engine v0.1
Uses a transparent Beta-evidence model. It is provisional, intentionally simple, and must not be presented as psychometrically validated.

### Curriculum graph
Stores skills and prerequisite relationships independently from textbooks. Textbooks map onto official outcomes/skills rather than defining the curriculum.

### Recommendation engine v0.1
Returns one of:
- `review_prerequisite`
- `continue_current_skill`
- `advance_skill`
- `collect_more_evidence`

Recommendations must remain resolvable to the relevant course/program, unit and skill rather than relying on a single-course assumption.

### AI gateway
Not included in the first student-facing loop. Future AI calls must occur server-side and receive the minimum educational context required; student identity should not be sent unless strictly necessary.

## Security principle

Correct answers are stored separately from student-readable item content. Students never receive answer keys through normal database reads. The grading Edge Function retrieves answer keys server-side.

## Security notes

- Student-readable item content and protected answer keys are separated.
- Students cannot update their own `role` through `profiles`; role elevation is admin-controlled.
- Attempt + mastery writes use one database RPC so they are atomic.
- Class/member RLS uses `SECURITY DEFINER` helper functions to avoid recursive RLS policies.
