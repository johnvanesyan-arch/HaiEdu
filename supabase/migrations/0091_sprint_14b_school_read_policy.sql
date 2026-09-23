-- One scoped policy avoids duplicate permissive policy evaluation.
alter policy schools_admin_read on public.schools using (
  (private.current_user_active() and private.current_user_role() in ('admin','content_admin'))
  or private.current_school_admin_of_school_14b(id)
);
drop policy schools_own_admin_read_14b on public.schools;
