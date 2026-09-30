-- Sprint 15B.1 — Grade 7 Physics Chapter II review foundation.
-- Governing source: current N 40-Ն programme as amended/reissued by N 36-Ն,
-- effective 2026-08-14. Supporting source: 2023 Grade 7 Physics textbook,
-- Chapter II, printed pages 23–41.
--
-- Everything introduced here remains review/draft-only. No Chapter II item,
-- pool, blueprint or active release is created, so learner runtime is unchanged.

create unique index if not exists units_subject_program_code_uq
  on public.units(subject_program_id, code)
  where code is not null;
create unique index if not exists topics_unit_code_uq
  on public.topics(unit_id, code)
  where code is not null;

insert into public.units (
  subject_program_id, code, title_hy, title_en, sequence_order, status
)
select sp.id, 'PHY7-U02', 'Նյութի կառուցվածքը', 'Structure of matter', 2,
       'review'::public.content_status
from public.subject_programs sp
join public.subjects s on s.id = sp.subject_id and s.code = 'physics'
join public.grades g on g.id = sp.grade_id and g.grade_number = 7
on conflict (subject_program_id, code) where code is not null do update set
  title_hy = excluded.title_hy,
  title_en = excluded.title_en,
  sequence_order = excluded.sequence_order;

with topic_rows(code, title_hy, title_en, sequence_order) as (
  values
    ('PHY7-U02-T01', 'Ֆիզիկական մարմին և նյութ. նյութի մասնիկային կառուցվածքը', 'Physical body, substance and particulate structure', 1),
    ('PHY7-U02-T02', 'Ատոմներ, մոլեկուլներ և դրանց չափերը', 'Atoms, molecules and their sizes', 2),
    ('PHY7-U02-T03', 'Մոլեկուլների շարժումը և դիֆուզիան', 'Molecular motion and diffusion', 3),
    ('PHY7-U02-T04', 'Մոլեկուլների քաոսային շարժման արագությունը և ջերմաստիճանը', 'Random molecular motion and temperature', 4),
    ('PHY7-U02-T05', 'Ջերմաստիճանային սանդղակը և ջերմաչափը', 'Temperature scale and thermometer', 5)
)
insert into public.topics (
  unit_id, code, title_hy, title_en, sequence_order, status
)
select u.id, tr.code, tr.title_hy, tr.title_en, tr.sequence_order,
       'review'::public.content_status
from topic_rows tr
join public.units u on u.code = 'PHY7-U02'
on conflict (unit_id, code) where code is not null do update set
  title_hy = excluded.title_hy,
  title_en = excluded.title_en,
  sequence_order = excluded.sequence_order;

with programme as (
  select id from public.curriculum_source_documents
  where source_key = 'am_physics_grade7_programme_40n_36n'
), outcome_rows(
  topic_code, source_locator, requirement_level, statement_hy,
  sequence_order, source_transcription_notes
) as (
  values
    ('PHY7-U02-T01', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'mandatory',
      'օրինակներով հիմնավորել նյութի մասնիկային կառուցվածքը (Հ29, Հ30)', 1, null::text),
    ('PHY7-U02-T02', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)', 'mandatory',
      'ներկայացնել մոլեկուլների չափերը՝ համեմատելով այլ մարմինների չափերի հետ (Հ4, Հ9, Հ28)', 2, null::text),
    ('PHY7-U02-T03', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)', 'mandatory',
      'նկարագրել ատոմների, մոլեկուլների շարժման առանձնահատկությունները նյութում (Հ8, Հ9)', 3, null::text),
    ('PHY7-U02-T03', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'mandatory',
      'օրինակներով լուսաբանել դիֆուզիայի երևույթը (Հ9)', 4, null::text),
    ('PHY7-U02-T04', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)', 'mandatory',
      'բացատրել, թե ինչով է պայմանավորված մարմնի ջերմաստիճանը (Հ9, Հ29)', 5,
      'Պաշտոնական հավելվածում այս տողը հաջորդում է պարտադիր 1(4)-ին, սակայն տեսանելի հերթական համարը բացակայում է։ Պահպանվել է որպես պարտադիր ցանկի հինգերորդ վերջնարդյունք։'),
    ('PHY7-U02-T03', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'additional',
      'բնութագրել դիֆուզիայի արագությունը գազերում, հեղուկներում և պինդ մարմիններում, բերել օրինակներ', 6, null::text),
    ('PHY7-U02-T05', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)', 'additional',
      'բացատրել ջերմաչափի աշխատանքի սկզբունքը', 7, null::text)
)
insert into public.learning_outcomes (
  topic_id, official_code, statement_hy, statement_en, source_reference,
  sequence_order, status, source_document_id, source_locator,
  requirement_level, source_transcription_notes
)
select t.id, null, o.statement_hy, null, 'https://www.arlis.am/hy/acts/229331',
       o.sequence_order, 'review'::public.content_status, p.id,
       o.source_locator, o.requirement_level, o.source_transcription_notes
from outcome_rows o
join public.topics t on t.code = o.topic_code
cross join programme p
on conflict (source_document_id, source_locator)
  where source_document_id is not null and source_locator is not null
do update set
  topic_id = excluded.topic_id,
  statement_hy = excluded.statement_hy,
  source_reference = excluded.source_reference,
  sequence_order = excluded.sequence_order,
  requirement_level = excluded.requirement_level,
  source_transcription_notes = excluded.source_transcription_notes;

with context as (
  select s.id as subject_id, g.id as grade_id
  from public.subjects s
  cross join public.grades g
  where s.code = 'physics' and g.grade_number = 7
), skill_rows(code, name_hy, name_en, description_hy, layer, sequence_order) as (
  values
    ('PHY7-U02-S01', 'Տարբերակել ֆիզիկական մարմինն ու նյութը', 'Distinguish a physical body from a substance',
      'Օրինակներում որոշել՝ որն է ֆիզիկական մարմինը, և նշել այն կազմող նյութը կամ նյութերը։', 'knowledge'::public.skill_layer, 1),
    ('PHY7-U02-S02', 'Փորձերով հիմնավորել նյութի մասնիկային կառուցվածքը', 'Justify particulate structure using evidence',
      'Դիտարկված փորձերից եզրակացնել, որ նյութը կազմված է մասնիկներից, որոնց միջև կան ազատ տարածություններ։', 'reasoning'::public.skill_layer, 2),
    ('PHY7-U02-S03', 'Տարբերակել ատոմը, մոլեկուլը և քիմիական տարրը', 'Distinguish atom, molecule and chemical element',
      'Պարզ օրինակներում տարբերակել ատոմը, մոլեկուլը և միևնույն տեսակի ատոմներից կազմված քիմիական տարրը։', 'knowledge'::public.skill_layer, 3),
    ('PHY7-U02-S04', 'Մոլեկուլների չափերը համեմատել այլ մարմինների չափերի հետ', 'Compare molecular sizes with familiar scales',
      'Մոլեկուլների չափերը ներկայացնել համեմատական մասշտաբով և կիրառել փոքր մասնիկների չափի որոշման պարզ եղանակը։', 'application'::public.skill_layer, 4),
    ('PHY7-U02-S05', 'Նկարագրել ատոմների և մոլեկուլների շարժումը նյութում', 'Describe atomic and molecular motion in matter',
      'Նկարագրել մասնիկների անընդհատ ու անկանոն շարժումը նյութի տարբեր ագրեգատային վիճակներում։', 'knowledge'::public.skill_layer, 5),
    ('PHY7-U02-S06', 'Դիֆուզիան բացատրել օրինակներով', 'Explain diffusion using examples',
      'Առօրյա և փորձարարական օրինակներում ճանաչել ու մասնիկների շարժմամբ բացատրել դիֆուզիան։', 'application'::public.skill_layer, 6),
    ('PHY7-U02-S07', 'Համեմատել դիֆուզիայի արագությունը նյութի տարբեր ագրեգատային վիճակներում', 'Compare diffusion rates across states of matter',
      'Համեմատել դիֆուզիայի արագությունը գազերում, հեղուկներում և պինդ մարմիններում ու հիմնավորել տարբերությունը։', 'reasoning'::public.skill_layer, 7),
    ('PHY7-U02-S08', 'Մարմնի ջերմաստիճանը կապել մասնիկների շարժման արագության հետ', 'Relate temperature to particle motion',
      'Բացատրել մարմնի ջերմաստիճանի ֆիզիկական իմաստը՝ այն կապելով մասնիկների անկանոն շարժման արագության հետ։', 'reasoning'::public.skill_layer, 8),
    ('PHY7-U02-S09', 'Բացատրել ջերմաչափի աշխատանքի սկզբունքը', 'Explain how a thermometer works',
      'Հեղուկային ջերմաչափի օրինակով բացատրել ջերմաչափի աշխատանքը՝ այն կապելով ջերմաստիճանից հեղուկի ծավալի փոփոխության հետ։', 'application'::public.skill_layer, 9)
)
insert into public.skills (
  subject_id, grade_id, code, name_hy, name_en, description_hy,
  description_en, layer, sequence_order, status
)
select c.subject_id, c.grade_id, sr.code, sr.name_hy, sr.name_en,
       sr.description_hy, null, sr.layer, sr.sequence_order,
       'review'::public.content_status
from skill_rows sr
cross join context c
on conflict (code) do update set
  name_hy = excluded.name_hy,
  name_en = excluded.name_en,
  description_hy = excluded.description_hy,
  layer = excluded.layer,
  sequence_order = excluded.sequence_order;

with prerequisite_rows(skill_code, prerequisite_code, required_mastery) as (
  values
    ('PHY7-U02-S02', 'PHY7-U02-S01', 0.720::numeric),
    ('PHY7-U02-S03', 'PHY7-U02-S02', 0.720::numeric),
    ('PHY7-U02-S04', 'PHY7-U02-S03', 0.720::numeric),
    ('PHY7-U02-S05', 'PHY7-U02-S03', 0.720::numeric),
    ('PHY7-U02-S06', 'PHY7-U02-S05', 0.720::numeric),
    ('PHY7-U02-S07', 'PHY7-U02-S06', 0.720::numeric),
    ('PHY7-U02-S08', 'PHY7-U02-S05', 0.720::numeric),
    ('PHY7-U02-S09', 'PHY7-U02-S08', 0.720::numeric)
)
insert into public.skill_prerequisites (
  skill_id, prerequisite_skill_id, required_mastery
)
select s.id, p.id, pr.required_mastery
from prerequisite_rows pr
join public.skills s on s.code = pr.skill_code
join public.skills p on p.code = pr.prerequisite_code
on conflict (skill_id, prerequisite_skill_id) do update set
  required_mastery = excluded.required_mastery;

insert into public.curriculum_reconciliation_runs (
  reconciliation_key, subject_program_id, unit_id,
  framework_document_id, subject_standard_document_id, programme_document_id,
  status, source_snapshot, notes
)
select
  'physics7_u02_2026_08_14', sp.id, u.id,
  b.framework_document_id, b.subject_standard_document_id, b.programme_document_id,
  'draft',
  jsonb_build_object(
    'retrieved_on', '2026-09-30',
    'framework_url', 'https://www.arlis.am/hy/acts/225446',
    'subject_standard_url', 'https://www.arlis.am/hy/acts/229259',
    'programme_url', 'https://www.arlis.am/hy/acts/229331',
    'programme_attachment_url', 'https://www.arlis.am/acts/files/361998/966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478',
    'programme_attachment_sha256', '966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478',
    'textbook_title', 'Ֆիզիկա 7',
    'textbook_edition_year', 2023,
    'textbook_chapter', 'Գլուխ II — Նյութի կառուցվածքը',
    'textbook_printed_pages', '23–41',
    'textbook_sha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbook_role', 'supporting_reference'
  ),
  'Գլուխ II-ի թեկնածու համադրումն է։ Պաշտոնական վերջնարդյունքների բառացիությունը ստուգված է, իսկ հմտությունների կառուցվածքը, չափորոշչային կետային համադրումը և գնահատման ծավալը դեռ պահանջում են բովանդակային ու ֆիզիկայի մասնագետի հաստատում։'
from public.subject_programs sp
join public.subjects s on s.id = sp.subject_id and s.code = 'physics'
join public.grades g on g.id = sp.grade_id and g.grade_number = 7
join public.units u on u.subject_program_id = sp.id and u.code = 'PHY7-U02'
join public.subject_program_source_bindings b on b.subject_program_id = sp.id
where b.applicability_status = 'governing'
on conflict (reconciliation_key) do update set
  unit_id = excluded.unit_id,
  status = 'draft',
  source_snapshot = excluded.source_snapshot,
  notes = excluded.notes,
  completed_at = null;

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u02_2026_08_14'
), outcome_context(source_locator, framework_references, mapping_notes) as (
  values
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)', array['Հ29', 'Հ30']::text[], 'Պաշտոնական ծրագրի պարտադիր վերջնարդյունքը պահպանված է բառացի։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։'),
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)', array['Հ4', 'Հ9', 'Հ28']::text[], 'Պաշտոնական ծրագրի պարտադիր վերջնարդյունքը պահպանված է բառացի։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։'),
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)', array['Հ8', 'Հ9']::text[], 'Պաշտոնական ծրագրի պարտադիր վերջնարդյունքը պահպանված է բառացի։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։'),
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)', array['Հ9']::text[], 'Պաշտոնական ծրագրի պարտադիր վերջնարդյունքը պահպանված է բառացի։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։'),
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)', array['Հ9', 'Հ29']::text[], 'Պաշտոնական ծրագրի պարտադիր վերջնարդյունքը պահպանված է բառացի՝ տեսանելի համարակալման բացակայության մասին տառադարձման նշումով։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։'),
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', '{}'::text[], 'Պաշտոնական ծրագրի լրացուցիչ վերջնարդյունքը պահպանված է բառացի։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։'),
    ('7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)', '{}'::text[], 'Պաշտոնական ծրագրի լրացուցիչ վերջնարդյունքը պահպանված է բառացի։ Առարկայական չափորոշչի կետային համադրումը սպասում է մասնագետի հաստատմանը։')
)
insert into public.learning_outcome_normative_mappings (
  reconciliation_id, learning_outcome_id, disposition,
  framework_references, subject_standard_references, mapping_notes
)
select r.id, lo.id, 'new_official_outcome_missing',
       oc.framework_references, '{}'::text[], oc.mapping_notes
from outcome_context oc
join public.learning_outcomes lo on lo.source_locator = oc.source_locator
join public.curriculum_source_documents d on d.id = lo.source_document_id
  and d.source_key = 'am_physics_grade7_programme_40n_36n'
cross join run r
on conflict (reconciliation_id, learning_outcome_id) do update set
  disposition = excluded.disposition,
  framework_references = excluded.framework_references,
  subject_standard_references = excluded.subject_standard_references,
  mapping_notes = excluded.mapping_notes,
  reviewed_at = now();

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u02_2026_08_14'
), skill_rows(skill_code, rationale) as (
  values
    ('PHY7-U02-S01', 'Դասագրքային հիմնարար տարբերակում է, որն աջակցում է նյութի կառուցվածքի վերաբերյալ պարտադիր վերջնարդյունքին՝ առանց առանձին պաշտոնական վերջնարդյունք համարվելու։'),
    ('PHY7-U02-S02', 'Ուղղակիորեն գործնականացնում է նյութի մասնիկային կառուցվածքը օրինակներով հիմնավորելու պարտադիր վերջնարդյունքը։'),
    ('PHY7-U02-S03', 'Դասագրքային հիմնարար տարբերակում է, որն աջակցում է մասնիկային կառուցվածքի և մոլեկուլների չափերի ըմբռնմանը։'),
    ('PHY7-U02-S04', 'Ուղղակիորեն գործնականացնում է մոլեկուլների չափերը այլ մարմինների չափերի հետ համեմատելու պարտադիր վերջնարդյունքը։'),
    ('PHY7-U02-S05', 'Ուղղակիորեն գործնականացնում է նյութում ատոմների և մոլեկուլների շարժումը նկարագրելու պարտադիր վերջնարդյունքը։'),
    ('PHY7-U02-S06', 'Ուղղակիորեն գործնականացնում է դիֆուզիան օրինակներով լուսաբանելու պարտադիր վերջնարդյունքը։'),
    ('PHY7-U02-S07', 'Ուղղակիորեն գործնականացնում է տարբեր ագրեգատային վիճակներում դիֆուզիայի արագությունը բնութագրելու լրացուցիչ վերջնարդյունքը։'),
    ('PHY7-U02-S08', 'Ուղղակիորեն գործնականացնում է մարմնի ջերմաստիճանի ֆիզիկական պայմանավորվածությունը բացատրելու պարտադիր վերջնարդյունքը։'),
    ('PHY7-U02-S09', 'Ուղղակիորեն գործնականացնում է ջերմաչափի աշխատանքի սկզբունքը բացատրելու լրացուցիչ վերջնարդյունքը։')
)
insert into public.skill_curriculum_reconciliations (
  reconciliation_id, skill_id, disposition, rationale
)
select r.id, s.id, 'mapping_updated', sr.rationale
from skill_rows sr
join public.skills s on s.code = sr.skill_code
cross join run r
on conflict (reconciliation_id, skill_id) do update set
  disposition = excluded.disposition,
  rationale = excluded.rationale,
  reviewed_at = now();

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u02_2026_08_14'
), mapping_rows(skill_code, source_locator, mapping_type, rationale) as (
  values
    ('PHY7-U02-S01', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'derived_supporting', 'Մարմին–նյութ տարբերակումը նախապատրաստում է մասնիկային կառուցվածքի հիմնավորումը։'),
    ('PHY7-U02-S02', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'direct', 'Փորձարարական ապացույցների մեկնաբանումը գնահատում է վերջնարդյունքի հիմնական կառուցույթը։'),
    ('PHY7-U02-S03', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'derived_supporting', 'Ատոմ–մոլեկուլ–տարր տարբերակումը աջակցում է մասնիկային կառուցվածքի ըմբռնմանը։'),
    ('PHY7-U02-S04', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)', 'direct', 'Համեմատական մասշտաբը և փոքր մասնիկների չափի որոշումը գնահատում են մոլեկուլների չափերի վերջնարդյունքը։'),
    ('PHY7-U02-S05', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)', 'direct', 'Հմտությունը գնահատում է նյութում մասնիկների շարժման առանձնահատկությունների նկարագրումը։'),
    ('PHY7-U02-S06', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'Հմտությունը գնահատում է դիֆուզիայի ճանաչումն ու մասնիկային բացատրությունը։'),
    ('PHY7-U02-S07', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'direct', 'Հմտությունը գնահատում է դիֆուզիայի արագության համեմատումը երեք ագրեգատային վիճակներում։'),
    ('PHY7-U02-S08', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)', 'direct', 'Հմտությունը գնահատում է ջերմաստիճանի կապը մասնիկների շարժման արագության հետ։'),
    ('PHY7-U02-S09', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)', 'direct', 'Հմտությունը գնահատում է ջերմաչափի աշխատանքի սկզբունքի բացատրությունը՝ հեղուկային ջերմաչափի օրինակով։')
)
insert into public.skill_outcome_curriculum_mappings (
  reconciliation_id, skill_id, learning_outcome_id, mapping_type, rationale
)
select r.id, s.id, lo.id, mr.mapping_type, mr.rationale
from mapping_rows mr
join public.skills s on s.code = mr.skill_code
join public.learning_outcomes lo on lo.source_locator = mr.source_locator
join public.curriculum_source_documents d on d.id = lo.source_document_id
  and d.source_key = 'am_physics_grade7_programme_40n_36n'
cross join run r
on conflict (reconciliation_id, skill_id, learning_outcome_id) do update set
  mapping_type = excluded.mapping_type,
  rationale = excluded.rationale;

insert into public.skill_outcomes (skill_id, learning_outcome_id)
select m.skill_id, m.learning_outcome_id
from public.skill_outcome_curriculum_mappings m
join public.curriculum_reconciliation_runs r on r.id = m.reconciliation_id
where r.reconciliation_key = 'physics7_u02_2026_08_14'
on conflict (skill_id, learning_outcome_id) do nothing;

-- A draft multi-unit candidate demonstrates the intended release shape. It
-- copies the already-approved Chapter I snapshots and adds the Chapter II
-- review candidates. It cannot activate while the Chapter II gates are pending.
insert into public.curriculum_releases (
  release_key, subject_program_id, release_number, version_label, status,
  provenance_quality, reconciliation_id, predecessor_release_id,
  source_snapshot, content_fingerprint, effective_from, notes
)
select
  'physics7_u01_u02_2026_08_14_candidate_r2', sp.id, 2,
  'Ֆիզիկա 7 — Գլուխներ I–II, 2026-08-14 թեկնածու թողարկում 2',
  'draft', 'exact', r.id, predecessor.id, r.source_snapshot,
  md5('physics7_u01_u02_2026_08_14_candidate_r2:' || r.id::text),
  sp.effective_from,
  'Վերանայման թեկնածու է, ոչ թե սովորողին հասանելի թողարկում։ Գլուխ II-ի բովանդակային, գնահատման, մասնագիտական և փորձնական բոլոր դարպասները պետք է փակվեն մինչև ակտիվացումը։'
from public.subject_programs sp
join public.curriculum_reconciliation_runs r
  on r.subject_program_id = sp.id and r.reconciliation_key = 'physics7_u02_2026_08_14'
join public.curriculum_releases predecessor
  on predecessor.subject_program_id = sp.id
 and predecessor.release_key = 'physics7_u01_2026_08_14_pilot_r1'
on conflict (release_key) do update set
  version_label = excluded.version_label,
  source_snapshot = excluded.source_snapshot,
  content_fingerprint = excluded.content_fingerprint,
  notes = excluded.notes
where public.curriculum_releases.status = 'draft';

insert into public.curriculum_release_units (
  curriculum_release_id, unit_id, unit_code_snapshot, title_hy_snapshot,
  title_en_snapshot, sequence_order_snapshot
)
select cr.id, u.id, u.code, u.title_hy, u.title_en, u.sequence_order
from public.curriculum_releases cr
join public.units u on u.subject_program_id = cr.subject_program_id
  and u.code in ('PHY7-U01', 'PHY7-U02')
where cr.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
on conflict (curriculum_release_id, unit_id) do update set
  unit_code_snapshot = excluded.unit_code_snapshot,
  title_hy_snapshot = excluded.title_hy_snapshot,
  title_en_snapshot = excluded.title_en_snapshot,
  sequence_order_snapshot = excluded.sequence_order_snapshot;

insert into public.curriculum_release_reconciliations (
  curriculum_release_id, reconciliation_id, unit_id
)
select candidate.id, run.id, run.unit_id
from public.curriculum_releases candidate
join public.curriculum_reconciliation_runs run
  on run.reconciliation_key in ('physics7_u01_2026_08_14', 'physics7_u02_2026_08_14')
where candidate.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
on conflict (curriculum_release_id, unit_id) do update set
  reconciliation_id = excluded.reconciliation_id;

insert into public.curriculum_release_outcomes (
  curriculum_release_id, learning_outcome_id, source_document_id,
  official_code_snapshot, statement_hy_snapshot, statement_en_snapshot,
  source_locator_snapshot, requirement_level_snapshot,
  source_transcription_notes_snapshot, framework_references_snapshot,
  subject_standard_references_snapshot, mapping_notes_snapshot,
  sequence_order_snapshot
)
select candidate.id, o.learning_outcome_id, o.source_document_id,
       o.official_code_snapshot, o.statement_hy_snapshot, o.statement_en_snapshot,
       o.source_locator_snapshot, o.requirement_level_snapshot,
       o.source_transcription_notes_snapshot, o.framework_references_snapshot,
       o.subject_standard_references_snapshot, o.mapping_notes_snapshot,
       o.sequence_order_snapshot
from public.curriculum_releases candidate
join public.curriculum_releases predecessor
  on predecessor.release_key = 'physics7_u01_2026_08_14_pilot_r1'
join public.curriculum_release_outcomes o
  on o.curriculum_release_id = predecessor.id
where candidate.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
on conflict (curriculum_release_id, learning_outcome_id) do nothing;

with candidate as (
  select id from public.curriculum_releases
  where release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
), run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u02_2026_08_14'
)
insert into public.curriculum_release_outcomes (
  curriculum_release_id, learning_outcome_id, source_document_id,
  official_code_snapshot, statement_hy_snapshot, statement_en_snapshot,
  source_locator_snapshot, requirement_level_snapshot,
  source_transcription_notes_snapshot, framework_references_snapshot,
  subject_standard_references_snapshot, mapping_notes_snapshot,
  sequence_order_snapshot
)
select c.id, lo.id, lo.source_document_id, lo.official_code, lo.statement_hy,
       lo.statement_en, lo.source_locator, lo.requirement_level,
       lo.source_transcription_notes, lom.framework_references,
       lom.subject_standard_references, lom.mapping_notes, lo.sequence_order
from candidate c
cross join run r
join public.learning_outcome_normative_mappings lom
  on lom.reconciliation_id = r.id
join public.learning_outcomes lo on lo.id = lom.learning_outcome_id
on conflict (curriculum_release_id, learning_outcome_id) do update set
  statement_hy_snapshot = excluded.statement_hy_snapshot,
  source_transcription_notes_snapshot = excluded.source_transcription_notes_snapshot,
  framework_references_snapshot = excluded.framework_references_snapshot,
  subject_standard_references_snapshot = excluded.subject_standard_references_snapshot,
  mapping_notes_snapshot = excluded.mapping_notes_snapshot,
  sequence_order_snapshot = excluded.sequence_order_snapshot;

insert into public.curriculum_release_skills (
  curriculum_release_id, skill_id, skill_code_snapshot, name_hy_snapshot,
  name_en_snapshot, description_hy_snapshot, description_en_snapshot,
  layer_snapshot, sequence_order_snapshot, disposition_snapshot,
  rationale_snapshot, outcome_mapping_snapshot
)
select candidate.id, s.skill_id, s.skill_code_snapshot, s.name_hy_snapshot,
       s.name_en_snapshot, s.description_hy_snapshot, s.description_en_snapshot,
       s.layer_snapshot, s.sequence_order_snapshot, s.disposition_snapshot,
       s.rationale_snapshot, s.outcome_mapping_snapshot
from public.curriculum_releases candidate
join public.curriculum_releases predecessor
  on predecessor.release_key = 'physics7_u01_2026_08_14_pilot_r1'
join public.curriculum_release_skills s
  on s.curriculum_release_id = predecessor.id
where candidate.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
on conflict (curriculum_release_id, skill_id) do nothing;

with candidate as (
  select id from public.curriculum_releases
  where release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
), run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u02_2026_08_14'
)
insert into public.curriculum_release_skills (
  curriculum_release_id, skill_id, skill_code_snapshot, name_hy_snapshot,
  name_en_snapshot, description_hy_snapshot, description_en_snapshot,
  layer_snapshot, sequence_order_snapshot, disposition_snapshot,
  rationale_snapshot, outcome_mapping_snapshot
)
select c.id, s.id, s.code, s.name_hy, s.name_en, s.description_hy,
       s.description_en, s.layer::text, s.sequence_order, scr.disposition,
       scr.rationale,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'learningOutcomeId', m.learning_outcome_id,
           'mappingType', m.mapping_type,
           'rationale', m.rationale
         ) order by m.learning_outcome_id)
         from public.skill_outcome_curriculum_mappings m
         where m.reconciliation_id = r.id and m.skill_id = s.id
       ), '[]'::jsonb)
from candidate c
cross join run r
join public.skill_curriculum_reconciliations scr
  on scr.reconciliation_id = r.id
join public.skills s on s.id = scr.skill_id
on conflict (curriculum_release_id, skill_id) do update set
  name_hy_snapshot = excluded.name_hy_snapshot,
  name_en_snapshot = excluded.name_en_snapshot,
  description_hy_snapshot = excluded.description_hy_snapshot,
  layer_snapshot = excluded.layer_snapshot,
  sequence_order_snapshot = excluded.sequence_order_snapshot,
  disposition_snapshot = excluded.disposition_snapshot,
  rationale_snapshot = excluded.rationale_snapshot,
  outcome_mapping_snapshot = excluded.outcome_mapping_snapshot;

-- Chapter I families remain in the successor candidate. Chapter II families
-- are deliberately absent until the next governed item-family authoring slice.
insert into public.curriculum_release_item_families (
  curriculum_release_id, item_family_id, skill_id, family_code_snapshot,
  name_hy_snapshot, description_snapshot, primary_learning_outcome_id,
  disposition_snapshot, mapping_type_snapshot, rationale_snapshot
)
select candidate.id, f.item_family_id, f.skill_id, f.family_code_snapshot,
       f.name_hy_snapshot, f.description_snapshot, f.primary_learning_outcome_id,
       f.disposition_snapshot, f.mapping_type_snapshot, f.rationale_snapshot
from public.curriculum_releases candidate
join public.curriculum_releases predecessor
  on predecessor.release_key = 'physics7_u01_2026_08_14_pilot_r1'
join public.curriculum_release_item_families f
  on f.curriculum_release_id = predecessor.id
where candidate.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
on conflict (curriculum_release_id, item_family_id) do nothing;

with release as (
  select id from public.curriculum_releases
  where release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
), gates(gate_code, status, evidence, notes, checked_at) as (
  values
    ('official_programme_identified', 'passed',
      jsonb_build_object(
        'programmeDocumentKey', 'am_physics_grade7_programme_40n_36n',
        'programmeAttachmentSha256', '966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478'
      ),
      'Գործող N 40-Ն ծրագիրը՝ N 36-Ն փոփոխությամբ, գրանցված և կապված է թողարկման թեկնածուին։', now()),
    ('normative_sources_registered', 'passed',
      jsonb_build_object('governingLayers', 3, 'supportingTextbookChapter', 'Գլուխ II, էջեր 23–41'),
      'Պետական չափորոշիչը, ֆիզիկայի առարկայական չափորոշիչը և 7-րդ դասարանի ծրագիրը գրանցված են որպես ղեկավարող աղբյուրներ։ Դասագիրքը միայն օժանդակ աղբյուր է։', now()),
    ('outcomes_reconciled', 'pending', '{}'::jsonb,
      'Յոթ պաշտոնական վերջնարդյունքները տառադարձված են, սակայն թեմատիկ և չափորոշչային վերջնական համադրումը սպասում է բովանդակային ու մասնագիտական հաստատմանը։', null::timestamptz),
    ('skills_mapped', 'pending', jsonb_build_object('candidateSkills', 9),
      'Ինը թեկնածու հմտությունների կառուցվածքն ու նախապայմանները սպասում են բովանդակային ու ֆիզիկայի մասնագետի հաստատմանը։', null::timestamptz),
    ('assessment_scope_bound', 'pending', '{}'::jsonb,
      'Գլուխ II-ի հարցերի ընտանիքները, գնահատման ավազանները և երեք գնահատման ձևանմուշները դեռ չեն ստեղծվել։', null::timestamptz),
    ('content_qa_passed', 'pending', '{}'::jsonb,
      'Գլուխ II-ի հարցերն ու հուշումները դեռ չեն անցել բովանդակային որակի ստուգում։', null::timestamptz),
    ('external_sme_approved', 'pending', '{}'::jsonb,
      'Ֆիզիկայի արտաքին մասնագետի հաստատումը դեռ չի ստացվել։', null::timestamptz)
)
insert into public.curriculum_release_gate_checks (
  curriculum_release_id, gate_code, status, evidence, notes, checked_at, checked_by
)
select r.id, g.gate_code, g.status, g.evidence, g.notes, g.checked_at, null
from release r
cross join gates g
on conflict (curriculum_release_id, gate_code) do update set
  status = excluded.status,
  evidence = excluded.evidence,
  notes = excluded.notes,
  checked_at = excluded.checked_at,
  checked_by = null,
  updated_at = now();
