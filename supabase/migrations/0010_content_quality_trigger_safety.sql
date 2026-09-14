-- Sprint 8 follow-up: make parent-item dirty trigger safe for DELETE rows.
create or replace function private.mark_parent_item_revision_required()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare v_item_id uuid;
begin
  if tg_op = 'DELETE' then
    v_item_id := old.item_id;
  else
    v_item_id := new.item_id;
  end if;

  update public.items
  set review_status='needs_review',
      status=case when status='published' then 'review'::content_status else status end,
      updated_at=now()
  where id=v_item_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
