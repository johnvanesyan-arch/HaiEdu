-- Sprint 12.5Z — global MCQ option-presentation integrity foundation.
-- Canonical answer keys remain stable while learner-visible option order is persisted per session item.
-- Randomization is staged off in this migration so Edge Function rollout is backward-compatible.

create table if not exists private.assessment_presentation_configuration (
  config_key text primary key,
  enabled boolean not null default false,
  algorithm_version text not null,
  updated_at timestamptz not null default now()
);

insert into private.assessment_presentation_configuration(config_key,enabled,algorithm_version)
values ('mcq_option_order',false,'mcq-option-order-v1')
on conflict (config_key) do update
set algorithm_version=excluded.algorithm_version,
    updated_at=now();

create table if not exists private.learning_session_item_option_orders (
  session_item_id uuid primary key references public.learning_session_items(id) on delete cascade,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  item_version_no integer not null,
  canonical_option_order text[] not null,
  algorithm_version text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint learning_session_item_option_orders_min_options
    check (cardinality(canonical_option_order) >= 2)
);

create index if not exists idx_lsi_option_orders_student_item_created
  on private.learning_session_item_option_orders(student_id,item_id,created_at desc);

alter table private.learning_session_item_option_orders enable row level security;
alter table private.assessment_presentation_configuration enable row level security;

revoke all on table private.learning_session_item_option_orders from public,anon,authenticated;
revoke all on table private.assessment_presentation_configuration from public,anon,authenticated;
grant select,insert,update,delete on table private.learning_session_item_option_orders to service_role;
grant select on table private.assessment_presentation_configuration to service_role;

create or replace function private.generate_mcq_option_order(
  p_student_id uuid,
  p_item_id uuid
) returns table(option_order text[], algorithm_version text)
language plpgsql
volatile
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_version text := 'mcq-option-order-v1';
  v_order text[];
  v_previous text[];
  v_count integer;
  v_unique integer;
begin
  select c.enabled,c.algorithm_version
    into v_enabled,v_version
  from private.assessment_presentation_configuration c
  where c.config_key='mcq_option_order';

  select count(*),count(distinct o.option_key)
    into v_count,v_unique
  from public.item_options o
  where o.item_id=p_item_id;

  if v_count < 2 or v_unique <> v_count then
    raise exception 'invalid_mcq_option_set';
  end if;

  if coalesce(v_enabled,false) then
    select array_agg(o.option_key order by gen_random_uuid())
      into v_order
    from public.item_options o
    where o.item_id=p_item_id;

    select p.canonical_option_order
      into v_previous
    from private.learning_session_item_option_orders p
    where p.student_id=p_student_id
      and p.item_id=p_item_id
    order by p.created_at desc,p.session_item_id desc
    limit 1;

    -- Randomness may naturally reproduce the previous permutation.
    -- Rotate once in that collision case so consecutive exposures for the same
    -- learner/item never use the identical presentation when >1 option exists.
    if v_previous is not null
       and cardinality(v_order) > 1
       and v_order = v_previous then
      v_order := v_order[2:cardinality(v_order)] || v_order[1:1];
    end if;
  else
    select array_agg(o.option_key order by o.display_order,o.option_key)
      into v_order
    from public.item_options o
    where o.item_id=p_item_id;
    v_version := 'mcq-option-order-staged-v0';
  end if;

  return query select v_order,v_version;
end;
$$;

revoke all on function private.generate_mcq_option_order(uuid,uuid) from public,anon,authenticated;
grant execute on function private.generate_mcq_option_order(uuid,uuid) to service_role;

create or replace function private.capture_learning_session_item_option_order()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_student_id uuid;
  v_item_type text;
  v_item_version integer;
  v_order text[];
  v_algorithm text;
begin
  select ls.student_id into v_student_id
  from public.learning_sessions ls
  where ls.id=new.session_id;

  select i.item_type::text,i.version_no
    into v_item_type,v_item_version
  from public.items i
  where i.id=new.item_id;

  if v_student_id is null or v_item_type is null then
    raise exception 'session_item_option_context_missing';
  end if;

  if v_item_type <> 'single_choice' then
    return new;
  end if;

  select g.option_order,g.algorithm_version
    into v_order,v_algorithm
  from private.generate_mcq_option_order(v_student_id,new.item_id) g;

  insert into private.learning_session_item_option_orders(
    session_item_id,session_id,student_id,item_id,item_version_no,
    canonical_option_order,algorithm_version,created_at
  ) values (
    new.id,new.session_id,v_student_id,new.item_id,v_item_version,
    v_order,v_algorithm,clock_timestamp()
  )
  on conflict (session_item_id) do nothing;

  return new;
end;
$$;

revoke all on function private.capture_learning_session_item_option_order() from public,anon,authenticated;

drop trigger if exists learning_session_item_option_order_capture on public.learning_session_items;
create trigger learning_session_item_option_order_capture
after insert on public.learning_session_items
for each row
execute function private.capture_learning_session_item_option_order();

-- Preserve already-active, unanswered MCQs exactly as they could already have
-- been seen before this rollout. Do not fabricate presentation provenance for
-- answered historical evidence.
insert into private.learning_session_item_option_orders(
  session_item_id,session_id,student_id,item_id,item_version_no,
  canonical_option_order,algorithm_version,created_at
)
select
  lsi.id,lsi.session_id,ls.student_id,lsi.item_id,i.version_no,
  array_agg(o.option_key order by o.display_order,o.option_key),
  'legacy-canonical-v0',
  clock_timestamp()
from public.learning_session_items lsi
join public.learning_sessions ls on ls.id=lsi.session_id
join public.items i on i.id=lsi.item_id and i.item_type='single_choice'::public.item_type
join public.item_options o on o.item_id=i.id
where ls.status='active'
  and lsi.answered_at is null
  and not exists (
    select 1
    from private.learning_session_item_option_orders p
    where p.session_item_id=lsi.id
  )
group by lsi.id,lsi.session_id,ls.student_id,lsi.item_id,i.version_no
having count(*) >= 2;

create or replace function public.service_ensure_session_item_option_order(
  p_session_item_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_session_id uuid;
  v_student_id uuid;
  v_item_id uuid;
  v_item_type text;
  v_item_version integer;
  v_order text[];
  v_algorithm text;
begin
  select p.canonical_option_order,p.algorithm_version,p.item_version_no
    into v_order,v_algorithm,v_item_version
  from private.learning_session_item_option_orders p
  where p.session_item_id=p_session_item_id;

  if found then
    return jsonb_build_object(
      'canonicalOptionOrder',to_jsonb(v_order),
      'algorithmVersion',v_algorithm,
      'itemVersionNo',v_item_version
    );
  end if;

  select lsi.session_id,ls.student_id,lsi.item_id,i.item_type::text,i.version_no
    into v_session_id,v_student_id,v_item_id,v_item_type,v_item_version
  from public.learning_session_items lsi
  join public.learning_sessions ls on ls.id=lsi.session_id
  join public.items i on i.id=lsi.item_id
  where lsi.id=p_session_item_id
  for update of lsi;

  if not found then
    raise exception 'session_item_not_found';
  end if;
  if v_item_type <> 'single_choice' then
    return null;
  end if;

  select g.option_order,g.algorithm_version
    into v_order,v_algorithm
  from private.generate_mcq_option_order(v_student_id,v_item_id) g;

  insert into private.learning_session_item_option_orders(
    session_item_id,session_id,student_id,item_id,item_version_no,
    canonical_option_order,algorithm_version,created_at
  ) values (
    p_session_item_id,v_session_id,v_student_id,v_item_id,v_item_version,
    v_order,v_algorithm,clock_timestamp()
  )
  on conflict (session_item_id) do nothing;

  select p.canonical_option_order,p.algorithm_version,p.item_version_no
    into v_order,v_algorithm,v_item_version
  from private.learning_session_item_option_orders p
  where p.session_item_id=p_session_item_id;

  return jsonb_build_object(
    'canonicalOptionOrder',to_jsonb(v_order),
    'algorithmVersion',v_algorithm,
    'itemVersionNo',v_item_version
  );
end;
$$;

revoke all on function public.service_ensure_session_item_option_order(uuid) from public,anon,authenticated;
grant execute on function public.service_ensure_session_item_option_order(uuid) to service_role;

-- Learner-facing item delivery is now exclusively mediated by get-session-item.
-- Do not expose canonical option keys/order directly to learners or anonymous clients.
drop policy if exists item_options_public_read on public.item_options;
drop policy if exists item_options_read on public.item_options;
