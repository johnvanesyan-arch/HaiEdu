// A configured, explicitly selected context is the only entrance to this engine.
// Existing unconfigured clients use the separately registered legacy adapter.
import { resolveAuthorizedStudentLearningContext } from './student-learning-context.mjs';
import { readAssessmentPolicy } from './assessment-policy.mjs';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const modes = new Set(['diagnostic','practice','mastery_check','chapter_review']);
export function verifiedSessionClaim(token) {
  // Call only after Auth.getUser and the live-session check have succeeded.
  try { const s = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id; return uuid(s) ? s : null; }
  catch { return null; }
}

async function rpc(admin, name, args) {
  const {data,error} = await admin.rpc(name,args);
  if (error || !data) throw new Error(error?.message ?? 'governed_learning_unavailable');
  return data;
}

export async function routeGovernedLearning({admin,studentId,token,request,operation}) {
  let body;
  try { body = await request.clone().json(); } catch { return null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const selected = ['enrollmentId','curriculumReleaseId','unitId'].some(key => Object.hasOwn(body,key));
  let governed = selected;
  if (!selected && uuid(body.sessionId)) {
    const {data,error} = await admin.from('learning_sessions').select('assessment_policy_binding_id').eq('id',body.sessionId).eq('student_id',studentId).maybeSingle();
    if (error) return {status:503,body:{error:'learning_context_service_unavailable'}};
    governed = Boolean(data?.assessment_policy_binding_id);
    if (data && !governed) {
      const result = await admin.rpc('service_is_registered_legacy_learning_session',{p_student_id:studentId,p_session_id:body.sessionId});
      if (result.error || result.data !== true) return {status:403,body:{error:'learning_context_unavailable'}};
    }
  }
  if (!governed) return null;
  const authSessionId = verifiedSessionClaim(token);
  if (!authSessionId) return {status:403,body:{error:'account_or_session_inactive'}};
  try {
    if (operation === 'start' || (selected && ['status','lifecycle'].includes(operation))) {
      if (!['enrollmentId','curriculumReleaseId','unitId'].every(key=>uuid(body[key])) || !modes.has(body.mode)) return {status:400,body:{error:'invalid_context_selection'}};
      const allowed = ['enrollmentId','curriculumReleaseId','unitId','mode','targetSkillId','recommendationInstanceId'];
      if (Object.keys(body).some(key=>!allowed.includes(key)) || (body.targetSkillId != null && !uuid(body.targetSkillId)) || (body.recommendationInstanceId != null && !uuid(body.recommendationInstanceId))) return {status:400,body:{error:'invalid_context_selection'}};
      const context = await resolveAuthorizedStudentLearningContext(admin,studentId,body);
      if (operation === 'start') {
        const resumed = await rpc(admin,'service_resume_governed_learning',{
          p_student_id:studentId,p_auth_session_id:authSessionId,p_enrollment_id:context.enrollmentId,
          p_release_id:context.curriculumReleaseId,p_unit_id:context.unitId,p_mode:body.mode,
        });
        if (resumed.resumed) return {status:200,body:resumed};
      }
      const {data:blueprints,error} = await admin.from('assessment_blueprints').select('id,purpose,version_number,published_at,configuration_snapshot')
        .eq('curriculum_release_id',context.curriculumReleaseId).eq('unit_id',context.unitId).eq('purpose',body.mode)
        .in('status',['pilot','production']).order('version_number',{ascending:false}).limit(2);
      if (error || !blueprints?.length || !blueprints[0].published_at || (blueprints[1] && blueprints[1].version_number === blueprints[0].version_number)) throw new Error('assessment_blueprint_unavailable');
      if (!readAssessmentPolicy(blueprints[0].configuration_snapshot,{...context,mode:body.mode})) return {status:409,body:{error:'assessment_policy_unconfigured'}};
      const result = await rpc(admin,'service_launch_governed_learning',{
        p_student_id:studentId,p_auth_session_id:authSessionId,p_enrollment_id:context.enrollmentId,p_blueprint_id:blueprints[0].id,
        p_target_skill_id:body.targetSkillId ?? null,p_recommendation_instance_id:body.recommendationInstanceId ?? null,p_read_only:operation !== 'start',
      });
      return {status:200,body:result};
    }
    if (!uuid(body.sessionId)) return {status:400,body:{error:'session_context_required'}};
    const action = {item:'serve',answer:'answer',mastery:'answer',help:'help',status:'status',lifecycle:'status'}[operation];
    if (!action) throw new Error('unsupported_governed_operation');
    if (['answer','mastery','help'].includes(operation) && !uuid(body.sessionItemId)) return {status:400,body:{error:'session_item_required'}};
    if (['answer','mastery'].includes(operation) && (!uuid(body.itemId) || !body.response || typeof body.response !== 'object' || Array.isArray(body.response))) return {status:400,body:{error:'answer_required'}};
    const allowed = ['sessionId','sessionItemId','itemId','response','responseTimeMs','hintUsed'];
    if (Object.keys(body).some(key=>!allowed.includes(key))) return {status:400,body:{error:'invalid_session_request'}};
    return {status:200,body:await rpc(admin,'service_governed_learning_operation',{
      p_student_id:studentId,p_auth_session_id:authSessionId,p_session_id:body.sessionId,p_action:action,
      p_payload:{...body,expectedMode:operation === 'mastery' ? 'mastery_check' : null},
    })};
  } catch (error) {
    const message = String(error?.message ?? '');
    // Never expose tenant/catalogue details or raw SQL errors.
    const code = ['chapter_diagnostic_required','skills_not_ready','mastery_check_not_allowed','chapter_review_not_available','assessment_policy_unconfigured','session_item_already_answered','invalid_option_presentation_key','help_not_available_in_assessment','remediation_guide_missing','session_not_active'].find(value=>message.includes(value));
    return {status:code ? 409 : 403,body:{error:code ?? 'learning_context_unavailable'}};
  }
}
