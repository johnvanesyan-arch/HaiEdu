-- Correct the enum/text comparison in the deployed 0083 issue function.
do $$
declare definition text;
begin
  select pg_get_functiondef(
    'public.service_issue_institutional_invitation_14b(uuid,uuid,uuid,text,uuid,uuid,text,timestamptz)'::regprocedure
  ) into definition;
  if definition is null or
     position('v_recipient.role is distinct from p_role' in definition) = 0 then
    raise exception 'unexpected_issue_function_definition';
  end if;
  execute replace(definition,
    'v_recipient.role is distinct from p_role',
    'v_recipient.role::text is distinct from p_role');
end $$;
