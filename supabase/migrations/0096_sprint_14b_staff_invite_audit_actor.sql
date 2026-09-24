-- Invitation events identify the issuing administrator in the academic log.
create or replace function public.audit_academic_identity_14a() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare v jsonb := to_jsonb(new);
begin
  insert into public.academic_identity_events
    (table_name,row_id,operation,old_value,new_value,actor_id)
  values(tg_table_name,new.id,tg_op,to_jsonb(old),v,
    coalesce(nullif(v->>'ended_by','')::uuid,
             nullif(v->>'created_by','')::uuid,
             nullif(v->>'issued_by','')::uuid,auth.uid()));
  return new;
end $$;
