-- Subject-neutral definition review. Existing definitions, mappings, question
-- approvals, guides, assessment pools and learner evidence are not backfilled.
create table public.misconception_review_events (
  id uuid primary key default gen_random_uuid(),
  misconception_id uuid not null references public.misconceptions(id) on delete restrict,
  revision_no integer not null check (revision_no > 0),
  action text not null check (action in ('save_draft','request_changes','approve')),
  actor_id uuid not null, -- immutable audit identity; account deletion must not erase history
  actor_role text not null check (actor_role in ('admin','content_admin')),
  actor_aal text not null check (actor_aal in ('aal1','aal2')),
  reason text not null check (char_length(btrim(reason)) between 3 and 2000),
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  mapping_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (misconception_id, revision_no)
);
alter table public.misconception_review_events enable row level security;
create policy misconception_history_service_only on public.misconception_review_events
  for all to service_role using (true) with check (true);
revoke all on public.misconception_review_events from public, anon, authenticated;
grant select, insert on public.misconception_review_events to service_role;
-- The existing application writes through service-only content APIs. Close the
-- direct table-write route so a staff JWT cannot bypass MFA or audit history.
revoke insert, update, delete on public.misconceptions from anon, authenticated;

create or replace function private.keep_misconception_review_history()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'misconception_history_immutable'; end;
$$;
create trigger misconception_history_immutable before update or delete
on public.misconception_review_events for each row
execute function private.keep_misconception_review_history();
revoke all on function private.keep_misconception_review_history() from public, anon, authenticated;

-- Only the parent definition is locked. Existing item writers keep their own
-- lock order; review never locks an item row, avoiding an item/definition cycle.
create or replace function private.lock_misconception_review_mapping()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_old uuid; v_new uuid;
begin
  if tg_op <> 'INSERT' then v_old := old.misconception_id; end if;
  if tg_op <> 'DELETE' then v_new := new.misconception_id; end if;
  perform 1 from public.misconceptions where id in (v_old, v_new) order by id for key share;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.lock_misconception_review_mapping() from public, anon, authenticated;
create trigger misconception_review_mapping_lock before insert or update or delete
on public.item_misconception_mappings for each row
execute function private.lock_misconception_review_mapping();

create view public.misconception_review_catalog_v with (security_invoker = true) as
select m.*, s.code as skill_code, s.name_hy as skill_name_hy,
  s.status::text as skill_status,
  sub.id as subject_id, sub.name_hy as subject_name_hy,
  g.id as grade_id, g.grade_number, g.label_hy as grade_label_hy,
  coalesce(ctx.units,'[]'::jsonb) as units,
  (select count(*) from public.item_misconception_mappings mm where mm.misconception_id=m.id) as mapping_count,
  coalesce(ev.revision_no,0) as review_revision, ev.action as last_action
from public.misconceptions m
join public.skills s on s.id=m.skill_id
join public.subjects sub on sub.id=s.subject_id
join public.grades g on g.id=s.grade_id
left join lateral (
 select jsonb_agg(distinct jsonb_build_object('id',u.id,'code',u.code,'titleHy',u.title_hy)) as units
 from public.skill_outcomes so
 join public.learning_outcomes lo on lo.id=so.learning_outcome_id
 join public.topics t on t.id=lo.topic_id join public.units u on u.id=t.unit_id
 where so.skill_id=s.id
) ctx on true
left join lateral (select revision_no,action from public.misconception_review_events
 where misconception_id=m.id order by revision_no desc limit 1) ev on true;
revoke all on public.misconception_review_catalog_v from public, anon, authenticated;
grant select on public.misconception_review_catalog_v to service_role;

create function public.service_list_misconception_reviews(p_filters jsonb default '{}')
returns jsonb language sql stable security invoker set search_path = '' as $$
with catalog as (select * from public.misconception_review_catalog_v), filtered as (
 select * from catalog c where
 (coalesce(p_filters->>'status','')='' or c.status=p_filters->>'status') and
 (coalesce(p_filters->>'subjectId','')='' or c.subject_id::text=p_filters->>'subjectId') and
 (coalesce(p_filters->>'gradeId','')='' or c.grade_id::text=p_filters->>'gradeId') and
 (coalesce(p_filters->>'skillId','')='' or c.skill_id::text=p_filters->>'skillId') and
 (coalesce(p_filters->>'unitId','')='' or c.units @> jsonb_build_array(jsonb_build_object('id',p_filters->>'unitId'))) and
 (coalesce(p_filters->>'search','')='' or strpos(lower(c.title_hy||' '||coalesce(c.description_hy,'')||' '||c.code||' '||c.skill_code),lower(p_filters->>'search'))>0)
), page as (
 select * from filtered order by skill_code,code,id
 limit 50 offset least(100000,greatest(0,coalesce((p_filters->>'offset')::integer,0)))
)
select jsonb_build_object(
 'definitions',coalesce((select jsonb_agg(to_jsonb(p)) from page p),'[]'::jsonb),
 'total',(select count(*) from filtered),'pageSize',50,
 'counts',(select jsonb_object_agg(status,n) from (select status,count(*) n from catalog group by status)x),
 'filters',jsonb_build_object(
   'subjects',coalesce((select jsonb_agg(x order by x->>'name') from (select distinct jsonb_build_object('id',subject_id,'name',subject_name_hy) x from catalog)y),'[]'::jsonb),
   'grades',coalesce((select jsonb_agg(x order by (x->>'number')::integer) from (select distinct jsonb_build_object('id',grade_id,'name',grade_label_hy,'number',grade_number) x from catalog)y),'[]'::jsonb),
   'units',coalesce((select jsonb_agg(x order by x->>'code') from (select distinct jsonb_array_elements(units) x from catalog)y),'[]'::jsonb),
   'skills',coalesce((select jsonb_agg(x order by x->>'code') from (select distinct jsonb_build_object('id',skill_id,'code',skill_code,'name',skill_name_hy) x from catalog)y),'[]'::jsonb)
 ));
$$;
revoke all on function public.service_list_misconception_reviews(jsonb) from public,anon,authenticated;
grant execute on function public.service_list_misconception_reviews(jsonb) to service_role;

create function public.service_get_misconception_review(p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_definition jsonb; v_mappings jsonb; v_history jsonb; v_token text;
begin
 select to_jsonb(c) into v_definition from public.misconception_review_catalog_v c where id=p_id;
 if v_definition is null then raise exception 'misconception_not_found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'itemId',i.id,'itemCode',i.code,'skillId',i.skill_id,'version',i.version_no,
   'promptHy',i.prompt_hy,'itemType',i.item_type,'itemStatus',i.status,
   'reviewStatus',i.review_status,'retiredAt',i.retired_at,
   'responseKey',mm.response_key,'mappingNote',mm.mapping_note,
   'responseText',o.content_hy
 ) order by i.code,i.id,mm.response_key),'[]'::jsonb) into v_mappings
 from public.item_misconception_mappings mm join public.items i on i.id=mm.item_id
 left join public.item_options o on o.item_id=i.id and o.option_key=mm.response_key
 where mm.misconception_id=p_id;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.revision_no desc),'[]'::jsonb) into v_history
 from public.misconception_review_events e where e.misconception_id=p_id;
 v_token := md5(jsonb_build_object('definition',v_definition,'mappings',v_mappings)::text);
 return jsonb_build_object('definition',v_definition,'mappings',v_mappings,'history',v_history,'expectedToken',v_token);
end;
$$;
revoke all on function public.service_get_misconception_review(uuid) from public,anon,authenticated;
grant execute on function public.service_get_misconception_review(uuid) to service_role;

create function public.service_review_misconception(
 p_id uuid,p_action text,p_expected_token text,p_title_hy text,p_description_hy text,
 p_reason text,p_actor_id uuid,p_session_id uuid,p_actor_aal text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_before jsonb; v_after jsonb; v_role text; v_revision integer;
begin
 if p_action not in ('save_draft','request_changes','approve') or p_action is null then raise exception 'invalid_action'; end if;
 select role::text into v_role from public.profiles where id=p_actor_id and account_status='active' for share;
 if v_role is null or v_role not in ('admin','content_admin') then raise exception 'content_authoring_role_required'; end if;
 if not public.service_validate_active_session(p_actor_id,p_session_id) then raise exception 'account_or_session_inactive'; end if;
 if p_actor_aal is null or p_actor_aal not in ('aal1','aal2') then raise exception 'invalid_assurance_level'; end if;
 if p_action='approve' and p_actor_aal<>'aal2' then raise exception 'mfa_required'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'review_reason_required'; end if;
 perform 1 from public.misconceptions where id=p_id for update;
 if not found then raise exception 'misconception_not_found'; end if;
 v_before:=public.service_get_misconception_review(p_id);
 if p_expected_token is null or p_expected_token is distinct from v_before->>'expectedToken' then raise exception 'stale_misconception_review'; end if;
 if v_before#>>'{definition,status}'<>'draft' then raise exception 'active_definition_read_only'; end if;
 if v_before#>>'{definition,skill_status}' in ('archived','retired') then raise exception 'inactive_skill'; end if;
 if exists(select 1 from jsonb_array_elements(v_before->'mappings') m where m->>'skillId' is distinct from v_before#>>'{definition,skill_id}') then raise exception 'misconception_mapping_scope_mismatch'; end if;
 if p_action='save_draft' then
   if char_length(btrim(coalesce(p_title_hy,''))) not between 3 and 240 or
      char_length(btrim(coalesce(p_description_hy,''))) not between 5 and 4000 then raise exception 'invalid_definition'; end if;
   if btrim(p_title_hy)=v_before#>>'{definition,title_hy}' and btrim(p_description_hy)=v_before#>>'{definition,description_hy}' then raise exception 'definition_unchanged'; end if;
   update public.misconceptions set title_hy=btrim(p_title_hy), description_hy=btrim(p_description_hy),updated_at=now() where id=p_id;
 elsif p_action='approve' then
   if char_length(btrim(coalesce(v_before#>>'{definition,title_hy}',''))) not between 3 and 240 or
      char_length(btrim(coalesce(v_before#>>'{definition,description_hy}',''))) not between 5 and 4000 then raise exception 'invalid_definition'; end if;
   update public.misconceptions set status='active',updated_at=now() where id=p_id;
 end if;
 v_after:=public.service_get_misconception_review(p_id);
 v_revision:=(v_before#>>'{definition,review_revision}')::integer+1;
 insert into public.misconception_review_events(misconception_id,revision_no,action,actor_id,actor_role,actor_aal,reason,before_snapshot,after_snapshot,mapping_snapshot)
 values(p_id,v_revision,p_action,p_actor_id,v_role,p_actor_aal,btrim(p_reason),v_before->'definition',
   (v_after->'definition') || jsonb_build_object('review_revision',v_revision,'last_action',p_action),v_before->'mappings');
 return public.service_get_misconception_review(p_id);
end;
$$;
revoke all on function public.service_review_misconception(uuid,text,text,text,text,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.service_review_misconception(uuid,text,text,text,text,text,uuid,uuid,text) to service_role;
