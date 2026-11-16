"""Fictional curriculum for the owned BF-21 database.

These are synthetic gate records, not an approval of any real curriculum.
Every existing constraint/trigger remains enabled. The fixture activates through
the normal draft-to-pilot gate. The optional assessment profile adds fictional
questions; neither profile seeds learner sessions or responses.
"""
from datetime import datetime, timezone
import hashlib
import uuid

from psycopg import sql
from psycopg.types.json import Jsonb


def seed_navigation_curriculum(connection, school, *, assessment_files=False, mastery=False, pilot=False):
    label = school['label']
    prefix = 'bf21_' + label.lower()
    title = 'Synthetic unit ' + label
    now = datetime.now(timezone.utc)
    evidence = Jsonb({'synthetic': True, 'purpose': 'local dashboard qualification only'})
    ids = {key: str(uuid.uuid4()) for key in (
        'authority', 'frameworkDoc', 'standardDoc', 'programmeDoc', 'unit',
        'topic', 'outcome', 'skill', 'family', 'reconciliation', 'release')}

    def insert(table, **row):
        connection.execute(sql.SQL('INSERT INTO public.{} ({}) VALUES ({})').format(
            sql.Identifier(table), sql.SQL(',').join(map(sql.Identifier, row)),
            sql.SQL(',').join(sql.Placeholder() for _ in row)), list(row.values()))

    insert('curriculum_authorities', id=ids['authority'], code=prefix,
           name_hy='Synthetic authority ' + label, country_code='ZZ',
           authority_type='other', lifecycle_status='active')
    for key, kind, subject, grade in (
        ('frameworkDoc', 'national_framework', None, None),
        ('standardDoc', 'subject_standard', school['subject'], None),
        ('programmeDoc', 'grade_programme', school['subject'], school['grade']),
    ):
        insert('curriculum_source_documents', id=ids[key], source_key=prefix + '_' + kind,
               authority_id=ids['authority'], source_class='normative', document_type=kind,
               subject_id=subject, grade_id=grade, title_hy='Synthetic ' + kind,
               version_label='fixture-v2', official_url='https://example.invalid/' + prefix,
               revision_status='current', verification_status='verified',
               notes='Synthetic local fixture; no real source or SME approval claim.')
    insert('units', id=ids['unit'], subject_program_id=school['programme'],
           code=prefix.upper() + '_U1', title_hy=title, sequence_order=1, status='published')
    insert('topics', id=ids['topic'], unit_id=ids['unit'], title_hy='Synthetic topic',
           sequence_order=1, status='published')
    insert('learning_outcomes', id=ids['outcome'], topic_id=ids['topic'],
           statement_hy='Synthetic navigation outcome', sequence_order=1, status='published',
           source_document_id=ids['programmeDoc'], source_locator='fixture:1', requirement_level='mandatory')
    insert('skills', id=ids['skill'], subject_id=school['subject'], grade_id=school['grade'],
           code=prefix.upper() + '_S1', name_hy='Synthetic skill', layer='knowledge',
           sequence_order=1, status='published')
    insert('item_families', id=ids['family'], skill_id=ids['skill'], code=prefix.upper() + '_F1',
           name_hy='Synthetic family', metadata=evidence)
    insert('curriculum_reconciliation_runs', id=ids['reconciliation'], reconciliation_key=prefix,
           subject_program_id=school['programme'], unit_id=ids['unit'],
           framework_document_id=ids['frameworkDoc'], subject_standard_document_id=ids['standardDoc'],
           programme_document_id=ids['programmeDoc'], status='complete', completed_at=now,
           source_snapshot=evidence, notes='Synthetic fixture reconciliation only.')
    insert('curriculum_releases', id=ids['release'], release_key=prefix,
           subject_program_id=school['programme'], release_number=1, version_label='fixture-v2',
           status='draft', provenance_quality='exact', source_snapshot=evidence,
           content_fingerprint=hashlib.sha256(prefix.encode()).hexdigest(),
           notes=('Synthetic local Mastery lifecycle qualification.' if mastery else 'Synthetic local assessment/file qualification.' if assessment_files
                  else 'Synthetic dashboard navigation only; assessments are unconfigured.'))
    insert('curriculum_release_units', curriculum_release_id=ids['release'], unit_id=ids['unit'],
           unit_code_snapshot=prefix.upper() + '_U1', title_hy_snapshot=title, sequence_order_snapshot=1)
    insert('curriculum_release_reconciliations', curriculum_release_id=ids['release'],
           reconciliation_id=ids['reconciliation'], unit_id=ids['unit'])
    insert('curriculum_release_outcomes', curriculum_release_id=ids['release'],
           learning_outcome_id=ids['outcome'], source_document_id=ids['programmeDoc'],
           statement_hy_snapshot='Synthetic navigation outcome', source_locator_snapshot='fixture:1',
           requirement_level_snapshot='mandatory', framework_references_snapshot=[],
           subject_standard_references_snapshot=[], mapping_notes_snapshot='Synthetic fixture', sequence_order_snapshot=1)
    insert('curriculum_release_skills', curriculum_release_id=ids['release'], skill_id=ids['skill'],
           skill_code_snapshot=prefix.upper() + '_S1', name_hy_snapshot='Synthetic skill',
           layer_snapshot='knowledge', sequence_order_snapshot=1, disposition_snapshot='synthetic',
           rationale_snapshot='Synthetic fixture', outcome_mapping_snapshot=Jsonb([]))
    insert('curriculum_release_item_families', curriculum_release_id=ids['release'],
           item_family_id=ids['family'], skill_id=ids['skill'], family_code_snapshot=prefix.upper() + '_F1',
           primary_learning_outcome_id=ids['outcome'], disposition_snapshot='synthetic',
           mapping_type_snapshot='synthetic', rationale_snapshot='Synthetic fixture')
    if assessment_files or mastery or pilot:
        from staging_assessments import seed_assessments
        seed_assessments(connection, school, ids, insert, now, mastery=mastery, pilot=pilot)
    else:
        # Navigation has no questions, scoring policy or learning-model binding.
        # The UI must accurately show unavailable assessments, never start a session.
        for purpose in ('practice', 'diagnostic', 'mastery_check'):
            pool = str(uuid.uuid4())
            insert('assessment_pools', id=pool, code=prefix + '_' + purpose,
                   unit_code=prefix.upper() + '_U1', purpose=purpose, name='Synthetic ' + purpose,
                   is_protected=purpose != 'practice', status='draft', metadata=evidence)
            insert('assessment_blueprints', id=str(uuid.uuid4()), blueprint_key=prefix + '_' + purpose,
                   curriculum_release_id=ids['release'], unit_id=ids['unit'], assessment_pool_id=pool,
                   purpose=purpose, version_number=1, status='pilot', selection_policy_version='synthetic-unconfigured-v1',
                   configuration_snapshot=evidence, item_set_fingerprint=hashlib.sha256(purpose.encode()).hexdigest(),
                   published_at=now)
    for gate in ('official_programme_identified', 'normative_sources_registered', 'outcomes_reconciled',
                 'skills_mapped', 'assessment_scope_bound', 'content_qa_passed'):
        insert('curriculum_release_gate_checks', curriculum_release_id=ids['release'], gate_code=gate,
               status='passed', evidence=evidence, notes='Synthetic fixture only; no real content acceptance.', checked_at=now)
    connection.execute("UPDATE curriculum_releases SET status='pilot' WHERE id=%s", [ids['release']])
    school.update(unit=ids['unit'], release=ids['release'])
    if pilot:
        from staging_pilot import seed_writing
        seed_writing(connection, school)
