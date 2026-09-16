-- Human approval of a Sprint 11D candidate records the review evidence but must not
-- make the item learner-readable before the dedicated bank-activation migration.
-- This trigger is intentionally named after trg_items_mark_revision_required so it
-- runs later among BEFORE UPDATE triggers.

create or replace function private.hold_unactivated_11d_after_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.config->>'phase' = '11D'
     and new.review_status = 'approved'
     and new.status = 'published'::public.content_status
     and coalesce((new.config->>'pilot_ready')::boolean,false) is not true then
    new.status := 'review'::public.content_status;
    new.config := jsonb_set(new.config,'{humanReviewStatus}','"approved"'::jsonb,true);
    new.config := jsonb_set(new.config,'{technicalQaStatus}','"passed"'::jsonb,true);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_items_z_11d_review_hold on public.items;
create trigger trg_items_z_11d_review_hold
before update on public.items
for each row execute function private.hold_unactivated_11d_after_approval();
