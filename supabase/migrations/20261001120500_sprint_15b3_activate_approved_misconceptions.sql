-- Sprint 15B.3 closure: activate only the three product-owner-approved
-- misconception definitions for the first Chapter II item family.
--
-- This migration deliberately does not publish items, create assessment pools,
-- or authorize learner delivery. Those release gates remain separate.

do $$
declare
  v_definition_count integer;
  v_mapping_count integer;
  v_item_mapping_count integer;
begin
  select count(*)
  into v_definition_count
  from public.misconceptions misconception
  join public.skills skill on skill.id = misconception.skill_id
  where skill.code = 'PHY7-U02-S02'
    and misconception.status in ('draft', 'active')
    and (
      (
        misconception.code = 'matter_as_continuous'
        and misconception.title_hy = 'Նյութը որպես հոծ միջավայր պատկերացնելը'
        and misconception.description_hy = 'Սովորողը ենթադրում է, որ նյութը հոծ է և մասնիկների միջև ազատ տարածություններ չկան։'
      )
      or (
        misconception.code = 'particle_identity_or_count_changes'
        and misconception.title_hy = 'Մասնիկների անհետացում, առաջացում կամ փոխակերպում ենթադրելը'
        and misconception.description_hy = 'Սովորողը ծավալի կամ չափի փոփոխությունը բացատրում է մասնիկների անհետացմամբ, առաջացմամբ կամ այլ մասնիկների փոխակերպմամբ։'
      )
      or (
        misconception.code = 'particle_size_increases_on_heating'
        and misconception.title_hy = 'Տաքացնելիս մասնիկների չափի մեծացում ենթադրելը'
        and misconception.description_hy = 'Սովորողը ջերմային ընդարձակումը վերագրում է մասնիկների չափի, ոչ թե նրանց միջև միջին հեռավորության մեծացմանը։'
      )
    );

  if v_definition_count <> 3 then
    raise exception '15B3_approved_misconception_definition_mismatch:%', v_definition_count;
  end if;

  select count(*)
  into v_mapping_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.misconceptions misconception on misconception.id = mapping.misconception_id
  join public.skills skill on skill.id = item.skill_id
  where skill.code = 'PHY7-U02-S02'
    and item.code in (
      'PHY7-U02-S02-I01',
      'PHY7-U02-S02-I02',
      'PHY7-U02-S02-I03',
      'PHY7-U02-S02-I04'
    )
    and misconception.code in (
      'matter_as_continuous',
      'particle_identity_or_count_changes',
      'particle_size_increases_on_heating'
    );

  if v_mapping_count <> 12 then
    raise exception '15B3_approved_misconception_mapping_count_mismatch:%', v_mapping_count;
  end if;

  select count(*)
  into v_item_mapping_count
  from (
    select item.id
    from public.items item
    join public.skills skill on skill.id = item.skill_id
    left join public.item_misconception_mappings mapping on mapping.item_id = item.id
    where skill.code = 'PHY7-U02-S02'
      and item.code in (
        'PHY7-U02-S02-I01',
        'PHY7-U02-S02-I02',
        'PHY7-U02-S02-I03',
        'PHY7-U02-S02-I04'
      )
    group by item.id
    having count(mapping.item_id) = 3
  ) fully_mapped_items;

  if v_item_mapping_count <> 4 then
    raise exception '15B3_item_mapping_distribution_mismatch:%', v_item_mapping_count;
  end if;

  update public.misconceptions misconception
  set
    status = 'active',
    updated_at = now()
  from public.skills skill
  where skill.id = misconception.skill_id
    and skill.code = 'PHY7-U02-S02'
    and misconception.code in (
      'matter_as_continuous',
      'particle_identity_or_count_changes',
      'particle_size_increases_on_heating'
    );

  select count(*)
  into v_definition_count
  from public.misconceptions misconception
  join public.skills skill on skill.id = misconception.skill_id
  where skill.code = 'PHY7-U02-S02'
    and misconception.status = 'active'
    and misconception.code in (
      'matter_as_continuous',
      'particle_identity_or_count_changes',
      'particle_size_increases_on_heating'
    );

  if v_definition_count <> 3 then
    raise exception '15B3_misconception_activation_failed:%', v_definition_count;
  end if;
end;
$$;
