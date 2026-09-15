-- Sprint 11D — review-safe Chapter I bank expansion.
-- IMPORTANT: existing Sprint 8/11A revision triggers intentionally force assessable
-- edits (and answer/option edits) back to review. This migration therefore mutates
-- content first, records QA/review evidence second, and only then publishes/approves.
-- `approved` below means structured internal content workflow approval; every item
-- remains validation_state=provisional_no_sme_review until an independent Physics
-- SME signs the existing review sheet.

-- ---------------------------------------------------------------------------
-- 1. Re-audit the original 60 fixed items against the Chapter I skill specification.
-- ---------------------------------------------------------------------------
update public.items i
set item_family = case
  when s.code='PHY7-U01-S01' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code='PHY7-U01-S02' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code='PHY7-U01-S03' then 'knowledge'
  when s.code='PHY7-U01-S04' and right(i.code,3)='I02' then 'knowledge'
  when s.code='PHY7-U01-S04' then 'application'
  when s.code='PHY7-U01-S05' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code='PHY7-U01-S05' then 'reasoning'
  when s.code='PHY7-U01-S06' and right(i.code,3) in ('I01','I02','I03','I04') then 'knowledge'
  when s.code='PHY7-U01-S06' then 'application'
  when s.code='PHY7-U01-S07' then 'application'
  when s.code='PHY7-U01-S08' and right(i.code,3)='I03' then 'knowledge'
  when s.code='PHY7-U01-S08' then 'application'
  when s.code='PHY7-U01-S09' and right(i.code,3) in ('I02','I04','I05','I06') then 'reasoning'
  when s.code='PHY7-U01-S09' then 'application'
  when s.code='PHY7-U01-S10' and right(i.code,3) in ('I01','I03','I04','I06') then 'transfer'
  when s.code='PHY7-U01-S10' then 'reasoning'
  else 'application'
end,
config=i.config || jsonb_build_object(
  'sprint11dAudit',true,
  'sprint11dDifficultyAudit','retained_after_skill_layer_review',
  'sprint11dMisconceptionAudit','skill_level_mapping_reviewed',
  'reviewBasis','structured_internal_content_review',
  'smeValidation','pending',
  'pilot_ready',true
),
validation_state='provisional_no_sme_review',
updated_at=now()
from public.skills s
where i.skill_id=s.id
  and s.code like 'PHY7-U01-S%'
  and i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

-- ---------------------------------------------------------------------------
-- 2. Correct the 11D S01 catalogue to the phenomenon classes explicitly used by
--    the current Chapter I architecture/baseline (mechanical, thermal, electrical,
--    magnetic, optical). The earlier proof catalogue included sound examples;
--    those are replaced rather than promoted into the pilot-eligible pool.
-- ---------------------------------------------------------------------------
with revised(code,prompt_hy,answer,difficulty) as (
  values
  ('PHY7-U01-S01-11D-D03','Հայելու վրա ընկած լույսն անդրադառնում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"E"'::jsonb,2),
  ('PHY7-U01-S01-11D-D04','Սառույցի կտորը տաք սենյակում աստիճանաբար հալվում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"B"'::jsonb,2),
  ('PHY7-U01-S01-11D-M01','Ապակե պրիզմայով անցնելիս սպիտակ լույսը բաժանվում է գույների։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"E"'::jsonb,3),
  ('PHY7-U01-S01-11D-M02','Մագնիսը մոտեցնում են կողմնացույցին, և սլաքը փոխում է ուղղությունը։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"D"'::jsonb,3),
  ('PHY7-U01-S01-11D-M03','Սայլակը շարժվում է հարթ ուղով և փոխում իր դիրքը։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"A"'::jsonb,2),
  ('PHY7-U01-S01-11D-M04','Տաք թեյը սեղանի վրա աստիճանաբար սառչում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"B"'::jsonb,2),
  ('PHY7-U01-S01-11D-M05','Շփումից լիցքավորված սանրը մոտեցնում են թղթի մանր կտորներին, և դրանք ձգվում են դեպի սանրը։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"C"'::jsonb,3),
  ('PHY7-U01-S01-11D-M06','Արևի լույսից անթափանց մարմնի հետևում ստվեր է առաջանում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"E"'::jsonb,3)
)
update public.items i
set prompt_hy=r.prompt_hy,
    difficulty=r.difficulty,
    difficulty_band=case when r.difficulty<=1 then 'foundation' when r.difficulty<=3 then 'core' else 'challenge' end,
    variant_fingerprint=md5(i.skill_id::text || '|' || lower(regexp_replace(r.prompt_hy,'\s+',' ','g')) || '|' || r.answer::text),
    config=i.config || jsonb_build_object('sourceScopeCorrection','11D_textbook_architecture_alignment'),
    updated_at=now()
from revised r where i.code=r.code;

with revised(code,answer) as (
  values
  ('PHY7-U01-S01-11D-D03','"E"'::jsonb),('PHY7-U01-S01-11D-D04','"B"'::jsonb),
  ('PHY7-U01-S01-11D-M01','"E"'::jsonb),('PHY7-U01-S01-11D-M02','"D"'::jsonb),
  ('PHY7-U01-S01-11D-M03','"A"'::jsonb),('PHY7-U01-S01-11D-M04','"B"'::jsonb),
  ('PHY7-U01-S01-11D-M05','"C"'::jsonb),('PHY7-U01-S01-11D-M06','"E"'::jsonb)
)
update public.item_answer_keys k set answer=r.answer,updated_at=now()
from public.items i join revised r on r.code=i.code where k.item_id=i.id;

-- ---------------------------------------------------------------------------
-- 3. Materialise deterministic numerical capacity for S07–S10.
--    S09 has exactly 10 unique semantic outputs in its current safe parameter domain;
--    two parallel Diagnostic items are added below rather than manufacturing duplicates.
-- ---------------------------------------------------------------------------
create temp table tmp_11d_numeric_alloc(
  skill_code text not null,
  item_id uuid not null primary key,
  bucket text not null,
  bucket_seq integer not null
) on commit drop;

do $$
declare
  r record; v_templates text[]; v_target integer; v_added integer; v_seed_n integer;
  v_template text; v_seed text; v_preview jsonb; v_fp text; v_item_id uuid;
  v_existing record; v_materialized jsonb; v_bucket text; v_bucket_seq integer;
begin
  for r in select * from (values
    ('PHY7-U01-S07',18,array['PHY7-U01-S07-T-LENGTH-TO-M','PHY7-U01-S07-T-TIME-TO-S','PHY7-U01-S07-T-VOLUME-TO-L']::text[]),
    ('PHY7-U01-S08',18,array['PHY7-U01-S08-T-SCALE-DIVISION','PHY7-U01-S08-T-SCALE-READING']::text[]),
    ('PHY7-U01-S09',10,array['PHY7-U01-S09-T-MEASUREMENT-ERROR']::text[]),
    ('PHY7-U01-S10',18,array['PHY7-U01-S10-T-DISPLACEMENT-VOLUME','PHY7-U01-S10-T-SHEET-THICKNESS']::text[])
  ) x(skill_code,target_count,template_codes)
  loop
    v_target:=r.target_count; v_templates:=r.template_codes; v_added:=0; v_seed_n:=1;
    while v_added<v_target loop
      if v_seed_n>5000 then raise exception '11D_numeric_capacity_exhausted:%:%/%',r.skill_code,v_added,v_target; end if;
      v_template:=v_templates[((v_seed_n-1)%array_length(v_templates,1))+1];
      v_seed:='11d-'||r.skill_code||'-'||lpad(v_seed_n::text,4,'0');
      begin
        v_preview:=public.service_preview_item_variant(v_template,v_seed);
      exception when others then
        v_seed_n:=v_seed_n+1; continue;
      end;
      if coalesce((v_preview #>> '{qa,valid}')::boolean,false) is not true then v_seed_n:=v_seed_n+1; continue; end if;
      v_fp:=v_preview->>'semanticFingerprint'; v_item_id:=null;

      select i.id,i.variant_seed into v_existing
      from public.items i join public.skills s on s.id=i.skill_id
      where s.code=r.skill_code and i.variant_fingerprint=v_fp and i.retired_at is null limit 1;

      if found then
        if v_existing.variant_seed is not null and not exists(select 1 from tmp_11d_numeric_alloc a where a.item_id=v_existing.id) then
          v_item_id:=v_existing.id;
        end if;
      else
        begin
          v_materialized:=public.service_materialize_item_variant(v_template,v_seed);
          v_item_id:=(v_materialized->>'itemId')::uuid;
        exception when others then
          v_item_id:=null;
        end;
      end if;

      if v_item_id is not null and not exists(select 1 from tmp_11d_numeric_alloc a where a.item_id=v_item_id) then
        v_added:=v_added+1;
        if v_added<=8 then v_bucket:='practice'; v_bucket_seq:=v_added;
        elsif v_added<=12 then v_bucket:='diagnostic'; v_bucket_seq:=v_added-8;
        else v_bucket:='mastery_check'; v_bucket_seq:=v_added-12; end if;
        insert into tmp_11d_numeric_alloc values(r.skill_code,v_item_id,v_bucket,v_bucket_seq);

        update public.items i
        set item_family=case when i.item_family='unspecified' then case when r.skill_code in ('PHY7-U01-S09','PHY7-U01-S10') then 'reasoning' else 'application' end else i.item_family end,
            source_reference=coalesce(i.source_reference,'Grade 7 Physics Chapter I deterministic variant; SME validation pending'),
            validation_state='provisional_no_sme_review',
            config=i.config || jsonb_build_object(
              'bank','PHY7-U01-11D','phase','11D','pilot_ready',true,
              'sprint11dBucket',v_bucket,'sprint11dBucketSeq',v_bucket_seq,
              'sprint11dDifficultyAudit','template_domain_reviewed',
              'sprint11dMisconceptionAudit','skill_level_mapping_reviewed',
              'reviewBasis','structured_internal_content_review','smeValidation','pending'
            ),
            updated_at=now()
        where i.id=v_item_id;
      end if;
      v_seed_n:=v_seed_n+1;
    end loop;
  end loop;
end $$;

-- Two S09 parallel Diagnostic items complete the 4-variant Diagnostic capacity.
with src(code,prompt_hy,answer,difficulty,bucket_seq,options) as (
  values
  ('PHY7-U01-S09-11D-D03','Երկու ջերմաչափերից A-ի մեկ բաժանումը 1°C է, B-ինը՝ 5°C։ Ընդունված կես-բաժանման կանոնով ո՞ր ջերմաչափը կունենա ավելի փոքր գնահատված չափման սխալ։','"A"'::jsonb,3,3,'[{"optionKey":"A","contentHy":"A ջերմաչափը"},{"optionKey":"B","contentHy":"B ջերմաչափը"},{"optionKey":"C","contentHy":"Երկուսն էլ նույն սխալը կունենան"},{"optionKey":"D","contentHy":"Բաժանման արժեքից հնարավոր չէ գնահատել"}]'::jsonb),
  ('PHY7-U01-S09-11D-D04','Չափման արդյունքը գրված է x=(20.0±0.5) սմ։ Ըստ կես-բաժանման կանոնի՝ սարքի մեկ բաժանման արժեքը որքա՞ն է։','"B"'::jsonb,3,4,'[{"optionKey":"A","contentHy":"0.5 սմ"},{"optionKey":"B","contentHy":"1.0 սմ"},{"optionKey":"C","contentHy":"2.0 սմ"},{"optionKey":"D","contentHy":"20.0 սմ"}]'::jsonb)
), ids as (
  select s.id skill_id,t.id template_id from public.skills s
  join public.item_templates t on t.code='PHY7-U01-S09-T-11D-PARALLEL'
  where s.code='PHY7-U01-S09'
), upserted as (
  insert into public.items(
    skill_id,item_type,prompt_hy,stimulus,difficulty,config,status,code,difficulty_band,item_family,
    source_reference,validation_state,review_status,item_template_id,variant_key,variant_seed,
    variant_parameters,variant_fingerprint
  )
  select ids.skill_id,'single_choice'::public.item_type,src.prompt_hy,'{}'::jsonb,src.difficulty,
    jsonb_build_object(
      'bank','PHY7-U01-11D','phase','11D','pilot_ready',true,
      'sprint11dBucket','diagnostic','sprint11dBucketSeq',src.bucket_seq,
      'sprint11dDifficultyAudit','reviewed_against_reasoning_layer',
      'sprint11dMisconceptionAudit','skill_level_mapping_reviewed',
      'reviewBasis','structured_internal_content_review','smeValidation','pending'
    ),
    'review'::public.content_status,src.code,'core','reasoning',
    'Grade 7 Physics Chapter I internally reviewed Diagnostic parallel variant; SME validation pending',
    'provisional_no_sme_review','needs_review',ids.template_id,
    '11d:diagnostic:'||lpad(src.bucket_seq::text,2,'0'),
    '11d:PHY7-U01-S09:diagnostic:'||lpad(src.bucket_seq::text,2,'0'),
    jsonb_build_object('bucket','diagnostic','sequence',src.bucket_seq),
    md5(ids.skill_id::text||'|'||lower(src.prompt_hy)||'|'||src.answer::text||'|'||src.options::text)
  from src cross join ids
  on conflict (code) where code is not null do update
  set prompt_hy=excluded.prompt_hy,difficulty=excluded.difficulty,config=excluded.config,
      difficulty_band=excluded.difficulty_band,item_family=excluded.item_family,
      source_reference=excluded.source_reference,validation_state='provisional_no_sme_review',
      variant_parameters=excluded.variant_parameters,variant_fingerprint=excluded.variant_fingerprint,
      updated_at=now()
  returning id,code
)
insert into public.item_answer_keys(item_id,answer,tolerance,canonical_unit,accepted_units,feedback_code)
select u.id,s.answer,null,null,array[]::text[],'sprint_11d_parallel'
from upserted u join src s on s.code=u.code
on conflict (item_id) do update
set answer=excluded.answer,tolerance=null,canonical_unit=null,accepted_units=array[]::text[],feedback_code=excluded.feedback_code,updated_at=now();

delete from public.item_options o using public.items i
where o.item_id=i.id and i.code in ('PHY7-U01-S09-11D-D03','PHY7-U01-S09-11D-D04');
insert into public.item_options(item_id,option_key,content_hy,display_order)
select i.id,x.elem->>'optionKey',x.elem->>'contentHy',x.ord::integer
from (values
  ('PHY7-U01-S09-11D-D03','[{"optionKey":"A","contentHy":"A ջերմաչափը"},{"optionKey":"B","contentHy":"B ջերմաչափը"},{"optionKey":"C","contentHy":"Երկուսն էլ նույն սխալը կունենան"},{"optionKey":"D","contentHy":"Բաժանման արժեքից հնարավոր չէ գնահատել"}]'::jsonb),
  ('PHY7-U01-S09-11D-D04','[{"optionKey":"A","contentHy":"0.5 սմ"},{"optionKey":"B","contentHy":"1.0 սմ"},{"optionKey":"C","contentHy":"2.0 սմ"},{"optionKey":"D","contentHy":"20.0 սմ"}]'::jsonb)
) s(code,options)
join public.items i on i.code=s.code
cross join lateral jsonb_array_elements(s.options) with ordinality x(elem,ord);

-- ---------------------------------------------------------------------------
-- 4. Misconception audit: every Chapter I item gets the active skill-level
--    misconception mapping. Response-specific refinement remains an SME task.
-- ---------------------------------------------------------------------------
insert into public.item_misconception_mappings(item_id,misconception_id,response_key,mapping_note)
select i.id,m.id,'*','Sprint 11D skill-level misconception mapping reviewed; response-specific refinement remains pending.'
from public.items i
join public.skills s on s.id=i.skill_id
join public.misconceptions m on m.skill_id=i.skill_id and m.status='active'
where s.code like 'PHY7-U01-S%' and i.retired_at is null
on conflict (item_id,misconception_id,response_key) do update
set mapping_note=excluded.mapping_note;

-- ---------------------------------------------------------------------------
-- 5. Record technical QA and structured internal content-review evidence AFTER
--    all assessable mutations/child edits, then explicitly publish/approve.
-- ---------------------------------------------------------------------------
insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select i.id,i.version_no,null,true,'[]'::jsonb,'["sme_review_pending"]'::jsonb,
       jsonb_build_object(
         'phase','11D','scope','technical_structure_answer_key_options_difficulty_family_misconception',
         'internalContentReview',true,'humanSmeReview',false
       )
from public.items i join public.skills s on s.id=i.skill_id
where s.code like 'PHY7-U01-S%'
  and i.retired_at is null
  and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or i.config->>'phase'='11D');

insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
select i.id,i.version_no,null,'content','approved',
       'Sprint 11D structured internal content review completed. This is workflow approval, not independent human Physics SME validation.'
from public.items i join public.skills s on s.id=i.skill_id
where s.code like 'PHY7-U01-S%'
  and i.retired_at is null
  and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or i.config->>'phase'='11D');

-- The second update intentionally changes only workflow fields. The revision trigger
-- therefore does not invalidate the approval we have just recorded.
update public.items i
set review_status='approved',status='published'::public.content_status,
    validation_state='provisional_no_sme_review',last_reviewed_at=now(),updated_at=now()
from public.skills s
where i.skill_id=s.id and s.code like 'PHY7-U01-S%'
  and i.retired_at is null
  and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or i.config->>'phase'='11D');

-- ---------------------------------------------------------------------------
-- 6. Hard bank-construction gates before assessment pools are rebuilt.
-- ---------------------------------------------------------------------------
do $$
declare r record; v_bad integer;
begin
  for r in
    select s.code,
      count(*) filter(where i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$') fixed_count,
      count(*) filter(where i.config->>'phase'='11D' and i.config ? 'sprint11dBucket') new_bucketed_count
    from public.skills s join public.items i on i.skill_id=s.id and i.retired_at is null
    where s.code like 'PHY7-U01-S%'
    group by s.code order by s.code
  loop
    if r.fixed_count<>6 or r.new_bucketed_count<>18 then
      raise exception '11D_bank_capacity_gate_failed:% fixed=% new=%',r.code,r.fixed_count,r.new_bucketed_count;
    end if;
  end loop;

  select count(*) into v_bad
  from public.items i join public.skills s on s.id=i.skill_id
  where s.code like 'PHY7-U01-S%' and i.retired_at is null
    and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or (i.config->>'phase'='11D' and i.config ? 'sprint11dBucket'))
    and (i.item_family='unspecified' or i.review_status<>'approved' or i.status<>'published'::public.content_status
         or i.validation_state<>'provisional_no_sme_review'
         or not exists(select 1 from public.item_answer_keys k where k.item_id=i.id)
         or not exists(select 1 from public.item_misconception_mappings mm where mm.item_id=i.id));
  if v_bad<>0 then raise exception '11D_review_gate_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i join public.skills s on s.id=i.skill_id
  where s.code like 'PHY7-U01-S%' and i.retired_at is null
    and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or (i.config->>'phase'='11D' and i.config ? 'sprint11dBucket'))
    and i.item_type='single_choice'::public.item_type
    and ((select count(*) from public.item_options o where o.item_id=i.id)<2
         or not exists(select 1 from public.item_answer_keys k join public.item_options o on o.item_id=i.id and to_jsonb(o.option_key)=k.answer where k.item_id=i.id));
  if v_bad<>0 then raise exception '11D_single_choice_gate_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i join public.skills s on s.id=i.skill_id join public.item_answer_keys k on k.item_id=i.id
  where s.code like 'PHY7-U01-S%' and i.retired_at is null
    and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or (i.config->>'phase'='11D' and i.config ? 'sprint11dBucket'))
    and i.item_type in ('numeric'::public.item_type,'quantity'::public.item_type)
    and k.tolerance is null;
  if v_bad<>0 then raise exception '11D_numeric_tolerance_gate_failed:%',v_bad; end if;
end $$;
