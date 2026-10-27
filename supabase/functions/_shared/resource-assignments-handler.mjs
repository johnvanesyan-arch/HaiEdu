import {resourceUrl,MAX_RESOURCE_BYTES} from './supplementary-resources-handler.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=code=>{throw Error(code);};
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
async function bodyJSON(request){
 if(Number(request.headers.get('content-length'))>32768)fail('assignment_request_invalid');
 const reader=request.body?.getReader();if(!reader)fail('assignment_request_invalid');
 const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();fail('assignment_request_invalid');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail('assignment_request_invalid');}
}
export function createResourceAssignmentsHandler({createAdmin,hasActiveLiveSession,env}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  try{
   if(!env.url||!env.key)return reply({error:'service_unavailable'},503);
   const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return reply({error:'unauthorized'},401);
   const admin=createAdmin(env.url,env.key),{data:auth,error}=await admin.auth.getUser(token);
   if(error||!auth?.user)return reply({error:'unauthorized'},401);
   let claims;try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{fail('assignment_forbidden');}
   if(!UUID.test(claims.session_id)||!['aal1','aal2'].includes(claims.aal)||!await hasActiveLiveSession(admin,token,auth.user.id))fail('assignment_forbidden');
   const live=async()=>{if(!await hasActiveLiveSession(admin,token,auth.user.id))fail('assignment_forbidden');};
   const body=await bodyJSON(request),keys={catalog:['offset'],preview:['materialId','offset','search'],assign:['materialId','fingerprint','requestId','rosterFingerprint','mode','enrollmentIds','instructions'],list:['offset','state'],inbox:['offset','state'],get:['id'],cancel:['id','revision','reason'],open:['id']};
   if(!shape(body,['action','context','payload'])||!Object.hasOwn(keys,body.action)||!shape(body.context??{},['assignmentId','enrollmentId','curriculumReleaseId','unitId'])||!shape(body.payload??{},keys[body.action]))fail('assignment_request_invalid');
   const {action,context={},payload={}}=body;
   if(Object.values(context).some(x=>typeof x!=='string'||!UUID.test(x)))fail('assignment_request_invalid');
   for(const k of ['id','materialId','requestId'])if(payload[k]!=null&&(typeof payload[k]!=='string'||!UUID.test(payload[k])))fail('assignment_request_invalid');
   if(['preview','assign'].includes(action)&&!UUID.test(payload.materialId))fail('assignment_request_invalid');
   if(['get','cancel','open'].includes(action)&&!UUID.test(payload.id))fail('assignment_request_invalid');
   if(payload.offset!=null&&(!Number.isSafeInteger(payload.offset)||payload.offset<0||payload.offset>100000))fail('assignment_request_invalid');
   if(payload.state!=null&&!['current','history'].includes(payload.state))fail('assignment_request_invalid');
   if(payload.search!=null&&(typeof payload.search!=='string'||payload.search.length>120))fail('assignment_request_invalid');
   if(action==='assign'&&(!UUID.test(payload.requestId)||!['class','selected'].includes(payload.mode)||!/^[a-f0-9]{64}$/.test(payload.fingerprint)||!/^[a-f0-9]{64}$/.test(payload.rosterFingerprint)||
    !Array.isArray(payload.enrollmentIds)||payload.enrollmentIds.length>500||payload.enrollmentIds.some(x=>typeof x!=='string'||!UUID.test(x))||(payload.instructions!=null&&(typeof payload.instructions!=='string'||payload.instructions.length>2000))))fail('assignment_request_invalid');
   if(action==='cancel'&&(!Number.isSafeInteger(payload.revision)||payload.revision<1||typeof payload.reason!=='string'||!payload.reason.trim()||payload.reason.length>1000))fail('assignment_request_invalid');
   const rpc=async()=>{const {data,error}=await admin.rpc('service_resource_assignments',{p_actor_id:auth.user.id,p_auth_session_id:claims.session_id,p_action:action,p_context:context,p_payload:payload});if(error)throw Error(error.message);return data;};
   const data=await rpc();
   if(action==='open'){
    const material=data.assignment.material,delivery=data.delivery;
    if(material.definition.format==='link'){
     if(!resourceUrl(delivery.url,env.url))fail('assignment_unavailable');
     await rpc();await live();return reply({url:delivery.url});
    }
    if(!Number.isInteger(delivery.bytes)||delivery.bytes<1||delivery.bytes>MAX_RESOURCE_BYTES)fail('assignment_unavailable');
    const stored=await admin.storage.from('supplementary-materials').download(delivery.path);
    if(stored.error||!stored.data)fail('assignment_storage_unavailable');
    const bytes=new Uint8Array(await stored.data.arrayBuffer());
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(bytes.length!==delivery.bytes||hash!==delivery.sha256)fail('assignment_file_invalid');
    await rpc();await live();
    return new Response(bytes,{headers:{...cors,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="haiedu-assignment-'+payload.id+'-v'+material.version+'.pdf"','Content-Security-Policy':"sandbox; default-src 'none'"}});
   }
   await live();return reply(data);
  }catch(error){
   let code=String(error?.message??'').split('\n')[0].trim();
   if(['resource_forbidden','learning_context_unavailable','written_context_unavailable','written_read_only'].includes(code))code='assignment_forbidden';
   const statuses={assignment_forbidden:403,assignment_unavailable:404,assignment_conflict:409,assignment_preview_stale:409,assignment_recipients_invalid:400,assignment_recipient_limit:400,assignment_request_invalid:400,assignment_reason_required:400,assignment_storage_unavailable:503,assignment_file_invalid:503};
   return reply({error:statuses[code]?code:'service_unavailable'},statuses[code]??503);
  }
 };
}
