// Runs only in the owned Docker network. No user-controlled upstream.
const services = JSON.parse(Deno.readTextFileSync('/service/services.json'));
const routeNames = Object.keys(services);
const configuration = JSON.parse(Deno.env.get('BF21_GATEWAY') ?? '{}');
if (!/^[a-f0-9]{24}$/.test(configuration.runId ?? '') || !/^[a-f0-9]{40}$/.test(configuration.sourceCommit ?? '')
    || !configuration.anonKey || !configuration.serviceKey) throw Error('local_gateway_configuration_required');
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'};
const result=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
async function boundedBody(req:Request,limit:number) {
  if(Number(req.headers.get('content-length'))>limit)return null;
  const reader=req.clone().body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let length=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;
    if(length>limit){void reader.cancel();return null;}chunks.push(value);}}
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
Deno.serve(async req=>{
  const url=new URL(req.url);
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(url.pathname==='/_local/identity' && req.method==='GET')return result({kind:'owned-local',runId:configuration.runId,sourceCommit:configuration.sourceCommit});
  if(![configuration.anonKey,configuration.serviceKey].includes(req.headers.get('apikey')))return result({error:'local_api_key_required'},401);
  let upstream:string|undefined, service:string|undefined;
  if(/^\/auth\/v1\/(?:token|user|logout|settings|health|\.well-known\/jwks\.json)$/.test(url.pathname)) upstream='http://auth:9999'+url.pathname.slice('/auth/v1'.length)+url.search;
  else if(url.pathname==='/auth/v1/admin/users' && req.headers.get('apikey')===configuration.serviceKey && req.method==='GET') upstream='http://auth:9999/admin/users'+url.search;
  else if(url.pathname.startsWith('/rest/v1/')) upstream='http://rest:3000'+url.pathname.slice('/rest/v1'.length)+url.search;
  else if(/^\/storage\/v1\/object\/(?:authenticated\/|public\/)?teacher-task-files\/[a-zA-Z0-9_/-]+\.(?:pdf|docx)$/.test(url.pathname)) upstream='http://storage:5000'+url.pathname.slice('/storage/v1'.length)+url.search;
  else if(/^\/storage\/v1\/object\/(?:authenticated\/|public\/)?supplementary-materials\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/.test(url.pathname)) upstream='http://storage:5000'+url.pathname.slice('/storage/v1'.length)+url.search;
  else if(req.method==='GET' && (/^\/storage\/v1\/object\/(?:authenticated\/|public\/)?bf21-audio\/[a-f0-9]{64}\.wav$/.test(url.pathname) || url.pathname==='/storage/v1/bucket/bf21-audio')) upstream='http://storage:5000'+url.pathname.slice('/storage/v1'.length);
  else if(url.pathname.startsWith('/functions/v1/')) {
    const name=url.pathname.slice('/functions/v1/'.length);
    if(routeNames.includes(name))service=name;
  }
  if((!upstream&&!service) || !['GET','POST'].includes(req.method))return result({error:'local_route_not_enabled'},404);
  try {
    const headers=new Headers(req.headers);headers.delete('host');headers.delete('content-length');
    const limit=service?services[service].maxBodyBytes??1048576:upstream?.startsWith('http://storage:5000/')?10485760:1048576;
    const body=req.method==='GET'?undefined:await boundedBody(req,limit);
    if(body===null)return result({error:'local_request_too_large'},413);
    if(service && services[service].actions) {
      let action;try{action=JSON.parse(new TextDecoder().decode(body)).action;}catch{}
      if(!services[service].actions.includes(action))return result({error:'local_read_action_required'},400);
    }
    let response:Response;
    if(service) {
      // One pinned runtime owns isolated workers for the fixed reviewed bundles.
      // No caller controls service paths, imports, credentials or worker settings.
      const worker=await EdgeRuntime.userWorkers.create({servicePath:'/service/'+service,
        memoryLimitMb:150,workerTimeoutMs:60000,noModuleCache:false,forceCreate:false,
        envVars:[['SUPABASE_URL','http://api:8080'],['SUPABASE_SERVICE_ROLE_KEY',configuration.serviceKey],
          ['HAIEDU_RATE_BUDGETS_MODE','off'],['NO_PROXY','api,auth,rest,storage'],['no_proxy','api,auth,rest,storage']]});
      // The pinned runtime attaches transport metadata to the original request.
      // Inspect a clone above; retain that original request and its unread body.
      response=await worker.fetch(req);
    } else response=await fetch(upstream!,{method:req.method,headers,body,redirect:'error',signal:AbortSignal.timeout(20000)});
    const outgoing=new Headers(response.headers);for(const [k,v] of Object.entries(cors))outgoing.set(k,v);
    return new Response(response.body,{status:response.status,headers:outgoing});
  }catch(error){
    const diagnostic=String(error).replaceAll(configuration.serviceKey,'[local-secret]').replaceAll(configuration.anonKey,'[local-secret]');
    console.error('local_gateway_failure',diagnostic);
    return result({error:'local_upstream_unavailable'},502);
  }
});
