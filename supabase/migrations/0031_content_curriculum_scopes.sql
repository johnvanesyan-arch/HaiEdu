-- Sprint 11D admin hardening: give every item an explicit curriculum scope.
-- This keeps the content catalogue multi-grade / multi-subject without relying on item-code parsing at runtime.

create table if not exists public.item_curriculum_scopes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  subject_program_id uuid not null references public.subject_programs(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (item_id, unit_id)
);

create unique index if not exists item_curriculum_scopes_one_primary_per_item
  on public.item_curriculum_scopes(item_id)
  where is_primary;

create index if not exists item_curriculum_scopes_program_idx
  on public.item_curriculum_scopes(subject_program_id, unit_id, item_id);

create or replace function public.validate_item_curriculum_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_unit_program uuid;
  v_program_subject uuid;
  v_program_grade uuid;
  v_skill_subject uuid;
  v_skill_grade uuid;
begin
  select u.subject_program_id
    into v_unit_program
  from public.units u
  where u.id = new.unit_id;

  if v_unit_program is distinct from new.subject_program_id then
    raise exception 'curriculum_scope_unit_program_mismatch';
  end if;

  select sp.subject_id, sp.grade_id
    into v_program_subject, v_program_grade
  from public.subject_programs sp
  where sp.id = new.subject_program_id;

  select s.subject_id, s.grade_id
    into v_skill_subject, v_skill_grade
  from public.items i
  join public.skills s on s.id = i.skill_id
  where i.id = new.item_id;

  if v_skill_subject is distinct from v_program_subject
     or v_skill_grade is distinct from v_program_grade then
    raise exception 'curriculum_scope_skill_program_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_item_curriculum_scope on public.item_curriculum_scopes;
create trigger trg_validate_item_curriculum_scope
before insert or update on public.item_curriculum_scopes
for each row execute function public.validate_item_curriculum_scope();

-- Transitional backfill for the existing catalogue. We use the existing relational
-- subject/grade identity and only use the current skill-code/unit-code prefix to locate
-- the correct unit once during migration. Runtime catalogue filtering uses the explicit
-- scope rows created here, not code parsing.
insert into public.item_curriculum_scopes (item_id, subject_program_id, unit_id, is_primary)
select i.id, matched.subject_program_id, matched.unit_id, true
from public.items i
join public.skills s on s.id = i.skill_id
join lateral (
  select sp.id as subject_program_id, u.id as unit_id
  from public.subject_programs sp
  join public.units u on u.subject_program_id = sp.id
  where sp.subject_id = s.subject_id
    and sp.grade_id = s.grade_id
    and s.code like u.code || '-%'
  order by length(u.code) desc, u.sequence_order asc
  limit 1
) matched on true
where not exists (
  select 1 from public.item_curriculum_scopes existing where existing.item_id = i.id
);

do $$
begin
  if exists (
    select 1
    from public.items i
    where not exists (
      select 1 from public.item_curriculum_scopes s where s.item_id = i.id and s.is_primary
    )
  ) then
    raise exception 'item_curriculum_scope_backfill_incomplete';
  end if;
end;
$$;

alter table public.item_curriculum_scopes enable row level security;

comment on table public.item_curriculum_scopes is
  'Explicit curriculum placement for question-bank items. Unit implies subject program; primary scope drives catalogue navigation.';
