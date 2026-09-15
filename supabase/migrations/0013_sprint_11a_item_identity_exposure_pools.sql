-- Sprint 11A: Assessment integrity foundations
-- Adds normalized item family/template/concrete-variant identity, explicit assessment
-- pools/eligibility, protected Mastery content, and student-level exposure history.

-- ---------------------------------------------------------------------------
-- 1. Normalized item identity
-- ---------------------------------------------------------------------------

create table if not exists public.item_families (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  code text not null unique,
  name_hy text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_templates (
  id uuid primary key default gen_random_uuid(),
  item_family_id uuid not null references public.item_families(id) on delete restrict,
  code text not null unique,
  template_kind text not null default 'fixed'
    check (template_kind in ('fixed','parameterized','parallel')),
  template_version integer not null default 1 check (template_version >= 1),
  generation_config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items
  add column if not exists item_template_id uuid references public.item_templates(id) on delete restrict,
  add column if not exists variant_key text,
  add column if not exists variant_seed text,
  add column if not exists variant_parameters jsonb not null default '{}'::jsonb;

-- Existing fixed items are conservatively backfilled as singleton families/templates.
-- Sprint 11D can merge/reclassify families after the 60-item content re-audit without
-- pretending that the legacy `item_family` tag already represents a true family identity.
insert into public.item_families(skill_id, code, name_hy, description, metadata)
select
  i.skill_id,
  coalesce(i.code, i.id::text) || '-F01',
  coalesce(i.code, i.id::text) || ' — սկզբնական ընտանիք',
  'Sprint 11A singleton baseline family; regroup only after explicit content review.',
  jsonb_build_object('source','sprint_11a_backfill','legacyItemFamilyTag',i.item_family)
from public.items i
on conflict (code) do nothing;

insert into public.item_templates(item_family_id, code, template_kind, template_version, generation_config, status)
select
  f.id,
  coalesce(i.code, i.id::text) || '-T01',
  'fixed',
  1,
  jsonb_build_object('source','sprint_11a_backfill','fixedItemId',i.id),
  'active'
from public.items i
join public.item_families f on f.code = coalesce(i.code, i.id::text) || '-F01'
on conflict (code) do nothing;

update public.items i
set item_template_id = t.id,
    variant_key = coalesce(i.variant_key, 'fixed:' || coalesce(i.code, i.id::text)),
    variant_seed = coalesce(i.variant_seed, null),
    variant_parameters = coalesce(i.variant_parameters, '{}'::jsonb)
from public.item_templates t
where t.code = coalesce(i.code, i.id::text) || '-T01'
  and (i.item_template_id is null or i.variant_key is null);

alter table public.items alter column item_template_id set not null;
alter table public.items alter column variant_key set not null;

create unique index if not exists uq_items_template_variant
  on public.items(item_template_id, variant_key);
create index if not exists idx_item_templates_family on public.item_templates(item_family_id, status);
create index if not exists idx_item_families_skill on public.item_families(skill_id);

-- Item identity changes are assessable-content changes and must re-enter review.
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
     or old.item_template_id is distinct from new.item_template_id
     or old.variant_key is distinct from new.variant_key
     or old.variant_seed is distinct from new.variant_seed
     or old.variant_parameters is distinct from new.variant_parameters
     or old.config is distinct from new.config
     or old.source_reference is distinct from new.source_reference then
    new.review_status := 'needs_review';
    if old.status = 'published' then new.status := 'review'; end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Explicit Practice / Diagnostic / Mastery eligibility and protected pools
-- ---------------------------------------------------------------------------

create table if not exists public.assessment_pools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  unit_code text not null,
  purpose text not null check (purpose in ('practice','diagnostic','mastery_check')),
  name text not null,
  is_protected boolean not null default false,
  status text not null default 'active' check (status in ('draft','active','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_pool_items (
  pool_id uuid not null references public.assessment_pools(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now(),
  primary key(pool_id, item_id)
);

create index if not exists idx_assessment_pools_unit_purpose
  on public.assessment_pools(unit_code, purpose, status);
create index if not exists idx_assessment_pool_items_item
  on public.assessment_pool_items(item_id, enabled);

insert into public.assessment_pools(code, unit_code, purpose, name, is_protected, status, metadata)
values
  ('PHY7-U01-PRACTICE-BASELINE', 'PHY7-U01', 'practice', 'Grade 7 Physics Chapter I — Practice baseline', false, 'active', jsonb_build_object('phase','11A')),
  ('PHY7-U01-DIAGNOSTIC-BASELINE', 'PHY7-U01', 'diagnostic', 'Grade 7 Physics Chapter I — Diagnostic baseline', false, 'active', jsonb_build_object('phase','11A','note','Parallel forms are added in Sprint 11B/11D.')),
  ('PHY7-U01-MASTERY-PROTECTED-A', 'PHY7-U01', 'mastery_check', 'Grade 7 Physics Chapter I — Protected Mastery pool A', true, 'active', jsonb_build_object('phase','11A','provisionalSelection',true))
on conflict (code) do update
set unit_code = excluded.unit_code,
    purpose = excluded.purpose,
    name = excluded.name,
    is_protected = excluded.is_protected,
    status = excluded.status,
    metadata = public.assessment_pools.metadata || excluded.metadata,
    updated_at = now();

-- Mechanical baseline split: for each Chapter I skill, the final two currently
-- published items become Mastery-only/protected. The first four remain eligible
-- for Practice and Diagnostic. Sprint 11D will re-audit the pedagogical fitness
-- of this provisional allocation while preserving the protection boundary.
with ranked as (
  select
    i.id,
    i.skill_id,
    row_number() over (partition by i.skill_id order by i.code nulls last, i.id) as rn,
    count(*) over (partition by i.skill_id) as cnt
  from public.items i
  join public.skills s on s.id = i.skill_id
  where s.code like 'PHY7-U01-S%'
    and i.status = 'published'::content_status
    and i.retired_at is null
), practice_pool as (
  select id from ranked where rn <= greatest(cnt - 2, 0)
)
insert into public.assessment_pool_items(pool_id, item_id, metadata)
select p.id, r.id, jsonb_build_object('source','11A_baseline_split')
from practice_pool r
join public.assessment_pools p on p.code = 'PHY7-U01-PRACTICE-BASELINE'
on conflict (pool_id, item_id) do update set enabled=true;

with ranked as (
  select
    i.id,
    i.skill_id,
    row_number() over (partition by i.skill_id order by i.code nulls last, i.id) as rn,
    count(*) over (partition by i.skill_id) as cnt
  from public.items i
  join public.skills s on s.id = i.skill_id
  where s.code like 'PHY7-U01-S%'
    and i.status = 'published'::content_status
    and i.retired_at is null
), diagnostic_pool as (
  select id from ranked where rn <= greatest(cnt - 2, 0)
)
insert into public.assessment_pool_items(pool_id, item_id, metadata)
select p.id, r.id, jsonb_build_object('source','11A_baseline_split')
from diagnostic_pool r
join public.assessment_pools p on p.code = 'PHY7-U01-DIAGNOSTIC-BASELINE'
on conflict (pool_id, item_id) do update set enabled=true;

with ranked as (
  select
    i.id,
    i.skill_id,
    row_number() over (partition by i.skill_id order by i.code nulls last, i.id) as rn,
    count(*) over (partition by i.skill_id) as cnt
  from public.items i
  join public.skills s on s.id = i.skill_id
  where s.code like 'PHY7-U01-S%'
    and i.status = 'published'::content_status
    and i.retired_at is null
), mastery_pool as (
  select id from ranked where rn > greatest(cnt - 2, 0)
)
insert into public.assessment_pool_items(pool_id, item_id, metadata)
select p.id, r.id, jsonb_build_object('source','11A_baseline_split','protected',true)
from mastery_pool r
join public.assessment_pools p on p.code = 'PHY7-U01-MASTERY-PROTECTED-A'
on conflict (pool_id, item_id) do update set enabled=true;

-- ---------------------------------------------------------------------------
-- 3. Student-level exposure history
-- ---------------------------------------------------------------------------

create table if not exists public.student_item_exposure_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  item_family_id uuid not null references public.item_families(id) on delete restrict,
  item_template_id uuid not null references public.item_templates(id) on delete restrict,
  item_code text not null,
  family_code text not null,
  template_code text not null,
  variant_key text not null,
  purpose text not null check (purpose in ('practice','diagnostic','mastery_check')),
  session_id uuid references public.learning_sessions(id) on delete set null,
  session_item_id uuid unique references public.learning_session_items(id) on delete set null,
  served_at timestamptz not null default now(),
  answered_at timestamptz,
  attempt_id uuid references public.attempts(id) on delete set null,
  correct boolean,
  help_used boolean not null default false,
  hint_level_used integer not null default 0 check (hint_level_used between 0 and 3),
  response_time_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exposure_student_recent
  on public.student_item_exposure_events(student_id, served_at desc);
create index if not exists idx_exposure_student_item_recent
  on public.student_item_exposure_events(student_id, item_id, served_at desc);
create index if not exists idx_exposure_student_template_recent
  on public.student_item_exposure_events(student_id, item_template_id, served_at desc);
create index if not exists idx_exposure_student_family_recent
  on public.student_item_exposure_events(student_id, item_family_id, served_at desc);
create index if not exists idx_exposure_purpose_recent
  on public.student_item_exposure_events(purpose, served_at desc);

-- Idempotently record an item only when it is actually served to the learner.
create or replace function public.service_record_item_exposure(
  p_student_id uuid,
  p_session_id uuid,
  p_session_item_id uuid,
  p_item_id uuid,
  p_served_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_event_id uuid;
  v_purpose text;
  v_item_code text;
  v_variant_key text;
  v_template_id uuid;
  v_template_code text;
  v_family_id uuid;
  v_family_code text;
begin
  select
    ls.mode,
    i.code,
    i.variant_key,
    t.id,
    t.code,
    f.id,
    f.code
  into
    v_purpose,
    v_item_code,
    v_variant_key,
    v_template_id,
    v_template_code,
    v_family_id,
    v_family_code
  from public.learning_session_items lsi
  join public.learning_sessions ls on ls.id = lsi.session_id
  join public.items i on i.id = lsi.item_id
  join public.item_templates t on t.id = i.item_template_id
  join public.item_families f on f.id = t.item_family_id
  where lsi.id = p_session_item_id
    and lsi.session_id = p_session_id
    and lsi.item_id = p_item_id
    and ls.student_id = p_student_id
    and ls.mode in ('practice','diagnostic','mastery_check');

  if not found then
    raise exception 'invalid_exposure_context';
  end if;

  insert into public.student_item_exposure_events(
    student_id, item_id, item_family_id, item_template_id,
    item_code, family_code, template_code, variant_key,
    purpose, session_id, session_item_id, served_at
  ) values (
    p_student_id, p_item_id, v_family_id, v_template_id,
    coalesce(v_item_code, p_item_id::text), v_family_code, v_template_code, v_variant_key,
    v_purpose, p_session_id, p_session_item_id, p_served_at
  )
  on conflict (session_item_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.student_item_exposure_events
    where session_item_id = p_session_item_id;
  end if;

  return v_event_id;
end;
$$;

create or replace function public.service_finalize_item_exposure(
  p_student_id uuid,
  p_session_id uuid,
  p_session_item_id uuid,
  p_item_id uuid,
  p_attempt_id uuid,
  p_correct boolean,
  p_hint_used boolean,
  p_response_time_ms integer,
  p_answered_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_hint_level integer;
begin
  perform public.service_record_item_exposure(
    p_student_id, p_session_id, p_session_item_id, p_item_id, p_answered_at
  );

  select coalesce(hint_level_used, 0)
  into v_hint_level
  from public.learning_session_items
  where id = p_session_item_id and session_id = p_session_id and item_id = p_item_id;

  update public.student_item_exposure_events
  set answered_at = coalesce(answered_at, p_answered_at),
      attempt_id = coalesce(attempt_id, p_attempt_id),
      correct = p_correct,
      help_used = help_used or p_hint_used or coalesce(v_hint_level,0) > 0,
      hint_level_used = greatest(hint_level_used, coalesce(v_hint_level,0)),
      response_time_ms = coalesce(response_time_ms, p_response_time_ms),
      updated_at = now()
  where student_id = p_student_id
    and session_item_id = p_session_item_id
    and item_id = p_item_id;
end;
$$;

create or replace function public.service_record_item_help(
  p_student_id uuid,
  p_session_id uuid,
  p_session_item_id uuid,
  p_item_id uuid,
  p_hint_level integer
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform public.service_record_item_exposure(
    p_student_id, p_session_id, p_session_item_id, p_item_id, now()
  );

  update public.student_item_exposure_events
  set help_used = true,
      hint_level_used = greatest(hint_level_used, least(3, greatest(0, coalesce(p_hint_level,0)))),
      updated_at = now()
  where student_id = p_student_id
    and session_item_id = p_session_item_id
    and item_id = p_item_id;
end;
$$;

revoke all on function public.service_record_item_exposure(uuid,uuid,uuid,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.service_finalize_item_exposure(uuid,uuid,uuid,uuid,uuid,boolean,boolean,integer,timestamptz) from public, anon, authenticated;
revoke all on function public.service_record_item_help(uuid,uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.service_record_item_exposure(uuid,uuid,uuid,uuid,timestamptz) to service_role;
grant execute on function public.service_finalize_item_exposure(uuid,uuid,uuid,uuid,uuid,boolean,boolean,integer,timestamptz) to service_role;
grant execute on function public.service_record_item_help(uuid,uuid,uuid,uuid,integer) to service_role;

-- Keep exposure outcome in the same transaction as the graded attempt.
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

  perform public.service_finalize_item_exposure(
    p_student_id,
    p_session_id,
    p_session_item_id,
    p_item_id,
    v_attempt_id,
    p_correct,
    p_hint_used,
    p_response_time_ms,
    p_attempted_at
  );

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

-- Post-answer remediation may happen after the attempt was finalized; keep the
-- exposure event synchronized when a remediation stage is requested.
create or replace function private.sync_remediation_event_exposure()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_hint_level integer;
begin
  select coalesce(hint_level_used,0)
  into v_hint_level
  from public.learning_session_items
  where id = new.session_item_id;

  perform public.service_record_item_help(
    new.student_id,
    new.session_id,
    new.session_item_id,
    new.item_id,
    coalesce(v_hint_level,0)
  );
  return new;
end;
$$;

drop trigger if exists trg_remediation_event_exposure on public.remediation_events;
create trigger trg_remediation_event_exposure
after insert on public.remediation_events
for each row execute function private.sync_remediation_event_exposure();

-- ---------------------------------------------------------------------------
-- 4. RLS: protected pools cannot be browsed directly by learners
-- ---------------------------------------------------------------------------

create or replace function private.item_is_protected(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.assessment_pool_items api
    join public.assessment_pools ap on ap.id = api.pool_id
    where api.item_id = p_item_id
      and api.enabled = true
      and ap.status = 'active'
      and ap.is_protected = true
  );
$$;

revoke all on function private.item_is_protected(uuid) from public;
grant execute on function private.item_is_protected(uuid) to anon, authenticated, service_role;

alter table public.item_families enable row level security;
alter table public.item_templates enable row level security;
alter table public.assessment_pools enable row level security;
alter table public.assessment_pool_items enable row level security;
alter table public.student_item_exposure_events enable row level security;

grant select, insert, update, delete on public.item_families to authenticated;
grant select, insert, update, delete on public.item_templates to authenticated;
grant select, insert, update, delete on public.assessment_pools to authenticated;
grant select, insert, update, delete on public.assessment_pool_items to authenticated;
grant select on public.student_item_exposure_events to authenticated;

drop policy if exists content_integrity_staff_all on public.item_families;
create policy content_integrity_staff_all on public.item_families
for all to authenticated
using (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]))
with check (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]));

drop policy if exists content_integrity_staff_all on public.item_templates;
create policy content_integrity_staff_all on public.item_templates
for all to authenticated
using (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]))
with check (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]));

drop policy if exists content_integrity_staff_all on public.assessment_pools;
create policy content_integrity_staff_all on public.assessment_pools
for all to authenticated
using (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]))
with check (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]));

drop policy if exists content_integrity_staff_all on public.assessment_pool_items;
create policy content_integrity_staff_all on public.assessment_pool_items
for all to authenticated
using (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]))
with check (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]));

drop policy if exists students_read_own_item_exposure on public.student_item_exposure_events;
create policy students_read_own_item_exposure on public.student_item_exposure_events
for select to authenticated
using (student_id = auth.uid());

drop policy if exists integrity_staff_read_item_exposure on public.student_item_exposure_events;
create policy integrity_staff_read_item_exposure on public.student_item_exposure_events
for select to authenticated
using (private.current_user_role() = any (array['admin'::user_role,'content_admin'::user_role]));

-- Replace broad published-item policies: protected Mastery items are only served
-- through authorized assessment Edge Functions, never through direct learner reads.
drop policy if exists items_public_read_published on public.items;
create policy items_public_read_published on public.items
for select to anon using (
  status='published'::content_status
  and retired_at is null
  and not private.item_is_protected(id)
);

drop policy if exists items_read_published on public.items;
create policy items_read_published on public.items
for select to authenticated using (
  (
    status='published'::content_status
    and retired_at is null
    and not private.item_is_protected(id)
  )
  or private.current_user_role() = any (array['teacher'::user_role,'admin'::user_role,'content_admin'::user_role])
);

drop policy if exists item_options_public_read on public.item_options;
create policy item_options_public_read on public.item_options
for select to anon using (
  exists (
    select 1 from public.items i
    where i.id=item_id
      and i.status='published'::content_status
      and i.retired_at is null
      and not private.item_is_protected(i.id)
  )
);

drop policy if exists item_options_read on public.item_options;
create policy item_options_read on public.item_options
for select to authenticated using (
  exists (
    select 1 from public.items i
    where i.id=item_id
      and i.status='published'::content_status
      and i.retired_at is null
      and not private.item_is_protected(i.id)
  )
  or private.current_user_role() = any (array['teacher'::user_role,'admin'::user_role,'content_admin'::user_role])
);
