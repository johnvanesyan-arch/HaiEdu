import {readFileSync,readdirSync} from 'node:fs';
import {database as base,call as materialCall,definition,id,context,scopes} from './supplementary-resources-db.mjs';
export {id,context,scopes,definition,materialCall};
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(x=>x.endsWith('_sprint_16_5b_resource_assignments.sql'));
export async function addLearner(db,n=12){
 await db.query("insert into profiles(id,role,account_status,display_name) values($1,'student','active',$2)",[id(n),'Synthetic learner '+n]);
 await db.query('insert into auth.users(id) values($1)',[id(n)]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(9200+n),id(n)]);
 await db.query("insert into institutional_memberships(id,school_id,person_id,role,status,valid_from,valid_to) values($1,$2,$3,'student','active','2020-01-01',null)",[id(9000+n),id(301),id(n)]);
 await db.query("insert into institutional_class_enrollments(id,student_id,school_id,academic_year_id,class_id,student_membership_id,teacher_assignment_id,subject_program_id,status,valid_from,valid_to) values($1,$2,$3,$4,$5,$6,$7,$8,'active','2020-01-01',null)",[id(9100+n),id(n),id(301),id(311),id(321),id(9000+n),id(351),id(201)]);
}
export async function database(){const db=await base();try{await db.exec(readFileSync(migrationPath,'utf8'));await addLearner(db);return db;}catch(e){await db.close();throw e;}}
export async function published(db,options={}){
 const m=(await materialCall(db,'create',{definition:{...definition,...options.definition}},options)).material;
 await materialCall(db,'qa',{id:m.id,fingerprint:m.fingerprint},options);
 return(await materialCall(db,'publish',{id:m.id,fingerprint:m.fingerprint},{...options,...(options.actor===30?{aal:'aal2'}:{})})).material;
}
export async function call(db,action,payload={},options={}){
 const actor=options.actor??20,isTeacher=[20,21].includes(actor);
 const ctx=options.context??(action==='inbox'?{}:{...context(options.index??0,isTeacher),...(!isTeacher&&actor!==10?{enrollmentId:id(actor===11?372:9100+actor)}:{})});
 const auth=options.auth??(actor===20?420:actor===21?421:actor===10?401:actor===11?402:9200+actor);
 return(await db.query('select service_resource_assignments($1,$2,$3,$4,$5) result',[id(actor),id(auth),action,JSON.stringify(ctx),JSON.stringify(payload)])).rows[0].result;
}
export async function prepared(db,m,extra={}){
 const p=await call(db,'preview',{materialId:m.id});
 return {materialId:m.id,fingerprint:m.fingerprint,requestId:crypto.randomUUID(),rosterFingerprint:p.rosterFingerprint,mode:'class',enrollmentIds:[],instructions:'Read before our next lesson.',...extra};
}
