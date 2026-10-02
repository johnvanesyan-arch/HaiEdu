-- Sprint 15B.8 - make profiled-family approval and its QA fingerprint check
-- one atomic database operation.
--
-- Family mutations take the same transaction-scoped advisory lock as approval.
-- This prevents a sibling or template change from committing between the
-- fingerprint comparison, review record and approval update.

create or replace function public.lock_item_family_state_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_template_ids uuid[];
  v_template_id uuid;
begin
  if tg_op = 'INSERT' then
    v_template_ids := array[new.item_template_id];
  elsif tg_op = 'DELETE' then
    v_template_ids := array[old.item_template_id];
  else
    select array_agg(template_id order by template_id::text collate "C")
    into v_template_ids
    from (
      select distinct template_id
      from unnest(array[old.item_template_id, new.item_template_id]) as ids(template_id)
      where template_id is not null
    ) locked_templates;
  end if;

  foreach v_template_id in array coalesce(v_template_ids, array[]::uuid[])
  loop
    if v_template_id is not null then
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_template_id::text, 1508001)
      );
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.lock_item_family_state_mutation() from public;
revoke all on function public.lock_item_family_state_mutation() from anon;
revoke all on function public.lock_item_family_state_mutation() from authenticated;

drop trigger if exists lock_item_family_state_before_insert_delete on public.items;
create trigger lock_item_family_state_before_insert_delete
before insert or delete on public.items
for each row execute function public.lock_item_family_state_mutation();

drop trigger if exists lock_item_family_state_before_profile_change on public.items;
create trigger lock_item_family_state_before_profile_change
before update of item_template_id, config, version_no, retired_at on public.items
for each row execute function public.lock_item_family_state_mutation();

create or replace function public.lock_item_template_state_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(old.id::text, 1508001)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.lock_item_template_state_mutation() from public;
revoke all on function public.lock_item_template_state_mutation() from anon;
revoke all on function public.lock_item_template_state_mutation() from authenticated;

drop trigger if exists lock_item_template_state_before_profile_change on public.item_templates;
create trigger lock_item_template_state_before_profile_change
before update of template_version, generation_config or delete on public.item_templates
for each row execute function public.lock_item_template_state_mutation();

create or replace function public.approve_item_if_family_qa_current(
  p_item_id uuid,
  p_actor_id uuid,
  p_review_type text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items%rowtype;
  v_template public.item_templates%rowtype;
  v_qa public.item_qa_runs%rowtype;
  v_required_purposes text := '';
  v_family_members text := '';
  v_live_fingerprint text;
  v_stored_fingerprint text;
begin
  if p_actor_id is null then
    return jsonb_build_object('approved', false, 'error', 'reviewer_required');
  end if;

  select item.*
  into v_item
  from public.items item
  where item.id = p_item_id
  for update;

  if not found then
    return jsonb_build_object('approved', false, 'error', 'item_not_found');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_item.item_template_id::text, 1508001)
  );

  select template.*
  into v_template
  from public.item_templates template
  where template.id = v_item.item_template_id;

  if not found then
    return jsonb_build_object('approved', false, 'error', 'item_template_not_found');
  end if;

  select qa.*
  into v_qa
  from public.item_qa_runs qa
  where qa.item_id = v_item.id
    and qa.version_no = v_item.version_no
  order by qa.created_at desc, qa.id desc
  limit 1;

  if not found or not coalesce(v_qa.passed, false) then
    return jsonb_build_object(
      'approved', false,
      'error', 'technical_qa_must_pass_before_approval'
    );
  end if;

  if coalesce(v_template.generation_config->>'authoringProfileVersion', '') = 'haiedu-evidence-blueprint-v1' then
    select coalesce(string_agg(required.value, ',' order by required.ordinality), '')
    into v_required_purposes
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(v_template.generation_config->'requiredEvidencePurposes') = 'array'
          then v_template.generation_config->'requiredEvidencePurposes'
        else '[]'::jsonb
      end
    ) with ordinality as required(value, ordinality);

    select coalesce(
      string_agg(
        sibling.id::text || ':' || sibling.version_no::text || ':' || coalesce(sibling.config->>'evidencePurpose', ''),
        ',' order by sibling.id::text collate "C"
      ),
      ''
    )
    into v_family_members
    from public.items sibling
    where sibling.item_template_id = v_template.id
      and sibling.retired_at is null;

    v_live_fingerprint :=
      'haiedu-family-state-v1' || '|' ||
      v_template.id::text || '|' ||
      v_template.template_version::text || '|' ||
      coalesce(v_template.generation_config->>'authoringProfileVersion', '') || '|' ||
      coalesce(v_template.generation_config->>'evidenceBlueprintPolicy', '') || '|' ||
      v_required_purposes || '|' ||
      case when v_template.generation_config->'enforceUniqueEvidencePurposes' = 'true'::jsonb then '1' else '0' end || '|' ||
      v_family_members;

    v_stored_fingerprint := v_qa.details #>> '{evidenceBlueprintVerification,familyStateFingerprint}';

    if v_stored_fingerprint is null or v_stored_fingerprint <> v_live_fingerprint then
      return jsonb_build_object(
        'approved', false,
        'error', 'technical_qa_must_pass_before_approval',
        'detail', 'family_state_changed_since_qa',
        'requiresQaRerun', true
      );
    end if;
  end if;

  insert into public.item_reviews (
    item_id,
    version_no,
    reviewer_id,
    review_type,
    decision,
    notes
  ) values (
    v_item.id,
    v_item.version_no,
    p_actor_id,
    coalesce(nullif(pg_catalog.btrim(p_review_type), ''), 'content'),
    'approved',
    p_notes
  );

  update public.items
  set review_status = 'approved',
      last_reviewed_at = pg_catalog.now(),
      last_reviewed_by = p_actor_id,
      status = case
        when v_item.retired_at is null then 'published'::public.content_status
        else 'archived'::public.content_status
      end
  where id = v_item.id;

  return jsonb_build_object(
    'approved', true,
    'versionNo', v_item.version_no
  );
end;
$$;

revoke all on function public.approve_item_if_family_qa_current(uuid, uuid, text, text) from public;
revoke all on function public.approve_item_if_family_qa_current(uuid, uuid, text, text) from anon;
revoke all on function public.approve_item_if_family_qa_current(uuid, uuid, text, text) from authenticated;
grant execute on function public.approve_item_if_family_qa_current(uuid, uuid, text, text) to service_role;

