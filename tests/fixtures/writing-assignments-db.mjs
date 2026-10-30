import {readFileSync} from 'node:fs';
import {database as base,id,context,addLearner} from './resource-assignments-db.mjs';
export {id,context,addLearner};
export const migrationPath='supabase/migrations/20261030203359_teacher_writing_assignments.sql';
export async function database(){const db=await base();try{await db.exec(readFileSync(migrationPath,'utf8'));return db;}catch(e){await db.close();throw e;}}
export async function call(db,action,payload={},options={}){
 const actor=options.actor??20,teacher=[20,21].includes(actor);
 const ctx=options.context??(action==='inbox'?{}:{...context(options.index??0,teacher),...(!teacher&&actor!==10?{enrollmentId:id(actor===11?372:9100+actor)}:{})});
 const auth=options.auth??(actor===20?420:actor===21?421:actor===10?401:actor===11?402:9200+actor);
 return(await db.query('select service_writing_assignments($1,$2,$3,$4,$5) result',[id(actor),id(auth),action,JSON.stringify(ctx),JSON.stringify(payload)])).rows[0].result;
}
export async function prepared(db,extra={}){const p=await call(db,'preview',{taskId:id(1000)});return {taskId:id(1000),fingerprint:p.task.fingerprint,requestId:crypto.randomUUID(),rosterFingerprint:p.rosterFingerprint,mode:'class',enrollmentIds:[],...extra};}
