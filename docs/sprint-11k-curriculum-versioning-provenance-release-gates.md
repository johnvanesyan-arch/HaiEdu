# Sprint 11K — Curriculum Versioning, Provenance & Release Gates

Status: complete on 2026-09-19.

## Outcome

Sprint 11K makes curriculum identity immutable and resolvable for both content and learner evidence. A semantic curriculum change now requires a new release and assessment blueprint; historical evidence is never silently reinterpreted against the current standard.

## Release baseline

| Release | Status | Provenance | Outcomes | Skills | Item families |
| --- | --- | --- | ---: | ---: | ---: |
| `physics7_u01_legacy_pre_11k` | Legacy | `legacy_inferred` | 0 | 0 | 0 |
| `physics7_u01_2026_08_14_pilot_r1` | Pilot | `exact` | 6 | 10 | 77 |

The legacy release deliberately has no normative curriculum snapshots. The 11 existing sessions, 94 attempts, and 56 exposure events predate release identity, so they are bound to the legacy release instead of being relabelled as evidence for the reconciled 2026 pilot.

## Architecture

- `curriculum_releases` identifies the programme release, semantic sequence, source snapshot, reconciliation run, effective period, predecessor, and content fingerprint.
- Release snapshot tables freeze units, official outcomes, skills, and item-family mappings.
- `assessment_blueprints` and `assessment_blueprint_items` freeze the assessment purpose, selection policy, and exact item/version membership.
- Learning sessions, attempts, and item-exposure events carry non-null release, blueprint, and provenance identities.
- `student_skill_mastery_by_release` prevents mastery evidence from crossing curriculum-release boundaries.
- Database triggers bind new sessions and evidence to the active release and matching blueprint, reject provenance mutation, and keep published snapshots immutable.
- Learning APIs resolve the active release, select only from the immutable blueprint membership, query release-scoped mastery/history, and return provenance identifiers.
- The content-quality dashboard exposes releases, gates, and blueprints to admins and content admins.

## Release gates

The active Physics 7 pilot release passes:

1. Official programme identified.
2. Normative sources registered.
3. Outcomes reconciled.
4. Skills mapped.
5. Assessment scope bound.
6. Content QA passed.

`external_sme_approved` remains pending. This is intentionally not required for pilot activation, but it is required by the database gate before production activation.

## Frozen assessment scope

| Purpose | Blueprint status | Item membership |
| --- | --- | ---: |
| Diagnostic | Pilot | 40 |
| Practice | Pilot | 120 |
| Mastery check | Pilot | 80 |

The three blueprints cover 240 published, approved, QA-passed distinct items.

## Evidence migration

| Evidence | Legacy-bound | Unbound after migration |
| --- | ---: | ---: |
| Learning sessions | 11 | 0 |
| Attempts | 94 | 0 |
| Exposure events | 56 | 0 |

Ten release-scoped mastery rows were initialized from the legacy compatibility state. The legacy aggregate table remains temporarily available for compatibility, while runtime reads now use `student_skill_mastery_by_release`.

## Security and integrity

- RLS is enabled on every new public table.
- Only admins and content admins can mutate curriculum releases, snapshots, gates, and blueprints.
- Learners can read only their own release-scoped mastery.
- Activation is fail-closed when required gates are incomplete.
- Composite foreign keys guarantee that evidence cannot point to a blueprint from another release.
- Advisor follow-up migration adds covering composite indexes and removes redundant permissive read paths from governance write policies.

## Verification

- Migrations `0039` and `0040` applied successfully.
- Six release-aware Edge Functions deployed with JWT verification enabled.
- All 11 historical sessions are legacy-bound; none remain active.
- Current pilot snapshots contain 6 official outcomes, 10 skills, and 77 item families.
- Current pilot blueprints contain 40 diagnostic, 120 practice, and 80 mastery-check items.
- All six pilot gates pass; only external SME approval remains pending for production.
- Supabase advisors report no new 11K security findings, redundant policies, or missing 11K foreign-key indexes.

## Exit decision

Sprint 11K is complete for the closed pilot architecture. Production promotion remains blocked, by design, until external Physics SME approval is recorded. Sprint 11L can now close the pilot against this exact reconciled release baseline.
