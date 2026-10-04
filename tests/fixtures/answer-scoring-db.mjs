import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
export const id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const actor='10000000-0000-4000-8000-000000000010';
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(n=>n.endsWith('_atomic_answer_mastery_evidence.sql'));
export async function scoringDatabase({baseline=false}={}) {
 const db=new PGlite();
 try {
  await db.exec(readFileSync('tests/fixtures/answer-scoring.sql','utf8'));
  const guards=readFileSync('supabase/migrations/20260927190434_chapter_diagnostic_practice_gate.sql','utf8');
  await db.exec(guards.slice(0,guards.indexOf('-- A locked pre-diagnostic')));
  const old=readFileSync('supabase/migrations/0039_sprint_11k_curriculum_releases_and_evidence_provenance.sql','utf8');
  await db.exec(old.slice(old.indexOf('create or replace function public.record_session_graded_attempt('),old.indexOf('-- Record and verify the current pilot gates.')));
  if(!baseline) await db.exec(readFileSync(migrationPath,'utf8'));
  return db;
 } catch(error){await db.close();throw error;}
}
export const args=(n,correct=true,student=actor)=>[student,id(n>10?402:401),id(600+n),id(500+n),id(50),JSON.stringify({value:correct?5:0}),null,correct?1:0,correct,null,false,null,'2026-10-04T09:00:00Z'];
export async function answer(db,n,correct=true,student=actor){return (await db.query('select service_record_session_answer_atomic('+args(n,correct,student).map((_,i)=>'$'+(i+1)).join(',')+') result',args(n,correct,student))).rows[0].result;}
export async function state(db,release=201){return (await db.query('select alpha_evidence::float,beta_evidence::float,mastery_score::float,evidence_count,status from student_skill_mastery_by_release where curriculum_release_id=$1',[id(release)])).rows[0];}
