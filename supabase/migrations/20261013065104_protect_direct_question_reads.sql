-- Content approval is not permission to browse question prompts directly.
-- The former public rule protected only items in enabled active protected pools,
-- leaving approved but unallocated assessment candidates readable by learners.
-- All learner question delivery already uses authorized server-side endpoints.
-- Preserve existing staff and service-role access, and content/approval history.
drop policy if exists items_public_read_published on public.items;
drop policy if exists items_read_published on public.items;

create policy items_staff_read on public.items
for select to authenticated
using (
  private.current_user_role() = any (
    array['teacher'::public.user_role,'admin'::public.user_role,'content_admin'::public.user_role]
  )
);
