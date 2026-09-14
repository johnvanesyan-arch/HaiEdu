-- Sprint 5: Adaptive Practice v2 / deterministic remediation support.

alter table public.learning_session_items
  add column if not exists hint_level_used integer not null default 0
    check (hint_level_used between 0 and 3),
  add column if not exists selection_reason text;

create table if not exists public.skill_remediation_guides (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  misconception_code text not null,
  title_hy text not null,
  strategy_hy text not null,
  hint_1_hy text not null,
  hint_2_hy text not null,
  worked_example_hy text not null,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(skill_id, misconception_code)
);

create table if not exists public.remediation_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  session_item_id uuid not null references public.learning_session_items(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  stage text not null check (stage in ('hint_1','hint_2','worked_example')),
  created_at timestamptz not null default now()
);

create index if not exists idx_remediation_guides_skill on public.skill_remediation_guides(skill_id, status);
create index if not exists idx_remediation_events_student_created on public.remediation_events(student_id, created_at desc);
create index if not exists idx_remediation_events_session on public.remediation_events(session_id, session_item_id);

alter table public.skill_remediation_guides enable row level security;
alter table public.remediation_events enable row level security;

-- Remediation content is safe for authenticated learners; it contains no item answer keys.
drop policy if exists "authenticated_read_published_remediation_guides" on public.skill_remediation_guides;
create policy "authenticated_read_published_remediation_guides" on public.skill_remediation_guides
for select to authenticated using (status = 'published');

-- Students may inspect their own help history, but writes remain server-side.
drop policy if exists "students_read_own_remediation_events" on public.remediation_events;
create policy "students_read_own_remediation_events" on public.remediation_events
for select to authenticated using (student_id = auth.uid());
