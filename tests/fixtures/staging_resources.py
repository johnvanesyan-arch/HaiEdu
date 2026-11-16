"""Extra fictional recipients and independent resource-delivery verification."""
import hashlib
import secrets
import uuid

from fresh_baseline_stack import request


def seed_resource_recipients(database, fixture):
    """One unselected classmate and one other-class student in each school."""
    for account in fixture['accounts']:
        account['case'] = account['role']
    with database.connect() as connection:
        for school in fixture['schools']:
            actors = {a['role']: a for a in fixture['accounts'] if a['school'] == school['label']}
            extra_class, extra_assignment = str(uuid.uuid4()), str(uuid.uuid4())
            admin = actors['school_admin']['id']
            connection.execute('INSERT INTO classes(id,school_id,teacher_id,subject_id,grade_id,name,academic_year_id) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                               [extra_class, school['school'], actors['teacher']['id'], school['subject'], school['grade'], 'Synthetic other class ' + school['label'], school['year']])
            connection.execute("INSERT INTO teacher_assignments(id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,valid_from,status,created_by) VALUES (%s,%s,%s,%s,%s,%s,now(),'active',%s)",
                               [extra_assignment, school['school'], school['year'], extra_class, school['teacherMember'], school['programme'], admin])
            school['resourceRecipients'] = []
            for kind, class_id, assignment in [('peer', school['class'], school['assignment']), ('other_class', extra_class, extra_assignment)]:
                account = {'school': school['label'], 'role': 'student', 'case': kind,
                           'email': secrets.token_hex(12) + '@example.invalid', 'password': secrets.token_urlsafe(30)}
                status, user = request(database.stack['auth'], 'POST', '/admin/users', {
                    'email': account['email'], 'password': account['password'], 'email_confirm': True,
                    'role': 'authenticated', 'user_metadata': {'display_name': 'Synthetic ' + school['label'] + ' ' + kind}}, database.stack['serviceToken'])
                assert status == 200, 'local_extra_student_creation_failed'
                account['id'] = user['id']
                member, invitation, enrollment = [str(uuid.uuid4()) for _ in range(3)]
                connection.execute("INSERT INTO institutional_memberships(id,school_id,person_id,role,valid_from,status,created_by) VALUES (%s,%s,%s,'student',now()-interval '1 day','active',%s)",
                                   [member, school['school'], user['id'], admin])
                connection.execute("INSERT INTO institutional_invitations(id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,recipient_user_id,invited_role,token_digest,issued_by,expires_at,used_at) VALUES (%s,%s,%s,%s,%s,%s,%s,'student',%s,%s,now()+interval '1 day',now())",
                                   [invitation, school['school'], school['year'], class_id, assignment, school['programme'], user['id'], hashlib.sha256(secrets.token_bytes(32)).hexdigest(), admin])
                connection.execute('INSERT INTO institutional_class_enrollments(id,school_id,academic_year_id,class_id,student_membership_id,student_id,invitation_id,teacher_assignment_id,subject_program_id,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                                   [enrollment, school['school'], school['year'], class_id, member, user['id'], invitation, assignment, school['programme'], admin])
                account.update(enrollment=enrollment, classId=class_id, assignmentId=assignment)
                fixture['accounts'].append(account)
                school['resourceRecipients'].append({'case': kind, 'id': user['id'], 'enrollment': enrollment, 'class': class_id, 'assignment': assignment})
        connection.execute("INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('supplementary-materials','supplementary-materials',false,5242880,ARRAY['application/pdf'])")
        connection.execute("NOTIFY pgrst,'reload schema'")


def verify_resources(connection, fixture):
    assert connection.execute('SELECT count(*) FROM resource_assignments').fetchone()[0] == 4
    assert connection.execute('SELECT count(*) FROM resource_assignment_recipients').fetchone()[0] == 6
    assert connection.execute('SELECT count(*) FROM supplementary_resource_versions').fetchone()[0] == 2
    assert connection.execute("SELECT count(*) FROM storage.objects WHERE bucket_id='supplementary-materials'").fetchone()[0] == 2
    for school in fixture['schools']:
        student = next(a for a in fixture['accounts'] if a['school'] == school['label'] and a['case'] == 'student')
        teacher = next(a for a in fixture['accounts'] if a['school'] == school['label'] and a['case'] == 'teacher')
        peer = next(a for a in fixture['accounts'] if a['school'] == school['label'] and a['case'] == 'peer')
        rows = connection.execute('''SELECT a.id,a.recipient_mode,a.recipient_count,a.status,a.revision,m.id,m.object_path,m.file_bytes,m.file_sha256,m.status
          FROM resource_assignments a JOIN supplementary_resource_versions m ON m.id=a.material_version_id
          WHERE a.school_id=%s AND a.class_id=%s AND a.teacher_assignment_id=%s AND a.created_by=%s
          AND a.subject_program_id=%s AND a.curriculum_release_id=%s AND a.unit_id=%s
          AND m.created_by=a.created_by AND m.assignment_id=a.teacher_assignment_id
          AND m.curriculum_release_id=a.curriculum_release_id AND m.unit_id=a.unit_id ORDER BY a.recipient_mode''',
          [school['school'], school['class'], school['assignment'], teacher['id'], school['programme'], school['release'], school['unit']]).fetchall()
        assert len(rows) == 2
        assert len({str(row[5]) for row in rows}) == 1
        for assignment_id, mode, count, status, revision, material_id, object_path, size, digest, material_status in rows:
            assert (mode, count, status, revision) == (('class', 2, 'assigned', 1) if mode == 'class' else ('selected', 1, 'canceled', 2))
            expected = {(student['id'], school['enrollment'])}
            if mode == 'class':
                expected.add((peer['id'], peer['enrollment']))
            actual = connection.execute('SELECT student_id,enrollment_id FROM resource_assignment_recipients WHERE assignment_id=%s', [assignment_id]).fetchall()
            assert {(str(a), str(b)) for a, b in actual} == expected
            events = connection.execute('SELECT event FROM resource_assignment_events WHERE assignment_id=%s ORDER BY created_at,id', [assignment_id]).fetchall()
            assert events == ([('assigned',)] if mode == 'class' else [('assigned',), ('canceled',)])
            assert material_status == 'withdrawn' and size > 0 and len(digest) == 64
            assert connection.execute("SELECT count(*) FROM storage.objects WHERE bucket_id='supplementary-materials' AND name=%s", [object_path]).fetchone()[0] == 1
            resource_events = connection.execute('SELECT event FROM supplementary_resource_events WHERE version_id=%s ORDER BY created_at,id', [material_id]).fetchall()
            assert [e[0] for e in resource_events] == ['created', 'file_attached', 'qa', 'published', 'withdrawn']
    return {'resourceAssignmentsCreated': 4, 'resourceRecipientBindingsVerified': 6,
            'resourceAssignmentsCanceled': 2, 'resourceMaterialsWithdrawn': 2,
            'privateResourceObjects': 2, 'tenantEvidenceBindingsVerified': True}


def verify_resource_storage(database, fixture):
    """Check real object paths, including a positive byte check before refusals."""
    stack = database.stack
    with database.connect() as connection:
        objects = connection.execute('SELECT object_path,file_sha256,file_bytes FROM supplementary_resource_versions').fetchall()
    assert len(objects) == 2
    for object_path, digest, size in objects:
        status, data = request(stack['storage'], 'GET', '/object/authenticated/supplementary-materials/' + object_path, token=stack['serviceToken'])
        assert status == 200 and len(data) == size and hashlib.sha256(data).hexdigest() == digest
        status, _ = request(stack['storage'], 'GET', '/object/public/supplementary-materials/' + object_path, token=stack['anonToken'])
        assert status in (400, 401, 403, 404), 'private_resource_public_download_denied'
    for account in (a for a in fixture['accounts'] if a['case'] == 'student'):
        status, session = request(stack['auth'], 'POST', '/token?grant_type=password', {
            'email': account['email'], 'password': account['password']}, stack['anonToken'])
        assert status == 200, 'local_storage_probe_signin_failed'
        token = session['access_token']
        try:
            for object_path, _, _ in objects:
                status, _ = request(stack['storage'], 'GET', '/object/authenticated/supplementary-materials/' + object_path, token=token)
                assert status in (400, 401, 403, 404), 'private_resource_direct_download_denied'
        finally:
            status, _ = request(stack['auth'], 'POST', '/logout', token=token)
            assert status in (200, 204), 'local_storage_probe_signout_failed'
    with database.connect() as connection:
        assert connection.execute('SELECT count(*) FROM auth.sessions').fetchone()[0] == 0
    return {'privateStorageChecks': 8, 'privateStorageChecksPassed': True}
