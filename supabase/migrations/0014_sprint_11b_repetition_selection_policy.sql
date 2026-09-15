-- Sprint 11B: repetition and item-selection policy
-- Adds explicit Diagnostic forms so retakes rotate through non-overlapping baseline forms.
-- Practice and Mastery selection policy is enforced by Edge Functions using the
-- cross-session exposure history introduced in Sprint 11A.

create table if not exists public.assessment_forms (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.assessment_pools(id) on delete cascade,
  code text not null,
  name text not null,
  form_version integer not null default 1 check (form_version >= 1),
  status text not null default 'active' check (status in ('draft','active','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pool_id, code, form_version)
);

create table if not exists public.assessment_form_items (
  form_id uuid not null references public.assessment_forms(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  slot_order integer not null check (slot_order >= 1),
  metadata jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now(),
  primary key(form_id, item_id),
  unique(form_id, slot_order)
);

create index if not exists idx_assessment_forms_pool_status
  on public.assessment_forms(pool_id, status, code);
create index if not exists idx_assessment_form_items_item
  on public.assessment_form_items(item_id);

-- Build two mechanically non-overlapping 20-item Chapter I Diagnostic forms from
-- the current 40-item Diagnostic baseline pool (2 items per skill per form).
-- This is an exposure-rotation structure, not a claim of psychometric equivalence.
-- Sprint 11D must review content parallelism before the forms are considered
-- pedagogically validated.
insert into public.assessment_forms(pool_id, code, name, form_version, status, metadata)
select
  p.id,
  v.code,
  v.name,
  1,
  'active',
  jsonb_build_object(
    'phase','11B',
    'unitCode','PHY7-U01',
    'itemsPerSkill',2,
    'provisionalParallelism',true,
    'contentValidation','pending_sprint_11d_review'
  )
from public.assessment_pools p
cross join (values
  ('PHY7-U01-DIAG-A', 'Grade 7 Physics Chapter I — Diagnostic Form A'),
  ('PHY7-U01-DIAG-B', 'Grade 7 Physics Chapter I — Diagnostic Form B')
) as v(code, name)
where p.code = 'PHY7-U01-DIAGNOSTIC-BASELINE'
on conflict (pool_id, code, form_version) do update
set name = excluded.name,
    status = excluded.status,
    metadata = public.assessment_forms.metadata || excluded.metadata,
    updated_at = now();

with ranked as (
  select
    api.item_id,
    i.skill_id,
    s.code as skill_code,
    row_number() over (partition by i.skill_id order by i.code nulls last, i.id) as rn
  from public.assessment_pool_items api
  join public.assessment_pools p on p.id = api.pool_id
  join public.items i on i.id = api.item_id
  join public.skills s on s.id = i.skill_id
  where p.code = 'PHY7-U01-DIAGNOSTIC-BASELINE'
    and api.enabled = true
    and i.status = 'published'::content_status
    and i.retired_at is null
), form_rows as (
  select
    'PHY7-U01-DIAG-A'::text as form_code,
    item_id,
    skill_code,
    rn
  from ranked where rn in (1,3)
  union all
  select
    'PHY7-U01-DIAG-B'::text as form_code,
    item_id,
    skill_code,
    rn
  from ranked where rn in (2,4)
), numbered as (
  select
    form_code,
    item_id,
    row_number() over (partition by form_code order by skill_code, rn) as slot_order
  from form_rows
)
insert into public.assessment_form_items(form_id, item_id, slot_order, metadata)
select
  f.id,
  n.item_id,
  n.slot_order,
  jsonb_build_object('source','11B_baseline_rotation')
from numbered n
join public.assessment_forms f on f.code = n.form_code and f.form_version = 1
join public.assessment_pools p on p.id = f.pool_id and p.code = 'PHY7-U01-DIAGNOSTIC-BASELINE'
on conflict (form_id, item_id) do update
set slot_order = excluded.slot_order,
    metadata = public.assessment_form_items.metadata || excluded.metadata;

-- Forms are service-selected. Learners do not get direct form membership access;
-- staff can inspect definitions for QA/content operations.
alter table public.assessment_forms enable row level security;
alter table public.assessment_form_items enable row level security;

drop policy if exists assessment_forms_staff_read on public.assessment_forms;
create policy assessment_forms_staff_read on public.assessment_forms
for select to authenticated
using (private.current_user_role() = any (array['teacher'::user_role,'admin'::user_role,'content_admin'::user_role]));

drop policy if exists assessment_form_items_staff_read on public.assessment_form_items;
create policy assessment_form_items_staff_read on public.assessment_form_items
for select to authenticated
using (private.current_user_role() = any (array['teacher'::user_role,'admin'::user_role,'content_admin'::user_role]));

-- Guard the baseline: every active form must be composed only of enabled items from
-- its parent pool. This trigger also protects future forms from accidental leakage.
create or replace function private.validate_assessment_form_item_membership()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_pool_id uuid;
begin
  select pool_id into v_pool_id from public.assessment_forms where id = new.form_id;
  if v_pool_id is null then
    raise exception 'assessment_form_not_found';
  end if;

  if not exists (
    select 1
    from public.assessment_pool_items api
    where api.pool_id = v_pool_id
      and api.item_id = new.item_id
      and api.enabled = true
  ) then
    raise exception 'assessment_form_item_not_in_parent_pool';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_assessment_form_item_membership on public.assessment_form_items;
create trigger trg_validate_assessment_form_item_membership
before insert or update on public.assessment_form_items
for each row execute function private.validate_assessment_form_item_membership();
