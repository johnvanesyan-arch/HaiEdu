import {readFileSync} from 'node:fs';
export const recoveryMigration='supabase/migrations/20261104111921_answer_response_recovery.sql';
export async function installAnswerRecovery(db,{legacy=false}={}) {
  if(legacy) await db.exec(`
    alter table learning_sessions add column assessment_result text,add column score_percent numeric;
    create table profiles(id uuid primary key,role text default 'student',account_status text default 'active');
    insert into profiles(id) select distinct student_id from learning_sessions;
    create schema auth;
    create table auth.users(id uuid primary key,deleted_at timestamptz,banned_until timestamptz);
    insert into auth.users(id) select id from profiles;
    create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
    insert into auth.sessions(id,user_id) values('60000000-0000-4000-8000-000000000901','10000000-0000-4000-8000-000000000010');
    create function private.lock_governed_learning_session(uuid,uuid,uuid) returns public.learning_sessions
    language plpgsql as $$begin raise exception 'not_a_governed_fixture'; end$$;
    create function public.service_governed_learning_operation(uuid,uuid,uuid,text,jsonb default '{}') returns jsonb
    language plpgsql as $$begin raise exception 'not_a_governed_fixture'; end$$;
    create table recommendation_events(id uuid primary key default gen_random_uuid(),recommendation_instance_id uuid,
      student_id uuid,event_type text,policy_scope text,surface text,action text,target_skill_id uuid,curriculum_release_id uuid,
      assessment_blueprint_id uuid,learning_model_configuration_id uuid,model_provenance_status text,learning_session_id uuid,
      attempt_id uuid,state_snapshot jsonb,recommendation_snapshot jsonb);
  `);
  if(legacy) await db.exec(readFileSync('supabase/migrations/0012_live_session_gate.sql','utf8'));
  await db.exec(readFileSync(recoveryMigration,'utf8'));
}
