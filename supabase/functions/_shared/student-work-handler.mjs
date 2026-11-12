import {enforceRateBudget} from './rate-budget.mjs';
// One read-only "My work" list for the signed-in student.
// Each source keeps its own authorization in SQL: this handler calls the same
// three service functions the per-source endpoints call, as the same actor and
// Auth session, with their own inbox action, and only merges the results.
// It never writes, never widens a query and never trusts client identifiers.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=code=>{throw Error(code);};
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
export const STUDENT_WORK_VERSION='student-work-v1';
// Each source pages 50 rows; this bounds one request to 20 pages (1,000 rows) per source.
export const STUDENT_WORK_MAX_PAGES=20;
const forbidden=new Set(['task_work_forbidden','assignment_forbidden','resource_forbidden','learning_context_unavailable','written_read_only','unauthorized']);
export const studentWorkSources=[
 {key:'task',rpc:'service_teacher_task_student_work',version:'teacher-task-student-work-v1',
  args:(actor,session,offset)=>({p_actor:actor,p_auth:session,p_action:'inbox',p_context:{},p_payload:{offset}}),
  // The task inbox returns current and cancelled deliveries together.
  keep:(row,state)=>state==='history'?row.cancelled===true:row.cancelled!==true},
 {key:'writing',rpc:'service_writing_assignments',version:'writing-assignments-v1',
  args:(actor,session,offset,state)=>({p_actor_id:actor,p_auth_session_id:session,p_action:'inbox',p_context:{},p_payload:{offset,state}}),
  keep:()=>true},
 {key:'material',rpc:'service_resource_assignments',version:null,
  args:(actor,session,offset,state)=>({p_actor_id:actor,p_auth_session_id:session,p_action:'inbox',p_context:{},p_payload:{offset,state}}),
  keep:()=>true},
];
async function bodyJSON(request){
 if(Number(request.headers.get('content-length'))>4096)fail('student_work_invalid');
 const reader=request.body?.getReader();if(!reader)fail('student_work_invalid');
 const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();fail('student_work_invalid');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail('student_work_invalid');}
}
const code=error=>String(error?.message??'').split('\n')[0].trim();
async function readSource(admin,source,actor,session,state){
 const rows=[];let offset=0;
 for(let page=0;page<STUDENT_WORK_MAX_PAGES;page++){
  const {data,error}=await admin.rpc(source.rpc,source.args(actor,session,offset,state));
  if(error)throw Error(error.message);
  if(!data||!Array.isArray(data.assignments)||source.version&&data.version!==source.version)fail('student_work_source_invalid');
  rows.push(...data.assignments.filter(row=>source.keep(row,state)));
  if(!data.hasMore)return {rows,complete:true};
  if(!Number.isSafeInteger(data.nextOffset)||data.nextOffset<=offset)fail('student_work_source_invalid');
  offset=data.nextOffset;
 }
 return {rows,complete:false};
}
const dateOf=row=>Date.parse(row.sentAt??row.assignedAt??'')||0;
export function mergeStudentWork(results){
 const items=[];
 for(const [key,result]of Object.entries(results))if(result.status==='ok')result.rows.forEach((row,order)=>items.push({source:key,order,row}));
 // Newest first across sources; each source's own order breaks ties.
 items.sort((a,b)=>dateOf(b.row)-dateOf(a.row)||studentWorkSources.findIndex(s=>s.key===a.source)-studentWorkSources.findIndex(s=>s.key===b.source)||a.order-b.order);
 return items.map(({source,row})=>({source,row}));
}
export function createStudentWorkHandler({createAdmin,hasActiveLiveSession,env,rateBudget=enforceRateBudget,rateBudgetRoute="get-student-work"}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  try{
   if(!env.url||!env.key)return reply({error:'service_unavailable'},503);
   const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return reply({error:'unauthorized'},401);
   const admin=createAdmin(env.url,env.key),{data:auth,error}=await admin.auth.getUser(token);
   if(error||!auth?.user)return reply({error:'unauthorized'},401);
   let claims;try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'=')));}catch{fail('student_work_forbidden');}
   const actor=auth.user.id,session=claims?.session_id;
   const live=async()=>{if(!UUID.test(session??'')||!['aal1','aal2'].includes(claims.aal)||!await hasActiveLiveSession(admin,token,actor))fail('student_work_forbidden');};
   await live();
   const rateDenied=await rateBudget(request,admin,actor,token,rateBudgetRoute);if(rateDenied)return rateDenied;

   const body=await bodyJSON(request);
   if(!shape(body,['action','payload'])||body.action!=='inbox'||!shape(body.payload??{},['state']))fail('student_work_invalid');
   const state=body.payload?.state??'current';if(!['current','history'].includes(state))fail('student_work_invalid');
   const results={};
   // Sequential reads keep one source's failure from racing another's authorization.
   for(const source of studentWorkSources){
    try{results[source.key]={status:'ok',...await readSource(admin,source,actor,session,state)};}
    catch(e){if(forbidden.has(code(e)))fail('student_work_forbidden');results[source.key]={status:'unavailable'};}
   }
   await live();
   const sources=Object.fromEntries(Object.entries(results).map(([key,r])=>[key,r.status==='ok'?{status:'ok',complete:r.complete}:{status:'unavailable'}]));
   return reply({version:STUDENT_WORK_VERSION,state,items:mergeStudentWork(results),sources});
  }catch(error){
   const c=code(error),statuses={student_work_forbidden:403,student_work_invalid:400};
   return reply({error:statuses[c]?c:'service_unavailable'},statuses[c]??503);
  }
 };
}
