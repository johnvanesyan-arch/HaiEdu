-- Temporary 14A gate. 14B replaces this with controlled institutional enrollment.
-- Keep legacy class memberships exclusively on unscoped classes until that path
-- validates institutional membership, class assignment and invitation policy.
create function public.guard_legacy_class_membership_14a() returns trigger
language plpgsql set search_path = public as $$
declare v_school_id uuid;
begin
  select school_id into v_school_id from public.classes where id = new.class_id;
  if not found or v_school_id is not null then
    raise exception 'institutional_enrollment_not_ready' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger guard_legacy_class_membership_14a
before insert or update of class_id, student_id on public.class_memberships
for each row execute function public.guard_legacy_class_membership_14a();

-- Historical classes retain their original provenance. Institution mapping
-- requires an adjudicated migration rather than a mutable school_id update.
create function public.guard_class_identity_14a() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.school_id is distinct from old.school_id or
     new.academic_year_id is distinct from old.academic_year_id then
    raise exception 'class_academic_identity_immutable' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger guard_class_identity_14a
before update of school_id, academic_year_id on public.classes
for each row execute function public.guard_class_identity_14a();

revoke execute on function public.guard_legacy_class_membership_14a() from public, anon, authenticated;
revoke execute on function public.guard_class_identity_14a() from public, anon, authenticated;
