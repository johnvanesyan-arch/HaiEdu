-- Sprint 11I follow-up: resolve registry findings from the post-migration advisor pass.

create index if not exists curriculum_source_documents_grade_idx
  on public.curriculum_source_documents(grade_id)
  where grade_id is not null;
create index if not exists curriculum_source_documents_verified_by_idx
  on public.curriculum_source_documents(verified_by)
  where verified_by is not null;
create index if not exists subject_program_source_bindings_reviewed_by_idx
  on public.subject_program_source_bindings(reviewed_by)
  where reviewed_by is not null;

drop policy if exists curriculum_authorities_write on public.curriculum_authorities;
create policy curriculum_authorities_insert on public.curriculum_authorities
for insert to authenticated
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
create policy curriculum_authorities_update on public.curriculum_authorities
for update to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
create policy curriculum_authorities_delete on public.curriculum_authorities
for delete to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));

drop policy if exists curriculum_source_documents_write on public.curriculum_source_documents;
create policy curriculum_source_documents_insert on public.curriculum_source_documents
for insert to authenticated
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
create policy curriculum_source_documents_update on public.curriculum_source_documents
for update to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
create policy curriculum_source_documents_delete on public.curriculum_source_documents
for delete to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));

drop policy if exists subject_program_source_bindings_write on public.subject_program_source_bindings;
create policy subject_program_source_bindings_insert on public.subject_program_source_bindings
for insert to authenticated
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
create policy subject_program_source_bindings_update on public.subject_program_source_bindings
for update to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
create policy subject_program_source_bindings_delete on public.subject_program_source_bindings
for delete to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));
