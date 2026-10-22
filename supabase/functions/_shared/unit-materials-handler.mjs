const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const actions=new Set(['list','get','revise','qa','approve','retire']);
function claims(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p+'='.repeat((4-p.length%4)%4)));}catch{return{};}}
export function createUnitMaterialsHandler({createAdmin,hasActiveLiveSession,env}){
 return async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!env.url||!env.key)return json({error:'server_not_configured'},503);
  const header=req.headers.get('Authorization');if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
  try{
   const raw=await req.text();if(new TextEncoder().encode(raw).length>100000)return json({error:'material_payload_too_large'},413);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'material_request_invalid'},400);}
   if(!body||Array.isArray(body)||!actions.has(body.action)||Object.keys(body).some(k=>!['action','payload'].includes(k)))return json({error:'material_request_invalid'},400);
   const payload=body.payload??{};
   const allowed=body.action==='list'?['offset']:body.action==='get'?['id']:body.action==='revise'?['id','fingerprint','definition','reviewPackage','reason']:['id','fingerprint','reason'];
   if(!payload||Array.isArray(payload)||typeof payload!=='object'||Object.keys(payload).some(k=>!allowed.includes(k))||(body.action!=='list'&&!uuid(payload.id)))return json({error:'material_request_invalid'},400);
   const admin=createAdmin(env.url,env.key),token=header.replace(/^Bearer\s+/i,'');
   const {data,error}=await admin.auth.getUser(token);if(error||!data?.user)return json({error:'unauthorized'},401);
   // Claims are read only AFTER server verification; request bodies cannot assert identity or MFA.
   const {session_id,aal}=claims(token);
   if(!uuid(session_id)||!['aal1','aal2'].includes(aal)||!(await hasActiveLiveSession(admin,token,data.user.id)))return json({error:'account_or_session_inactive'},403);
   const result=await admin.rpc('service_unit_materials',{p_actor_id:data.user.id,p_auth_session_id:session_id,p_aal:aal,p_action:body.action,p_payload:payload});
   if(result.error){const code=['material_forbidden','material_mfa_required','material_conflict','material_unavailable','material_scope_invalid','material_request_invalid','material_read_only','material_qa_required'].find(c=>String(result.error.message).includes(c));return json({error:code??'material_service_unavailable'},code==='material_conflict'?409:code?.endsWith('_invalid')||code==='material_qa_required'?400:code?403:503);}
   if(!(await hasActiveLiveSession(admin,token,data.user.id)))return json({error:'account_or_session_inactive'},403);
   return json(result.data);
  }catch{return json({error:'material_service_unavailable'},503);}
 };
}
