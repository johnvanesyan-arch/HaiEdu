"""Fictional writing and audio sources, plus independent local evidence checks.
No learner progress is seeded. The reviewer is a non-login fixture identity.
"""
import hashlib
import io
import math
import struct
import uuid
import wave
from psycopg.types.json import Jsonb
from fresh_baseline_stack import request


def audio_bytes(label, mode):
    duration = 2400 if mode == 'diagnostic' else 350
    frequency = (440 if label == 'A' else 660) + (0 if mode == 'diagnostic' else 100)
    data = io.BytesIO()
    with wave.open(data, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b''.join(struct.pack('<h', round(2000 * math.sin(2 * math.pi * frequency * n / 8000))) for n in range(8 * duration)))
    return data.getvalue(), duration


def seed_audio(connection, school, ids, insert, now, mode, items):
    audio, family, task_set = [str(uuid.uuid4()) for _ in range(3)]
    data, duration = audio_bytes(school['label'], mode)
    sha = hashlib.sha256(data).hexdigest()
    insert('learning_audio_versions', id=audio, curriculum_release_id=ids['release'], unit_id=ids['unit'],
           source_family_id=family, locale='en', title='Synthetic tone ' + school['label'] + ' ' + mode,
           bucket_id='bf21-audio', object_path=sha + '.wav', sha256=sha, mime_type='audio/wav',
           byte_length=len(data), duration_ms=duration, source_reference='Synthetic test tone; not curriculum',
           permission_reference='Generated local fixture', listening_review_reference='Technical fixture only',
           reviewed_by=school['reviewer'], reviewed_at=now)
    stimulus = {'kind': 'audio', 'schemaVersion': 'haiedu-audio-v1', 'audioVersionId': audio}
    insert('learning_task_set_versions', id=task_set, curriculum_release_id=ids['release'], unit_id=ids['unit'],
           source_family_id=family, locale='en', title='Synthetic audio block', stimulus=Jsonb(stimulus),
           members=Jsonb([{'itemId': item, 'version': 1, 'skillId': ids['skill']} for item in items]),
           source_reference='Synthetic local fixture', permission_reference='Generated local fixture',
           review_reference='Technical fixture only; no real content approval', reviewed_by=school['reviewer'], reviewed_at=now)
    reference = Jsonb({'kind': 'task_set', 'schemaVersion': 'haiedu-task-set-v1', 'taskSetVersionId': task_set})
    for item in items:
        connection.execute('UPDATE items SET stimulus=%s WHERE id=%s', [reference, item])
    school.setdefault('audio', {})[mode] = {'id': audio, 'sha256': sha, 'bytes': len(data), 'durationMs': duration,
                                          'objectPath': sha + '.wav', 'taskSetId': task_set}


def seed_writing(connection, school):
    task = str(uuid.uuid4())
    definition = {'schemaVersion': 'extended-text-v1', 'title': 'Synthetic writing ' + school['label'],
                  'prompt': 'Describe a fictional classroom object and explain your choice.', 'locale': 'en',
                  'minWords': 5, 'maxWords': 100, 'wordCountConvention': 'unicode-whitespace-v1',
                  'baselineRequired': False, 'assistance': {'spellcheck': False, 'platformHints': False},
                  'source': {'kind': 'synthetic-fixture'}, 'outcomes': ['synthetic-description'],
                  'criteria': [{'key': key, 'label': key.title(), 'descriptors': ['No evidence', 'Limited', 'Mostly meets', 'Meets']}
                               for key in ('task', 'clarity')]}
    connection.execute('''INSERT INTO written_task_versions(id,task_key,version_no,subject_program_id,
      curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence)
      VALUES (%s,%s,1,%s,%s,%s,%s,'approved',%s,now(),%s)''',
      [task, 'bf21_synthetic_' + school['label'], school['programme'], school['release'], school['unit'],
       Jsonb(definition), school['reviewer'], Jsonb({'synthetic': True, 'qaPassed': True,
       'reviewReference': 'Local fixture only', 'sourceComparisonReference': 'Generated technical fixture'})])
    school['writingTask'] = task


def upload_audio(database, fixture):
    for school in fixture['schools']:
        for mode, audio in school['audio'].items():
            data, _ = audio_bytes(school['label'], mode)
            status, _ = request(database.stack['storage'], 'POST', '/object/bf21-audio/' + audio['objectPath'],
                                data, database.stack['serviceToken'], 'audio/wav')
            assert status == 200, 'owned_audio_upload_failed'


def verify_pilot(connection, fixture):
    assert connection.execute('SELECT count(*) FROM writing_assignments').fetchone()[0] == 2
    assert connection.execute('SELECT count(*) FROM written_work').fetchone()[0] == 2
    assert connection.execute('SELECT count(*) FROM written_submissions').fetchone()[0] == 4
    assert connection.execute('SELECT count(*) FROM written_reviews').fetchone()[0] == 4
    assert connection.execute("SELECT count(*) FROM storage.objects WHERE bucket_id='bf21-audio'").fetchone()[0] == 4
    assert connection.execute('SELECT count(*) FROM learning_assessed_audio').fetchone()[0] == 2
    assert connection.execute('SELECT count(*) FROM teacher_task_submissions').fetchone()[0] == 0
    for school in fixture['schools']:
        actors = {a['role']: a['id'] for a in fixture['accounts'] if a['school'] == school['label']}
        assert connection.execute("""SELECT count(*) FROM writing_assignments a
          JOIN writing_assignment_recipients r ON r.assignment_id=a.id
          WHERE a.teacher_assignment_id=%s AND a.created_by=%s AND a.school_id=%s AND a.task_version_id=%s
          AND a.recipient_mode='selected' AND a.recipient_count=1 AND a.status='assigned'
          AND r.student_id=%s AND r.enrollment_id=%s""",
          [school['assignment'], actors['teacher'], school['school'], school['writingTask'], actors['student'], school['enrollment']]).fetchone()[0] == 1
        row = connection.execute('''SELECT w.state,count(DISTINCT s.id),count(DISTINCT r.id)
          FROM written_work w JOIN written_submissions s ON s.work_id=w.id JOIN written_reviews r ON r.submission_id=s.id
          WHERE w.student_id=%s AND w.enrollment_id=%s AND w.school_id=%s AND w.task_version_id=%s
          AND r.assessor_id=%s AND r.teacher_assignment_id=%s GROUP BY w.id''',
          [actors['student'], school['enrollment'], school['school'], school['writingTask'], actors['teacher'], school['assignment']]).fetchone()
        assert row == ('reviewed', 2, 2), 'written_evidence_binding'
        reviews = connection.execute('''SELECT s.version_no,r.decision,r.criterion_scores FROM written_submissions s
          JOIN written_work w ON w.id=s.work_id JOIN written_reviews r ON r.submission_id=s.id
          WHERE w.student_id=%s ORDER BY s.version_no''', [actors['student']]).fetchall()
        assert reviews == [(1, 'return', None), (2, 'assessed', {'task': 3, 'clarity': 2})]
        rows = connection.execute('''SELECT mode,answered_count,correct_count FROM learning_sessions
          WHERE student_id=%s AND school_id=%s AND institutional_class_enrollment_id=%s AND curriculum_release_id=%s
          AND status='completed' ORDER BY mode''', [actors['student'], school['school'], school['enrollment'], school['release']]).fetchall()
        assert rows == [('diagnostic', 2, 2), ('practice', 2, 2)]
        assessed = connection.execute('''SELECT d.completed_plays,d.failed_at FROM learning_assessed_audio d
          JOIN learning_sessions s ON s.id=d.session_id WHERE d.student_id=%s AND s.student_id=d.student_id
          AND d.audio_version_id=%s AND s.curriculum_release_id=%s''',
          [actors['student'], school['audio']['diagnostic']['id'], school['release']]).fetchone()
        assert assessed == (2, None), 'assessed_playback_binding'
        assert connection.execute('''SELECT count(*) FROM learning_audio_deliveries d JOIN learning_session_items li
          ON li.id=d.session_item_id JOIN learning_sessions s ON s.id=li.session_id
          WHERE s.student_id=%s AND d.audio_version_id=%s AND d.completed_at IS NOT NULL''',
          [actors['student'], school['audio']['practice']['id']]).fetchone()[0] == 2
    return {'writtenSubmissionsCreated': 4, 'publishedWrittenReviews': 4, 'writingAssignmentsCreated': 2,
            'privateAudioFiles': 4, 'assessedRecordingsCompleted': 2, 'tenantEvidenceBindingsVerified': True}
