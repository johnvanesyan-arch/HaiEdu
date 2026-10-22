const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function sessionClaim(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p+'='.repeat((4-p.length%4)%4))).session_id;}catch{return null;}}
export function createUnitGuidesHandler({createAdmin,hasActiveLiveSession,env}){
 return async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!env.url||!env.key)return json({error:'server_not_configured'},503);
  const header=req.headers.get('Authorization');if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
  try{
   const raw=await req.text();if(new TextEncoder().encode(raw).length>2048)return json({error:'guides_request_invalid'},400);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'guides_request_invalid'},400);}
   const keys=['enrollmentId','curriculumReleaseId','unitId'];
   if(!body||Array.isArray(body)||!keys.every(k=>uuid(body[k]))||Object.keys(body).some(k=>!keys.includes(k)))return json({error:'guides_request_invalid'},400);
   const admin=createAdmin(env.url,env.key),token=header.replace(/^Bearer\s+/i,'');
   const {data,error}=await admin.auth.getUser(token);if(error||!data?.user)return json({error:'unauthorized'},401);
   // The server verifies the token before any identity/session claims are used.
   const authId=sessionClaim(token);
   if(!uuid(authId)||!(await hasActiveLiveSession(admin,token,data.user.id)))return json({error:'account_or_session_inactive'},403);
   const result=await admin.rpc('service_student_unit_guides',{p_student_id:data.user.id,p_auth_session_id:authId,
    p_enrollment_id:body.enrollmentId,p_release_id:body.curriculumReleaseId,p_unit_id:body.unitId});
   if(result.error){const denied=String(result.error.message).includes('learning_context_unavailable');return json({error:denied?'learning_context_unavailable':'guides_service_unavailable'},denied?403:503);}
   if(!(await hasActiveLiveSession(admin,token,data.user.id)))return json({error:'account_or_session_inactive'},403);
   return json(result.data);
  }catch{return json({error:'guides_service_unavailable'},503);}
 };
}
