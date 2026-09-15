-- Sprint 11D: expand conceptual/reasoning skills with reviewed parallel variants.
-- All content remains validation_state=provisional_no_sme_review.

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select s.id,
       s.code || '-F-11D-PARALLEL',
       s.name_hy || ' — 11D զուգահեռ առաջադրանքներ',
       'Sprint 11D parallel item family',
       jsonb_build_object('phase','11D','reviewBasis','structured_internal_content_review','smeValidation','pending')
from public.skills s
where s.code in (
  'PHY7-U01-S01','PHY7-U01-S02','PHY7-U01-S03','PHY7-U01-S04',
  'PHY7-U01-S05','PHY7-U01-S06','PHY7-U01-S09'
)
on conflict (code) do update
set name_hy=excluded.name_hy,
    description=excluded.description,
    metadata=public.item_families.metadata || excluded.metadata,
    updated_at=now();

insert into public.item_templates(item_family_id, code, template_kind, template_version, generation_config, status)
select f.id,
       s.code || '-T-11D-PARALLEL',
       'parallel',
       1,
       jsonb_build_object('phase','11D','generator','reviewed_catalog_concrete_v1','skillCode',s.code),
       'active'
from public.skills s
join public.item_families f
  on f.skill_id=s.id and f.code=s.code || '-F-11D-PARALLEL'
where s.code in (
  'PHY7-U01-S01','PHY7-U01-S02','PHY7-U01-S03','PHY7-U01-S04',
  'PHY7-U01-S05','PHY7-U01-S06','PHY7-U01-S09'
)
on conflict (code) do update
set generation_config=excluded.generation_config,
    status='active',
    updated_at=now();

create or replace function private.insert_11d_parallel_item(
  p_skill_code text,
  p_bucket text,
  p_bucket_seq integer,
  p_item_type public.item_type,
  p_prompt_hy text,
  p_answer jsonb,
  p_difficulty integer,
  p_item_family text,
  p_options jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_skill_id uuid;
  v_template_id uuid;
  v_item_id uuid;
  v_bucket_code text;
  v_code text;
  v_fingerprint text;
begin
  if p_bucket not in ('practice','diagnostic','mastery_check') then
    raise exception 'invalid_11d_bucket';
  end if;
  if p_bucket_seq < 1 then raise exception 'invalid_11d_bucket_seq'; end if;
  if p_difficulty < 1 or p_difficulty > 5 then raise exception 'invalid_11d_difficulty'; end if;

  select s.id,t.id into v_skill_id,v_template_id
  from public.skills s
  join public.item_templates t on t.code=s.code || '-T-11D-PARALLEL'
  where s.code=p_skill_code and t.status='active';
  if v_skill_id is null or v_template_id is null then raise exception '11d_template_missing:%',p_skill_code; end if;

  v_bucket_code := case p_bucket when 'practice' then 'P' when 'diagnostic' then 'D' else 'M' end;
  v_code := p_skill_code || '-11D-' || v_bucket_code || lpad(p_bucket_seq::text,2,'0');
  v_fingerprint := md5(v_skill_id::text || '|' || lower(regexp_replace(p_prompt_hy,'\\s+',' ','g')) || '|' || p_answer::text || '|' || coalesce(p_options,'[]'::jsonb)::text);

  insert into public.items(
    skill_id,item_type,prompt_hy,prompt_en,stimulus,difficulty,config,status,code,
    difficulty_band,item_family,source_reference,validation_state,review_status,
    item_template_id,variant_key,variant_seed,variant_parameters,variant_fingerprint,last_reviewed_at
  ) values (
    v_skill_id,p_item_type,p_prompt_hy,null,'{}'::jsonb,p_difficulty,
    jsonb_build_object(
      'bank','PHY7-U01-11D','pilot_ready',true,'phase','11D',
      'assessmentBucket',p_bucket,'sprint11dBucket',p_bucket,'sprint11dBucketSeq',p_bucket_seq,
      'reviewBasis','structured_internal_content_review','smeValidation','pending',
      'official_2026_outcome_verified',false
    ),
    'published'::public.content_status,v_code,
    case when p_difficulty<=1 then 'foundation' when p_difficulty<=3 then 'core' else 'challenge' end,
    p_item_family,
    'Grade 7 Physics Chapter I skill map; internally reviewed parallel variant; SME validation pending',
    'provisional_no_sme_review','approved',v_template_id,
    '11d:' || p_bucket || ':' || lpad(p_bucket_seq::text,2,'0'),
    '11d:' || p_skill_code || ':' || p_bucket || ':' || lpad(p_bucket_seq::text,2,'0'),
    jsonb_build_object('skillCode',p_skill_code,'bucket',p_bucket,'sequence',p_bucket_seq),
    v_fingerprint,now()
  )
  on conflict (code) where code is not null do update
  set prompt_hy=excluded.prompt_hy,
      difficulty=excluded.difficulty,
      config=excluded.config,
      status='published'::public.content_status,
      difficulty_band=excluded.difficulty_band,
      item_family=excluded.item_family,
      source_reference=excluded.source_reference,
      validation_state='provisional_no_sme_review',
      review_status='approved',
      variant_parameters=excluded.variant_parameters,
      variant_fingerprint=excluded.variant_fingerprint,
      last_reviewed_at=now(),
      updated_at=now()
  returning id into v_item_id;

  insert into public.item_answer_keys(item_id,answer,tolerance,canonical_unit,accepted_units,feedback_code)
  values(v_item_id,p_answer,null,null,array[]::text[],'sprint_11d_parallel')
  on conflict (item_id) do update
  set answer=excluded.answer,tolerance=null,canonical_unit=null,accepted_units=array[]::text[],
      feedback_code=excluded.feedback_code,updated_at=now();

  delete from public.item_options where item_id=v_item_id;
  if jsonb_typeof(coalesce(p_options,'[]'::jsonb))='array' then
    insert into public.item_options(item_id,option_key,content_hy,display_order)
    select v_item_id,x.elem->>'optionKey',x.elem->>'contentHy',x.ord::integer
    from jsonb_array_elements(coalesce(p_options,'[]'::jsonb)) with ordinality x(elem,ord);
  end if;

  insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
  select v_item_id,i.version_no,null,true,'[]'::jsonb,'["sme_review_pending"]'::jsonb,
         jsonb_build_object('phase','11D','scope','technical_structure_and_internal_content_review','humanSmeReview',false)
  from public.items i where i.id=v_item_id;

  insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
  select v_item_id,i.version_no,null,'content','approved',
         'Sprint 11D structured internal content review completed; this is not human SME validation.'
  from public.items i where i.id=v_item_id;

  return v_item_id;
end;
$$;

-- S01 — physical phenomena: 18 parallel variants.
do $$
declare
  prompts text[] := array[
    'Գնդակը գլորվում է հատակով։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Քարը ընկնում է գետնին։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Ճոճանակը տատանվում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Սառույցը հալվում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Ջուրը եռում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Մետաղե գդալը տաքանում է տաք ջրում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Էլեկտրական լամպով հոսանք է անցնում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Սանրելուց հետո լիցքավորված սանրը ձգում է թղթի փոքր կտորները։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Կայծ է առաջանում երկու լիցքավորված մարմինների միջև։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Կողմնացույցի սլաքը շեղվում է մագնիսի մոտ։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Մագնիսը ձգում է երկաթե մեխը։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Երկու մագնիսների նույնանուն բևեռները վանում են միմյանց։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Հայելուց լույսն անդրադառնում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Ապակե պրիզմայով անցնելիս սպիտակ լույսը բաժանվում է գույների։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Արևի լույսից պատին ստվեր է առաջանում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Լարված լարը թրթռում է և ձայն է առաջացնում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Զանգը հարվածից հետո ձայն է արձակում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։',
    'Որոտի ձայնը լսվում է կայծակից հետո։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։'
  ];
  answers text[] := array['A','A','A','B','B','B','C','C','C','D','D','D','E','E','E','F','F','F'];
  opts jsonb := '[{"optionKey":"A","contentHy":"Մեխանիկական"},{"optionKey":"B","contentHy":"Ջերմային"},{"optionKey":"C","contentHy":"Էլեկտրական"},{"optionKey":"D","contentHy":"Մագնիսական"},{"optionKey":"E","contentHy":"Օպտիկական"},{"optionKey":"F","contentHy":"Ձայնային"}]'::jsonb;
  i integer; bucket text; bseq integer;
begin
  for i in 1..18 loop
    bucket := case when i<=8 then 'practice' when i<=12 then 'diagnostic' else 'mastery_check' end;
    bseq := case when i<=8 then i when i<=12 then i-8 else i-12 end;
    perform private.insert_11d_parallel_item('PHY7-U01-S01',bucket,bseq,'single_choice'::public.item_type,prompts[i],to_jsonb(answers[i]),case when i in (8,9,12,14) then 3 else 2 end,'application',opts);
  end loop;
end $$;

-- S02 — body / material / phenomenon classification.
do $$
declare
  terms text[] := array['գդալ','ապակե բաժակ','գնդակ','գիրք','մեխ','քանոն','պղինձ','ապակի','երկաթ','պլաստիկ','ջուր','փայտ','սառույցի հալվելը','մարմնի շարժումը','ջրի տաքանալը','լույսի անդրադարձը','ջրի գոլորշիացումը','ջրի սառչելը'];
  answers text[] := array['A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','C','C'];
  opts jsonb := '[{"optionKey":"A","contentHy":"Ֆիզիկական մարմին"},{"optionKey":"B","contentHy":"Նյութ"},{"optionKey":"C","contentHy":"Ֆիզիկական երևույթ"}]'::jsonb;
  i integer; bucket text; bseq integer; prompt text;
begin
  for i in 1..18 loop
    bucket := case when i<=8 then 'practice' when i<=12 then 'diagnostic' else 'mastery_check' end;
    bseq := case when i<=8 then i when i<=12 then i-8 else i-12 end;
    prompt := '«' || terms[i] || '» օրինակը հիմնականում ո՞ր կատեգորիային է պատկանում։';
    perform private.insert_11d_parallel_item('PHY7-U01-S02',bucket,bseq,'single_choice'::public.item_type,prompt,to_jsonb(answers[i]),case when i<=12 then 2 else 3 end,'application',opts);
  end loop;
end $$;

-- S03 — scientists and Armenian physicists. New variants deliberately reuse only facts already present in the source-backed baseline bank.
do $$
declare
  prompts text[] := array[
    'Գալիլեո Գալիլեյը դասագրքում ներկայացված է որպես բնության հետազոտման փորձարարական մեթոդի հիմնադիր։',
    'Անանիա Շիրակացին գիտականորեն բացատրել է Արեգակի և Լուսնի խավարումները։',
    'Իսահակ Նյուտոնը դասագրքում ներկայացված է որպես դասական մեխանիկայի հիմնադիր։',
    'Մայքլ Ֆարադեյը երկարատև փորձերի արդյունքում հայտնաբերել է մագնիսի միջոցով էլեկտրական հոսանք ստանալու երևույթը։',
    'Ալիխանյան եղբայրների ջանքերով 1942 թ. հիմնադրվել է Արագածի տիեզերական ճառագայթների ուսումնասիրման կայանը։',
    'Վիկտոր Համբարձումյանի նախաձեռնությամբ և ղեկավարությամբ հիմնադրվել է Բյուրականի աստղադիտարանը։',
    'Դասագրքում բնության հետազոտման փորձարարական մեթոդի հիմնադիր է ներկայացված Իսահակ Նյուտոնը։',
    'Արեգակի և Լուսնի խավարումների գիտական բացատրությունը դասագրքում վերագրվում է Մայքլ Ֆարադեյին։',
    'Դասական մեխանիկայի հիմնադիր է ներկայացված Գալիլեո Գալիլեյը։',
    'Մագնիսի միջոցով էլեկտրական հոսանք ստանալու երևույթի հայտնաբերումը դասագրքում կապվում է Մայքլ Ֆարադեյի հետ։',
    'Արագածի տիեզերական ճառագայթների ուսումնասիրման կայանի հիմնադրումը դասագրքում կապվում է Ալիխանյան եղբայրների հետ։',
    'Բյուրականի աստղադիտարանի հիմնադրումը դասագրքում կապվում է Վիկտոր Համբարձումյանի հետ։',
    'Գալիլեո Գալիլեյի մասին տվյալ հատվածում շեշտվում է փորձարարական մեթոդի զարգացումը։',
    'Անանիա Շիրակացու մասին տվյալ հատվածում նշվում է Արեգակի և Լուսնի խավարումների գիտական բացատրությունը։',
    'Իսահակ Նյուտոնի մասին տվյալ հատվածում շեշտվում է դասական մեխանիկայի հիմնադրումը։',
    'Մայքլ Ֆարադեյի մասին տվյալ հատվածում նշվում է մագնիսով էլեկտրական հոսանք ստանալու երևույթի հայտնաբերումը։',
    'Ալիխանյան եղբայրների մասին տվյալ հատվածում նշվում է Արագածի կայանի հիմնադրումը 1942 թ.։',
    'Վիկտոր Համբարձումյանի մասին տվյալ հատվածում նշվում է Բյուրականի աստղադիտարանի հիմնադրումը։'
  ];
  answers boolean[] := array[true,true,true,true,true,true,false,false,false,true,true,true,true,true,true,true,true,true];
  i integer; bucket text; bseq integer;
begin
  for i in 1..18 loop
    bucket := case when i<=8 then 'practice' when i<=12 then 'diagnostic' else 'mastery_check' end;
    bseq := case when i<=8 then i when i<=12 then i-8 else i-12 end;
    perform private.insert_11d_parallel_item('PHY7-U01-S03',bucket,bseq,'true_false'::public.item_type,prompts[i],to_jsonb(answers[i]),case when i<=12 then 2 else 3 end,'knowledge','[]'::jsonb);
  end loop;
end $$;

-- S04 — observation vs experiment.
do $$
declare
  scenarios text[] := array[
    'Աշակերտը երեք երեկո անընդմեջ գրանցում է Լուսնի տեսանելի ձևը՝ առանց պայմանները փոխելու։',
    'Աշակերտը փոխում է ճոճանակի թելի երկարությունը և յուրաքանչյուր դեպքում չափում տատանման ժամանակը։',
    'Աշակերտը լուսամուտի մոտ ամեն ժամ գրանցում է ստվերի երկարությունը՝ առանց պայմանները փոխելու։',
    'Աշակերտը նույն քանակի ջուրը տաքացնում է երկու տարբեր հզորության ջեռուցիչներով և համեմատում տաքացման ժամանակը։',
    'Աստղագետը մի քանի գիշեր շարունակ գրանցում է մոլորակի դիրքը՝ չփոխելով երևույթի պայմանները։',
    'Աշակերտը տարբեր մակերևույթների վրա նույն խաղալիք մեքենան բաց է թողնում նույն թեքությունից և համեմատում անցած ճանապարհը։',
    'Աշակերտը դիտում է անձրևից հետո առաջացած ծիածանը և նկարագրում գույները։',
    'Աշակերտը փոխում է լույսի աղբյուրի հեռավորությունը և չափում ստվերի երկարությունը։',
    'Աշակերտը պատուհանից հետևում է ձյան տեղալուն և գրանցում դիտածը։',
    'Աշակերտը նույն գնդակը բաց է թողնում տարբեր բարձրություններից և չափում ընկնելու ժամանակը։',
    'Աշակերտը հեռադիտակով հետևում է Լուսնի խավարմանը՝ չփոխելով պայմանները։',
    'Աշակերտը միևնույն քանակի շաքարը լուծում է տարբեր ջերմաստիճանի ջրում և չափում լուծման ժամանակը։',
    'Աշակերտը դիտում է, թե ինչպես է առավոտյան մառախուղը աստիճանաբար անհետանում։',
    'Աշակերտը տարբեր երկարության լարեր է թրթռացնում և համեմատում ստացվող ձայնը։',
    'Աշակերտը մեկ շաբաթ ամեն օր նույն ժամին գրանցում է արտաքին օդի ջերմաստիճանը։',
    'Աշակերտը տարբեր նյութերից պատրաստված ձողերը նույն պայմաններում տաքացնում է և համեմատում ջերմաստիճանի փոփոխությունը։',
    'Աշակերտը գետի ափից հետևում է ջրի հոսքին և նկարագրում այն։',
    'Աշակերտը փոխում է թեք հարթության անկյունը և չափում սայլակի անցած ճանապարհը նույն ժամանակում։'
  ];
  answers text[] := array['A','B','A','B','A','B','A','B','A','B','A','B','A','B','A','B','A','B'];
  opts jsonb := '[{"optionKey":"A","contentHy":"Դիտում"},{"optionKey":"B","contentHy":"Փորձ"}]'::jsonb;
  i integer; bucket text; bseq integer;
begin
  for i in 1..18 loop
    bucket := case when i<=8 then 'practice' when i<=12 then 'diagnostic' else 'mastery_check' end;
    bseq := case when i<=8 then i when i<=12 then i-8 else i-12 end;
    perform private.insert_11d_parallel_item('PHY7-U01-S04',bucket,bseq,'single_choice'::public.item_type,scenarios[i] || ' Սա հիմնականում ո՞ր մեթոդն է։',to_jsonb(answers[i]),case when i%3=0 then 3 else 2 end,'application',opts);
  end loop;
end $$;

-- S05 — hypothesis / experiment / data / conclusion chain.
do $$
declare
  descriptions text[] := array[
    '«Ենթադրում եմ, որ ջրի ավելի բարձր ջերմաստիճանը կկրճատի շաքարի լուծման ժամանակը»։',
    'Աշակերտը նույն քանակի շաքարը լուծում է տարբեր ջերմաստիճանի ջրում և չափում ժամանակը։',
    'Գրանցվել է՝ 20°C ջրում լուծումը տևեց 90 վրկ, իսկ 60°C ջրում՝ 30 վրկ։',
    'Տվյալներից ձևակերպվում է՝ տվյալ պայմաններում տաք ջրում շաքարը ավելի արագ լուծվեց։',
    '«Կարծում եմ՝ ավելի երկար ճոճանակի տատանման ժամանակը մեծ կլինի»։',
    'Աշակերտը փոխում է միայն ճոճանակի թելի երկարությունը և յուրաքանչյուր դեպքում չափում տատանման ժամանակը։',
    'Չափումների աղյուսակում գրանցված են երեք տարբեր երկարությունների համար ստացված ժամանակները։',
    'Չափումների հիման վրա ձևակերպվում է՝ թելի երկարության մեծացման դեպքում չափված տատանման ժամանակը մեծացավ։',
    '«Հնարավոր է՝ մուգ մակերևույթը նույն լամպի տակ ավելի արագ տաքանա»։',
    'Աշակերտը նույն նյութից երկու մակերևույթ է վերցնում, փոխում միայն գույնը և չափում ջերմաստիճանի փոփոխությունը։',
    'Աղյուսակում գրանցվում են երկու մակերևույթների ջերմաստիճանները յուրաքանչյուր րոպեի համար։',
    'Տվյալներից ձևակերպվում է՝ փորձի պայմաններում մուգ մակերևույթը ավելի արագ տաքացավ։',
    '«Կարծում եմ՝ մագնիսը կձգի միայն երկաթ պարունակող առարկաները»։',
    'Աշակերտը նույն պայմաններում փորձում է մագնիսը հայտնի կազմով տարբեր առարկաների վրա։',
    'Գրանցվում է, թե որ առարկաները ձգվեցին և որոնք՝ ոչ։',
    'Գրանցված արդյունքներից ձևակերպվում է՝ տվյալ նմուշների մեջ ձգվեցին երկաթ պարունակող առարկաները։',
    '«Կարծում եմ՝ թեքության մեծ անկյան դեպքում սայլակը նույն ճանապարհը կանցնի ավելի կարճ ժամանակում»։',
    'Աշակերտը նույն սայլակի համար փոխում է միայն թեքության անկյունը և չափում նույն ճանապարհի անցման ժամանակը։'
  ];
  answers text[] := array['A','B','C','D','A','B','C','D','A','B','C','D','A','B','C','D','A','B'];
  opts jsonb := '[{"optionKey":"A","contentHy":"Վարկած"},{"optionKey":"B","contentHy":"Փորձ"},{"optionKey":"C","contentHy":"Տվյալ"},{"optionKey":"D","contentHy":"Եզրակացություն"}]'::jsonb;
  i integer; bucket text; bseq integer;
begin
  for i in 1..18 loop
    bucket := case when i<=8 then 'practice' when i<=12 then 'diagnostic' else 'mastery_check' end;
    bseq := case when i<=8 then i when i<=12 then i-8 else i-12 end;
    perform private.insert_11d_parallel_item('PHY7-U01-S05',bucket,bseq,'single_choice'::public.item_type,'Գիտական հետազոտության շղթայի ո՞ր փուլն է նկարագրված։ ' || descriptions[i],to_jsonb(answers[i]),case when i<=8 then 2 else 3 end,'reasoning',opts);
  end loop;
end $$;

-- S06 — physical quantities, units and measuring instruments.
do $$
declare
  prompts text[] := array[
    'Երկարության ՄՀ հիմնական միավորը մետրն է։',
    'Ժամանակի ՄՀ հիմնական միավորը վայրկյանն է։',
    'Զանգվածի ՄՀ հիմնական միավորը կիլոգրամն է։',
    'Հեղուկի ծավալը կարելի է չափել չափագլանով։',
    'Ջերմաստիճանը չափում են ջերմաչափով։',
    'Երկարությունը կարելի է չափել քանոնով։',
    'Ժամանակը չափելու համար կշեռքն է համապատասխան սարքը։',
    'Զանգվածը չափելու համար ջերմաչափն է համապատասխան սարքը։',
    'Չափման արդյունքը պետք է ներառի թվային արժեք և համապատասխան միավոր։',
    'Մետրն օգտագործվում է որպես ժամանակի միավոր։',
    'Վայրկենաչափը նախատեսված է ժամանակային միջակայքներ չափելու համար։',
    'Կշեռքը նախատեսված է զանգվածը չափելու համար։',
    'Չափագլանը հիմնականում օգտագործվում է հեղուկի ծավալը չափելու համար։',
    'Քանոնը կարող է օգտագործվել մարմնի երկարությունը չափելու համար։',
    'Ջերմաչափով չափում են մարմնի զանգվածը։',
    'Կիլոգրամը զանգվածի միավոր է։',
    'Վայրկյանը երկարության միավոր է։',
    'Ֆիզիկական մեծության արժեքը առանց միավորի գրելը սովորաբար ամբողջական չափման արդյունք չէ։'
  ];
  answers boolean[] := array[true,true,true,true,true,true,false,false,true,false,true,true,true,true,false,true,false,true];
  i integer; bucket text; bseq integer;
begin
  for i in 1..18 loop
    bucket := case when i<=8 then 'practice' when i<=12 then 'diagnostic' else 'mastery_check' end;
    bseq := case when i<=8 then i when i<=12 then i-8 else i-12 end;
    perform private.insert_11d_parallel_item('PHY7-U01-S06',bucket,bseq,'true_false'::public.item_type,prompts[i],to_jsonb(answers[i]),case when i<=8 then 2 else 3 end,case when i in (1,2,3,9,16,17) then 'knowledge' else 'application' end,'[]'::jsonb);
  end loop;
end $$;

-- S09 — six protected conceptual reasoning variants supplement the finite numerical generator.
do $$
declare
  prompts text[] := array[
    'Երկու քանոններով նույն երկարությունն են չափում. A-ի բաժանման արժեքը 1 սմ է, B-ինը՝ 0.2 սմ։ Ընդունված կանոնի համաձայն ո՞րն է սովորաբար ավելի ճշգրիտ։',
    'Չափման արդյունքը 15.0±0.5 սմ է։ Ո՞ր միջակայքն է համապատասխանում արդյունքին։',
    'Եթե սարքի մեկ բաժանման արժեքը փոքրացվում է, իսկ մնացած պայմանները նույնն են, չափման գնահատված սխալը սովորաբար ինչպե՞ս է փոխվում։',
    'Գրքի մեկ թերթի հաստությունը գտնելու համար չափում են 100 թերթի ընդհանուր հաստությունը և բաժանում 100-ի։ Ինչո՞ւ է այս եղանակը օգտակար։',
    'Միևնույն չափումը կրկնելիս ստացվում են 12.1 սմ, 12.0 սմ և 12.1 սմ։ Այս տվյալներն առաջին հերթին ի՞նչ են ցույց տալիս։',
    'Չափիչ սարքի մեկ բաժանումը 2 °C է։ Ընդունված կես-բաժանման կանոնով արդյունքը ո՞ր ձևով է ճիշտ ներկայացնել, եթե ցուցմունքը 24 °C է։'
  ];
  answers text[] := array['B','C','A','D','B','A'];
  options jsonb[] := array[
    '[{"optionKey":"A","contentHy":"A քանոնը"},{"optionKey":"B","contentHy":"B քանոնը"},{"optionKey":"C","contentHy":"Երկուսն էլ միշտ նույն ճշգրտությունն ունեն"},{"optionKey":"D","contentHy":"Չի կարելի համեմատել բաժանման արժեքներով"}]'::jsonb,
    '[{"optionKey":"A","contentHy":"14.0–16.0 սմ"},{"optionKey":"B","contentHy":"15.0–15.5 սմ"},{"optionKey":"C","contentHy":"14.5–15.5 սմ"},{"optionKey":"D","contentHy":"14.95–15.05 սմ"}]'::jsonb,
    '[{"optionKey":"A","contentHy":"Փոքրանում է"},{"optionKey":"B","contentHy":"Մեծանում է"},{"optionKey":"C","contentHy":"Միշտ դառնում է զրո"},{"optionKey":"D","contentHy":"Չի փոխվում"}]'::jsonb,
    '[{"optionKey":"A","contentHy":"Որովհետև չի պահանջում չափիչ սարք"},{"optionKey":"B","contentHy":"Որովհետև վերացնում է բոլոր տեսակի սխալները"},{"optionKey":"C","contentHy":"Որովհետև թերթերի թիվը նշանակություն չունի"},{"optionKey":"D","contentHy":"Որովհետև շատ փոքր հաստությունը չափվում է ավելի մեծ ընդհանուր երկարության միջոցով"}]'::jsonb,
    '[{"optionKey":"A","contentHy":"Չափումը հաստատ սխալ է"},{"optionKey":"B","contentHy":"Կրկնվող արդյունքները միմյանց մոտ են"},{"optionKey":"C","contentHy":"Իրական արժեքը հաստատ 12.1 սմ է"},{"optionKey":"D","contentHy":"Սարքի բաժանման արժեքը 1 սմ է"}]'::jsonb,
    '[{"optionKey":"A","contentHy":"24±1 °C"},{"optionKey":"B","contentHy":"24±2 °C"},{"optionKey":"C","contentHy":"24±0 °C"},{"optionKey":"D","contentHy":"24±4 °C"}]'::jsonb
  ];
  i integer;
begin
  for i in 1..6 loop
    perform private.insert_11d_parallel_item('PHY7-U01-S09','mastery_check',i,'single_choice'::public.item_type,prompts[i],to_jsonb(answers[i]),case when i in (4,6) then 4 else 3 end,'reasoning',options[i]);
  end loop;
end $$;

drop function private.insert_11d_parallel_item(text,text,integer,public.item_type,text,jsonb,integer,text,jsonb);
