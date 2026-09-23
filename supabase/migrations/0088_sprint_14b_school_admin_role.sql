-- Separate institution administration from the platform-wide admin role.
alter type public.user_role add value if not exists 'school_admin';
