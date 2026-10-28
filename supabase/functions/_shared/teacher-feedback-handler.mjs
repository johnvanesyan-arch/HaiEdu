const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}});
const fields={open:['workId'],save_draft:['workId','expectedRevision','draftRevision','data'],publish:['workId','expectedRevision','draftRevision','decision','requestId'],snippets:['archived','offset'],save_snippet:['id','expectedRevision','title','body','archived']};
export function createTeacherFeedbackHandler({createAdmin,hasActiveLiveSession,env}){
 return async req=>{
  if(req.method==='OPTIONS')return json({ok:true});if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!env.url||!env.key)return json({error:'server_not_configured'},503);
  const header=req.headers.get('Authorization');if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
  try{
   const raw=await req.text();if(new TextEncoder().encode(raw).length>30000)return json({error:'feedback_request_invalid'},400);
   let b;try{b=JSON.parse(raw);}catch{return json({error:'feedback_request_invalid'},400);}
   const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
   if(!obj(b)||!Object.hasOwn(fields,b.action)||Object.keys(b).some(k=>!['action','context','payload'].includes(k))||!obj(b.payload??{})||!obj(b.context??{}))return json({error:'feedback_request_invalid'},400);
   const payload=b.payload??{},context=b.context??{},personal=['snippets','save_snippet'].includes(b.action);
   if(Object.keys(payload).some(k=>!fields[b.action].includes(k))|| (personal?Object.keys(context).length:!uuid(context.assignmentId)||!uuid(context.curriculumReleaseId)||!uuid(context.unitId)||Object.keys(context).length!==3||!uuid(payload.workId)))return json({error:'feedback_request_invalid'},400);
   if(b.action==='snippets'&&((payload.archived!==undefined&&typeof payload.archived!=='boolean')||(payload.offset!==undefined&&(!Number.isInteger(payload.offset)||payload.offset<0||payload.offset>100000))))return json({error:'feedback_request_invalid'},400);
   const admin=createAdmin(env.url,env.key),token=header.replace(/^Bearer\s+/i,'');const{data,error}=await admin.auth.getUser(token);
   if(error||!data?.user)return json({error:'unauthorized'},401);
   let auth;try{let p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');auth=JSON.parse(atob(p+'='.repeat((4-p.length%4)%4))).session_id;}catch{}
   if(!uuid(auth)||!await hasActiveLiveSession(admin,token,data.user.id))return json({error:'account_or_session_inactive'},403);
   const r=await admin.rpc('service_teacher_feedback',{p_actor:data.user.id,p_auth:auth,p_action:b.action,p_context:context,p_payload:payload});
   if(r.error){let code=['feedback_conflict','feedback_request_invalid','feedback_context_unavailable','feedback_snippet_limit','written_context_unavailable','written_read_only','written_review_invalid','written_conflict','written_work_unavailable'].find(c=>String(r.error.message).includes(c));return json({error:code??'feedback_service_unavailable'},['feedback_conflict','written_conflict'].includes(code)?409:['feedback_request_invalid','feedback_snippet_limit','written_review_invalid'].includes(code)?400:code?403:503);}
   if(!await hasActiveLiveSession(admin,token,data.user.id))return json({error:'account_or_session_inactive'},403);
   const p=await admin.from('profiles').select('role,account_status').eq('id',data.user.id).maybeSingle();if(p.error||p.data?.role!=='teacher'||p.data.account_status!=='active')return json({error:'feedback_context_unavailable'},403);
   return json(r.data);
  }catch{return json({error:'feedback_service_unavailable'},503);}
 };
}
