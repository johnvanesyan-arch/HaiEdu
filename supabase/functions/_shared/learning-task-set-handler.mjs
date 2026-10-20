const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function authSession(token){try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(part+'='.repeat((4-part.length%4)%4))).session_id;}catch{return null;}}
export function createLearningTaskSetHandler({createAdmin,hasActiveLiveSession,env}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!env.url||!env.key)return json({error:'task_set_service_unavailable'},503);
  const header=request.headers.get('Authorization');if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
  try{
   const raw=await request.text();if(raw.length>1000)return json({error:'task_set_request_invalid'},400);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'task_set_request_invalid'},400);}
   if(!body||Array.isArray(body)||!['catalog','preview'].includes(body.action)||!uuid(body.itemId)||Object.keys(body).some(k=>!['action','itemId'].includes(k)))return json({error:'task_set_request_invalid'},400);
   const token=header.replace(/^Bearer\s+/i,''),admin=createAdmin(env.url,env.key),authId=authSession(token),{data,error}=await admin.auth.getUser(token);
   if(error||!data?.user)return json({error:'unauthorized'},401);
   if(!uuid(authId)||!await hasActiveLiveSession(admin,token,data.user.id))return json({error:'account_or_session_inactive'},403);
   const result=await admin.rpc('service_learning_task_set',{p_actor:data.user.id,p_auth:authId,p_action:body.action,p_item:body.itemId});
   if(result.error||!result.data)throw new Error(result.error?.message??'task_set_unavailable');
   if(!await hasActiveLiveSession(admin,token,data.user.id))return json({error:'account_or_session_inactive'},403);
   return json(result.data);
  }catch(error){const denied=String(error?.message??'').includes('task_set_access_denied');return json({error:denied?'task_set_access_denied':'task_set_unavailable'},denied?403:503);}
 };
}
