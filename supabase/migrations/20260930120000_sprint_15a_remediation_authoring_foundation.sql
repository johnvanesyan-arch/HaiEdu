-- Sprint 15A.1 — governed remediation-guide authoring foundation.
-- Draft/review work is append-only and cannot change the learner-facing guide
-- until an authorized AAL2 publish action completes atomically.

alter table public.skill_remediation_guides
  add column if not exists metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object');

alter table public.remediation_guide_versions
  add column if not exists actor_id uuid,
  add column if not exists actor_role text,
  add column if not exists change_rationale text,
  add column if not exists lifecycle_action text;

create table if not exists public.remediation_guide_authoring_versions (
  id uuid primary key default gen_random_uuid(),
  guide_scope text not null check (guide_scope in ('skill','template')),
  guide_source_id uuid not null,
  authoring_version integer not null check (authoring_version > 0),
  lifecycle_status text not null check (lifecycle_status in ('draft','review','published','archived')),
  content_snapshot jsonb not null check (jsonb_typeof(content_snapshot) = 'object'),
  reference_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(reference_metadata) = 'object'),
  change_rationale text not null check (length(btrim(change_rationale)) >= 3),
  actor_id uuid,
  actor_role text not null,
  actor_aal text not null check (actor_aal in ('aal1','aal2','system')),
  parent_version_id uuid references public.remediation_guide_authoring_versions(id) on delete restrict,
  published_runtime_version integer check (published_runtime_version is null or published_runtime_version > 0),
  created_at timestamptz not null default now(),
  unique (guide_scope, guide_source_id, authoring_version),
  check (actor_id is not null or actor_role = 'system'),
  check ((lifecycle_status in ('published','archived') and actor_aal in ('aal2','system'))
    or lifecycle_status in ('draft','review'))
);

comment on table public.remediation_guide_authoring_versions is
  'Append-only Content Reviewer workflow. Draft/review records never alter the learner runtime; publish/archive is applied atomically by a service-only procedure.';

alter table public.remediation_guide_authoring_versions enable row level security;
revoke all on table public.remediation_guide_authoring_versions from anon, authenticated;
grant select, insert on table public.remediation_guide_authoring_versions to service_role;

create index if not exists remediation_guide_authoring_latest_idx
  on public.remediation_guide_authoring_versions
  (guide_scope, guide_source_id, authoring_version desc);

create index if not exists remediation_guide_authoring_status_idx
  on public.remediation_guide_authoring_versions
  (lifecycle_status, created_at desc);

create or replace function public.reject_remediation_guide_authoring_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'remediation_guide_authoring_versions is append-only';
end;
$$;

drop trigger if exists remediation_guide_authoring_immutable
  on public.remediation_guide_authoring_versions;

create trigger remediation_guide_authoring_immutable
before update or delete on public.remediation_guide_authoring_versions
for each row execute function public.reject_remediation_guide_authoring_mutation();

-- Status and reference metadata are part of the governed runtime version.
create or replace function public.version_skill_remediation_guide()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(
    new.skill_id,
    new.misconception_code,
    new.title_hy,
    new.strategy_hy,
    new.hint_1_hy,
    new.hint_2_hy,
    new.worked_example_hy,
    new.status,
    new.metadata
  ) is distinct from row(
    old.skill_id,
    old.misconception_code,
    old.title_hy,
    old.strategy_hy,
    old.hint_1_hy,
    old.hint_2_hy,
    old.worked_example_hy,
    old.status,
    old.metadata
  ) then
    new.guide_version := old.guide_version + 1;
  else
    new.guide_version := old.guide_version;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.version_template_remediation_guide()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(
    new.item_template_id,
    new.trigger_error_code,
    new.title_hy,
    new.strategy_hy,
    new.hint_1_hy,
    new.hint_2_hy,
    new.worked_example_hy,
    new.allowed_parameter_keys,
    new.status,
    new.metadata
  ) is distinct from row(
    old.item_template_id,
    old.trigger_error_code,
    old.title_hy,
    old.strategy_hy,
    old.hint_1_hy,
    old.hint_2_hy,
    old.worked_example_hy,
    old.allowed_parameter_keys,
    old.status,
    old.metadata
  ) then
    new.guide_version := old.guide_version + 1;
  else
    new.guide_version := old.guide_version;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.snapshot_skill_remediation_guide()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.remediation_guide_versions (
    guide_scope, guide_source_id, guide_version, content_snapshot,
    actor_id, actor_role, change_rationale, lifecycle_action
  ) values (
    'skill',
    new.id,
    new.guide_version,
    jsonb_build_object(
      'skillId', new.skill_id,
      'misconceptionCode', new.misconception_code,
      'titleHy', new.title_hy,
      'strategyHy', new.strategy_hy,
      'hint1Hy', new.hint_1_hy,
      'hint2Hy', new.hint_2_hy,
      'workedExampleHy', new.worked_example_hy,
      'metadata', new.metadata,
      'status', new.status
    ),
    nullif(current_setting('app.remediation_actor_id', true), '')::uuid,
    nullif(current_setting('app.remediation_actor_role', true), ''),
    nullif(current_setting('app.remediation_change_rationale', true), ''),
    nullif(current_setting('app.remediation_lifecycle_action', true), '')
  )
  on conflict (guide_scope, guide_source_id, guide_version) do nothing;
  return new;
end;
$$;

create or replace function public.snapshot_template_remediation_guide()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.remediation_guide_versions (
    guide_scope, guide_source_id, guide_version, content_snapshot,
    actor_id, actor_role, change_rationale, lifecycle_action
  ) values (
    'template',
    new.id,
    new.guide_version,
    jsonb_build_object(
      'itemTemplateId', new.item_template_id,
      'triggerErrorCode', new.trigger_error_code,
      'titleHy', new.title_hy,
      'strategyHy', new.strategy_hy,
      'hint1Hy', new.hint_1_hy,
      'hint2Hy', new.hint_2_hy,
      'workedExampleHy', new.worked_example_hy,
      'allowedParameterKeys', to_jsonb(new.allowed_parameter_keys),
      'metadata', new.metadata,
      'status', new.status
    ),
    nullif(current_setting('app.remediation_actor_id', true), '')::uuid,
    nullif(current_setting('app.remediation_actor_role', true), ''),
    nullif(current_setting('app.remediation_change_rationale', true), ''),
    nullif(current_setting('app.remediation_lifecycle_action', true), '')
  )
  on conflict (guide_scope, guide_source_id, guide_version) do nothing;
  return new;
end;
$$;

-- Capture the current learner-facing state before authoring begins.
insert into public.remediation_guide_authoring_versions (
  guide_scope, guide_source_id, authoring_version, lifecycle_status,
  content_snapshot, reference_metadata, change_rationale,
  actor_id, actor_role, actor_aal, published_runtime_version
)
select
  'skill', g.id, 1,
  case when g.status = 'archived' then 'archived' else 'published' end,
  jsonb_build_object(
    'skillId', g.skill_id,
    'misconceptionCode', g.misconception_code,
    'titleHy', g.title_hy,
    'strategyHy', g.strategy_hy,
    'hint1Hy', g.hint_1_hy,
    'hint2Hy', g.hint_2_hy,
    'workedExampleHy', g.worked_example_hy,
    'allowedParameterKeys', '[]'::jsonb,
    'metadata', g.metadata
  ),
  coalesce(g.metadata->'referenceMetadata', '{}'::jsonb),
  '15A սկզբնական վիճակի գրանցում',
  null, 'system', 'system', g.guide_version
from public.skill_remediation_guides g
where not exists (
  select 1 from public.remediation_guide_authoring_versions v
  where v.guide_scope = 'skill' and v.guide_source_id = g.id
);

insert into public.remediation_guide_authoring_versions (
  guide_scope, guide_source_id, authoring_version, lifecycle_status,
  content_snapshot, reference_metadata, change_rationale,
  actor_id, actor_role, actor_aal, published_runtime_version
)
select
  'template', g.id, 1,
  case when g.status = 'archived' then 'archived' else 'published' end,
  jsonb_build_object(
    'itemTemplateId', g.item_template_id,
    'triggerErrorCode', g.trigger_error_code,
    'titleHy', g.title_hy,
    'strategyHy', g.strategy_hy,
    'hint1Hy', g.hint_1_hy,
    'hint2Hy', g.hint_2_hy,
    'workedExampleHy', g.worked_example_hy,
    'allowedParameterKeys', to_jsonb(g.allowed_parameter_keys),
    'metadata', g.metadata
  ),
  coalesce(g.metadata->'referenceMetadata', '{}'::jsonb),
  '15A սկզբնական վիճակի գրանցում',
  null, 'system', 'system', g.guide_version
from public.item_template_remediation_guides g
where not exists (
  select 1 from public.remediation_guide_authoring_versions v
  where v.guide_scope = 'template' and v.guide_source_id = g.id
);

create or replace view public.remediation_guide_authoring_catalog_v
with (security_invoker = true)
as
with skill_context as (
  select
    s.id as skill_id,
    s.code as skill_code,
    s.name_hy as skill_name_hy,
    sub.id as subject_id,
    sub.code as subject_code,
    sub.name_hy as subject_name_hy,
    gr.id as grade_id,
    gr.grade_number,
    gr.label_hy as grade_label_hy,
    coalesce(
      jsonb_agg(distinct jsonb_build_object(
        'id', u.id, 'code', u.code, 'titleHy', u.title_hy
      )) filter (where u.id is not null),
      '[]'::jsonb
    ) as units,
    coalesce(
      jsonb_agg(distinct jsonb_build_object(
        'id', sp.id, 'versionLabel', sp.version_label
      )) filter (where sp.id is not null),
      '[]'::jsonb
    ) as programmes
  from public.skills s
  join public.subjects sub on sub.id = s.subject_id
  join public.grades gr on gr.id = s.grade_id
  left join public.skill_outcomes so on so.skill_id = s.id
  left join public.learning_outcomes lo on lo.id = so.learning_outcome_id
  left join public.topics t on t.id = lo.topic_id
  left join public.units u on u.id = t.unit_id
  left join public.subject_programs sp on sp.id = u.subject_program_id
  group by s.id, s.code, s.name_hy, sub.id, sub.code, sub.name_hy,
    gr.id, gr.grade_number, gr.label_hy
), latest_authoring as (
  select distinct on (v.guide_scope, v.guide_source_id)
    v.*
  from public.remediation_guide_authoring_versions v
  order by v.guide_scope, v.guide_source_id, v.authoring_version desc
), skill_rows as (
  select
    'skill'::text as guide_scope,
    g.id as guide_source_id,
    sc.subject_id, sc.subject_code, sc.subject_name_hy,
    sc.grade_id, sc.grade_number, sc.grade_label_hy,
    sc.programmes, sc.units,
    sc.skill_id, sc.skill_code, sc.skill_name_hy,
    null::uuid as item_template_id,
    null::text as item_template_code,
    g.misconception_code as specialization_code,
    g.guide_version as runtime_version,
    g.status as runtime_status,
    jsonb_build_object(
      'skillId', g.skill_id,
      'misconceptionCode', g.misconception_code,
      'titleHy', g.title_hy,
      'strategyHy', g.strategy_hy,
      'hint1Hy', g.hint_1_hy,
      'hint2Hy', g.hint_2_hy,
      'workedExampleHy', g.worked_example_hy,
      'allowedParameterKeys', '[]'::jsonb,
      'metadata', g.metadata
    ) as runtime_content,
    coalesce(g.metadata->'referenceMetadata', '{}'::jsonb) as runtime_reference_metadata
  from public.skill_remediation_guides g
  join skill_context sc on sc.skill_id = g.skill_id
), template_rows as (
  select
    'template'::text as guide_scope,
    g.id as guide_source_id,
    sc.subject_id, sc.subject_code, sc.subject_name_hy,
    sc.grade_id, sc.grade_number, sc.grade_label_hy,
    sc.programmes, sc.units,
    sc.skill_id, sc.skill_code, sc.skill_name_hy,
    it.id as item_template_id,
    it.code as item_template_code,
    g.trigger_error_code as specialization_code,
    g.guide_version as runtime_version,
    g.status as runtime_status,
    jsonb_build_object(
      'itemTemplateId', g.item_template_id,
      'triggerErrorCode', g.trigger_error_code,
      'titleHy', g.title_hy,
      'strategyHy', g.strategy_hy,
      'hint1Hy', g.hint_1_hy,
      'hint2Hy', g.hint_2_hy,
      'workedExampleHy', g.worked_example_hy,
      'allowedParameterKeys', to_jsonb(g.allowed_parameter_keys),
      'metadata', g.metadata
    ) as runtime_content,
    coalesce(g.metadata->'referenceMetadata', '{}'::jsonb) as runtime_reference_metadata
  from public.item_template_remediation_guides g
  join public.item_templates it on it.id = g.item_template_id
  join public.item_families f on f.id = it.item_family_id
  join skill_context sc on sc.skill_id = f.skill_id
)
select
  r.*,
  coalesce(a.authoring_version, 0) as authoring_version,
  coalesce(a.lifecycle_status, r.runtime_status) as lifecycle_status,
  coalesce(a.content_snapshot, r.runtime_content) as authoring_content,
  coalesce(a.reference_metadata, r.runtime_reference_metadata) as reference_metadata,
  a.change_rationale,
  a.actor_id,
  a.actor_role,
  a.actor_aal,
  a.created_at as authoring_updated_at
from (
  select * from skill_rows
  union all
  select * from template_rows
) r
left join latest_authoring a
  on a.guide_scope = r.guide_scope and a.guide_source_id = r.guide_source_id;

revoke all on table public.remediation_guide_authoring_catalog_v from anon, authenticated;
grant select on table public.remediation_guide_authoring_catalog_v to service_role;

create or replace function public.service_append_remediation_guide_authoring_version(
  p_guide_scope text,
  p_guide_source_id uuid,
  p_expected_authoring_version integer,
  p_lifecycle_status text,
  p_content_snapshot jsonb,
  p_reference_metadata jsonb,
  p_change_rationale text,
  p_actor_id uuid,
  p_actor_role text,
  p_actor_aal text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_profile record;
  v_latest public.remediation_guide_authoring_versions%rowtype;
  v_next integer;
  v_new_id uuid;
  v_runtime_version integer;
  v_allowed_keys text[] := '{}'::text[];
  v_metadata jsonb;
begin
  if p_guide_scope not in ('skill','template') then
    raise exception 'invalid_guide_scope';
  end if;
  if p_lifecycle_status not in ('draft','review','published','archived') then
    raise exception 'invalid_lifecycle_status';
  end if;
  if jsonb_typeof(p_content_snapshot) is distinct from 'object' then
    raise exception 'invalid_content_snapshot';
  end if;
  if jsonb_typeof(coalesce(p_reference_metadata, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'invalid_reference_metadata';
  end if;
  if length(btrim(coalesce(p_change_rationale,''))) < 3 then
    raise exception 'change_rationale_required';
  end if;

  select role, account_status into v_profile
  from public.profiles
  where id = p_actor_id;

  if not found or v_profile.account_status <> 'active'
     or v_profile.role not in ('content_admin','admin')
     or v_profile.role <> p_actor_role then
    raise exception 'content_authoring_role_required';
  end if;

  if p_lifecycle_status in ('published','archived') and p_actor_aal <> 'aal2' then
    raise exception 'mfa_required';
  end if;

  if p_guide_scope = 'skill' then
    perform 1 from public.skill_remediation_guides
    where id = p_guide_source_id for update;
  else
    perform 1 from public.item_template_remediation_guides
    where id = p_guide_source_id for update;
  end if;
  if not found then raise exception 'guide_not_found'; end if;

  select * into v_latest
  from public.remediation_guide_authoring_versions
  where guide_scope = p_guide_scope and guide_source_id = p_guide_source_id
  order by authoring_version desc
  limit 1;

  if not found then raise exception 'authoring_history_missing'; end if;
  if v_latest.authoring_version <> p_expected_authoring_version then
    raise exception 'stale_authoring_version';
  end if;
  if p_lifecycle_status = 'review' and v_latest.lifecycle_status <> 'draft' then
    raise exception 'draft_required_before_review';
  end if;
  if p_lifecycle_status = 'published' and v_latest.lifecycle_status <> 'review' then
    raise exception 'review_required_before_publish';
  end if;
  if p_lifecycle_status = 'published'
     and (p_content_snapshot is distinct from v_latest.content_snapshot
       or coalesce(p_reference_metadata,'{}'::jsonb) is distinct from v_latest.reference_metadata) then
    raise exception 'published_content_must_match_review';
  end if;
  if p_lifecycle_status = 'archived' and v_latest.lifecycle_status <> 'published' then
    raise exception 'published_guide_required_before_archive';
  end if;

  v_next := v_latest.authoring_version + 1;
  v_metadata := coalesce(p_content_snapshot->'metadata','{}'::jsonb)
    || jsonb_build_object('referenceMetadata', coalesce(p_reference_metadata,'{}'::jsonb));

  perform set_config('app.remediation_actor_id', p_actor_id::text, true);
  perform set_config('app.remediation_actor_role', p_actor_role, true);
  perform set_config('app.remediation_change_rationale', btrim(p_change_rationale), true);
  perform set_config('app.remediation_lifecycle_action', p_lifecycle_status, true);

  if p_lifecycle_status = 'published' then
    if p_guide_scope = 'skill' then
      update public.skill_remediation_guides set
        misconception_code = btrim(coalesce(p_content_snapshot->>'misconceptionCode','')),
        title_hy = btrim(coalesce(p_content_snapshot->>'titleHy','')),
        strategy_hy = btrim(coalesce(p_content_snapshot->>'strategyHy','')),
        hint_1_hy = btrim(coalesce(p_content_snapshot->>'hint1Hy','')),
        hint_2_hy = btrim(coalesce(p_content_snapshot->>'hint2Hy','')),
        worked_example_hy = btrim(coalesce(p_content_snapshot->>'workedExampleHy','')),
        metadata = v_metadata,
        status = 'published'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    else
      select coalesce(array_agg(value), '{}'::text[]) into v_allowed_keys
      from jsonb_array_elements_text(coalesce(p_content_snapshot->'allowedParameterKeys','[]'::jsonb));

      update public.item_template_remediation_guides set
        trigger_error_code = nullif(btrim(coalesce(p_content_snapshot->>'triggerErrorCode','')), ''),
        title_hy = btrim(coalesce(p_content_snapshot->>'titleHy','')),
        strategy_hy = btrim(coalesce(p_content_snapshot->>'strategyHy','')),
        hint_1_hy = btrim(coalesce(p_content_snapshot->>'hint1Hy','')),
        hint_2_hy = btrim(coalesce(p_content_snapshot->>'hint2Hy','')),
        worked_example_hy = btrim(coalesce(p_content_snapshot->>'workedExampleHy','')),
        allowed_parameter_keys = v_allowed_keys,
        metadata = v_metadata,
        status = 'published'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    end if;
  elsif p_lifecycle_status = 'archived' then
    -- Archive uses the last reviewed/published content; it cannot smuggle a content edit.
    p_content_snapshot := v_latest.content_snapshot;
    p_reference_metadata := v_latest.reference_metadata;
    if p_guide_scope = 'skill' then
      update public.skill_remediation_guides set status = 'archived'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    else
      update public.item_template_remediation_guides set status = 'archived'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    end if;
  end if;

  insert into public.remediation_guide_authoring_versions (
    guide_scope, guide_source_id, authoring_version, lifecycle_status,
    content_snapshot, reference_metadata, change_rationale,
    actor_id, actor_role, actor_aal, parent_version_id,
    published_runtime_version
  ) values (
    p_guide_scope, p_guide_source_id, v_next, p_lifecycle_status,
    p_content_snapshot, coalesce(p_reference_metadata,'{}'::jsonb), btrim(p_change_rationale),
    p_actor_id, p_actor_role, p_actor_aal, v_latest.id,
    case when p_lifecycle_status in ('published','archived') then v_runtime_version else null end
  ) returning id into v_new_id;

  return jsonb_build_object(
    'id', v_new_id,
    'guideScope', p_guide_scope,
    'guideSourceId', p_guide_source_id,
    'authoringVersion', v_next,
    'lifecycleStatus', p_lifecycle_status,
    'runtimeVersion', v_runtime_version
  );
end;
$$;

revoke all on function public.service_append_remediation_guide_authoring_version(
  text, uuid, integer, text, jsonb, jsonb, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.service_append_remediation_guide_authoring_version(
  text, uuid, integer, text, jsonb, jsonb, text, uuid, text, text
) to service_role;
