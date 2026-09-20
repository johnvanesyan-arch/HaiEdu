-- Sprint 12A audit correction 2 — immutable remediation-guide provenance.

alter table public.skill_remediation_guides
  add column if not exists guide_version integer not null default 1
    check (guide_version > 0);

create table if not exists public.remediation_guide_versions (
  id uuid primary key default gen_random_uuid(),
  guide_scope text not null check (guide_scope in ('skill','template')),
  guide_source_id uuid not null,
  guide_version integer not null check (guide_version > 0),
  content_snapshot jsonb not null check (jsonb_typeof(content_snapshot)='object'),
  content_fingerprint text generated always as (md5(content_snapshot::text)) stored,
  created_at timestamptz not null default now(),
  unique (guide_scope, guide_source_id, guide_version)
);

comment on table public.remediation_guide_versions is
  'Append-only immutable snapshots of remediation guide content. Historical remediation events resolve to an exact guide version.';

alter table public.remediation_guide_versions enable row level security;
revoke all on table public.remediation_guide_versions from anon, authenticated;
grant select, insert on table public.remediation_guide_versions to service_role;

create index if not exists remediation_guide_versions_source_idx
  on public.remediation_guide_versions (guide_scope, guide_source_id, guide_version);

create or replace function public.reject_remediation_guide_version_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'remediation_guide_versions is append-only';
end;
$$;

drop trigger if exists remediation_guide_versions_immutable
  on public.remediation_guide_versions;

create trigger remediation_guide_versions_immutable
before update or delete on public.remediation_guide_versions
for each row execute function public.reject_remediation_guide_version_mutation();

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
    new.worked_example_hy
  ) is distinct from row(
    old.skill_id,
    old.misconception_code,
    old.title_hy,
    old.strategy_hy,
    old.hint_1_hy,
    old.hint_2_hy,
    old.worked_example_hy
  ) then
    new.guide_version := old.guide_version + 1;
  else
    new.guide_version := old.guide_version;
  end if;
  return new;
end;
$$;

drop trigger if exists skill_remediation_guides_auto_version
  on public.skill_remediation_guides;

create trigger skill_remediation_guides_auto_version
before update on public.skill_remediation_guides
for each row execute function public.version_skill_remediation_guide();

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
    old.metadata
  ) then
    new.guide_version := old.guide_version + 1;
  else
    new.guide_version := old.guide_version;
  end if;
  return new;
end;
$$;

drop trigger if exists item_template_remediation_guides_auto_version
  on public.item_template_remediation_guides;

create trigger item_template_remediation_guides_auto_version
before update on public.item_template_remediation_guides
for each row execute function public.version_template_remediation_guide();

create or replace function public.snapshot_skill_remediation_guide()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.remediation_guide_versions (
    guide_scope, guide_source_id, guide_version, content_snapshot
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
      'status', new.status
    )
  )
  on conflict (guide_scope, guide_source_id, guide_version) do nothing;
  return new;
end;
$$;

drop trigger if exists skill_remediation_guides_snapshot
  on public.skill_remediation_guides;

create trigger skill_remediation_guides_snapshot
after insert or update on public.skill_remediation_guides
for each row execute function public.snapshot_skill_remediation_guide();

create or replace function public.snapshot_template_remediation_guide()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.remediation_guide_versions (
    guide_scope, guide_source_id, guide_version, content_snapshot
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
    )
  )
  on conflict (guide_scope, guide_source_id, guide_version) do nothing;
  return new;
end;
$$;

drop trigger if exists item_template_remediation_guides_snapshot
  on public.item_template_remediation_guides;

create trigger item_template_remediation_guides_snapshot
after insert or update on public.item_template_remediation_guides
for each row execute function public.snapshot_template_remediation_guide();

-- Backfill the current guide state as version 1/current version.
insert into public.remediation_guide_versions (
  guide_scope, guide_source_id, guide_version, content_snapshot
)
select
  'skill',
  g.id,
  g.guide_version,
  jsonb_build_object(
    'skillId', g.skill_id,
    'misconceptionCode', g.misconception_code,
    'titleHy', g.title_hy,
    'strategyHy', g.strategy_hy,
    'hint1Hy', g.hint_1_hy,
    'hint2Hy', g.hint_2_hy,
    'workedExampleHy', g.worked_example_hy,
    'status', g.status
  )
from public.skill_remediation_guides g
on conflict (guide_scope, guide_source_id, guide_version) do nothing;

insert into public.remediation_guide_versions (
  guide_scope, guide_source_id, guide_version, content_snapshot
)
select
  'template',
  g.id,
  g.guide_version,
  jsonb_build_object(
    'itemTemplateId', g.item_template_id,
    'triggerErrorCode', g.trigger_error_code,
    'titleHy', g.title_hy,
    'strategyHy', g.strategy_hy,
    'hint1Hy', g.hint_1_hy,
    'hint2Hy', g.hint_2_hy,
    'workedExampleHy', g.worked_example_hy,
    'allowedParameterKeys', to_jsonb(g.allowed_parameter_keys),
    'metadata', g.metadata,
    'status', g.status
  )
from public.item_template_remediation_guides g
on conflict (guide_scope, guide_source_id, guide_version) do nothing;

alter table public.remediation_events
  add column if not exists guide_snapshot_id uuid references public.remediation_guide_versions(id),
  add column if not exists rendered_title_hy text,
  add column if not exists rendered_strategy_hy text,
  add column if not exists rendered_content_hy text;

create index if not exists remediation_events_guide_snapshot_idx
  on public.remediation_events (guide_snapshot_id)
  where guide_snapshot_id is not null;

update public.remediation_events r
set guide_snapshot_id = v.id
from public.remediation_guide_versions v
where r.guide_snapshot_id is null
  and r.guide_source_id is not null
  and r.guide_scope = v.guide_scope
  and r.guide_source_id = v.guide_source_id
  and coalesce(r.guide_version,1) = v.guide_version;

create or replace function public.resolve_remediation_event_guide_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.guide_source_id is null then
    return new;
  end if;

  select v.id
    into new.guide_snapshot_id
  from public.remediation_guide_versions v
  where v.guide_scope = new.guide_scope
    and v.guide_source_id = new.guide_source_id
    and v.guide_version = coalesce(new.guide_version,1)
  limit 1;

  if new.guide_snapshot_id is null then
    raise exception
      'No immutable remediation guide snapshot for scope %, source %, version %',
      new.guide_scope, new.guide_source_id, new.guide_version;
  end if;

  return new;
end;
$$;

drop trigger if exists remediation_events_resolve_guide_snapshot
  on public.remediation_events;

create trigger remediation_events_resolve_guide_snapshot
before insert on public.remediation_events
for each row execute function public.resolve_remediation_event_guide_snapshot();
