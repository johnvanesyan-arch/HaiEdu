-- Sprint 11K follow-up: align FK indexes and remove redundant permissive reads.

create index if not exists curriculum_releases_activated_by_idx
  on public.curriculum_releases(activated_by);

create index if not exists learning_sessions_blueprint_release_idx
  on public.learning_sessions(assessment_blueprint_id, curriculum_release_id);

create index if not exists attempts_blueprint_release_idx
  on public.attempts(assessment_blueprint_id, curriculum_release_id);

create index if not exists exposure_events_blueprint_release_idx
  on public.student_item_exposure_events(assessment_blueprint_id, curriculum_release_id);

drop policy if exists curriculum_releases_write on public.curriculum_releases;
create policy curriculum_releases_insert on public.curriculum_releases
for insert to authenticated
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy curriculum_releases_update on public.curriculum_releases
for update to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy curriculum_releases_delete on public.curriculum_releases
for delete to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'curriculum_release_units', 'curriculum_release_outcomes',
    'curriculum_release_skills', 'curriculum_release_item_families'
  ] loop
    execute format('drop policy if exists %I_write on public.%I', v_table, v_table);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (
         (select private.current_user_role()) = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )', v_table, v_table
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (
         (select private.current_user_role()) = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       ) with check (
         (select private.current_user_role()) = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )', v_table, v_table
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (
         (select private.current_user_role()) = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )', v_table, v_table
    );
  end loop;
end;
$$;

drop policy if exists curriculum_release_gate_checks_write on public.curriculum_release_gate_checks;
create policy curriculum_release_gate_checks_insert on public.curriculum_release_gate_checks
for insert to authenticated
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy curriculum_release_gate_checks_update on public.curriculum_release_gate_checks
for update to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy curriculum_release_gate_checks_delete on public.curriculum_release_gate_checks
for delete to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

drop policy if exists assessment_blueprints_write on public.assessment_blueprints;
create policy assessment_blueprints_insert on public.assessment_blueprints
for insert to authenticated
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy assessment_blueprints_update on public.assessment_blueprints
for update to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy assessment_blueprints_delete on public.assessment_blueprints
for delete to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

drop policy if exists assessment_blueprint_items_write on public.assessment_blueprint_items;
create policy assessment_blueprint_items_insert on public.assessment_blueprint_items
for insert to authenticated
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy assessment_blueprint_items_update on public.assessment_blueprint_items
for update to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy assessment_blueprint_items_delete on public.assessment_blueprint_items
for delete to authenticated
using ((select private.current_user_role()) = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
