"""Independent database assertions after the native local Mastery journey."""


def verify_mastery(connection, fixture):
    assert connection.execute('SELECT count(*) FROM chapter_mastery_states').fetchone()[0] == 2
    assert connection.execute('SELECT count(*) FROM mastery_check_attempts').fetchone()[0] == 5
    assert connection.execute('SELECT count(*) FROM chapter_review_sessions').fetchone()[0] == 5
    assert connection.execute('SELECT count(*) FROM chapter_review_requirements').fetchone()[0] == 3
    assert connection.execute("SELECT count(*) FROM chapter_review_requirements WHERE status='satisfied'").fetchone()[0] == 3
    assert connection.execute('SELECT count(*) FROM attempts WHERE correct').fetchone()[0] == 21
    assert connection.execute('SELECT count(DISTINCT learning_session_item_id) FROM attempts').fetchone()[0] == 28
    assert connection.execute('SELECT count(*) FROM storage.objects').fetchone()[0] == 0
    assert connection.execute('SELECT count(*) FROM teacher_task_submissions').fetchone()[0] == 0
    for school in fixture['schools']:
        student = next(a['id'] for a in fixture['accounts'] if a['school'] == school['label'] and a['role'] == 'student')
        passed = school['label'] == 'A'
        maximum = 2 if passed else 3
        expected_state = 'mastery_passed' if passed else 'mastery_failed_final'
        row = connection.execute('''SELECT id,lifecycle_state,attempts_used,passed_on_attempt FROM chapter_mastery_states
          WHERE student_id=%s AND curriculum_release_id=%s''', [student, school['release']]).fetchone()
        assert row and row[1:] == (expected_state, maximum, 2 if passed else None)
        state_id = row[0]
        sessions = connection.execute('''SELECT mode,count(*),sum(answered_count),sum(correct_count) FROM learning_sessions
          WHERE student_id=%s AND school_id=%s AND institutional_class_enrollment_id=%s
          AND curriculum_release_id=%s AND governed_unit_id=%s AND status='completed'
          AND assessment_policy_binding_id IS NOT NULL AND learning_model_configuration_id IS NOT NULL
          AND runtime_build_id IS NOT NULL AND source_auth_session_id IS NOT NULL
          GROUP BY mode ORDER BY mode''',
          [student, school['school'], school['enrollment'], school['release'], school['unit']]).fetchall()
        assert sessions == [('chapter_review', maximum, maximum * 2, maximum * 2),
                            ('diagnostic', 1, 2, 2), ('mastery_check', maximum, maximum * 2, 3 if passed else 0),
                            ('practice', 1, 2, 2)]
        attempts = connection.execute('''SELECT m.attempt_number,m.result,m.score_percent,m.preceding_required_review_id,
          s.id,s.metadata->>'assessmentFormId',s.answered_count,s.correct_count,m.academic_mastery_policy_id=s.academic_mastery_policy_id
          FROM mastery_check_attempts m JOIN learning_sessions s ON s.id=m.learning_session_id
          WHERE m.chapter_mastery_state_id=%s AND m.status='completed' ORDER BY m.attempt_number''', [state_id]).fetchall()
        assert len(attempts) == maximum
        assigned = set()
        for number, result, percent, review_id, session_id, form_id, answered, correct, policy_matches in attempts:
            success = passed and number == 2
            expected_correct = 2 if success else 1 if passed else 0
            assert result == ('passed' if success else 'failed') and percent == expected_correct * 50
            assert answered == 2 and correct == expected_correct and policy_matches
            assert form_id == school['masteryForms'][number - 1]
            if number == 1:
                assert review_id is None
            else:
                assert connection.execute('''SELECT count(*) FROM chapter_review_sessions r
                  JOIN chapter_review_requirements q ON q.qualifying_review_session_id=r.id
                  WHERE r.id=%s AND r.chapter_mastery_state_id=%s AND r.status='completed' AND r.qualifying
                  AND q.status='satisfied' AND q.required_after_attempt=%s''', [review_id, state_id, number - 1]).fetchone()[0] == 1
            items = {str(r[0]) for r in connection.execute('SELECT item_id FROM learning_session_items WHERE session_id=%s', [session_id])}
            expected = {str(r[0]) for r in connection.execute('SELECT item_id FROM assessment_form_items WHERE form_id=%s', [form_id])}
            assert items == expected and len(items) == 2 and not items & assigned
            assigned |= items
        assert len(school['masteryForms']) == 4
        for unused_form in school['masteryForms'][maximum:]:
            assert connection.execute('''SELECT count(*) FROM learning_session_items li
              JOIN assessment_form_items fi ON fi.item_id=li.item_id WHERE fi.form_id=%s''', [unused_form]).fetchone()[0] == 0
            assert connection.execute('''SELECT count(*) FROM student_item_exposure_events e
              JOIN assessment_form_items fi ON fi.item_id=e.item_id WHERE fi.form_id=%s''', [unused_form]).fetchone()[0] == 0
        reviews = connection.execute('''SELECT review_context,qualifying,status,preceding_mastery_attempt_number
          FROM chapter_review_sessions WHERE chapter_mastery_state_id=%s ORDER BY review_context''', [state_id]).fetchall()
        expected_reviews = [('required_after_attempt_1_failure', True, 'completed', 1)]
        if not passed:
            expected_reviews.append(('required_after_attempt_2_failure', True, 'completed', 2))
        expected_reviews.append(('voluntary_after_mastery_pass' if passed else 'voluntary_after_final_failure', False, 'completed', maximum))
        assert reviews == sorted(expected_reviews)
        assert connection.execute('''SELECT count(*) FROM attempts a JOIN learning_sessions s ON s.id=a.learning_session_id
          JOIN learning_session_items i ON i.id=a.learning_session_item_id
          WHERE s.student_id=%s AND a.student_id=s.student_id AND a.curriculum_release_id=s.curriculum_release_id
          AND a.item_id=i.item_id AND i.session_id=s.id AND a.skill_id=%s''', [student, school['skill']]).fetchone()[0] == (12 if passed else 16)
    return {'masteryAttemptsCreated': 5, 'chapterReviewSessionsCreated': 5, 'requiredReviewsSatisfied': 3,
            'masteryPasses': 1, 'masteryFailures': 4, 'terminalStates': ['mastery_passed', 'mastery_failed_final'],
            'independentPolicyTenantFormAndReviewBindingsVerified': True, 'duplicateAnswersOrMasteryAttempts': 0,
            'unusedProtectedFormsPreserved': True, 'partialScoreBelowOverallThresholdFailed': True}
