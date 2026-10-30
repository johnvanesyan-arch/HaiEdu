import {readFileSync} from 'node:fs';
import {compile} from './learning-acceptance.mjs';
import {studentTaskFixture,id,context,pdf,textDefinition} from './teacher-task-student-api.mjs';
import {taskPrivacyRpc,removeTeacherTaskFiles,taskAuthUserMissing} from '../../supabase/functions/_shared/teacher-task-privacy.mjs';
export {id,context,pdf,textDefinition};
export const privacyToken=(actor=40,aal='aal2')=>'fixture.'+Buffer.from(JSON.stringify({session_id:id(({10:401,12:9212,20:420,21:421,30:430,40:440})[actor]),aal})).toString('base64url')+'.'+actor;
// Existing legacy privacy DDL/procedure, without unrelated policy replacement.
export function privacyFoundationSQL(){
 const sql=readFileSync('supabase/migrations/0011_security_privacy_administration.sql','utf8');
 const a=sql.indexOf('create table if not exists public.privacy_preferences'),b=sql.indexOf('alter table public.privacy_preferences enable row level security');
 const c=sql.indexOf('create or replace function public.erase_student_data'),d=sql.indexOf('create or replace function private.audit_profile_security_change',c);
 return `create type public.user_role as enum ('student','teacher','school_admin','content_admin','admin');
 create table if not exists class_memberships(class_id uuid,student_id uuid);
 alter table profiles add column updated_at timestamptz default now(),add column created_at timestamptz default now(),add column status_changed_at timestamptz default now();
 ${sql.slice(a,b)}\n${sql.slice(c,d)}`;
}
function crud(db){return table=>{
 if(!/^[a-z_]+$/.test(table))throw Error('Invalid fixture table');
 let mode='select',columns='*',value=null,single=false,limit=null,clauses=[],orders=[],params=[];
 const ident=s=>{if(!/^[a-z_]+$/.test(s))throw Error('Invalid fixture identifier');return s;};
 const bind=v=>{params.push(v&&typeof v==='object'?JSON.stringify(v):v);return '$'+params.length;};
 const q={select(c='*'){columns=c==='*'?'*':c.split(',').map(x=>ident(x.trim())).join(',');return q;},
  update(v){mode='update';value=v;return q;},insert(v){mode='insert';value=v;return q;},
  eq(k,v){clauses.push(ident(k)+'='+bind(v));return q;},in(k,v){clauses.push(ident(k)+' in ('+v.map(bind).join(',')+')');return q;},
  order(k,{ascending=true}={}){orders.push(ident(k)+(ascending?' asc':' desc'));return q;},limit(n){limit=n;return q;},
  maybeSingle(){single=true;return q;},single(){single=true;return q;},
  then(resolve,reject){return(async()=>{try{
   const where=clauses.length?' where '+clauses.join(' and '):'';let sql;
   if(mode==='select')sql=`select ${columns} from ${table}${where}${orders.length?' order by '+orders.join(','):''}${limit==null?'':' limit '+Number(limit)}`;
   else if(mode==='update')sql=`update ${table} set ${Object.entries(value).map(([k,v])=>ident(k)+'='+bind(v)).join(',')}${where} returning ${columns}`;
   else sql=`insert into ${table}(${Object.keys(value).map(ident).join(',')}) values(${Object.values(value).map(bind).join(',')}) returning ${columns}`;
   const r=await db.query(sql,params);return{data:single?r.rows[0]??null:r.rows,error:null};
  }catch(error){return{data:null,error:{message:error.message,code:error.code}};}})().then(resolve,reject);}
 };return q;
};}
export async function privacyFixture(){
 const f=await studentTaskFixture({review:true});await f.db.exec(privacyFoundationSQL());
 await f.db.query("insert into profiles(id,role,account_status,display_name) values($1,'admin','active','Synthetic administrator')",[id(40)]);
 await f.db.query('insert into auth.users(id) values($1)',[id(40)]);await f.db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(440),id(40)]);
 await f.db.exec(readFileSync('supabase/migrations/20261030204829_teacher_task_privacy.sql','utf8'));
 f.admin.from=crud(f.db);const baseRpc=f.admin.rpc.bind(f.admin);let lostRpc=null,removeMode='ok',authDeleteMode='ok',removes=0;
 f.admin.rpc=async(name,args)=>{const r=await baseRpc(name,args);if(!r.error&&(lostRpc===args.p_action||lostRpc===name)){lostRpc=null;return{data:null,error:{message:'fixture_lost_reply'}};}return r;};
 f.admin.auth={getUser:async token=>{const actor=Number(token.split('.').at(-1));return token.startsWith('fixture.')&&[10,12,20,21,30,40].includes(actor)?{data:{user:{id:id(actor)}}}:{error:{message:'Invalid fixture credential'}};},admin:{
  async updateUserById(user){const r=await f.db.query("update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=$1 returning id",[user]);return r.rows.length?{data:{user:{id:user}}}:{error:{code:'user_not_found',status:404}};},
  async deleteUser(user){if(authDeleteMode==='fail')return{error:{status:503}};const r=await f.db.query('delete from auth.users where id=$1 returning id',[user]);if(authDeleteMode==='lost'){authDeleteMode='ok';return{error:{status:503}};}return r.rows.length?{data:{}}:{error:{status:404,code:'user_not_found'}};}
 }};
 const oldStore=f.admin.storage.from('teacher-task-files');f.admin.storage={from:bucket=>{if(bucket!=='teacher-task-files')throw Error('Unexpected fixture bucket');return{...oldStore,
  async remove(paths){removes++;if(removeMode==='fail')return{error:{status:503}};paths.forEach(p=>f.objects.delete(p));return removeMode==='lost'?{error:{status:503}}:{data:[]};},
  async list(prefix,{search}){return{data:[...f.objects.keys()].filter(p=>p.startsWith(prefix+'/')&&!p.slice(prefix.length+1).includes('/')&&p.slice(prefix.length+1).includes(search)).map(p=>({name:p.slice(prefix.length+1)})),error:null};}
 };}};
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);let handleAdmin,handleMine;
 const bindings={createClient:()=>f.admin,hasActiveLiveSession,taskPrivacyRpc,removeTeacherTaskFiles,taskAuthUserMissing,
  Deno:{env:{get:()=> 'fixture'},serve:fn=>{handleAdmin=fn;}}};
 compile(readFileSync('supabase/functions/manage-admin-account/index.ts','utf8'),bindings,[]);
 compile(readFileSync('supabase/functions/manage-my-privacy/index.ts','utf8'),{createClient:()=>f.admin,Deno:{env:{get:()=> 'fixture'},serve:fn=>{handleMine=fn;}}},[]);
 const request=(handler,body,actor=40,aal='aal2')=>handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+privacyToken(actor,aal),'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const privacy=(action,payload,actor=40)=>baseRpc('service_teacher_task_privacy',{p_actor:id(actor),p_auth:id(actor===40?440:420),p_action:action,p_payload:payload});
 return{...f,privacy,adminRequest:(body,actor=40,aal='aal2')=>request(handleAdmin,body,actor,aal),mineRequest:(body,actor=10)=>request(handleMine,body,actor),
  async processing(student=10){const r=await f.db.query("insert into account_deletion_requests(user_id,auth_user_id,requester_user_id,status) values($1,$1,$1,'processing') returning id",[id(student)]);await f.db.query("update profiles set account_status='deletion_pending' where id=$1",[id(student)]);return r.rows[0].id;},
  async drainElapsed(){await f.db.exec("update teacher_task_storage_deletions set not_before=clock_timestamp()-interval '1 second'");},
  loseRpc(name){lostRpc=name;},storageMode(mode){removeMode=mode;},authMode(mode){authDeleteMode=mode;},removeCalls:()=>removes,
 };
}
