import { readFileSync, readdirSync } from 'node:fs';
import { database as runtimeDatabase, id } from './governed-runtime-db.mjs';
export { id, launch, finish, operation, scopes } from './governed-runtime-db.mjs';
export const dashboardMigration = 'supabase/migrations/' + readdirSync('supabase/migrations').find(x => x.endsWith('_sprint_15b12d_student_dashboard_read.sql'));
export const dashboardFixtureSQL = `

create table schools(id uuid primary key,name text);
create table grades(id uuid primary key,grade_number integer,label_hy text);
alter table subjects add column code text,add column name_hy text;
alter table classes add column name text;
alter table academic_years add column label text;
alter table curriculum_releases add column release_number integer default 1;
alter table curriculum_release_units add column sequence_order_snapshot integer default 1,add column title_hy_snapshot text default 'Գլուխ';
alter table curriculum_release_skills add column skill_code_snapshot text,add column name_hy_snapshot text,add column layer_snapshot text;
alter table assessment_blueprints add column if not exists version_number integer default 1,add column if not exists published_at timestamptz default now();
insert into schools values('${id(301)}','Դպրոց Ա'),('${id(302)}','Դպրոց Բ');
insert into grades values('${id(7)}',7,'7-րդ դասարան');
update subjects set code=id::text,name_hy='Առարկա '||id::text;
update classes set name='Դասարան '||id::text;
update academic_years set label='2026–2027';
update curriculum_release_skills rs set skill_code_snapshot=s.code,name_hy_snapshot=s.name_hy,layer_snapshot=s.layer from skills s where s.id=rs.skill_id;
`;
export async function database(options={}) {
  const db = await runtimeDatabase(options);
  try { await db.exec(dashboardFixtureSQL); await db.exec(readFileSync(dashboardMigration,'utf8')); return db; }
  catch(error) { await db.close(); throw error; }
}
export async function dashboard(db, idx=0, extra={}) {
  const { scopes } = await import('./governed-runtime-db.mjs');
  const s=scopes[idx];
  return (await isolated(db,'select service_student_learning_dashboard($1,$2,$3,$4,$5) result',[
    extra.student??id(10),extra.auth??id(401),extra.enrollment??id(s.enrollment),extra.release??id(s.release),extra.unit??id(s.unit),
  ])).rows[0].result;
}
export async function navigation(db, extra={}) {
  return (await isolated(db,'select service_student_learning_navigation($1,$2) result',[extra.student??id(10),extra.auth??id(401)])).rows[0].result;
}
async function isolated(db,sql,args) {
 if(!db.fixtureTransaction)return db.query(sql,args);
 await db.exec('savepoint dashboard_rpc');
 try{return await db.query(sql,args);}catch(error){await db.exec('rollback to dashboard_rpc');throw error;}finally{await db.exec('release savepoint dashboard_rpc');}
}
