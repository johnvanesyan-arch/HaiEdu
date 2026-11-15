// Runs only in the owned Docker network. No user-controlled upstream.
const routeNames = ['get-student-classes','get-teacher-dashboard','get-school-admin-overview'];
const configuration = JSON.parse(Deno.env.get('BF21_GATEWAY') ?? '{}');
if (!/^[a-f0-9]{24}$/.test(configuration.runId ?? '') || !/^[a-f0-9]{40}$/.test(configuration.sourceCommit ?? '')
    || !configuration.anonKey || !configuration.serviceKey) throw Error('local_gateway_configuration_required');
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'};
const result=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
  const url=new URL(req.url);
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(url.pathname==='/_local/identity' && req.method==='GET')return result({kind:'owned-local',runId:configuration.runId,sourceCommit:configuration.sourceCommit});
  if(![configuration.anonKey,configuration.serviceKey].includes(req.headers.get('apikey')))return result({error:'local_api_key_required'},401);
  let upstream:string|undefined;
  if(/^\/auth\/v1\/(?:token|user|logout|settings|health|\.well-known\/jwks\.json)$/.test(url.pathname)) upstream='http://auth:9999'+url.pathname.slice('/auth/v1'.length)+url.search;
  else if(url.pathname==='/auth/v1/admin/users' && req.headers.get('apikey')===configuration.serviceKey && req.method==='GET') upstream='http://auth:9999/admin/users'+url.search;
  else if(url.pathname.startsWith('/rest/v1/')) upstream='http://rest:3000'+url.pathname.slice('/rest/v1'.length)+url.search;
  else if(url.pathname.startsWith('/functions/v1/')) {
    const name=url.pathname.slice('/functions/v1/'.length);
    if(routeNames.includes(name))upstream='http://'+name+':9000/'+url.search;
  }
  if(!upstream || !['GET','POST'].includes(req.method))return result({error:'local_route_not_enabled'},404);
  try {
    const headers=new Headers(req.headers);headers.delete('host');headers.delete('content-length');
    const body=req.method==='GET'?undefined:await req.arrayBuffer();
    if(body && body.byteLength>1048576)return result({error:'local_request_too_large'},413);
    const response=await fetch(upstream,{method:req.method,headers,body,redirect:'error',signal:AbortSignal.timeout(20000)});
    const outgoing=new Headers(response.headers);for(const [k,v] of Object.entries(cors))outgoing.set(k,v);
    return new Response(response.body,{status:response.status,headers:outgoing});
  }catch{return result({error:'local_upstream_unavailable'},502);}
});
