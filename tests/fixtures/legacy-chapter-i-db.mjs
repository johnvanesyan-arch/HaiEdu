// Isolated legacy Chapter I fixture for the I-2 option A rehearsal (20 November 2026).
// In-memory PGlite only: synthetic skills, items and one student; no production data,
// credentials or remote client. Tables are REDUCED to the columns the legacy Chapter I
// handlers and lifecycle functions use; the lifecycle functions themselves are the real
// repository SQL (latest definitions). The real Edge handlers run in the endpoint harness;
// course access, curriculum resolution, rate budgets, answer receipts and the upstream
// answer grader are doubles (the grader double records correctness the way submit-answer
// does for these tests' purposes; real item grading is not exercised here).
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { registryDatabase } from './legacy-mastery-rules-db.mjs';
import { endpoint } from './phase3-endpoint-harness.mjs';
import * as rules from '../../supabase/functions/_shared/legacy-mastery-rules.mjs';

export const lid = n => `72000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const STUDENT = lid(10), RELEASE = lid(501), BLUEPRINT = lid(540), POLICY = lid(601), MODEL = lid(611);
export const SKILLS = Array.from({ length: 10 }, (_, n) => ({ id: lid(100 + n + 1), code: `PHY7-U01-S${String(n + 1).padStart(2, '0')}` }));
export const S07 = SKILLS[6];
export const ITEMS_PER_SKILL = 6;
export const itemId = (skill, n) => lid(1000 + skill * 10 + n);
export const ITEM_IDS = SKILLS.flatMap((_, k) => Array.from({ length: ITEMS_PER_SKILL }, (_, n) => itemId(k, n)));

const migration = name => readFileSync('supabase/migrations/' + name, 'utf8');
const fn = (file, name) => {
  const s = migration(file), m = new RegExp('create or replace function ' + name.replaceAll('.', '\\.') + '\\(').exec(s);
  if (!m) throw Error(name);
  return s.slice(m.index, s.indexOf('$$;', m.index) + 3);
};

export const reducedSchemaSQL = `
create table public.skills(id uuid primary key,code text unique,name_hy text,layer text default 'core',sequence_order integer);
create table public.items(id uuid primary key,code text,skill_id uuid,difficulty integer default 3,item_template_id uuid,variant_key text,status text default 'published');
create table public.skill_prerequisites(skill_id uuid,prerequisite_skill_id uuid);
create table public.student_skill_mastery(student_id uuid,skill_id uuid,mastery_score numeric,evidence_count integer,status text,primary key(student_id,skill_id));
create table public.student_skill_mastery_by_release(curriculum_release_id uuid,student_id uuid,skill_id uuid,mastery_score numeric,evidence_count integer,status text,primary key(curriculum_release_id,student_id,skill_id));
create table public.attempts(id uuid primary key default gen_random_uuid(),student_id uuid,skill_id uuid,item_id uuid,correct boolean,hint_used boolean default false,created_at timestamptz default now(),curriculum_release_id uuid);
create table public.student_item_exposure_events(id uuid primary key default gen_random_uuid(),student_id uuid,item_id uuid,item_template_id uuid,variant_key text,purpose text,session_id uuid,served_at timestamptz default now(),answered_at timestamptz,correct boolean,help_used boolean default false,hint_level_used integer default 0);
create table public.academic_mastery_policy_versions(id uuid primary key,status text,maximum_mastery_attempts smallint not null default 3,target_review_question_count smallint default 12);
create table public.academic_mastery_policy_activation(singleton boolean primary key default true,policy_id uuid not null);
create table public.assessment_policy_bindings(id uuid primary key,policy_snapshot jsonb);
create table public.learning_sessions(id uuid primary key default gen_random_uuid(),student_id uuid not null,curriculum_release_id uuid,assessment_blueprint_id uuid,unit_code text,mode text,status text not null default 'active',target_skill_id uuid,planned_item_count integer,answered_count integer not null default 0,correct_count integer not null default 0,metadata jsonb not null default '{}',academic_mastery_policy_id uuid,mastery_attempt_number smallint,assessment_result text,score_percent numeric,provenance_status text default 'exact',assessment_policy_binding_id uuid,started_at timestamptz not null default clock_timestamp(),completed_at timestamptz,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz default now());
create table public.learning_session_items(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.learning_sessions(id),ordinal integer,skill_id uuid,item_id uuid,selection_reason text,correct boolean,answered_at timestamptz,unique(session_id,ordinal));
create table public.chapter_mastery_states(id uuid primary key default gen_random_uuid(),student_id uuid not null,curriculum_release_id uuid not null,unit_code text not null,academic_mastery_policy_id uuid not null,
  lifecycle_state text not null check (lifecycle_state in ('mastery_ready','review_required_attempt_2','mastery_retry_2_ready','review_required_attempt_3','mastery_retry_3_ready','mastery_passed','mastery_failed_final')),
  attempts_used smallint not null default 0 check (attempts_used between 0 and 3),passed_on_attempt smallint,history_provenance text not null default 'exact',assessment_policy_binding_id uuid,
  created_at timestamptz default now(),updated_at timestamptz default now(),unique(student_id,curriculum_release_id,unit_code),
  check ((lifecycle_state='mastery_passed' and passed_on_attempt is not null) or (lifecycle_state<>'mastery_passed' and passed_on_attempt is null)),
  check (lifecycle_state<>'mastery_failed_final' or attempts_used=3));
create table public.mastery_check_attempts(id uuid primary key default gen_random_uuid(),chapter_mastery_state_id uuid not null,learning_session_id uuid unique,attempt_number smallint not null check (attempt_number between 1 and 3),
  academic_mastery_policy_id uuid,preceding_required_review_id uuid,status text not null,result text,score_percent numeric,started_at timestamptz,completed_at timestamptz,unique(chapter_mastery_state_id,attempt_number));
create table public.chapter_review_requirements(id uuid primary key default gen_random_uuid(),chapter_mastery_state_id uuid not null,originating_mastery_attempt_id uuid,required_after_attempt smallint,status text not null,
  qualifying_review_session_id uuid,required_at timestamptz default now(),satisfied_at timestamptz,cancelled_at timestamptz,unique(chapter_mastery_state_id,required_after_attempt));
create table public.chapter_review_sessions(id uuid primary key default gen_random_uuid(),learning_session_id uuid unique,chapter_mastery_state_id uuid,review_requirement_id uuid,status text not null default 'active',qualifying boolean,completed_at timestamptz);
create unique index learning_sessions_one_active_mastery_check_idx on public.learning_sessions(student_id,curriculum_release_id,unit_code) where mode='mastery_check' and status='active';
`;

export async function legacyDatabase() {
  const db = await registryDatabase();
  try {
    await db.exec(reducedSchemaSQL);
    await db.exec(fn('0064_sprint_12_5_chapter_review_gate.sql', 'public.start_mastery_check_atomic'));
    await db.exec(fn('20261021220954_sprint_16_1c_assessed_listening.sql', 'public.finalize_mastery_check_atomic'));
    await db.exec(fn('0064_sprint_12_5_chapter_review_gate.sql', 'public.finalize_chapter_review_atomic'));
    await db.query("insert into academic_mastery_policy_versions values($1,'active',3,12)", [POLICY]);
    await db.query('insert into academic_mastery_policy_activation values(true,$1)', [POLICY]);
    for (const [k, s] of SKILLS.entries()) {
      await db.query('insert into skills(id,code,name_hy,sequence_order) values($1,$2,$3,$4)', [s.id, s.code, `Հմտություն ${k + 1}`, k + 1]);
      for (let n = 0; n < ITEMS_PER_SKILL; n++) await db.query("insert into items(id,code,skill_id,variant_key) values($1,$2,$3,$2)", [itemId(k, n), `${s.code}-Q${n}`, s.id]);
    }
    // The student has finished the Chapter I diagnostic (practice and the check are open).
    await db.query("insert into learning_sessions(student_id,curriculum_release_id,assessment_blueprint_id,unit_code,mode,status,planned_item_count,answered_count,correct_count,completed_at) values($1,$2,$3,'PHY7-U01','diagnostic','completed',20,20,12,clock_timestamp())", [STUDENT, RELEASE, BLUEPRINT]);
    return db;
  } catch (e) { await db.close(); throw e; }
}

// Readiness through the score route (>= 3 answers, score >= 0.72), as the handlers compute it.
export async function setReadiness(db, readyBySkill) {
  for (const [k, s] of SKILLS.entries()) {
    const score = readyBySkill[k] ? 0.9 : 0.3;
    await db.query('insert into student_skill_mastery values($1,$2,$3,6,$4) on conflict(student_id,skill_id) do update set mastery_score=excluded.mastery_score', [STUDENT, s.id, score, readyBySkill[k] ? 'secure' : 'needs_support']);
    await db.query('insert into student_skill_mastery_by_release values($1,$2,$3,$4,6,$5) on conflict(curriculum_release_id,student_id,skill_id) do update set mastery_score=excluded.mastery_score', [RELEASE, STUDENT, s.id, score, readyBySkill[k] ? 'secure' : 'needs_support']);
  }
}

let integrity;
async function assessmentIntegrity() {
  if (!integrity) {
    const source = ts.transpile(readFileSync('supabase/functions/_shared/assessment-integrity.ts', 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 });
    integrity = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  }
  return integrity;
}

// Grader double for the upstream submit-answer call: records the answer on the session
// item and session counters, completing the session after its last planned item.
function graderFetch(db) {
  return async (_url, init) => {
    const body = JSON.parse(init.body);
    const correct = body.response?.value === 'correct';
    await db.query('update learning_session_items set correct=$2,answered_at=clock_timestamp() where id=$1 and answered_at is null', [body.sessionItemId, correct]);
    await db.query(`update learning_sessions s set answered_count=q.a,correct_count=q.c,
      status=case when q.a>=s.planned_item_count then 'completed' else s.status end,
      completed_at=case when q.a>=s.planned_item_count then clock_timestamp() else s.completed_at end
      from (select count(*) filter (where answered_at is not null) a,count(*) filter (where correct) c from learning_session_items where session_id=$1) q where s.id=$1`, [body.sessionId]);
    return new Response(JSON.stringify({ accepted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

export async function handlers(db) {
  const ai = await assessmentIntegrity();
  const common = {
    ...rules, enforceRateBudget: async () => null, routeGovernedLearning: async () => null, hasPhysics7Access: async () => true,
    resolveActiveCurriculumRelease: async () => RELEASE,
  };
  const make = (name, extra = {}) => endpoint(db, name, { ...common, ...extra });
  return {
    status: await make('get-mastery-check-status'),
    start: await make('start-learning-session', {
      ...ai, getPracticeDiagnosticBlock: async () => null, confirmRecommendationActionStarted: async () => null,
      resolveCurriculumBlueprint: async () => ({ releaseId: RELEASE, blueprintId: BLUEPRINT, itemIds: ITEM_IDS }),
      chooseInitialDiagnosticForm: () => { throw Error('not used'); },
    }),
    submit: await make('submit-mastery-answer', {
      legacyAnswerReceipt: async () => ({}), finishLegacyAnswer: async (_a, _b, _c, _d, _e, result) => ({ status: 200, body: result }),
      fetch: graderFetch(db),
    }),
    dashboard: await make('get-student-dashboard', {
      routeStudentDashboard: async () => null, resolveRuntimeLearningModel: async () => ({ id: MODEL, provenanceStatus: 'exact' }),
      issueRecommendationEvent: async () => lid(9999),
    }),
  };
}

// Answers every item of a mastery check through the real submit handler.
// correctBySkill[k] = number of correct answers (0..2) for skill k.
export async function answerCheck(h, db, sessionId, correctBySkill) {
  const items = (await db.query('select id,item_id,skill_id from learning_session_items where session_id=$1 order by ordinal', [sessionId])).rows;
  const given = new Map();
  let last;
  for (const row of items) {
    const k = SKILLS.findIndex(s => s.id === row.skill_id);
    const n = given.get(k) ?? 0; given.set(k, n + 1);
    last = await h.submit.call({ sessionId, sessionItemId: row.id, itemId: row.item_id, response: { value: n < correctBySkill[k] ? 'correct' : 'wrong' } }, { actor: STUDENT });
  }
  return last;
}

// A completed qualifying chapter review, finalized by the real lifecycle function.
// (The review session's questions are not served here.)
export async function completeRequiredReview(db) {
  const state = (await db.query('select * from chapter_mastery_states where student_id=$1', [STUDENT])).rows[0];
  const requirement = (await db.query("select * from chapter_review_requirements where chapter_mastery_state_id=$1 and status='required'", [state.id])).rows[0];
  const session = (await db.query("insert into learning_sessions(student_id,curriculum_release_id,assessment_blueprint_id,unit_code,mode,status,planned_item_count,answered_count,correct_count,completed_at) values($1,$2,$3,'PHY7-U01','chapter_review','completed',12,12,9,clock_timestamp()) returning id", [STUDENT, RELEASE, BLUEPRINT])).rows[0];
  await db.query("insert into chapter_review_sessions(learning_session_id,chapter_mastery_state_id,review_requirement_id) values($1,$2,$3)", [session.id, state.id, requirement.id]);
  return (await db.query('select finalize_chapter_review_atomic($1,$2) r', [STUDENT, session.id])).rows[0].r;
}
