-- Sprint 12.5Z follow-up — governed semantic exception for order-dependent MCQs.
-- Default remains shuffle=true. Disabling requires explicit content rationale.

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
  v_item_config jsonb := '{}'::jsonb;
  v_shuffle_item boolean := true;
  v_rationale text;
begin
  select c.enabled,c.algorithm_version
    into v_enabled,v_version
  from private.assessment_presentation_configuration c
  where c.config_key='mcq_option_order';

  select coalesce(i.config,'{}'::jsonb)
    into v_item_config
  from public.items i
  where i.id=p_item_id;

  if not found then
    raise exception 'mcq_item_not_found';
  end if;

  v_shuffle_item := coalesce((v_item_config->>'shuffleOptions')::boolean,true);
  v_rationale := nullif(btrim(coalesce(v_item_config->>'optionOrderRationale','')),'');

  if not v_shuffle_item and v_rationale is null then
    raise exception 'shuffle_disabled_without_option_order_rationale';
  end if;

  select count(*),count(distinct o.option_key)
    into v_count,v_unique
  from public.item_options o
  where o.item_id=p_item_id;

  if v_count < 2 or v_unique <> v_count then
    raise exception 'invalid_mcq_option_set';
  end if;

  if coalesce(v_enabled,false) and v_shuffle_item then
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

    v_version := case
      when not v_shuffle_item then 'mcq-option-order-fixed-v1'
      else 'mcq-option-order-staged-v0'
    end;
  end if;

  return query select v_order,v_version;
end;
$$;

revoke all on function private.generate_mcq_option_order(uuid,uuid) from public,anon,authenticated;
grant execute on function private.generate_mcq_option_order(uuid,uuid) to service_role;
