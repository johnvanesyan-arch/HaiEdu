"""Fictional assessment content for the owned local BF-21 stack only.

No production content or historical learner evidence is copied. Synthetic gate
records test the normal constraints; they do not approve any real curriculum.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import uuid

from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[2]


def seed_assessments(connection, school, ids, insert, now):
    prefix = 'bf21_' + school['label'].lower()
    source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    model_id, runtime_id, mastery_id = [str(uuid.uuid4()) for _ in range(3)]
    evidence = {'synthetic': True, 'purpose': 'owned local assessment and file qualification'}
    existing = connection.execute("SELECT id FROM academic_mastery_policy_versions WHERE policy_key='bf21_synthetic'").fetchone()
    if existing:
        mastery_id = str(existing[0])
    else:
        insert('academic_mastery_policy_versions', id=mastery_id, policy_key='bf21_synthetic',
               version_number=1, status='active', maximum_mastery_attempts=3,
               review_required_after_failed_attempts=[1, 2], review_optional_after_pass=True,
               review_available_after_final_failure=True, additional_attempt_after_final_failure=False,
               target_review_question_count=2, effective_from=now,
               notes='Fictional local test policy; no real learner activation.')
    insert('runtime_builds', id=runtime_id, build_key=prefix, source_commit=source,
           implementation_manifest=Jsonb(evidence), notes='Synthetic local runtime binding')
    policies = []
    for mode in ('diagnostic', 'practice', 'mastery_check'):
        policy = {'schemaVersion': 'haiedu-assessment-policy-v1', 'policyKey': prefix + '_' + mode,
                  'version': 1, 'mode': mode, 'subjectProgramId': school['programme'],
                  'curriculumReleaseId': ids['release'], 'unitId': ids['unit'],
                  'plannedQuestionCount': 2, 'learningModelConfigurationId': model_id,
                  'academicMasteryPolicyId': mastery_id, 'responseTypes': ['single_choice'],
                  'scoringStrategy': 'selected-response-v1', 'hintsAllowed': mode == 'practice',
                  'baselineRequired': mode != 'diagnostic'}
        if mode != 'practice':
            policy['questionCountBySkill'] = {ids['skill']: 2}
        if mode == 'diagnostic':
            policy['maximumCompletedBaselines'] = 1
        if mode == 'mastery_check':
            policy.update(minimumPercent=80, minimumCorrectBySkill={ids['skill']: 1})
        policies.append(policy)
    model = json.loads((ROOT / 'tests/fixtures/governed-runtime-model.json').read_text())
    model['assessmentPolicyContracts'] = policies
    insert('learning_model_configurations', id=model_id, model_key=prefix, version_label='fixture-v3',
           configuration_kind='approved', reference_curriculum_release_id=ids['release'],
           source_commit=source, configuration=Jsonb(model), deployment_manifest=Jsonb(evidence),
           notes='Synthetic local fixture only; no model or educational acceptance claim.')
    insert('learning_model_runtime_bindings', id=str(uuid.uuid4()), binding_key=prefix,
           curriculum_release_id=ids['release'], unit_code=prefix.upper() + '_U1',
           learning_model_configuration_id=model_id, runtime_build_id=runtime_id,
           status='active', notes='Synthetic local test binding')
    school['assessmentItems'] = []
    for policy in policies:
        mode = policy['mode']
        pool, blueprint, template = [str(uuid.uuid4()) for _ in range(3)]
        insert('item_templates', id=template, item_family_id=ids['family'], code=prefix + '_' + mode,
               template_kind='fixed', template_version=1, status='active',
               generation_config=Jsonb({**evidence, 'authoringProfileVersion': 'haiedu-evidence-blueprint-v1',
                                       'evidenceBlueprintPolicy': 'distinct-purpose-v1',
                                       'requiredEvidencePurposes': ['core_understanding']}))
        insert('assessment_pools', id=pool, code=prefix + '_' + mode, unit_code=prefix.upper() + '_U1',
               purpose=mode, name='Synthetic ' + mode, is_protected=mode != 'practice',
               status='active', metadata=Jsonb(evidence))
        insert('assessment_blueprints', id=blueprint, blueprint_key=prefix + '_' + mode,
               curriculum_release_id=ids['release'], unit_id=ids['unit'], assessment_pool_id=pool,
               purpose=mode, version_number=1, status='draft', selection_policy_version='synthetic-selected-response-v1',
               configuration_snapshot=Jsonb({**evidence, 'assessmentPolicy': policy}),
               item_set_fingerprint=hashlib.sha256((prefix + mode).encode()).hexdigest())
        form = str(uuid.uuid4())
        if mode == 'diagnostic':
            insert('assessment_forms', id=form, pool_id=pool, code=prefix + '_diagnostic',
                   name='Synthetic diagnostic', form_version=1, status='active', metadata=Jsonb(evidence))
        for ordinal in (1, 2):
            item = str(uuid.uuid4())
            code = prefix + '_' + mode + '_' + str(ordinal)
            insert('items', id=item, skill_id=ids['skill'], item_type='single_choice',
                   prompt_hy='Synthetic test: choose the option labelled Correct ' + school['label'],
                   code=code, difficulty=2, difficulty_band='foundation', item_family=prefix + '_' + mode,
                   source_reference='Synthetic local test fixture', status='draft', version_no=1,
                   item_template_id=template, variant_key=code,
                   config=Jsonb({**evidence, 'authoringProfileVersion': 'haiedu-evidence-blueprint-v1',
                                 'evidencePurpose': 'core_understanding'}))
            for key, text, order in [('A', 'Correct ' + school['label'], 1), ('B', 'Other ' + school['label'], 2)]:
                insert('item_options', item_id=item, option_key=key, content_hy=text, display_order=order)
            insert('item_answer_keys', item_id=item, answer=Jsonb({'value': 'A'}))
            connection.execute("UPDATE items SET status='published' WHERE id=%s", [item])
            insert('item_curriculum_scopes', item_id=item, subject_program_id=school['programme'],
                   unit_id=ids['unit'], is_primary=True)
            insert('assessment_pool_items', pool_id=pool, item_id=item, enabled=True, metadata=Jsonb(evidence))
            insert('assessment_blueprint_items', assessment_blueprint_id=blueprint, item_id=item,
                   item_code_snapshot=code, item_version_snapshot=1, item_template_id=template,
                   template_version_snapshot=1, item_family_id=ids['family'], variant_key_snapshot=code)
            if mode == 'diagnostic':
                insert('assessment_form_items', form_id=form, item_id=item, slot_order=ordinal, metadata=Jsonb(evidence))
            school['assessmentItems'].append(item)
        # Capture complete versions before a blueprint can refer to published
        # historical evidence. Run the real deferred guards; never disable them.
        connection.execute('SET CONSTRAINTS published_item_snapshot,published_option_snapshot,published_answer_snapshot IMMEDIATE')
        connection.execute('SET CONSTRAINTS published_item_snapshot,published_option_snapshot,published_answer_snapshot DEFERRED')
        connection.execute("UPDATE assessment_blueprints SET status='pilot',published_at=%s WHERE id=%s", [now, blueprint])
    school['skill'] = ids['skill']
    # Required historical setup choices are explicit and local to this fixture.
    connection.execute("UPDATE private.assessment_presentation_configuration SET enabled=true WHERE config_key='mcq_option_order'")
