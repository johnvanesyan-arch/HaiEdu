import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {postgresClient} from './fixtures/learning-acceptance.mjs';
import {buildManifest} from '../scripts/recovery/build-unit1-snapshot-manifest.mjs';
const migration=readFileSync('supabase/migrations/20261103061948_item_snapshot_integrity.sql','utf8');
const core=migration.slice(0,migration.indexOf('-- Bounded historical recovery.'));
const guards=migration.slice(migration.indexOf('create or replace function private.assert_item_version_snapshot'));
const manifest=JSON.parse(readFileSync('docs/evidence/unit1-snapshot-recovery-manifest-20261103.json','utf8'));
const id=n=>'95000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function fixture(t,install=true){
 const db=process.env.PHASE3_POSTGRES_17_CI==='1'?await postgresClient():new PGlite();if(db.waitReady)await db.waitReady;t.after(()=>db.close());
 await db.exec(`create schema private;do $roles$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role;end if;end;$roles$;
 create table items(id uuid primary key,code text unique,version_no integer default 1,skill_id uuid,item_type text default 'single_choice',prompt_hy text default 'Synthetic',prompt_en text,stimulus jsonb default '{}',difficulty integer default 2,config jsonb default '{}',status text default 'draft',variant_fingerprint text,item_template_id uuid);
 create table item_options(id uuid default gen_random_uuid(),item_id uuid references items(id),option_key text,content_hy text,display_order integer);
 create table item_answer_keys(item_id uuid primary key references items(id),answer jsonb,tolerance numeric,canonical_unit text,accepted_units text[] default '{}');
 create table item_versions(id uuid default gen_random_uuid(),item_id uuid references items(id),version_no integer,snapshot jsonb,change_summary text,created_at timestamptz default now(),created_by uuid,unique(item_id,version_no));
 create table curriculum_releases(id uuid primary key,release_key text,status text);
 create table assessment_blueprints(id uuid primary key,curriculum_release_id uuid references curriculum_releases(id),status text);
 create table assessment_blueprint_items(assessment_blueprint_id uuid references assessment_blueprints(id),item_id uuid references items(id),item_version_snapshot integer,variant_fingerprint_snapshot text,item_template_id uuid,template_version_snapshot integer,primary key(assessment_blueprint_id,item_id));
 create table attempts(id uuid primary key,item_id uuid references items(id),score numeric);
 create table misconceptions(id uuid primary key,code text);
 create table item_misconception_mappings(item_id uuid,misconception_id uuid,response_key text,mapping_note text);
 insert into curriculum_releases values('${id(1)}','SYN-A','draft'),('${id(2)}','SYN-B','draft');
 insert into assessment_blueprints values('${id(11)}','${id(1)}','draft'),('${id(12)}','${id(2)}','draft');`);
 if(install)await db.exec(core+guards);
 return db;
}
async function create(db,n,{status='draft',version=1}={}){
 await db.query('insert into items(id,code,skill_id,status,version_no) values($1,$2,$3,$4,$5)',[id(n),'SYN-'+n,id(800),status,version]);
 await db.query('insert into item_answer_keys(item_id,answer) values($1,$2)',[id(n),'"A"']);
}
async function tx(db,fn){await db.exec('begin');try{await fn();await db.exec('commit');}catch(e){await db.exec('rollback');throw e;}}
async function freeze(db,n){await db.query("insert into item_versions(item_id,version_no,snapshot) select id,version_no,private.current_item_version_snapshot(id) from items where id=$1",[id(n)]);}

test('publication captures a complete version atomically after answer/options and rolls back invalid publication',async t=>{
 const db=await fixture(t);
 await tx(db,async()=>{await create(db,21,{status:'published'});await db.query('insert into item_options(item_id,option_key,content_hy,display_order) values($1,$2,$3,1)',[id(21),'A','Correct']);});
 const s=(await db.query('select snapshot from item_versions')).rows[0].snapshot;
 assert.equal(s.item.id,id(21));assert.equal(s.options.length,1);assert.equal(s.answerKey.answer,'A');
 const hashes=(await db.query(`select md5(private.item_snapshot_assessment_content(jsonb_build_object('answerKey','{"answer":3.0000,"tolerance":0.01000}'::jsonb))::text) a,
 md5(private.item_snapshot_assessment_content(jsonb_build_object('answerKey','{"answer":3,"tolerance":0.01}'::jsonb))::text) b`)).rows[0];assert.equal(hashes.a,hashes.b);
 await assert.rejects(tx(db,()=>db.query("insert into items(id,code,skill_id,status) values($1,'bad',$2,'published')",[id(22),id(800)])),/snapshot_required/);
 assert.equal((await db.query('select count(*)::int n from items')).rows[0].n,1);
});

test('new activation and late membership reject missing snapshots, while drafts remain editable',async t=>{
 const db=await fixture(t);await create(db,31);
 await db.query('insert into assessment_blueprint_items(assessment_blueprint_id,item_id,item_version_snapshot) values($1,$2,1)',[id(11),id(31)]);
 await assert.rejects(tx(db,()=>db.query("update assessment_blueprints set status='pilot' where id=$1",[id(11)])),/snapshot_required/);
 await freeze(db,31);
 await tx(db,()=>db.query("update assessment_blueprints set status='pilot' where id=$1",[id(11)]));
 await create(db,32);
 await assert.rejects(tx(db,()=>db.query('insert into assessment_blueprint_items(assessment_blueprint_id,item_id,item_version_snapshot) values($1,$2,1)',[id(11),id(32)])),/snapshot_required/);
 // A second subject/release remains independent.
 await tx(db,()=>db.query("update curriculum_releases set status='pilot' where id=$1",[id(2)]));
 assert.equal((await db.query('select count(*)::int n from item_versions')).rows[0].n,1);
});

test('existing exposed gaps cannot be auto-backfilled; snapshots and same-version published content are immutable',async t=>{
 const db=await fixture(t);await create(db,41);await db.query('insert into attempts values($1,$2,1)',[id(501),id(41)]);
 await assert.rejects(tx(db,()=>db.query("update items set status='published' where id=$1",[id(41)])),/historical_item_snapshot_recovery_required/);
 await tx(db,()=>create(db,42,{status:'published'}));
 await assert.rejects(db.query('delete from item_versions where item_id=$1',[id(42)]),/immutable/);
 await assert.rejects(db.query("update item_versions set snapshot='{}' where item_id=$1",[id(42)]),/immutable/);
 await assert.rejects(db.query('insert into item_versions(item_id,version_no,snapshot) select item_id,2,snapshot from item_versions where item_id=$1',[id(42)]),/identity_mismatch/);
 await assert.rejects(tx(db,()=>db.query("update items set difficulty=5 where id=$1",[id(42)])),/content_mismatch/);
 await assert.rejects(tx(db,()=>db.query("update item_answer_keys set answer='\"B\"' where item_id=$1",[id(42)])),/content_mismatch/);
 await tx(db,()=>db.query("update items set status='review',difficulty=3,version_no=2 where id=$1",[id(42)]));
 await tx(db,()=>db.query("update items set status='published' where id=$1",[id(42)]));
 assert.equal((await db.query('select count(*)::int n from item_versions')).rows[0].n,2);
});

test('snapshot helpers expose no privileged definer or browser execution',async t=>{
 const db=await fixture(t);
 const rows=(await db.query("select prosecdef,has_function_privilege('anon',p.oid,'execute') a,has_function_privilege('authenticated',p.oid,'execute') u,has_function_privilege('service_role',p.oid,'execute') s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'")).rows;
 assert.equal(rows.length,6);assert.ok(rows.every(r=>!r.prosecdef&&!r.a&&!r.u&&r.s));
});

test('pinned source replay restores all174 versions idempotently, preserves learning, and fails closed on drift',async t=>{
 for(const source of manifest.sources)assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256);
 const inputs=manifest.entries.map(e=>({id:e.itemId,code:e.code,version_no:e.version,skill_id:e.sourceInputs.skillId,skill_code:e.sourceInputs.skillCode,item_template_id:e.templateId,template_code:e.sourceInputs.templateCode,variant_seed:e.sourceInputs.seed,variant_fingerprint:e.fingerprint}));
 const rows=await buildManifest(inputs,{replay:true});assert.equal(rows.length,174);
 const db=await fixture(t,false);await db.exec(core);
 await db.query('insert into curriculum_releases values($1,$2,$3)',[id(3),manifest.scope,'pilot']);await db.query('insert into assessment_blueprints values($1,$2,$3)',[id(13),id(3),'pilot']);
 for(const r of rows){
  await db.query('insert into items(id,code,version_no,skill_id,item_type,prompt_hy,prompt_en,stimulus,difficulty,status,variant_fingerprint,item_template_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[r.id,r.code,1,r.skill_id,r.item_type,r.prompt_hy,r.prompt_en??null,JSON.stringify(r.stimulus??{}),r.difficulty,'published',r.variant_fingerprint,r.item_template_id]);
  await db.query('insert into item_answer_keys values($1,$2,$3,$4,$5)',[r.id,JSON.stringify(r.answer_key.answer),r.answer_key.tolerance,r.answer_key.canonical_unit,r.answer_key.accepted_units]);
  for(const o of r.options)await db.query('insert into item_options(item_id,option_key,content_hy,display_order) values($1,$2,$3,$4)',[r.id,o.option_key,o.content_hy,o.display_order]);
  await db.query('insert into assessment_blueprint_items values($1,$2,1,$3,$4,1)',[id(13),r.id,r.variant_fingerprint,r.item_template_id]);
 }
 await db.query('insert into attempts values($1,$2,1)',[id(700),rows[0].id]);
 await create(db,99);await freeze(db,99);
 const existing=JSON.stringify((await db.query('select * from item_versions where item_id=$1',[id(99)])).rows);
 const before=JSON.stringify((await db.query('select * from attempts')).rows);
 await tx(db,()=>db.query('update items set difficulty=5 where id=$1',[rows[0].id]));
 await assert.rejects(tx(db,()=>db.exec(migration)),/content_or_reference_drift/);
 assert.equal((await db.query('select count(*)::int n from item_versions')).rows[0].n,1);
 await db.query('update items set difficulty=$2 where id=$1',[rows[0].id,rows[0].difficulty]);
 await db.query("update assessment_blueprint_items set template_version_snapshot=2 where item_id=$1",[rows[0].id]);
 await assert.rejects(tx(db,()=>db.exec(migration)),/content_or_reference_drift/);
 assert.equal((await db.query('select count(*)::int n from item_versions')).rows[0].n,1);
 await db.query('update assessment_blueprint_items set template_version_snapshot=1 where item_id=$1',[rows[0].id]);
 await tx(db,()=>db.exec(migration));await tx(db,()=>db.exec(migration));
 assert.equal((await db.query('select count(*)::int n from item_versions')).rows[0].n,175);
 assert.equal(JSON.stringify((await db.query('select * from item_versions where item_id=$1',[id(99)])).rows),existing);
 assert.equal(JSON.stringify((await db.query('select * from attempts')).rows),before);
 assert.equal((await db.query('select count(*)::int n from item_versions where snapshot->\'recovery\'->>\'protocol\'=$1',[manifest.schemaVersion])).rows[0].n,174);
});
