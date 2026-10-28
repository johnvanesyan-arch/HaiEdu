const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}});
export function createTeacherWorkspaceHandler({createAdmin,env}) {
 return async request=>{
  if(request.method==='OPTIONS')return json({ok:true});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!env.url||!env.key)return json({error:'server_not_configured'},503);
  const header=request.headers.get('Authorization');if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
  try {
   const raw=await request.text();if(new TextEncoder().encode(raw).length>4096)return json({error:'workspace_request_invalid'},400);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'workspace_request_invalid'},400);}
   const {assignmentId=null,cursor=null,workId=null,recent=[]}=body??{};
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['assignmentId','cursor','workId','recent'].includes(k))||
    (assignmentId!==null&&!uuid(assignmentId))||(workId!==null&&!uuid(workId))||!Array.isArray(recent)||recent.length>4||recent.some(v=>!uuid(v))||
    (cursor!==null&&(!cursor||Array.isArray(cursor)||typeof cursor!=='object'||Object.keys(cursor).length!==2||!uuid(cursor.id)||typeof cursor.submittedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(cursor.submittedAt)||!Number.isFinite(Date.parse(cursor.submittedAt)))))return json({error:'workspace_request_invalid'},400);
   const admin=createAdmin(env.url,env.key),token=header.replace(/^Bearer\s+/i,'');
   const {data,error}=await admin.auth.getUser(token);if(error||!data?.user)return json({error:'unauthorized'},401);
   let auth;try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');auth=JSON.parse(atob(p+'='.repeat((4-p.length%4)%4))).session_id;}catch{}
   if(!uuid(auth))return json({error:'account_or_session_inactive'},403);
   const r=await admin.rpc('service_teacher_workspace',{p_actor:data.user.id,p_auth:auth,p_assignment:assignmentId,p_cursor:cursor,p_work:workId,p_recent:recent});
   if(r.error){const m=String(r.error.message??'');return json({error:m.includes('workspace_context_unavailable')?'workspace_context_unavailable':m.includes('workspace_request_invalid')||r.error.code==='22P02'||r.error.code==='22007'?'workspace_request_invalid':'workspace_unavailable'},m.includes('workspace_context_unavailable')?403:m.includes('workspace_request_invalid')||['22P02','22007'].includes(r.error.code)?400:503);}
   // The workspace transaction validates the actor/session before reading.
   // A separate final RPC catches logout, disabled accounts and role changes
   // committed while that projection was being read.
   const finalActor=await admin.rpc('service_teacher_dashboard_actor',{p_actor:data.user.id,p_session:auth});
   if(finalActor.error)return json({error:finalActor.error.code==='42501'?'workspace_context_unavailable':'workspace_unavailable'},finalActor.error.code==='42501'?403:503);
   if(finalActor.data?.profile?.role!=='teacher'||finalActor.data?.profile?.account_status!=='active')return json({error:'workspace_context_unavailable'},403);
   return json(r.data);
  }catch{return json({error:'workspace_unavailable'},503);}
 };
}
