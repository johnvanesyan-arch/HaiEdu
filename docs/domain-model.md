# Domain model — v0.1

## Curriculum hierarchy

```text
curriculum_frameworks
  -> subject_programs
      -> units
          -> topics
              -> learning_outcomes
                  <-> skills
```

`skills` are the platform's diagnostic/mastery layer. They may be more granular than official learning outcomes.

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
```

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
