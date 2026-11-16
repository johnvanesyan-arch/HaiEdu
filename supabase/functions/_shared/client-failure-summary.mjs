import {FAILURE_CATEGORIES,FAILURE_OPERATIONS} from './client-failure-contract.mjs';
export const CLIENT_SUMMARY_SCOPE='bf22-authenticated-client-reports';
export function validateClientSummary(value) {
  if(!value||Object.keys(value).sort().join(',')!=='candidates,observedAt,schemaVersion,scope'
    ||value.schemaVersion!==1||value.scope!==CLIENT_SUMMARY_SCOPE
    ||typeof value.observedAt!=='string'||!Number.isFinite(Date.parse(value.observedAt))||new Date(value.observedAt).toISOString()!==value.observedAt
    ||!Array.isArray(value.candidates)||value.candidates.length>FAILURE_CATEGORIES.length*FAILURE_OPERATIONS.length)throw Error('invalid_client_summary');
  const seen=new Set();
  for(const candidate of value.candidates){
    if(!candidate||Object.keys(candidate).sort().join(',')!=='category,count,operation'
      ||!FAILURE_CATEGORIES.includes(candidate.category)||!FAILURE_OPERATIONS.includes(candidate.operation)
      ||!Number.isInteger(candidate.count)||candidate.count<3||candidate.count>500
      ||seen.has(candidate.category+':'+candidate.operation))throw Error('invalid_client_summary');
    seen.add(candidate.category+':'+candidate.operation);
  }
  return value;
}
export function createClientSummaryHandler({mode=()=> 'off',secret=()=>'',read,now=()=>new Date()}={}){
  let running=false,last=-Infinity;
  return async request=>{
    const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
    const reject=status=>new Response(JSON.stringify({error:'summary_unavailable'}),{status,headers});
    if(request.method!=='POST'||new URL(request.url).search)return reject(405);
    if(mode()!=='observe')return reject(503);
    const expected=secret(),actual=request.headers.get('authorization')?.replace(/^Bearer /,'');
    if(!/^[a-f0-9]{64}$/.test(expected)||!/^[a-f0-9]{64}$/.test(actual??''))return reject(401);
    const [a,b]=await Promise.all([expected,actual].map(s=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
    let mismatch=0;new Uint8Array(a).forEach((v,i)=>mismatch|=v^new Uint8Array(b)[i]);if(mismatch)return reject(401);
    if(running||now().getTime()-last<60000)return reject(429);
    running=true;last=now().getTime();
    try{
      const candidates=await read();
      const summary=validateClientSummary({schemaVersion:1,scope:CLIENT_SUMMARY_SCOPE,observedAt:now().toISOString(),candidates});
      return new Response(JSON.stringify(summary),{status:200,headers});
    }catch{return reject(503);}finally{running=false;}
  };
}
