import {appendFile,readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {eligibleEvent} from './observe-production.mjs';
import {validateClientSummary} from '../supabase/functions/_shared/client-failure-summary.mjs';
import {publishClientIncidents} from './client-failure-incidents.mjs';
const endpoint='https://xzyjvwiiibuarpotppid.supabase.co/functions/v1/get-client-failure-summary';
export function clientObserverEnabled(command,environment,event){
 if(!['collect','publish'].includes(command)||!eligibleEvent(environment,event)||environment.GITHUB_EVENT_NAME==='workflow_run')return false;
 const manual=environment.GITHUB_EVENT_NAME==='workflow_dispatch';
 if(manual&&!['inspect','notify'].includes(event.inputs?.mode))return false;
 const inspect=manual&&event.inputs.mode==='inspect';
 if(command==='publish'&&inspect)return false;
 return environment.BF22_CLIENT_FAILURE_ALERTS==='true'||command==='collect'&&inspect&&[true,'true'].includes(event.inputs.client_reports);
}
export async function fetchClientSummary(key,{fetchImpl=fetch}={}){
 if(!/^[a-f0-9]{64}$/.test(key??''))throw Error('client_summary_configuration');
 const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:'{}'});
 if(!response.ok||Number(response.headers.get('content-length'))>16384){await response.body?.cancel();throw Error('client_summary_unavailable');}
 const reader=response.body?.getReader();if(!reader)throw Error('client_summary_unavailable');const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384)throw Error('client_summary_unavailable');chunks.push(Buffer.from(value));}}
 finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
 return validateClientSummary(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
export async function main(command,environment=process.env){
 const event=JSON.parse(await readFile(environment.GITHUB_EVENT_PATH,'utf8'));
 if(!clientObserverEnabled(command,environment,event))throw Error('client_observer_disabled');
 if(command==='collect'){
  const summary=await fetchClientSummary(environment.BF22_CLIENT_FAILURE_SUMMARY_KEY);
  await mkdir('artifacts/client-failure-observer',{recursive:true});
  await writeFile('artifacts/client-failure-observer/summary.json',JSON.stringify(summary,null,2)+'\n',{mode:0o600});
  await appendFile(environment.GITHUB_OUTPUT,'summary='+JSON.stringify(summary)+'\n');
  console.log('BF22_CLIENT_SUMMARY '+JSON.stringify(summary));
 }else if(command==='publish'){
  const summary=validateClientSummary(JSON.parse(environment.BF22_CLIENT_SUMMARY));
  console.log('BF22_CLIENT_INCIDENTS '+JSON.stringify(await publishClientIncidents(summary,{token:environment.GITHUB_TOKEN})));
 }else throw Error('client_observer_configuration');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main(process.argv[2]);}catch{console.error('BF22_CLIENT_OBSERVER_ERROR unavailable');process.exitCode=1;}
}
