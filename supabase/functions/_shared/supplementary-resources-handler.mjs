const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_RESOURCE_BYTES=5*1024*1024;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=code=>{throw new Error(code);};
export function resourceUrl(value,serviceUrl=''){
 if(typeof value!=='string'||value.length>2048||/[\s\\]/.test(value))return false;
 try{const u=new URL(value),h=u.hostname.toLowerCase();
 return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&h.includes('.')&&
 !/^(?:\[|\d+(?:\.|$))/.test(h)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(h)&&
 !/(?:^|\.)(?:supabase\.co|supabase\.in|haiedu\.am)$/.test(h)&&h!==(serviceUrl?new URL(serviceUrl).hostname:'');
 }catch{return false;}
}
export function validResourcePdf(bytes){
 if(!bytes?.byteLength||bytes.byteLength>MAX_RESOURCE_BYTES)return false;
 const text=new TextDecoder('latin1');
 return /^%PDF-(1\.[0-7]|2\.0)[\r\n\s]/.test(text.decode(bytes.slice(0,16)))&&/%%EOF\s*$/.test(text.decode(bytes.slice(-1024)));
}
async function bounded(request,max){
 if(Number(request.headers.get('content-length'))>max)fail('resource_too_large');
 const reader=request.body?.getReader();if(!reader)fail('resource_request_invalid');
 let size=0;const chunks=[];
 try{while(true){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail('resource_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
}
const shape=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k));
export function createSupplementaryResourcesHandler({createAdmin,hasActiveLiveSession,env}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  let uploaded=null,admin=null,attached=false;
  try{
   if(!env.url||!env.key)return reply({error:'service_unavailable'},503);
   const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return reply({error:'unauthorized'},401);
   admin=createAdmin(env.url,env.key);const{data:auth,error:authError}=await admin.auth.getUser(token);
   if(authError||!auth?.user)return reply({error:'unauthorized'},401);
   let claims;try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{fail('resource_forbidden');}
   if(!UUID.test(claims.session_id)||!['aal1','aal2'].includes(claims.aal)||!await hasActiveLiveSession(admin,token,auth.user.id))fail('resource_forbidden');
   const live=async()=>{if(!await hasActiveLiveSession(admin,token,auth.user.id))fail('resource_forbidden');};
   const multipart=request.headers.get('content-type')?.startsWith('multipart/form-data;');
   const raw=await bounded(request,multipart?MAX_RESOURCE_BYTES+32768:24000);let body,file;
   try{if(multipart){const form=await new Response(raw,{headers:{'Content-Type':request.headers.get('content-type')}}).formData();
     if([...form.keys()].sort().join(',')!=='file,request')fail('resource_request_invalid');body=JSON.parse(form.get('request'));file=form.get('file');
    }else body=JSON.parse(new TextDecoder().decode(raw));}catch{fail('resource_request_invalid');}
   if(!shape(body,['action','context','payload'])||!shape(body.context??{},['enrollmentId','assignmentId','curriculumReleaseId','unitId'])||!shape(body.payload??{},['id','fingerprint','definition','reason','offset']))fail('resource_request_invalid');
   const {action,context={},payload={}}=body;
   if(!['contexts','list','get','create','revise','qa','publish','withdraw','upload','open'].includes(action)||Boolean(multipart)!==(action==='upload'))fail('resource_request_invalid');
   if(Object.values(context).some(v=>!UUID.test(v))||(payload.id!=null&&!UUID.test(payload.id)))fail('resource_request_invalid');
   const keys={contexts:[],list:['offset'],get:['id'],create:['definition'],revise:['id','fingerprint','definition','reason'],qa:['id','fingerprint'],publish:['id','fingerprint'],withdraw:['id','fingerprint','reason'],upload:['id','fingerprint'],open:['id']};
   if(Object.keys(payload).some(k=>!keys[action].includes(k)))fail('resource_request_invalid');
   if(payload.definition?.format==='link'&&!resourceUrl(payload.definition.url,env.url))fail('resource_url_invalid');
   const rpc=async(a,p=payload)=>{const{data,error}=await admin.rpc('service_supplementary_resources',{p_actor_id:auth.user.id,p_auth_session_id:claims.session_id,p_aal:claims.aal,p_action:a,p_context:context,p_payload:p});
    if(error)throw new Error(error.message);return data;};
   let data;
   if(action==='upload'){
    await rpc('upload_check');
    if(!(file instanceof Blob)||file.type!=='application/pdf'||file.size>MAX_RESOURCE_BYTES)fail('resource_file_invalid');
    const bytes=new Uint8Array(await file.arrayBuffer());if(!validResourcePdf(bytes))fail('resource_file_invalid');
    const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    uploaded=payload.id+'/'+crypto.randomUUID()+'.pdf';
    const stored=await admin.storage.from('supplementary-materials').upload(uploaded,bytes,{contentType:'application/pdf',upsert:false});if(stored.error)fail('resource_storage_unavailable');
    data=await rpc('attach',{...payload,objectPath:uploaded,fileBytes:bytes.length,fileSha256:sha});attached=true;
   }else data=await rpc(action);
   if(action==='open'){
    if(data.material.definition.format==='link'){
     if(!resourceUrl(data.delivery.url,env.url))fail('resource_unavailable');await live();
     // Recheck publication/context after delivery preparation.
     await rpc('open');return reply({url:data.delivery.url});
    }
    const stored=await admin.storage.from('supplementary-materials').download(data.delivery.path);if(stored.error||!stored.data)fail('resource_storage_unavailable');
    const bytes=new Uint8Array(await stored.data.arrayBuffer());
    const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(bytes.length!==data.delivery.bytes||sha!==data.delivery.sha256)fail('resource_file_invalid');
    await rpc('open');await live();
    return new Response(bytes,{headers:{...cors,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="haiedu-material-${payload.id}-v${data.material.version}.pdf"`,'Content-Security-Policy':"sandbox; default-src 'none'"}});
   }
   await live();return reply(data);
  }catch(error){
   if(uploaded&&!attached)await admin?.storage.from('supplementary-materials').remove([uploaded]).catch(()=>{});
   let code=String(error?.message??'');
   if(['learning_context_unavailable','written_context_unavailable','written_read_only'].includes(code))code='resource_forbidden';
   const known=['resource_request_invalid','resource_definition_invalid','resource_reason_required','resource_url_invalid','resource_file_invalid','resource_too_large','resource_forbidden','resource_unavailable','resource_conflict','resource_read_only','resource_mfa_required','resource_qa_required','resource_storage_unavailable'];
   if(!known.includes(code))return reply({error:'service_unavailable'},503);
   return reply({error:code},code==='resource_forbidden'||code==='resource_mfa_required'?403:code==='resource_unavailable'?404:code==='resource_conflict'||code==='resource_read_only'||code==='resource_qa_required'?409:code==='resource_storage_unavailable'?503:code==='resource_too_large'?413:400);
  }
 };
}
