// Read-only boundary probes. The reserved UUID is never a production assignment.
// No production media, session, answer or exposure is created for capability QA.
export async function sharedTaskSetsReadAcceptance({request,check}){
 const actors=[null,'A_student','B_student','A_teacher','B_teacher','A_admin','B_admin'];
 for(const actor of actors){
  for(const [table,column] of [['learning_task_set_versions','id'],['learning_source_family_exposures','session_item_id']]){
   const r=await request(actor,`/rest/v1/${table}?select=${column}&limit=1`,null,'GET');
   const denied=((r.status===403||(actor===null&&r.status===401))&&r.data?.code==='42501')||(r.status===200&&Array.isArray(r.data)&&r.data.length===0);
   check(`${actor??'anonymous'}: private ${table} reads denied or empty`,denied,r.status);
  }
  const r=await request(actor,'/functions/v1/get-learning-task-set',{action:'catalog',itemId:'00000000-0000-4000-8000-000000000000'});
  check(`${actor??'anonymous'}: shared-source catalog requires an authorized content reviewer and item`,actor===null?[401,403].includes(r.status):r.status===403&&r.data?.error==='task_set_access_denied',r.status);
 }
}
