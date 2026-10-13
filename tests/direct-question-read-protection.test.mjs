import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {database,launch,operation,finish,id} from './fixtures/governed-runtime-db.mjs';

const source=name=>readFileSync('supabase/migrations/'+name,'utf8');
const migration=source(readdirSync('supabase/migrations').find(n=>n.endsWith('_protect_direct_question_reads.sql')));
const helperSource=source('0003_security_hardening.sql');
const roleHelper=helperSource.slice(helperSource.indexOf('create or replace function private.current_user_role()'),helperSource.indexOf('create or replace function private.is_teacher_of_student'));
const oldSource=source('0013_sprint_11a_item_identity_exposure_pools.sql');
const protectedHelper=oldSource.slice(oldSource.indexOf('create or replace function private.item_is_protected('),oldSource.indexOf('alter table public.item_families enable row level security;'));
const oldPolicies=oldSource.slice(oldSource.indexOf('-- Replace broad published-item policies:'),oldSource.indexOf('drop policy if exists item_options_public_read'));
const identitySQL=`
create type public.user_role as enum ('student','teacher','admin','content_admin','school_admin');
create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant usage on schema private to authenticated,service_role;
`;
async function asRole(db,role,user,fn){
 await db.exec('begin');
 try{
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user??'']);
  await db.exec(`set local role ${role}`);
  return await fn();
 }finally{await db.exec('rollback');}
}
const visible=db=>db.query('select count(*)::int n from public.items').then(r=>r.rows[0].n);

test('published but unallocated prompts cannot bypass assessment protection through direct reads',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`
 create schema auth;create schema private;
 create role anon;create role authenticated;create role service_role bypassrls;
 grant usage on schema public to anon,authenticated,service_role;
 ${identitySQL}
 create type public.content_status as enum ('draft','review','published','archived');
 create table public.profiles(id uuid primary key,role public.user_role);
 create table public.items(id uuid primary key,status public.content_status,retired_at timestamptz,prompt_hy text,subject text,purpose text);
 create table public.assessment_pools(id uuid primary key,status text,is_protected boolean);
 create table public.assessment_pool_items(pool_id uuid,item_id uuid,enabled boolean);
 create table public.item_options(item_id uuid,option_key text);
 create table public.item_answer_keys(item_id uuid,answer jsonb);
 ${roleHelper}
 ${protectedHelper}
 alter table public.items enable row level security;
 alter table public.item_options enable row level security;
 alter table public.item_answer_keys enable row level security;
 grant select on public.items,public.item_options,public.item_answer_keys to anon,authenticated,service_role;
 create policy content_admin_items on public.items for all to authenticated using(private.current_user_role() in ('admin','content_admin')) with check(private.current_user_role() in ('admin','content_admin'));
 ${oldPolicies}
 `);
 for(const [n,role] of [[1,'student'],[2,'teacher'],[3,'admin'],[4,'content_admin'],[5,'school_admin']])await db.query('insert into profiles values($1,$2)',[id(n),role]);
 for(const [n,status,retired,subject,purpose] of [[11,'published',false,'A','mastery'],[12,'published',false,'A','diagnostic'],[13,'published',false,'B','practice'],[14,'published',false,'B','mastery'],[15,'draft',false,'A','mastery'],[16,'archived',false,'B','diagnostic'],[17,'review',false,'B','practice'],[18,'published',true,'A','practice']])await db.query('insert into items values($1,$2,$3,$4,$5,$6)',[id(n),status,retired?'2026-01-01':null,'Synthetic protected prompt',subject,purpose]);
 await db.query("insert into assessment_pools values($1,'active',true)",[id(100)]);
 await db.query('insert into assessment_pool_items values($1,$2,true)',[id(100),id(14)]);
 await db.query("insert into item_options values($1,'A')",[id(11)]);
 await db.query("insert into item_answer_keys values($1,'{}')",[id(11)]);
 assert.equal(await asRole(db,'anon',null,()=>visible(db)),3,'regression reproduces unallocated prompts visible under the predecessor policies');
 assert.equal(await asRole(db,'authenticated',id(1),()=>visible(db)),3);
 const before=(await db.query('select * from items order by id')).rows;
 await db.exec(migration);
 for(const [role,user] of [['anon',null],['authenticated',null],['authenticated',id(1)],['authenticated',id(5)]])await asRole(db,role,user,async()=>{
  assert.equal(await visible(db),0);
  assert.equal((await db.query('select count(*)::int n from item_options')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from item_answer_keys')).rows[0].n,0);
 });
 for(const user of [id(2),id(3),id(4)])assert.equal(await asRole(db,'authenticated',user,()=>visible(db)),8,'existing staff reads remain available');
 assert.equal(await asRole(db,'service_role',null,()=>visible(db)),8);
 assert.deepEqual((await db.query('select * from items order by id')).rows,before,'policy change preserves all content rows and dispositions');
});

test('protected direct reads retain governed delivery across subjects and reject inactive releases',async t=>{
 const db=await database();t.after(()=>db.close());
 await db.exec(identitySQL+`alter table profiles alter column role type public.user_role using role::public.user_role;`+roleHelper+`
 alter table public.items enable row level security;
 grant select on public.items to anon,authenticated,service_role;
 `+migration);
 assert.equal(await asRole(db,'anon',null,()=>visible(db)),0);
 assert.equal(await asRole(db,'authenticated',id(10),()=>visible(db)),0);
 await db.exec('set role service_role');
 try{
  for(const idx of [0,1,2]){
   const started=await launch(db,idx);
   const served=await operation(db,started.session.id,'serve');
   assert.ok(served.item.id);
   assert.ok(served.item.prompt_hy??served.item.promptHy);
   const completed=await finish(db,started.session.id,true);
   assert.equal(completed.session.status,'completed');
  }
 }finally{await db.exec('reset role');}
 await db.query("update curriculum_releases set status='draft' where id=$1",[id(501)]);
 await db.exec('set role service_role');
 try{await assert.rejects(launch(db,0),/learning_context_unavailable|release/);}finally{await db.exec('reset role');}
});
