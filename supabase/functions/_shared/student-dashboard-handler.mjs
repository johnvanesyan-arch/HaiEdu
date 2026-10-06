import { verifiedSessionClaim } from './governed-learning-runtime.mjs';
import { resolveAuthorizedStudentLearningContext } from './student-learning-context.mjs';

const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export async function routeStudentDashboard({ admin, studentId, token, request }) {
  let body;
  try { body = await request.clone().json(); } catch { return { status: 400, body: { error: 'invalid_dashboard_selection' } }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, body: { error: 'invalid_dashboard_selection' } };
  const selected = ['enrollmentId', 'curriculumReleaseId', 'unitId'].some(k => Object.hasOwn(body, k));
  if (!selected && body.navigation !== true) return Object.keys(body).length ? { status: 400, body: { error: 'invalid_dashboard_selection' } } : null;
  const authSessionId = verifiedSessionClaim(token);
  if (!authSessionId) return { status: 403, body: { error: 'learning_context_unavailable' } };
  try {
    if (!selected) {
      if (Object.keys(body).some(k => k !== 'navigation')) return { status: 400, body: { error: 'invalid_dashboard_selection' } };
      const { data, error } = await admin.rpc('service_student_learning_navigation', { p_student_id: studentId, p_auth_session_id: authSessionId });
      if (error || !data) throw new Error('learning_context_unavailable');
      return { status: 200, body: data };
    }
    if (!['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => uuid(body[k])) || Object.keys(body).some(k => !['enrollmentId', 'curriculumReleaseId', 'unitId'].includes(k))) {
      return { status: 400, body: { error: 'invalid_dashboard_selection' } };
    }
    const context = await resolveAuthorizedStudentLearningContext(admin, studentId, body);
    const { data, error } = await admin.rpc('service_student_learning_dashboard', {
      p_student_id: studentId, p_auth_session_id: authSessionId, p_enrollment_id: context.enrollmentId,
      p_release_id: context.curriculumReleaseId, p_unit_id: context.unitId,
    });
    if (error || !data) throw new Error('learning_context_unavailable');
    return { status: 200, body: { ...data, context } };
  } catch { return { status: 403, body: { error: 'learning_context_unavailable' } }; }
}
