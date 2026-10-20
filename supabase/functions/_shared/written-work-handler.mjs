const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const uuid = v => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const actions = new Set(['tasks','open','save','submit','queue','inspect','review']);
function sessionId(token) {
  try { const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p+'='.repeat((4-p.length%4)%4))).session_id; } catch { return null; }
}
export function createWrittenWorkHandler({createAdmin,hasActiveLiveSession,env}) {
  return async req => {
    if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
    if(req.method!=='POST')return json({error:'method_not_allowed'},405);
    if(!env.url||!env.key)return json({error:'server_not_configured'},503);
    const header=req.headers.get('Authorization');
    if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
    try {
      const raw=await req.text();
      if(new TextEncoder().encode(raw).length>100000)return json({error:'written_payload_too_large'},413);
      let body;try{body=JSON.parse(raw);}catch{return json({error:'written_request_invalid'},400);}
      if(!body||Array.isArray(body)||!actions.has(body.action)||Object.keys(body).some(k=>!['action','context','payload'].includes(k)))return json({error:'written_request_invalid'},400);
      const context=body.context,payload=body.payload??{};
      if(!context||Array.isArray(context)||!uuid(context.curriculumReleaseId)||!uuid(context.unitId)||
        (uuid(context.enrollmentId)===uuid(context.assignmentId))||
        Object.keys(context).some(k=>!['curriculumReleaseId','unitId','enrollmentId','assignmentId'].includes(k))||
        !payload||typeof payload!=='object'||Array.isArray(payload))return json({error:'written_request_invalid'},400);
      const admin=createAdmin(env.url,env.key),token=header.replace(/^Bearer\s+/i,'');
      const {data,error}=await admin.auth.getUser(token);
      if(error||!data?.user)return json({error:'unauthorized'},401);
      const authId=sessionId(token);
      if(!uuid(authId)||!(await hasActiveLiveSession(admin,token,data.user.id)))return json({error:'account_or_session_inactive'},403);
      const result=await admin.rpc('service_written_work',{p_actor_id:data.user.id,p_auth_session_id:authId,p_action:body.action,p_context:context,p_payload:payload});
      if(result.error){
        const message=String(result.error.message??'').replace('learning_context_unavailable','written_context_unavailable');
        const code=['written_context_unavailable','written_work_unavailable','written_task_unavailable','written_request_invalid','written_conflict','written_review_invalid','written_text_invalid','written_read_only','chapter_diagnostic_required'].find(c=>message.includes(c));
        return json({error:code??'written_service_unavailable'},code==='written_conflict'?409:code==='written_request_invalid'||code==='written_review_invalid'||code==='written_text_invalid'?400:code?403:503);
      }
      if(!(await hasActiveLiveSession(admin,token,data.user.id)))return json({error:'account_or_session_inactive'},403);
      return json(result.data);
    }catch{return json({error:'written_service_unavailable'},503);}
  };
}
