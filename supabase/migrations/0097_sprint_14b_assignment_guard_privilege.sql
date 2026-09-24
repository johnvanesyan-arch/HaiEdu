-- The subject grant table is read-only to service_role. Its assignment
-- validator locks a grant as the function owner to serialize with revocation.
alter function public.validate_teacher_assignment_14a() security definer;
