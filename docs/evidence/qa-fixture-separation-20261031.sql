-- Owner authorized this exact access correction on 2026-10-31.
-- Operator identity verified in HaiEdu's secure browser sign-in and account page.
-- No JWT claims, credentials, RLS, schema, trigger, account or content changes.
do $repair$
declare
 op constant uuid := 'df6c81bc-b92a-4a8e-aac5-cee830ad7840';
 mid constant uuid := '4b077073-9ad8-4c1f-a628-c8513b885588';
 eid constant uuid := '4647219d-5153-4c9e-97e4-0ebcf9bb485b';
 sid constant uuid := 'ae4cb419-f894-4d75-8e9f-3f08dc2fcdb7';
 school_a constant uuid := 'e88bb74c-ab42-41a5-8943-e33a3ac4c2e6';
 school_b constant uuid := 'dd92dacb-7889-47f3-8f00-ce9144e3ac4a';
 ses uuid; member_before jsonb; enrollment_before jsonb; member_after jsonb; enrollment_after jsonb;
 table_before jsonb := '{}'; table_after jsonb := '{}'; tab text; predicate text; n bigint; h text;
 audit_before text[]; audit_after text[]; enroll_ids uuid[];
begin
 perform set_config('lock_timeout','5s',true);
 perform set_config('statement_timeout','45s',true);
 perform 1 from public.profiles where id=op and role='school_admin' and account_status='active' for share;
 if not found or not private.active_school_admin_14b(op,school_a) then raise exception 'operator_scope_unavailable';end if;
 perform 1 from public.institutional_memberships where person_id=op and school_id=school_a
  and role='school_admin' and status='active' for share;
 if not found then raise exception 'operator_school_membership_unavailable';end if;
 select s.id into ses from auth.sessions s where s.user_id=op
  and public.service_validate_active_session(op,s.id) order by s.created_at desc limit 1 for share;
 if ses is null then raise exception 'operator_live_session_unavailable';end if;
 perform private.lock_teacher_offboarding_14b(mid);
 select to_jsonb(m) into member_before from public.institutional_memberships m where m.id=mid for update;
 if member_before is null or member_before->>'person_id'<>sid::text or member_before->>'school_id'<>school_a::text
  or member_before->>'role'<>'student' or member_before->>'status'<>'active' then raise exception 'approved_membership_scope_changed';end if;
 select array_agg(e.id order by e.id) into enroll_ids from public.institutional_class_enrollments e
  where e.student_membership_id=mid and e.status='active';
 if enroll_ids is distinct from array[eid] then raise exception 'approved_enrollment_scope_changed';end if;
 select to_jsonb(e) into enrollment_before from public.institutional_class_enrollments e where e.id=eid for update;
 if enrollment_before->>'student_id'<>sid::text or enrollment_before->>'school_id'<>school_a::text
  or enrollment_before->>'class_id'<>'2b2ab295-2ebd-47a1-888a-61622a9e89bf' then raise exception 'approved_class_scope_changed';end if;
 if exists(select 1 from public.teacher_assignments where teacher_membership_id=mid)
  then raise exception 'unexpected_teacher_assignment';end if;
 if (select count(*) from public.institutional_memberships where person_id=sid and school_id=school_b and role='student' and status='active')<>1
  or (select array_agg(id order by id) from public.institutional_class_enrollments where student_id=sid and school_id=school_b and status='active')
  is distinct from array['07871f94-c3b3-4763-97a2-129af0c66567'::uuid,'b78d7318-5627-4345-a190-665d5ea43b87'::uuid]
  then raise exception 'protected_school_b_scope_changed';end if;
 -- Preserve every other public row, including all learner work, classes and account profiles.
 for tab in select c.relname from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname='public' and c.relkind='r' and c.relname<>'academic_identity_events' order by c.relname loop
  predicate := case tab when 'institutional_memberships' then format('where t.id<>%L::uuid',mid)
   when 'institutional_class_enrollments' then format('where t.id<>%L::uuid',eid) else '' end;
  execute format($fingerprint$select count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) from public.%I t %s$fingerprint$,tab,predicate) into n,h;
  table_before := table_before||jsonb_build_object(tab,jsonb_build_object('count',n,'hash',h));
 end loop;
 select array_agg(md5(to_jsonb(e)::text) order by md5(to_jsonb(e)::text)) into audit_before from public.academic_identity_events e;
 if public.service_end_institutional_membership_14b(op,mid,'administrative') is distinct from true then raise exception 'audited_membership_end_refused';end if;
 select to_jsonb(m) into member_after from public.institutional_memberships m where m.id=mid;
 select to_jsonb(e) into enrollment_after from public.institutional_class_enrollments e where e.id=eid;
 if member_after->>'status'<>'ended' or enrollment_after->>'status'<>'ended'
  or member_after->>'ended_by'<>op::text or enrollment_after->>'ended_by'<>op::text
  or member_after->>'end_reason'<>'administrative' or enrollment_after->>'end_reason'<>'administrative'
  or (member_after-array['status','valid_to','ended_by','end_reason','updated_at']) is distinct from
     (member_before-array['status','valid_to','ended_by','end_reason','updated_at'])
  or (enrollment_after-array['status','valid_to','ended_by','end_reason','updated_at']) is distinct from
     (enrollment_before-array['status','valid_to','ended_by','end_reason','updated_at'])
  then raise exception 'membership_end_result_mismatch';end if;
 for tab in select c.relname from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname='public' and c.relkind='r' and c.relname<>'academic_identity_events' order by c.relname loop
  predicate := case tab when 'institutional_memberships' then format('where t.id<>%L::uuid',mid)
   when 'institutional_class_enrollments' then format('where t.id<>%L::uuid',eid) else '' end;
  execute format($fingerprint$select count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) from public.%I t %s$fingerprint$,tab,predicate) into n,h;
  table_after := table_after||jsonb_build_object(tab,jsonb_build_object('count',n,'hash',h));
 end loop;
 if table_before is distinct from table_after then raise exception 'unrelated_public_rows_changed';end if;
 select array_agg(md5(to_jsonb(e)::text) order by md5(to_jsonb(e)::text)) into audit_after from public.academic_identity_events e;
 if not coalesce(audit_before,'{}')<@coalesce(audit_after,'{}')
  or cardinality(audit_after)<>coalesce(cardinality(audit_before),0)+2 then raise exception 'audit_preservation_failed';end if;
 if not public.service_validate_active_session(op,ses) or not private.active_school_admin_14b(op,school_a)
  then raise exception 'operator_access_ended_before_commit';end if;
end;
$repair$;
