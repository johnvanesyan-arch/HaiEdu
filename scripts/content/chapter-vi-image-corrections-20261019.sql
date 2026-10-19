-- Chapter VI owner-selected image corrections, 2026-10-19.
-- DML only. The nine items remain non-visible, non-allocatable and review-pending.
-- Old v1 snapshots and original asset paths remain immutable for audit/recovery.

begin;

do $correction$
declare
  v_target_count integer;
begin
  perform 1
  from public.items i
  where i.code = any(array[
    'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
    'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
    'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
  ])
  order by i.code
  for update;

  select count(*) into v_target_count
  from public.items i
  where i.code = any(array[
    'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
    'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
    'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
  ]);
  if v_target_count <> 9 then
    raise exception 'chapter_vi_image_correction_target_count:%', v_target_count;
  end if;

  if not exists (
    select 1
    from public.curriculum_releases r
    where r.id = '44e5e99a-43bc-5937-8793-b2c614e38700'::uuid
      and r.release_key = 'physics7_u06_2026_08_14_draft_r6'
      and r.status = 'draft'
      and r.activated_at is null
  ) then
    raise exception 'chapter_vi_release_boundary_changed';
  end if;

  if (
    select count(*)
    from public.items i
    join public.skills s on s.id = i.skill_id
    where s.code like 'PHY7-U06-%'
      and i.status = 'published'
      and i.review_status = 'approved'
      and i.validation_state = 'provisional_no_sme_review'
  ) <> 233 then
    raise exception 'chapter_vi_approved_question_baseline_changed';
  end if;

  if (
    select count(*)
    from public.items i
    join public.skills s on s.id = i.skill_id
    where s.code like 'PHY7-U06-%'
      and i.status = 'draft'
      and i.review_status = 'needs_review'
      and i.validation_state = 'provisional_no_sme_review'
  ) <> 9 then
    raise exception 'chapter_vi_pending_question_baseline_changed';
  end if;

  if exists (
    with expected(code, row_sha256) as (
      values
        ('PHY7-U06-S02-I01','44512f55922cd81b9ba0e982424c4093209a17bf0de438b186df681d5d520611'),
        ('PHY7-U06-S04-I01','dfde58bb3cc96da8be5148af15f1d183b87bd2d7cd498ffaf49c3e46493cb855'),
        ('PHY7-U06-S06-I01','f4a1e738f791ea31471f8a6ba0659f5a5c19f048ead27bdbd912f84833b927ba'),
        ('PHY7-U06-S07-I01','cdd1b608da80dc3673515c7e3233ffe0d8558753f308396c1665448e865cb15a'),
        ('PHY7-U06-S08-I04','e45509ac7b2ea8824625db9557826f66c961018a1e75a6e8c0b7609cbdb9e275'),
        ('PHY7-U06-S09-I01','43ef624ec723f43e0fb2748969658ba989a2c9849a1d4c462e3d55723e2513ee'),
        ('PHY7-U06-S11-I01','ec5f2ead636da27dbe45c9b609ae86167e48df8fb7f4b097f7e6f25574db95a2'),
        ('PHY7-U06-S12-I01','a291a577fa92922a6b65df77fde7833e0d4297ae45803c41e8abc286bdc26b51'),
        ('PHY7-U06-S13-I05','d6f101e63cc4ad57efab93fd50b5eded2013b25cba61288da313a95804a41681')
    )
    select 1
    from expected e
    join public.items i on i.code = e.code
    where i.version_no <> 1
       or i.status <> 'draft'
       or i.review_status <> 'needs_review'
       or i.validation_state <> 'provisional_no_sme_review'
       or encode(digest(to_jsonb(i)::text,'sha256'),'hex') <> e.row_sha256
  ) then
    raise exception 'chapter_vi_image_correction_source_snapshot_drift';
  end if;

  if (
    select count(*)
    from public.item_versions v
    join public.items i on i.id = v.item_id
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ])
      and v.version_no = 1
  ) <> 9
  or exists (
    select 1
    from public.item_versions v
    join public.items i on i.id = v.item_id
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ])
      and v.version_no > 1
  ) then
    raise exception 'chapter_vi_image_correction_version_history_changed';
  end if;

  if exists (
    select 1
    from public.item_reviews r
    join public.items i on i.id = r.item_id
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ])
  ) then
    raise exception 'chapter_vi_image_correction_target_reviewed_concurrently';
  end if;

  if exists (
    select 1 from public.assessment_pool_items x join public.items i on i.id=x.item_id where i.code like 'PHY7-U06-%'
  ) or exists (
    select 1 from public.assessment_form_items x join public.items i on i.id=x.item_id where i.code like 'PHY7-U06-%'
  ) or exists (
    select 1 from public.learning_session_items x join public.items i on i.id=x.item_id where i.code like 'PHY7-U06-%'
  ) or exists (
    select 1 from public.student_item_exposure_events x join public.items i on i.id=x.item_id where i.code like 'PHY7-U06-%'
  ) or exists (
    select 1 from public.chapter_review_item_exposures x join public.items i on i.id=x.item_id where i.code like 'PHY7-U06-%'
  ) then
    raise exception 'chapter_vi_inactive_boundary_changed';
  end if;

  update public.items i
  set prompt_hy = replacement.prompt_hy,
      stimulus = jsonb_set(
        jsonb_set(
          jsonb_set(i.stimulus, '{url}', to_jsonb(replacement.asset_url), false),
          '{altHy}', to_jsonb(replacement.alt_hy), false
        ),
        '{source,sha256}', to_jsonb(replacement.asset_sha256), false
      ),
      version_no = 2,
      variant_fingerprint = md5(
        i.skill_id::text || '|' ||
        lower(regexp_replace(replacement.prompt_hy, '\s+', ' ', 'g')) || '|' ||
        (select k.answer::text from public.item_answer_keys k where k.item_id=i.id) || '|' ||
        (select jsonb_agg(jsonb_build_object('optionKey',o.option_key,'contentHy',o.content_hy)
          order by o.display_order,o.option_key)::text from public.item_options o where o.item_id=i.id)
      ),
      last_reviewed_at = null,
      last_reviewed_by = null,
      updated_at = now()
  from (
    values
      ('PHY7-U06-S02-I01',
       'Նկարում նույն սեղանիկի վրա դրված է նույն կշռաքարը։ Ո՞ր դիրքում է ավազի վրա ճնշումն ավելի փոքր։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p118-pressure-contact-v2.png',
       '01a5dbc2e2f693ef96c4c1e3b75ea927028e454ba84d6e2a2096f017ae566c1b',
       'Նկ. 80․ նույն սեղանիկը նույն կշռաքարով ավազի վրա է դրված երկու դիրքով՝ լայն հարթակով և ոտքերով։'),
      ('PHY7-U06-S04-I01',
       'Պասկալի գնդի մխոցը սեղմելիս ջրի շիթերը դուրս են գալիս տարբեր ուղղություններով բացված անցքերից։ Ի՞նչ է ցույց տալիս փորձը։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p126-pascal-law-v2.png',
       '3b70cbe742bb3806ec9bc2be7236d8217adac5c95c438227ea5e7108232c1dc7',
       'Պասկալի գունդ․ մխոցը սեղմելիս ծխի կամ ջրի շիթերը դուրս են գալիս գնդի տարբեր ուղղություններով բացված անցքերից։'),
      ('PHY7-U06-S06-I01',
       'Նկարում տարբեր ձևի և լայնության հաղորդակից անոթներում նույն ջուրն է, ազատ մակերևույթները բաց են մթնոլորտի առաջ։ Ի՞նչ է ցույց տալիս նկարը։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p131-communicating-vessels-v2.png',
       '899157965d74badcfe40e8efd86cd925db10f98d6f51dd33364c7c6f87c88768',
       'Նկ. 91 և 92․ տարբեր լայնությամբ ու ձևով հաղորդակից անոթներում նույն հեղուկի ազատ մակերևույթները նույն հորիզոնական մակարդակի վրա են։'),
      ('PHY7-U06-S07-I01',
       'Նկարում պատկերված ջրաբաշխական մամլիչում S₁<S₂ է։ Իդեալական դեպքում փոքր մխոցին F₁ ուժով սեղմելիս ինչո՞ւ է մեծ մխոցի վրա ստացվում ավելի մեծ F₂ ուժ։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p135-hydraulic-press-v2.png',
       '19ac97d235046f6c1bf241737e4f07516b86a8d3105031014ee8073db90b7e57',
       'Նկ. 99․ հեղուկով միացված երկու գլաններում փոքր S₁ և մեծ S₂ մակերեսներով մխոցներ, որոնց վրա ազդում են F₁ և F₂ ուժերը։'),
      ('PHY7-U06-S08-I04',
       'Տորիչելիի փորձի նկարում խողովակի սնդիկի և անոթի սնդիկի մակարդակների ուղղաձիգ տարբերությունը 76 սմ է։ Ի՞նչ է ներկայացնում այդ բարձրությունը։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p143-torricelli-v2.png',
       '51380c75cc7736a702afb9ff8eff862f8dfdf2db9d3f58dbe312d8b42b997d11',
       'Տորիչելիի փորձը․ շրջված խողովակում սնդիկի սյան և անոթի սնդիկի մակարդակների ուղղաձիգ տարբերությունը 76 սմ է, իսկ սնդիկի վերևում վակուում է։'),
      ('PHY7-U06-S09-I01',
       'Պատկերում նույն բեռը նախ կախված է օդում, ապա լրիվ ընկղմված է ջրում։ Ինչո՞ւ է ջրում ուժաչափի ցուցմունքը փոքրանում։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p148-buoyant-force-measurement-v2.png',
       '261cf5a1870b6fba36a79e43f96e6638def180bf20435b507471bbad9cbacaa7',
       'Նկ. 109․ նույն բեռը կախված է ուժաչափից՝ նախ օդում, ապա լրիվ ընկղմված ջրում։ Ջրում ուժաչափի ցուցմունքը փոքր է։'),
      ('PHY7-U06-S11-I01',
       'Պատկերում ո՞ր ուժային պայմանին է համապատասխանում այն դեպքը, երբ լրիվ ընկղմված մարմինը հեղուկի ներսում մնում է հավասարակշռության մեջ։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p156-floating-conditions-v2.png',
       '7ba03337f8cd14ec2f55a3573bd7faae90a8c11d300344a30f94df2a7fa6fdf6',
       'Լրիվ ընկղմված մարմնի երեք դեպք․ Fծ>FԱ դեպքում մարմինը սուզվում է, Fծ=FԱ դեպքում մնում է հավասարակշռության մեջ, իսկ Fծ<FԱ դեպքում բարձրանում է։'),
      ('PHY7-U06-S12-I01',
       'Պատկերում նավի իրանի վրա սպիտակ գծով ջրագիծն է նշված։ Ի՞նչ է ցույց տալիս այն։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p159-ship-displacement-v2.png',
       '0c43f21dc422e3e91b2fb958ed4e7aab8918570c5064ad2a5229291c3868afdc',
       'Նկ. 117․ նավի իրանի վրա սպիտակ գծով նշված է թույլատրելի խորասուզումը ցույց տվող ջրագիծը։'),
      ('PHY7-U06-S13-I05',
       'Պատկերում կշեռքի երկու կողմերում կախված են հավասար բեռներ, որոնց տակ դրված են ջրով և կերոսինով անոթներ։ Բեռները հեղուկների մեջ լրիվ ընկղմելիս ո՞ր լրացուցիչ պայմանն է կարևոր հեղուկների ազդեցությունը ճիշտ համեմատելու համար։',
       'https://www.haiedu.am/assets/textbook/physics7-2023/p152-liquid-density-comparison-v2.png',
       '8e3d02ffa9b5e836881ea887b6b45dd3fd0610bec3f08d29e8ad3b547c08d8d6',
       'Կշեռքի երկու կողմերում կախված են հավասար բեռներ, որոնց տակ դրված են ջրով և կերոսինով անոթներ՝ բեռները հեղուկների մեջ ընկղմելով համեմատություն կատարելու համար։')
  ) as replacement(code,prompt_hy,asset_url,asset_sha256,alt_hy)
  where i.code = replacement.code;

  insert into public.item_versions(item_id,version_no,snapshot,change_summary,created_by)
  select i.id,
         2,
         jsonb_build_object(
           'item',to_jsonb(i),
           'options',coalesce((
             select jsonb_agg(to_jsonb(o) order by o.display_order,o.option_key)
             from public.item_options o where o.item_id=i.id
           ),'[]'::jsonb),
           'answerKey',(select to_jsonb(k) from public.item_answer_keys k where k.item_id=i.id),
           'misconceptions',coalesce((
             select jsonb_agg(jsonb_build_object(
               'responseKey',m.response_key,
               'mappingNote',m.mapping_note,
               'code',mc.code
             ) order by mc.code,m.response_key)
             from public.item_misconception_mappings m
             join public.misconceptions mc on mc.id=m.misconception_id
             where m.item_id=i.id
           ),'[]'::jsonb)
         ),
         case when i.code='PHY7-U06-S13-I05'
           then 'Owner-selected clean textbook crop and owner-approved prompt clarification for the pictured pre-immersion setup; options, keyed answer C, explanation, hints and misconception mappings unchanged. Item remains review-pending.'
           else 'Owner-selected clean textbook crop; prompt, options, keyed answer, explanation, hints and misconception mappings unchanged. Item remains review-pending.'
         end,
         null
  from public.items i
  where i.code = any(array[
    'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
    'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
    'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
  ]);

  if (
    select count(*)
    from public.items i
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ])
      and i.version_no=2
      and i.status='draft'
      and i.review_status='needs_review'
      and i.validation_state='provisional_no_sme_review'
      and i.config->>'learnerVisible'='false'
      and coalesce((i.config->>'allocationAllowed')::boolean,false)=false
  ) <> 9 then
    raise exception 'chapter_vi_image_correction_post_state_invalid';
  end if;

  if (
    select count(*)
    from public.item_versions v
    join public.items i on i.id=v.item_id
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ]) and v.version_no=2
  ) <> 9 then
    raise exception 'chapter_vi_image_correction_v2_snapshot_missing';
  end if;

  if not exists (
    select 1
    from public.items i
    join public.item_answer_keys k on k.item_id=i.id
    where i.code='PHY7-U06-S13-I05'
      and i.prompt_hy='Պատկերում կշեռքի երկու կողմերում կախված են հավասար բեռներ, որոնց տակ դրված են ջրով և կերոսինով անոթներ։ Բեռները հեղուկների մեջ լրիվ ընկղմելիս ո՞ր լրացուցիչ պայմանն է կարևոր հեղուկների ազդեցությունը ճիշտ համեմատելու համար։'
      and k.answer='"C"'::jsonb
      and (select count(*) from public.item_options o where o.item_id=i.id)=4
      and (select count(*) from public.item_misconception_mappings m where m.item_id=i.id)=3
  ) then
    raise exception 'chapter_vi_s13_i05_revised_content_invalid';
  end if;
end
$correction$;

select jsonb_build_object(
  'observedAt',clock_timestamp(),
  'targetCount',count(*),
  'version2Count',count(*) filter(where i.version_no=2),
  'draftNeedsReviewCount',count(*) filter(where i.status='draft' and i.review_status='needs_review'),
  'targetDigest',md5(jsonb_agg(jsonb_build_object(
    'code',i.code,
    'version',i.version_no,
    'prompt',i.prompt_hy,
    'stimulus',i.stimulus,
    'fingerprint',i.variant_fingerprint
  ) order by i.code)::text)
) as verification
from public.items i
where i.code = any(array[
  'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
  'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
  'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
]);

commit;
