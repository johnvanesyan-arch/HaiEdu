import { resolveAuthorizedStudentLearningContext, StudentLearningContextDenied } from './student-learning-context.mjs';
import { readAssessmentPolicy, AssessmentPolicyInvalid } from './assessment-policy.mjs';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const modes = new Set(['diagnostic', 'practice', 'mastery_check', 'chapter_review']);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export function createLearningContextHandler({ createAdmin, hasActiveLiveSession, env }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!env.url || !env.key) return json({ error: 'server_not_configured' }, 500);
    const header = req.headers.get('Authorization');
    if (!header || !/^Bearer\s+\S+$/i.test(header)) return json({ error: 'unauthorized' }, 401);
    try {
      const admin = createAdmin(env.url, env.key), token = header.replace(/^Bearer\s+/i, '');
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data?.user) return json({ error: 'unauthorized' }, 401);
      if (!(await hasActiveLiveSession(admin, token, data.user.id))) return json({ error: 'account_or_session_inactive' }, 403);
      const { data: profile, error: profileError } = await admin.from('profiles').select('role,account_status').eq('id', data.user.id).maybeSingle();
      if (profileError || profile?.role !== 'student' || profile.account_status !== 'active') return json({ error: 'student_role_required' }, 403);
      let body;
      try { body = await req.json(); } catch { return json({ error: 'invalid_context_selection' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || !['enrollmentId','curriculumReleaseId','unitId'].every(key => uuid(body[key])) || !modes.has(body.mode)) return json({ error: 'invalid_context_selection' }, 400);
      // Only the explicit selector is accepted. User IDs, schools and policies are server-derived.
      if (Object.keys(body).some(key => !['enrollmentId','curriculumReleaseId','unitId','mode'].includes(key))) return json({ error: 'invalid_context_selection' }, 400);
      const context = await resolveAuthorizedStudentLearningContext(admin, data.user.id, body);
      const { data: blueprints, error: blueprintError } = await admin.from('assessment_blueprints')
        .select('id,version_number,purpose,status,configuration_snapshot,published_at')
        .eq('curriculum_release_id', context.curriculumReleaseId).eq('unit_id', context.unitId).eq('purpose', body.mode)
        .in('status', ['pilot','production']).order('version_number', { ascending: false }).limit(2);
      if (blueprintError || !blueprints?.length || !blueprints[0].published_at || !Number.isSafeInteger(blueprints[0].version_number) || blueprints[0].version_number < 1 ||
          (blueprints[1] && blueprints[1].version_number === blueprints[0].version_number)) return json({ error: 'assessment_blueprint_unavailable' }, 503);
      const blueprint = blueprints[0];
      const policy = readAssessmentPolicy(blueprint.configuration_snapshot, { ...context, mode: body.mode });
      if (!(await hasActiveLiveSession(admin, token, data.user.id))) return json({ error: 'account_or_session_inactive' }, 403);
      // This endpoint describes the future contract; it never starts a session or grants launch eligibility.
      return json({ context, blueprint: { id: blueprint.id, version: blueprint.version_number, purpose: blueprint.purpose },
        assessmentPolicy: policy, assessmentPolicyStatus: policy ? 'declared' : 'unconfigured', readOnly: true });
    } catch (error) {
      if (error instanceof StudentLearningContextDenied) return json({ error: 'learning_context_unavailable' }, 403);
      if (error instanceof AssessmentPolicyInvalid) return json({ error: 'assessment_policy_invalid' }, 503);
      return json({ error: 'learning_context_service_unavailable' }, 503);
    }
  };
}
