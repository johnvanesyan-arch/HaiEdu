const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function authSession(token){try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(part+'='.repeat((4-part.length%4)%4))).session_id;}catch{return null;}}
export function createLearningAudioHandler({createAdmin,hasActiveLiveSession,env}){
 return async request=>{
  let markFailed;
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!env.url||!env.key)return json({error:'audio_service_unavailable'},503);
  const header=request.headers.get('Authorization');
  if(!/^Bearer\s+\S+$/i.test(header??''))return json({error:'unauthorized'},401);
  try{
   const raw=await request.text();if(raw.length>2000)return json({error:'audio_request_invalid'},400);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'audio_request_invalid'},400);}
   if(!body||Array.isArray(body))return json({error:'audio_request_invalid'},400);
   const assessed=body.playbackPolicy==='assessed-recording-v1';
   const actions=assessed?['state','load','begin','progress','complete','pause','failed','cancel']:['load','preview','catalog','started','completed','failed'];
   if(!actions.includes(body.action))return json({error:'audio_request_invalid'},400);
   const preview=body.action==='preview',staff=preview||body.action==='catalog',events=assessed&&['begin','progress','complete','pause'].includes(body.action);
   const allowed=staff?['action','itemId']:['action','sessionId','sessionItemId',...(assessed?['playbackPolicy']:[]),...(events?['clientId','playId','positionMs']:[])];
   if(Object.keys(body).some(k=>!allowed.includes(k))||!(staff?uuid(body.itemId):uuid(body.sessionId)&&uuid(body.sessionItemId)))return json({error:'audio_request_invalid'},400);
   if(events&&(!uuid(body.clientId)||!uuid(body.playId)||!Number.isSafeInteger(body.positionMs)||body.positionMs<0||body.positionMs>600000))return json({error:'audio_request_invalid'},400);
   const token=header.replace(/^Bearer\s+/i,''),admin=createAdmin(env.url,env.key),authId=authSession(token);
   const {data,error}=await admin.auth.getUser(token);
   if(error||!data?.user)return json({error:'unauthorized'},401);
   if(!uuid(authId)||!await hasActiveLiveSession(admin,token,data.user.id))return json({error:'account_or_session_inactive'},403);
   const args={p_actor_id:data.user.id,p_auth_session_id:authId,p_action:body.action,p_session_id:body.sessionId??null,p_session_item_id:body.sessionItemId??null,p_item_id:body.itemId??null};
   const call=async action=>{
    const params=assessed?{p_actor_id:args.p_actor_id,p_auth_session_id:args.p_auth_session_id,p_action:action,p_session_id:args.p_session_id,p_session_item_id:args.p_session_item_id,p_payload:events?{clientId:body.clientId,playId:body.playId,positionMs:body.positionMs}:{}}:{...args,p_action:action};
    const r=await admin.rpc(assessed?'service_assessed_audio':'service_learning_audio',params);if(r.error||!r.data)throw new Error(r.error?.message??'audio_unavailable');return r.data;
   };
   const manifest=await call(body.action);
   if(!['load','preview'].includes(body.action))return json(manifest);
   if(!preview)markFailed=()=>call(assessed?'unavailable':'failed');
   // Never return a storage path or bearer/signed URL. Each full transfer is
   // authorized again; approved short recordings are capped at 8 MiB.
   const bucket=await admin.storage.getBucket(manifest.bucketId);
   if(bucket.error||!bucket.data||bucket.data.public!==false)throw new Error('audio_unavailable');
   const download=await admin.storage.from(manifest.bucketId).download(manifest.objectPath);
   if(download.error||!(download.data instanceof Blob)||download.data.size!==manifest.byteLength||download.data.size>8388608)throw new Error('audio_unavailable');
   const bytes=await download.data.arrayBuffer();
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(digest!==manifest.sha256||!['audio/mpeg','audio/wav'].includes(manifest.mimeType))throw new Error('audio_unavailable');
   if(!await hasActiveLiveSession(admin,token,data.user.id))return json({error:'account_or_session_inactive'},403);
   await call(preview?'preview':'fetched'); // Repeat live scope/retirement checks after I/O.
   // Supabase FunctionsClient decodes octet-stream as Blob; audio/* falls back
   // to text. Expose the separately validated media type for the local player.
   return new Response(bytes,{headers:{...cors,'Content-Type':'application/octet-stream','X-HaiEdu-Audio-Type':manifest.mimeType,'Access-Control-Expose-Headers':'X-HaiEdu-Audio-Type','Content-Length':String(bytes.byteLength),'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
  }catch(error){
   if(markFailed)await markFailed().catch(()=>{});
   const message=String(error?.message??'').replace('learning_context_unavailable','audio_access_denied');
   const conflict=['audio_playback_incomplete','audio_not_loaded','audio_play_limit_reached','audio_playback_busy','audio_playback_conflict','audio_progress_invalid','audio_interruption_required'];
   const code=['audio_access_denied','audio_mode_unavailable','audio_policy_unavailable','audio_policy_invalid','audio_request_invalid',...conflict].find(x=>message.includes(x));
   return json({error:code??'audio_unavailable'},code==='audio_request_invalid'?400:conflict.includes(code)?409:code?403:503);
  }
 };
}
