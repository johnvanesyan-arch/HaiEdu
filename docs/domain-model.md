# Domain model — v0.2

## Curriculum hierarchy

```text
curriculum_frameworks
  -> subject_programs / courses
      -> units
          -> topics
              -> learning_outcomes
                  <-> skills
```

`skills` are the platform's diagnostic/mastery evidence layer. They may be more granular than official learning outcomes.

## Assessment scope hierarchy

```text
course
  -> unit
      -> diagnostic           (unit-bound learning guidance)
      -> skills
          -> practice         (skill-bound learning activity)
      -> mastery_check        (unit-bound verification)
```

Course progress aggregates unit evidence. A future cumulative/final course assessment is a separate assessment type and must explicitly declare course-level scope.

There is no platform rule that a unit has exactly 10 skills. Assessment coverage is derived from the unit's defined skills and its assessment blueprint. PHY7-U01 currently has 10 skills and uses 2 items per skill for both diagnostic and mastery-check forms; that is a Unit I configuration only.

## Textbook mapping

```text
textbooks
  -> textbook_mappings -> learning_outcomes
```

A textbook section is a navigation/mapping layer. It does not own the skill definition.

## Skill graph

```text
skills
  -> skill_prerequisites -> skills
```

Each skill has a competency layer:
- knowledge
- application
- transfer
- reasoning

## Assessment

```text
items
  -> item_options          (student-readable)
  -> item_answer_keys      (protected)
  -> attempts

learning_sessions
- student_id
- unit_code                (required scope for diagnostic/practice/mastery_check)
- mode                     (diagnostic | practice | mastery_check)
- target_skill_id          (practice when applicable)
```

Semantic rules:
- `diagnostic` guides learning; it does not pass/fail;
- `practice` develops and records evidence for a skill;
- `mastery_check` independently verifies one unit;
- course completion/progress is computed from unit-level evidence rather than inferred from one unit assessment.

## Learner model

```text
student_skill_mastery
- alpha_evidence
- beta_evidence
- mastery_score
- evidence_count
- status
```

This is an MVP evidence model, not a final psychometric model.

## School workflow

```text
schools
classes
class_memberships
assignments
assignment_skills
```
