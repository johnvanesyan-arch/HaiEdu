# Architecture — v0.1

## Principle

The platform's core learning engine must not depend on generative AI.

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

### AI gateway
Not included in the first student-facing loop. Future AI calls must occur server-side and receive the minimum educational context required; student identity should not be sent unless strictly necessary.

## Security principle

Correct answers are stored separately from student-readable item content. Students never receive answer keys through normal database reads. The grading Edge Function retrieves answer keys server-side.

## Security notes

- Student-readable item content and protected answer keys are separated.
- Students cannot update their own `role` through `profiles`; role elevation is admin-controlled.
- Attempt + mastery writes use one database RPC so they are atomic.
- Class/member RLS uses `SECURITY DEFINER` helper functions to avoid recursive RLS policies.
