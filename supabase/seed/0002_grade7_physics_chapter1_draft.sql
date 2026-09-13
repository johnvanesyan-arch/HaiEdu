-- Grade 7 Physics — Chapter I draft curriculum graph
-- Status rule: official framework/program shell may be published; derived unit/topics/skills remain review
-- until the Physics SME validates them and the exact 2026 Grade 7 programme outcome wording is extracted.

begin;

insert into public.curriculum_frameworks (
  country_code,
  title,
  version_label,
  effective_from,
  source_url,
  status
)
values (
  'AM',
  'ՀՀ հանրակրթության պետական չափորոշիչ',
  '2026 current incorporation (N 439-Ն as amended by N 699-Ն)',
  null,
  'https://www.arlis.am/hy/acts/225446',
  'published'
)
on conflict (country_code, title, version_label)
do update set
  source_url = excluded.source_url,
  status = excluded.status;

insert into public.subject_programs (
  curriculum_framework_id,
  subject_id,
  grade_id,
  version_label,
  source_url,
  effective_from,
  status
)
select
  cf.id,
  s.id,
  g.id,
  '2026-08-14 / N 40-Ն as amended by N 36-Ն',
  'https://www.arlis.am/hy/acts/229331',
  date '2026-08-14',
  'published'
from public.curriculum_frameworks cf
join public.subjects s on s.code = 'physics'
join public.grades g on g.grade_number = 7
where cf.country_code = 'AM'
  and cf.title = 'ՀՀ հանրակրթության պետական չափորոշիչ'
  and cf.version_label = '2026 current incorporation (N 439-Ն as amended by N 699-Ն)'
on conflict (curriculum_framework_id, subject_id, grade_id, version_label)
do update set
  source_url = excluded.source_url,
  effective_from = excluded.effective_from,
  status = excluded.status;

insert into public.units (
  subject_program_id,
  code,
  title_hy,
  title_en,
  sequence_order,
  status
)
select
  sp.id,
  'PHY7-U01',
  'Բնության ուսումնասիրության ֆիզիկական մեթոդները',
  'Physical methods of studying nature',
  1,
  'review'
from public.subject_programs sp
join public.subjects s on s.id = sp.subject_id
join public.grades g on g.id = sp.grade_id
where s.code = 'physics'
  and g.grade_number = 7
  and sp.version_label = '2026-08-14 / N 40-Ն as amended by N 36-Ն'
  and not exists (
    select 1 from public.units u
    where u.subject_program_id = sp.id and u.code = 'PHY7-U01'
  );

with target_unit as (
  select u.id
  from public.units u
  join public.subject_programs sp on sp.id = u.subject_program_id
  join public.subjects s on s.id = sp.subject_id
  join public.grades g on g.id = sp.grade_id
  where s.code='physics' and g.grade_number=7
    and sp.version_label='2026-08-14 / N 40-Ն as amended by N 36-Ն'
    and u.code='PHY7-U01'
  limit 1
), topic_data(code,title_hy,title_en,sequence_order) as (
  values
    ('PHY7-U01-T01','Ֆիզիկայի ուսումնասիրման առարկան։ Ֆիզիկական երևույթներ','Subject matter of physics; physical phenomena',1),
    ('PHY7-U01-T02','Ֆիզիկոսներ։ Հայ անվանի ֆիզիկոսներ','Physicists; notable Armenian physicists',2),
    ('PHY7-U01-T03','Դիտումներ, փորձեր և գիտական հետազոտության քայլեր','Observation, experiments, and scientific inquiry',3),
    ('PHY7-U01-T04','Ֆիզիկական մեծություններ և չափումներ','Physical quantities and measurement',4),
    ('PHY7-U01-T05','Չափումներ պարզագույն սարքերով և խնդիրների լուծում','Measurement laboratory and problem solving',5)
)
insert into public.topics(unit_id,code,title_hy,title_en,sequence_order,status)
select tu.id, td.code, td.title_hy, td.title_en, td.sequence_order, 'review'
from target_unit tu cross join topic_data td
where not exists (
  select 1 from public.topics t where t.unit_id=tu.id and t.code=td.code
);

with subject_grade as (
  select s.id as subject_id, g.id as grade_id
  from public.subjects s cross join public.grades g
  where s.code='physics' and g.grade_number=7
), skill_data(code,name_hy,name_en,description_hy,description_en,layer,sequence_order) as (
  values
    ('PHY7-U01-S01','Ֆիզիկական երևույթների ճանաչում և դասակարգում','Recognise and classify physical phenomena',
     'Ճանաչել ֆիզիկական երևույթները և համապատասխան դեպքերում դասակարգել առօրյա օրինակները ըստ լայն տեսակի։',
     'Recognise physical phenomena and, where appropriate, classify familiar examples by broad type.',
     'knowledge'::public.skill_layer,1),
    ('PHY7-U01-S02','Ֆիզիկական մարմին, նյութ և երևույթ տարբերակելը','Distinguish body, material, and phenomenon',
     'Տարբերել ֆիզիկական մարմինը, նյութը և տեղի ունեցող երևույթը/գործընթացը։',
     'Distinguish a physical body/object, the material it is made from, and a phenomenon/process.',
     'knowledge'::public.skill_layer,2),
    ('PHY7-U01-S03','Ֆիզիկոսներ և հայ ֆիզիկոսներ','Physicists and Armenian physicists',
     'Դասագրքում ներկայացված ընտրված գիտնականներին կապել նրանց հիմնական գիտական ներդրումների հետ՝ հատուկ ուշադրությամբ հայ գիտնականներին։',
     'Associate selected textbook scientists with their broad scientific contributions, with particular attention to Armenian scientists.',
     'knowledge'::public.skill_layer,3),
    ('PHY7-U01-S04','Դիտումը և փորձը տարբերակելը','Distinguish observation and experiment',
     'Տրված իրավիճակում որոշել՝ այն դիտում է, թե փորձ, և հիմնավորել տարբերությունը։',
     'Given a scenario, determine whether it is observation or experiment and explain the essential difference.',
     'application'::public.skill_layer,4),
    ('PHY7-U01-S05','Վարկած–փորձ–տվյալ–եզրակացություն շղթան','Hypothesis–test–data–conclusion chain',
     'Կիրառել գիտական ուսումնասիրության շղթան՝ խնդիր/դիտում, վարկած, փորձնական ստուգում, տվյալ/ապացույց, եզրակացություն։',
     'Use the inquiry chain: observation/problem, hypothesis, experimental test, evidence/data, and conclusion.',
     'reasoning'::public.skill_layer,5),
    ('PHY7-U01-S06','Ֆիզիկական մեծություններ, միավորներ և չափիչ սարքեր','Physical quantities, units, and instruments',
     'Համապատասխանեցնել սովորական ֆիզիկական մեծությունները չափման միավորների և համապատասխան սարքերի հետ, ճանաչել գլխում ներկայացված ՄՀ հիմնական միավորները։',
     'Match common physical quantities to appropriate units and measuring instruments; identify the core SI units introduced in the chapter.',
     'knowledge'::public.skill_layer,6),
    ('PHY7-U01-S07','Չափման միավորների պարզ փոխարկումներ','Simple unit conversions',
     'Կատարել գլխում կիրառվող երկարության, ժամանակի և ծավալի պարզ միավորային փոխարկումներ։',
     'Perform simple length, time, and volume unit conversions used in Chapter I measurement tasks.',
     'application'::public.skill_layer,7),
    ('PHY7-U01-S08','Սանդղակի բաժանման արժեքը, չափման սահմանը և ցուցմունքը','Scale division, measurement limit, and reading',
     'Որոշել չափիչ սարքի սանդղակի բաժանման արժեքը, չափման սահմանը և կարդալ ցուցմունքը գծապատկերից կամ սարքից։',
     'Determine an instrument scale division value, measurement limit, and reading from a labelled scale or diagram.',
     'application'::public.skill_layer,8),
    ('PHY7-U01-S09','Չափման սխալ և ճշգրտության գնահատում','Measurement error and precision',
     'Հաշվել դասագրքում ընդունված չափման սխալը՝ բաժանման արժեքի կեսը, համեմատել չափումների ճշգրտությունը, նկատել դիրքային/պարալաքսային սխալներ և տարբերել ուղղակի ու անուղղակի չափումները։',
     'Use the textbook half-division error convention, compare precision, detect poor reading/positioning, and distinguish direct from indirect measurement.',
     'reasoning'::public.skill_layer,9),
    ('PHY7-U01-S10','Չափման փորձի պլանավորում և անկանոն մարմնի ծավալի որոշում','Plan a measurement investigation and determine irregular volume',
     'Պլանավորել/մեկնաբանել պարզ չափման ընթացակարգ, գրանցել արդյունքները և որոշել անկանոն մարմնի ծավալը արտամղման մեթոդով՝ V=V2−V1, այն կիրառելով նաև նոր իրավիճակում։',
     'Plan/interpret a simple measurement procedure, record results, and determine irregular-object volume by displacement using V=V2−V1, including transfer to a new setup.',
     'transfer'::public.skill_layer,10)
)
insert into public.skills(subject_id,grade_id,code,name_hy,name_en,description_hy,description_en,layer,sequence_order,status)
select sg.subject_id,sg.grade_id,sd.code,sd.name_hy,sd.name_en,sd.description_hy,sd.description_en,sd.layer,sd.sequence_order,'review'
from subject_grade sg cross join skill_data sd
on conflict (code) do update set
  name_hy=excluded.name_hy,
  name_en=excluded.name_en,
  description_hy=excluded.description_hy,
  description_en=excluded.description_en,
  layer=excluded.layer,
  sequence_order=excluded.sequence_order,
  status='review';

with prereq(skill_code,prereq_code) as (
  values
    ('PHY7-U01-S04','PHY7-U01-S01'),
    ('PHY7-U01-S05','PHY7-U01-S04'),
    ('PHY7-U01-S07','PHY7-U01-S06'),
    ('PHY7-U01-S08','PHY7-U01-S06'),
    ('PHY7-U01-S09','PHY7-U01-S08'),
    ('PHY7-U01-S10','PHY7-U01-S05'),
    ('PHY7-U01-S10','PHY7-U01-S07'),
    ('PHY7-U01-S10','PHY7-U01-S08'),
    ('PHY7-U01-S10','PHY7-U01-S09')
)
insert into public.skill_prerequisites(skill_id,prerequisite_skill_id,required_mastery)
select s.id,p.id,0.65
from prereq x
join public.skills s on s.code=x.skill_code
join public.skills p on p.code=x.prereq_code
on conflict (skill_id,prerequisite_skill_id)
do update set required_mastery=excluded.required_mastery;

-- Deliberately no insert into learning_outcomes or skill_outcomes here.
-- Exact current 2026 Grade 7 programme wording must be verified first.

commit;
