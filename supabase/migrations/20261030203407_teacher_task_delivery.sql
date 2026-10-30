-- B.12.3.2 production integration; promoted unchanged SQL after isolated verification.
-- Filename generated with Supabase CLI 2.122.0; deployment remains gated by release acceptance.
create table public.teacher_task_versions (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid references public.teacher_task_drafts(id) on delete set null,
 draft_revision integer not null check(draft_revision>0),
 definition jsonb not null,
 source_file_id uuid references public.teacher_task_source_files(id),
 created_at timestamptz not null default clock_timestamp(),
 unique(draft_id,draft_revision),
 check(jsonb_typeof(definition)='object' and definition->>'schemaVersion'='teacher-task-v1')
);
create table public.teacher_task_deliveries (
 id uuid primary key default gen_random_uuid(),
 task_version_id uuid not null references public.teacher_task_versions(id),
 teacher_assignment_id uuid not null references public.teacher_assignments(id),
 created_by uuid not null references public.profiles(id),
 curriculum_release_id uuid not null, unit_id uuid not null,
 request_id uuid not null, request_hash text not null,
 recipient_mode text not null check(recipient_mode in ('class','selected')),
 recipient_count integer not null check(recipient_count between 1 and 500),
 created_at timestamptz not null default clock_timestamp(),
 unique(created_by,request_id),
 foreign key(curriculum_release_id,unit_id) references public.curriculum_release_units(curriculum_release_id,unit_id)
);
create index teacher_task_deliveries_context on public.teacher_task_deliveries(teacher_assignment_id,curriculum_release_id,unit_id,created_at desc,id);
create index teacher_task_deliveries_owner on public.teacher_task_deliveries(created_by);
create index teacher_task_deliveries_version on public.teacher_task_deliveries(task_version_id);
create index teacher_task_deliveries_release_unit on public.teacher_task_deliveries(curriculum_release_id,unit_id);
create index teacher_task_versions_source on public.teacher_task_versions(source_file_id);
create table public.teacher_task_delivery_recipients (
 delivery_id uuid not null references public.teacher_task_deliveries(id),
 enrollment_id uuid not null references public.institutional_class_enrollments(id),
 student_id uuid not null references public.profiles(id),
 primary key(delivery_id,enrollment_id)
);
create index teacher_task_delivery_recipients_student on public.teacher_task_delivery_recipients(student_id,delivery_id);
create index teacher_task_delivery_recipients_enrollment on public.teacher_task_delivery_recipients(enrollment_id);
create table public.teacher_task_delivery_events (
 id uuid primary key default gen_random_uuid(),
 delivery_id uuid not null references public.teacher_task_deliveries(id),
 actor_id uuid not null references public.profiles(id),
 event text not null check(event='sent'),
 created_at timestamptz not null default clock_timestamp()
);
create index teacher_task_delivery_events_delivery on public.teacher_task_delivery_events(delivery_id);
create index teacher_task_delivery_events_actor on public.teacher_task_delivery_events(actor_id);
alter table public.teacher_task_versions enable row level security;
alter table public.teacher_task_deliveries enable row level security;
alter table public.teacher_task_delivery_recipients enable row level security;
alter table public.teacher_task_delivery_events enable row level security;
revoke all on public.teacher_task_versions,public.teacher_task_deliveries,public.teacher_task_delivery_recipients,public.teacher_task_delivery_events from public,anon,authenticated,service_role;
create function private.teacher_task_delivery_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'task_delivery_immutable';end;$$;
create trigger teacher_task_version_immutable before update or delete on public.teacher_task_versions for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_delivery_immutable before update or delete on public.teacher_task_deliveries for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_delivery_recipient_immutable before update or delete on public.teacher_task_delivery_recipients for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_delivery_event_immutable before update or delete on public.teacher_task_delivery_events for each row execute function private.teacher_task_delivery_immutable();
create function private.teacher_task_delivery_public(a public.teacher_task_deliveries) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',a.id,'taskVersionId',a.task_version_id,'definition',v.definition,'draftRevision',v.draft_revision,
 'recipientMode',a.recipient_mode,'recipientCount',a.recipient_count,'sentAt',a.created_at,
 'recipients',(select coalesce(jsonb_agg(jsonb_build_object('enrollmentId',rp.enrollment_id,'studentName',coalesce(nullif(btrim(p.display_name),''),'Աշակերտ')) order by rp.enrollment_id),'[]') from public.teacher_task_delivery_recipients rp join public.profiles p on p.id=rp.student_id where rp.delivery_id=a.id))
 from public.teacher_task_versions v where v.id=a.task_version_id;
$$;
create function private.service_teacher_task_delivery(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare ctx jsonb; d public.teacher_task_drafts%rowtype; a public.teacher_task_deliveries%rowtype; v public.teacher_task_versions%rowtype;
 roster jsonb; stamp text; selected_ids uuid[]; request_hash text; result jsonb; entries jsonb; off integer; needle text; n integer;
 ta uuid:=(p_context->>'assignmentId')::uuid; rel uuid:=(p_context->>'curriculumReleaseId')::uuid; unt uuid:=(p_context->>'unitId')::uuid;
begin
 if jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object' or ta is null or rel is null or unt is null
 or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('assignmentId','curriculumReleaseId','unitId')) or p_action not in ('preview','assign','get','list') then raise exception 'assignment_request_invalid';end if;
 ctx:=private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,p_action in ('preview','assign'));
 if p_action='assign' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','expectedRevision','definition','requestId','rosterFingerprint','mode','enrollmentIds'))
  or p_payload->>'requestId' is null or p_payload->>'mode' is null or p_payload->>'mode' not in ('class','selected') or jsonb_typeof(p_payload->'definition') is distinct from 'object'
  or jsonb_typeof(p_payload->'enrollmentIds') is distinct from 'array' or jsonb_array_length(p_payload->'enrollmentIds')>500
  then raise exception 'assignment_request_invalid';end if;
  select coalesce(array_agg(x::uuid order by x::uuid),array[]::uuid[]) into selected_ids from jsonb_array_elements_text(p_payload->'enrollmentIds') x;
  if cardinality(selected_ids)<>(select count(distinct x) from unnest(selected_ids) x) or (p_payload->>'mode'='class' and cardinality(selected_ids)>0) or (p_payload->>'mode'='selected' and cardinality(selected_ids)=0) then raise exception 'assignment_recipients_invalid';end if;
  request_hash:=encode(sha256(convert_to(jsonb_build_array(p_context,p_payload-'enrollmentIds',to_jsonb(selected_ids))::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('teacher-task-send:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
  select * into a from public.teacher_task_deliveries where created_by=p_actor and request_id=(p_payload->>'requestId')::uuid;
  if found then
   if a.request_hash<>request_hash then raise exception 'assignment_conflict';end if;
   result:=jsonb_build_object('delivery',private.teacher_task_delivery_public(a),'replayed',true);
  end if;
 end if;
 if p_action in ('preview','assign') and result is null then
  select * into d from public.teacher_task_drafts where id=(p_payload->>'id')::uuid and created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt for update;
  if not found then raise exception 'task_draft_unavailable';end if;
  roster:=private.resource_assignment_roster(ta,ctx);stamp:=encode(sha256(convert_to(roster::text,'UTF8')),'hex');
  if p_action='preview' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','offset','search')) then raise exception 'assignment_request_invalid';end if;
   off:=coalesce((p_payload->>'offset')::integer,0);needle:=btrim(coalesce(p_payload->>'search',''));
   if off not between 0 and 100000 or length(needle)>120 then raise exception 'assignment_request_invalid';end if;
   select count(*) into n from jsonb_array_elements(roster) x where position(lower(needle) in lower(x->>'studentName'))>0;
   select coalesce(jsonb_agg(x order by x->>'enrollmentId'),'[]') into entries from (select x from jsonb_array_elements(roster) x where position(lower(needle) in lower(x->>'studentName'))>0 order by x->>'enrollmentId' offset off limit 50) q;
   result:=jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'definition',d.definition),'roster',entries,'total',jsonb_array_length(roster),'hasMore',n>off+50,'nextOffset',off+50,'rosterFingerprint',stamp,'alreadyAssigned',(select coalesce(jsonb_agg(rp.enrollment_id order by rp.enrollment_id),'[]') from public.teacher_task_delivery_recipients rp join public.teacher_task_deliveries old on old.id=rp.delivery_id join public.teacher_task_versions frozen on frozen.id=old.task_version_id where frozen.draft_id=d.id and frozen.draft_revision=d.revision and exists(select 1 from jsonb_array_elements(roster) member where (member->>'enrollmentId')::uuid=rp.enrollment_id)));
  else
   if (p_payload->>'expectedRevision')::integer is distinct from d.revision or p_payload->'definition' is distinct from d.definition or p_payload->>'rosterFingerprint' is distinct from stamp then raise exception 'assignment_preview_stale';end if;
   if p_payload->>'mode'='class' then select coalesce(array_agg((x->>'enrollmentId')::uuid order by x->>'enrollmentId'),array[]::uuid[]) into selected_ids from jsonb_array_elements(roster) x;end if;
   if cardinality(selected_ids)=0 or exists(select 1 from unnest(selected_ids) member where not exists(select 1 from jsonb_array_elements(roster) x where (x->>'enrollmentId')::uuid=member)) then raise exception 'assignment_recipients_invalid';end if;
   select * into v from public.teacher_task_versions where draft_id=d.id and draft_revision=d.revision;
   if not found then
    insert into public.teacher_task_versions(draft_id,draft_revision,definition,source_file_id) values(d.id,d.revision,d.definition,case when d.definition->'source'->>'kind'='pdf' then (d.definition->'source'->>'attachmentId')::uuid end) returning * into v;
   end if;
   if exists(select 1 from public.teacher_task_deliveries old join public.teacher_task_delivery_recipients rp on rp.delivery_id=old.id where old.task_version_id=v.id and rp.enrollment_id=any(selected_ids)) then raise exception 'assignment_already_assigned';end if;
   insert into public.teacher_task_deliveries(task_version_id,teacher_assignment_id,created_by,curriculum_release_id,unit_id,request_id,request_hash,recipient_mode,recipient_count)
   values(v.id,ta,p_actor,rel,unt,(p_payload->>'requestId')::uuid,request_hash,p_payload->>'mode',cardinality(selected_ids)) returning * into a;
   insert into public.teacher_task_delivery_recipients(delivery_id,enrollment_id,student_id) select a.id,(x->>'enrollmentId')::uuid,(x->>'studentId')::uuid from jsonb_array_elements(roster) x where (x->>'enrollmentId')::uuid=any(selected_ids);
   insert into public.teacher_task_delivery_events(delivery_id,actor_id,event) values(a.id,p_actor,'sent');
   if stamp<>encode(sha256(convert_to(private.resource_assignment_roster(ta,ctx)::text,'UTF8')),'hex') then raise exception 'assignment_preview_stale';end if;
   result:=jsonb_build_object('delivery',private.teacher_task_delivery_public(a),'replayed',false);
  end if;
 elsif p_action='get' then
  if p_payload<>jsonb_build_object('id',p_payload->'id') then raise exception 'assignment_request_invalid';end if;
  select * into a from public.teacher_task_deliveries where id=(p_payload->>'id')::uuid and created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt;
  if not found then raise exception 'assignment_unavailable';end if;
  result:=jsonb_build_object('delivery',private.teacher_task_delivery_public(a));
 elsif p_action='list' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'offset') then raise exception 'assignment_request_invalid';end if;
  off:=coalesce((p_payload->>'offset')::integer,0);if off not between 0 and 100000 then raise exception 'assignment_request_invalid';end if;
  select coalesce(jsonb_agg(entry order by created_at desc,id),'[]') into entries from (select id,created_at,jsonb_build_object('id',id,'taskVersionId',task_version_id,'recipientCount',recipient_count,'sentAt',created_at) entry from public.teacher_task_deliveries where created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt order by created_at desc,id offset off limit 51) q;
  result:=jsonb_build_object('deliveries',case when jsonb_array_length(entries)>50 then entries-50 else entries end,'hasMore',jsonb_array_length(entries)>50,'nextOffset',off+50);
 end if;
 perform private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,p_action in ('preview','assign'));
 return jsonb_build_object('version','teacher-task-delivery-v1','readOnly',ctx->'readOnly')||result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'assignment_request_invalid';
end;$$;
create function public.service_teacher_task_delivery(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_delivery(p_actor,p_auth,p_action,p_context,p_payload);$$;
revoke all on function private.teacher_task_delivery_immutable(),private.teacher_task_delivery_public(public.teacher_task_deliveries),private.service_teacher_task_delivery(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_delivery(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_teacher_task_delivery(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_delivery(uuid,uuid,text,jsonb,jsonb) to service_role;
