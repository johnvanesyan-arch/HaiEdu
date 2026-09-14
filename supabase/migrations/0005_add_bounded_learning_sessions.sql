create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  unit_code text not null default 'PHY7-U01',
  mode text not null check (mode in ('diagnostic','practice')),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  target_skill_id uuid references public.skills(id) on delete set null,
  planned_item_count integer not null check (planned_item_count > 0 and planned_item_count <= 100),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  ordinal integer not null check (ordinal > 0),
  skill_id uuid not null references public.skills(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  attempt_id uuid references public.attempts(id) on delete set null,
  correct boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(session_id, ordinal)
);

alter table public.attempts add column if not exists learning_session_id uuid references public.learning_sessions(id) on delete set null;
alter table public.attempts add column if not exists learning_session_item_id uuid references public.learning_session_items(id) on delete set null;

create index if not exists idx_learning_sessions_student_status on public.learning_sessions(student_id, status, mode);
create index if not exists idx_learning_session_items_session_ordinal on public.learning_session_items(session_id, ordinal);
create index if not exists idx_attempts_learning_session on public.attempts(learning_session_id);

alter table public.learning_sessions enable row level security;
alter table public.learning_session_items enable row level security;

create policy "students_read_own_learning_sessions" on public.learning_sessions
for select to authenticated using (student_id = auth.uid());

create policy "students_read_own_learning_session_items" on public.learning_session_items
for select to authenticated using (
  exists (
    select 1 from public.learning_sessions s
    where s.id = learning_session_items.session_id and s.student_id = auth.uid()
  )
);

create or replace function public.record_session_graded_attempt(
  p_student_id uuid,
  p_session_id uuid,
  p_session_item_id uuid,
  p_item_id uuid,
  p_skill_id uuid,
  p_response jsonb,
  p_normalized_response jsonb,
  p_score numeric,
  p_correct boolean,
  p_error_code text,
  p_hint_used boolean,
  p_response_time_ms integer,
  p_alpha numeric,
  p_beta numeric,
  p_mastery_score numeric,
  p_evidence_count integer,
  p_status mastery_status,
  p_attempted_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_existing_attempt_id uuid;
  v_planned integer;
  v_answered integer;
begin
  select lsi.attempt_id into v_existing_attempt_id
  from public.learning_session_items lsi
  join public.learning_sessions ls on ls.id = lsi.session_id
  where lsi.id = p_session_item_id
    and lsi.session_id = p_session_id
    and lsi.item_id = p_item_id
    and lsi.skill_id = p_skill_id
    and ls.student_id = p_student_id
    and ls.status = 'active'
  for update of lsi;

  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  if v_existing_attempt_id is not null then return v_existing_attempt_id; end if;

  insert into public.attempts(
    student_id, item_id, skill_id, response, normalized_response, score, correct,
    error_code, hint_used, response_time_ms, created_at,
    learning_session_id, learning_session_item_id
  ) values (
    p_student_id, p_item_id, p_skill_id, p_response, p_normalized_response, p_score, p_correct,
    p_error_code, p_hint_used, p_response_time_ms, p_attempted_at,
    p_session_id, p_session_item_id
  ) returning id into v_attempt_id;

  insert into public.student_skill_mastery(
    student_id, skill_id, alpha_evidence, beta_evidence, mastery_score, evidence_count,
    status, last_attempt_at, updated_at
  ) values (
    p_student_id, p_skill_id, p_alpha, p_beta, p_mastery_score, p_evidence_count,
    p_status, p_attempted_at, p_attempted_at
  ) on conflict (student_id, skill_id) do update set
    alpha_evidence = excluded.alpha_evidence,
    beta_evidence = excluded.beta_evidence,
    mastery_score = excluded.mastery_score,
    evidence_count = excluded.evidence_count,
    status = excluded.status,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at;

  update public.learning_session_items
  set attempt_id = v_attempt_id, correct = p_correct, answered_at = p_attempted_at
  where id = p_session_item_id;

  update public.learning_sessions
  set answered_count = answered_count + 1,
      correct_count = correct_count + case when p_correct then 1 else 0 end,
      updated_at = p_attempted_at
  where id = p_session_id
  returning planned_item_count, answered_count into v_planned, v_answered;

  if v_answered >= v_planned then
    update public.learning_sessions
    set status = 'completed', completed_at = p_attempted_at, updated_at = p_attempted_at
    where id = p_session_id;
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function public.record_session_graded_attempt(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,numeric,numeric,numeric,integer,mastery_status,timestamptz) from public, anon, authenticated;
grant execute on function public.record_session_graded_attempt(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,numeric,numeric,numeric,integer,mastery_status,timestamptz) to service_role;
