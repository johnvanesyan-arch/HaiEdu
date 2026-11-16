import {validateClientFailure} from './client-failure-contract.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(error,status)=>new Response(JSON.stringify({error}),{status,headers:cors});
const accepted=()=>new Response(null,{status:204,headers:cors});
export async function boundedFailureBody(request,limit=1024,signal) {
  if(Number(request.headers.get('content-length'))>limit)throw Error('invalid_report');
  const reader=request.body?.getReader();if(!reader)throw Error('invalid_report');
  const abort=()=>{void reader.cancel().catch(()=>{});};
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  let size=0;const chunks=[];
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('invalid_report');chunks.push(value);}
  }finally{signal?.removeEventListener('abort',abort);void reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
// Coarse per-worker protection complements (never replaces) the atomic database
// caps. No shared-IP classroom bucket or caller-controlled key is allocated.
export function createClientFailureHandler({mode=()=> 'off',authenticate,record,now=Date.now,deadlineMs=2500}={}) {
  let minute=0,count=0,active=0;
  return async request=>{
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(request.method!=='POST')return reply('method_not_allowed',405);
    if(mode()!=='observe')return reply('reporting_disabled',503);
    const bucket=Math.floor(now()/60000);if(bucket!==minute){minute=bucket;count=0;}
    if(++count>200||active>=16)return reply('report_limit',429);
    const token=request.headers.get('authorization');
    if(!/^Bearer [A-Za-z0-9_.-]{32,8192}$/.test(token??''))return reply('unauthorized',401);
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return reply('invalid_report',400);
    active++;const controller=new AbortController();let timer;
    try {
      return await Promise.race([(async()=>{
        let report;try{report=await boundedFailureBody(request,1024,controller.signal);}catch{return reply('invalid_report',400);}
        if(controller.signal.aborted)return reply('reporting_unavailable',503);
        if(!validateClientFailure(report))return reply('invalid_report',400);
        const actor=await authenticate(token.slice(7),controller.signal);
        if(!actor)return reply('unauthorized',401);
        if(controller.signal.aborted)return reply('reporting_unavailable',503);
        const outcome=await record(actor,report,controller.signal);
        if(outcome==='accepted'||outcome==='duplicate')return accepted();
        if(outcome==='limited')return reply('report_limit',429);
        if(outcome==='inactive')return reply('unauthorized',401);
        if(outcome==='invalid')return reply('invalid_report',400);
        return reply('reporting_unavailable',503);
      })(),new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(reply('reporting_unavailable',503));},deadlineMs);})]);
    }catch{return reply('reporting_unavailable',503);}
    finally{clearTimeout(timer);controller.abort();active--;}
  };
}
