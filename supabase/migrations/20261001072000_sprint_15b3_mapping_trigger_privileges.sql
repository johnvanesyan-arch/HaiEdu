-- Sprint 15B.3 security follow-up.
-- Trigger functions are internal database enforcement mechanisms and must not
-- be exposed as callable RPCs to anonymous or ordinary authenticated clients.

revoke all on function public.enforce_item_misconception_mapping_policy()
  from public;
revoke all on function public.enforce_item_misconception_mapping_policy()
  from anon;
revoke all on function public.enforce_item_misconception_mapping_policy()
  from authenticated;
grant execute on function public.enforce_item_misconception_mapping_policy()
  to service_role;

revoke all on function public.enforce_published_mapping_mutation_policy()
  from public;
revoke all on function public.enforce_published_mapping_mutation_policy()
  from anon;
revoke all on function public.enforce_published_mapping_mutation_policy()
  from authenticated;
grant execute on function public.enforce_published_mapping_mutation_policy()
  to service_role;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and routine_name in (
      'enforce_item_misconception_mapping_policy',
      'enforce_published_mapping_mutation_policy'
    )
    and grantee in ('PUBLIC', 'anon', 'authenticated');

  if v_bad <> 0 then
    raise exception '15B3_trigger_function_privilege_revoke_failed:%', v_bad;
  end if;
end $$;
