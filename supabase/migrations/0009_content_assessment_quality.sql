-- Sprint 8: Content & Assessment Quality System
-- Adds normalized item metadata, misconception taxonomy, review/QA audit trails,
-- content version snapshots, and safe retirement/replacement semantics.

alter table public.items
  add column if not exists difficulty_band text,
  add column if not exists item_family text,
  add column if not exists source_reference text,
  add column if not exists validation_state text not null default 'provisional_no_sme_review',
  add column if not exists review_status text not null default 'unreviewed',
  add column if not exists version_no integer not null default 1,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists last_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists retired_at timestamptz,
  add column if not exists retired_reason text,
  add column if not exists replacement_item_id uuid references public.items(id) on delete set null;

update public.items
set difficulty_band = case
  when difficulty <= 1 then 'foundation'
  when difficulty <= 3 then 'core'
  else 'challenge'
end
where difficulty_band is null;

update public.items
set item_family = coalesce(nullif(config->>'item_family', ''), 'unspecified'),
    source_reference = coalesce(source_reference, nullif(config->>'source_basis', '')),
    validation_state = coalesce(nullif(config->>'validation_state', ''), validation_state)
where item_family is null or source_reference is null;

alter table public.items alter column difficulty_band set not null;
alter table public.items alter column item_family set not null;

alter table public.items drop constraint if exists items_difficulty_band_check;
alter table public.items add constraint items_difficulty_band_check
  check (difficulty_band in ('foundation','core','challenge'));

alter table public.items drop constraint if exists items_review_status_check;
alter table public.items add constraint items_review_status_check
  check (review_status in ('unreviewed','needs_review','in_review','changes_requested','approved'));

alter table public.items drop constraint if exists items_version_no_check;
alter table public.items add constraint items_version_no_check check (version_no >= 1);

alter table public.items drop constraint if exists items_replacement_not_self_check;
alter table public.items add constraint items_replacement_not_self_check
  check (replacement_item_id is null or replacement_item_id <> id);

create index if not exists idx_items_quality_status
  on public.items(status, review_status, retired_at, difficulty_band);
create index if not exists idx_items_replacement on public.items(replacement_item_id);

create table if not exists public.misconceptions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  code text not null,
  title_hy text not null,
  description_hy text,
  status text not null default 'active' check (status in ('draft','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(skill_id, code)
);

create table if not exists public.item_misconception_mappings (
  item_id uuid not null references public.items(id) on delete cascade,
  misconception_id uuid not null references public.misconceptions(id) on delete cascade,
  response_key text not null default '*',
  mapping_note text,
  created_at timestamptz not null default now(),
  primary key(item_id, misconception_id, response_key)
);

create table if not exists public.item_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  version_no integer not null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_type text not null default 'content' check (review_type in ('content','answer_key','language','accessibility','sme')),
  decision text not null check (decision in ('submitted','approved','changes_requested','rejected')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_item_reviews_item_created on public.item_reviews(item_id, created_at desc);

create table if not exists public.item_qa_runs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  version_no integer not null,
  run_by uuid references public.profiles(id) on delete set null,
  passed boolean not null,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_item_qa_runs_item_created on public.item_qa_runs(item_id, created_at desc);
create index if not exists idx_item_qa_runs_failed on public.item_qa_runs(passed, created_at desc);

create table if not exists public.item_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  version_no integer not null,
  snapshot jsonb not null,
  change_summary text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(item_id, version_no)
);
create index if not exists idx_item_versions_item_version on public.item_versions(item_id, version_no desc);

-- Seed a normalized misconception taxonomy from the Sprint 5 remediation guides.
insert into public.misconceptions(skill_id, code, title_hy, description_hy, status)
select g.skill_id, g.misconception_code, g.title_hy, g.strategy_hy, 'active'
from public.skill_remediation_guides g
on conflict (skill_id, code) do update
set title_hy = excluded.title_hy,
    description_hy = excluded.description_hy,
    updated_at = now();

-- Existing Chapter I items inherit the general misconception for their skill.
-- This is intentionally skill-level/provisional; option-specific mappings can be authored later.
insert into public.item_misconception_mappings(item_id, misconception_id, response_key, mapping_note)
select i.id, m.id, '*', 'Sprint 8 provisional skill-level mapping; refine to response-specific misconceptions during content review.'
from public.items i
join public.misconceptions m on m.skill_id = i.skill_id and m.status = 'active'
on conflict do nothing;

-- Baseline snapshot of the pre-Sprint-8 bank. Future snapshots are created by the content workflow.
insert into public.item_versions(item_id, version_no, snapshot, change_summary)
select i.id, i.version_no,
  jsonb_build_object(
    'item', to_jsonb(i),
    'options', coalesce((select jsonb_agg(to_jsonb(o) order by o.display_order, o.option_key) from public.item_options o where o.item_id = i.id), '[]'::jsonb),
    'answerKey', (select to_jsonb(k) from public.item_answer_keys k where k.item_id = i.id)
  ),
  'Sprint 8 baseline snapshot'
from public.items i
on conflict (item_id, version_no) do nothing;

-- Technical QA baseline. This validates structural correctness only; it is not SME approval.
insert into public.item_qa_runs(item_id, version_no, passed, errors, warnings, details)
select i.id, i.version_no,
  (
    k.item_id is not null
    and length(trim(i.prompt_hy)) > 0
    and i.difficulty between 1 and 5
    and case i.item_type::text
      when 'single_choice' then
        (select count(*) from public.item_options o where o.item_id=i.id) >= 2
        and exists (
          select 1 from public.item_options o
          where o.item_id=i.id and o.option_key = trim(both '"' from k.answer::text)
        )
      when 'true_false' then jsonb_typeof(k.answer) = 'boolean'
      when 'numeric' then jsonb_typeof(k.answer) = 'number' and k.tolerance is not null
      when 'quantity' then jsonb_typeof(k.answer) = 'number' and k.tolerance is not null and k.canonical_unit is not null and cardinality(k.accepted_units) > 0
      else false
    end
  ) as passed,
  to_jsonb(array_remove(array[
    case when k.item_id is null then 'missing_answer_key' end,
    case when length(trim(i.prompt_hy)) = 0 then 'empty_prompt' end,
    case when not (i.difficulty between 1 and 5) then 'invalid_difficulty' end,
    case when i.item_type::text='single_choice' and (select count(*) from public.item_options o where o.item_id=i.id) < 2 then 'insufficient_options' end,
    case when i.item_type::text='single_choice' and k.item_id is not null and not exists (select 1 from public.item_options o where o.item_id=i.id and o.option_key=trim(both '"' from k.answer::text)) then 'answer_not_in_options' end,
    case when i.item_type::text='true_false' and k.item_id is not null and jsonb_typeof(k.answer) <> 'boolean' then 'true_false_answer_not_boolean' end,
    case when i.item_type::text in ('numeric','quantity') and k.item_id is not null and jsonb_typeof(k.answer) <> 'number' then 'numeric_answer_not_number' end,
    case when i.item_type::text in ('numeric','quantity') and k.item_id is not null and k.tolerance is null then 'numeric_tolerance_missing' end,
    case when i.item_type::text='quantity' and k.item_id is not null and (k.canonical_unit is null or cardinality(k.accepted_units)=0) then 'quantity_unit_metadata_missing' end
  ]::text[], null)),
  to_jsonb(array_remove(array[
    case when i.source_reference is null then 'source_reference_missing' end,
    case when i.item_family='unspecified' then 'item_family_unspecified' end,
    case when i.review_status <> 'approved' then 'content_review_not_approved' end,
    case when i.validation_state='provisional_no_sme_review' then 'sme_review_pending' end
  ]::text[], null)),
  jsonb_build_object('scope','technical_structure','baseline',true)
from public.items i
left join public.item_answer_keys k on k.item_id=i.id
where not exists (select 1 from public.item_qa_runs q where q.item_id=i.id and q.version_no=i.version_no);

-- Any direct edit to assessable item content removes it from the published pool until re-review.
create or replace function private.mark_item_revision_required()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if old.skill_id is distinct from new.skill_id
     or old.item_type is distinct from new.item_type
     or old.prompt_hy is distinct from new.prompt_hy
     or old.prompt_en is distinct from new.prompt_en
     or old.stimulus is distinct from new.stimulus
     or old.difficulty is distinct from new.difficulty
     or old.difficulty_band is distinct from new.difficulty_band
     or old.item_family is distinct from new.item_family
     or old.config is distinct from new.config
     or old.source_reference is distinct from new.source_reference then
    new.review_status := 'needs_review';
    if old.status = 'published' then new.status := 'review'; end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_items_mark_revision_required on public.items;
create trigger trg_items_mark_revision_required
before update on public.items
for each row execute function private.mark_item_revision_required();

create or replace function private.mark_parent_item_revision_required()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare v_item_id uuid;
begin
  v_item_id := coalesce(new.item_id, old.item_id);
  update public.items
  set review_status='needs_review',
      status=case when status='published' then 'review'::content_status else status end,
      updated_at=now()
  where id=v_item_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_item_options_mark_revision_required on public.item_options;
create trigger trg_item_options_mark_revision_required
after insert or update or delete on public.item_options
for each row execute function private.mark_parent_item_revision_required();

drop trigger if exists trg_answer_keys_mark_revision_required on public.item_answer_keys;
create trigger trg_answer_keys_mark_revision_required
after insert or update or delete on public.item_answer_keys
for each row execute function private.mark_parent_item_revision_required();

-- Quality-system tables are restricted to content administrators and admins.
alter table public.misconceptions enable row level security;
alter table public.item_misconception_mappings enable row level security;
alter table public.item_reviews enable row level security;
alter table public.item_qa_runs enable row level security;
alter table public.item_versions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['misconceptions','item_misconception_mappings','item_reviews','item_qa_runs','item_versions'] loop
    execute format('drop policy if exists content_quality_staff_all on public.%I', t);
    execute format('create policy content_quality_staff_all on public.%I for all to authenticated using (private.current_user_role() = any (array[''admin''::user_role,''content_admin''::user_role])) with check (private.current_user_role() = any (array[''admin''::user_role,''content_admin''::user_role]))', t);
  end loop;
end $$;

-- Retired items are never exposed to learners through direct table reads.
drop policy if exists items_public_read_published on public.items;
create policy items_public_read_published on public.items
for select to anon using (status='published'::content_status and retired_at is null);

drop policy if exists items_read_published on public.items;
create policy items_read_published on public.items
for select to authenticated using (
  (status='published'::content_status and retired_at is null)
  or private.current_user_role() = any (array['teacher'::user_role,'admin'::user_role,'content_admin'::user_role])
);

-- Do not expose options for draft/review/retired items to learners.
drop policy if exists item_options_public_read on public.item_options;
create policy item_options_public_read on public.item_options
for select to anon using (
  exists (select 1 from public.items i where i.id=item_id and i.status='published'::content_status and i.retired_at is null)
);

drop policy if exists item_options_read on public.item_options;
create policy item_options_read on public.item_options
for select to authenticated using (
  exists (select 1 from public.items i where i.id=item_id and i.status='published'::content_status and i.retired_at is null)
  or private.current_user_role() = any (array['teacher'::user_role,'admin'::user_role,'content_admin'::user_role])
);
