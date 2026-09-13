-- Grade 7 Physics Chapter I development bank v0.2 expansion.
-- Adds 36 items so that each of the 10 micro-skills has six items (60 total).
-- Source basis: Գ. Մելիքյան, Ս. Մաիլյան, Ֆիզիկա 7, Էդիթ Պրինտ, 2023, Chapter I §§1–6.
-- Content remains provisional_no_sme_review and pilot_ready=false.

with bank(code,skill_code,item_type,prompt_hy,difficulty,stimulus,item_family,answer,tolerance,canonical_unit,accepted_units,feedback_code) as (
values
('PHY7-U01-S01-I03','PHY7-U01-S01','single_choice','Հայելուց լույսի անդրադարձը ո՞ր տեսակի ֆիզիկական երևույթ է:',2,'{}'::jsonb,'application','"C"'::jsonb,null::numeric,null::text,'{}'::text[],'PHY7-U01-S01_CLASSIFY'),
('PHY7-U01-S01-I04','PHY7-U01-S01','single_choice','Կողմնացույցի սլաքի շեղումը ո՞ր տեսակի ֆիզիկական երևույթ է:',2,'{}'::jsonb,'application','"D"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S01_CLASSIFY'),
('PHY7-U01-S01-I05','PHY7-U01-S01','single_choice','Ո՞ր օրինակը ֆիզիկական երևույթ չէ:',2,'{}'::jsonb,'application','"D"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S01_CLASSIFY'),
('PHY7-U01-S01-I06','PHY7-U01-S01','single_choice','Նետի սլանալը ո՞ր տեսակի ֆիզիկական երևույթ է:',1,'{}'::jsonb,'application','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S01_CLASSIFY'),
('PHY7-U01-S02-I03','PHY7-U01-S02','single_choice','«Պղնձե կաթսա» արտահայտության մեջ ո՞րն է մարմինը և ո՞րն է նյութը:',2,'{}'::jsonb,'application','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S02_BODY_MATERIAL'),
('PHY7-U01-S02-I04','PHY7-U01-S02','single_choice','Ո՞ր տարբերակում են ճիշտ համապատասխանեցված մարմինը, նյութը և երևույթը:',2,'{}'::jsonb,'application','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S02_BODY_MATERIAL'),
('PHY7-U01-S02-I05','PHY7-U01-S02','true_false','Միևնույն անվանումով ֆիզիկական մարմինները կարող են պատրաստված լինել տարբեր նյութերից:',2,'{}'::jsonb,'knowledge','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S02_BODY_MATERIAL'),
('PHY7-U01-S02-I06','PHY7-U01-S02','single_choice','Ո՞ր շարքում է հաջորդականությունը՝ մարմին → նյութ → երևույթ:',3,'{}'::jsonb,'application','"C"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S02_BODY_MATERIAL'),
('PHY7-U01-S03-I03','PHY7-U01-S03','single_choice','Ո՞ր գիտնականն է դասագրքում ներկայացված որպես դասական մեխանիկայի հիմնադիր:',1,'{}'::jsonb,'knowledge','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S03_SCIENTISTS'),
('PHY7-U01-S03-I04','PHY7-U01-S03','single_choice','Ո՞ր գիտնականը մագնիսի միջոցով էլեկտրական հոսանք ստանալու երևույթը հայտնաբերեց երկարատև փորձերի արդյունքում:',2,'{}'::jsonb,'knowledge','"C"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S03_SCIENTISTS'),
('PHY7-U01-S03-I05','PHY7-U01-S03','single_choice','Ո՞ւմ ջանքերով է 1942 թ. հիմնադրվել Արագածի տիեզերական ճառագայթների ուսումնասիրման կայանը:',2,'{}'::jsonb,'knowledge','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S03_ARMENIAN_PHYSICS'),
('PHY7-U01-S03-I06','PHY7-U01-S03','single_choice','Ո՞ր գիտնականի նախաձեռնությամբ և ղեկավարությամբ է հիմնադրվել Բյուրականի աստղադիտարանը:',2,'{}'::jsonb,'knowledge','"D"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S03_ARMENIAN_PHYSICS'),
('PHY7-U01-S04-I03','PHY7-U01-S04','single_choice','Աշակերտը անձրևից հետո դիտում է ծիածանը և գրանցում տեսածը՝ առանց պայմանները փոխելու: Սա հիմնականում ո՞ր մեթոդն է:',2,'{}'::jsonb,'application','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S04_OBS_VS_EXP'),
('PHY7-U01-S04-I04','PHY7-U01-S04','single_choice','Աշակերտը նույն պայմաններում մի քանի անգամ տաքացնում է ջուրը և ամեն րոպե չափում ջերմաստիճանը: Սա հիմնականում ո՞ր մեթոդն է:',2,'{}'::jsonb,'application','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S04_OBS_VS_EXP'),
('PHY7-U01-S04-I05','PHY7-U01-S04','single_choice','Ո՞ր հատկանիշն է առավել բնորոշ փորձին՝ համեմատած սովորական դիտման հետ:',3,'{}'::jsonb,'reasoning','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S04_OBS_VS_EXP'),
('PHY7-U01-S04-I06','PHY7-U01-S04','single_choice','Աստղագետը հեռադիտակով հետևում է Լուսնի խավարմանը՝ չփոխելով երևույթի պայմանները: Սա ո՞ր մեթոդն է:',2,'{}'::jsonb,'application','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S04_OBS_VS_EXP'),
('PHY7-U01-S05-I03','PHY7-U01-S05','single_choice','Ո՞ր հաջորդականությունն է լավագույնս ներկայացնում դասագրքում նկարագրված գիտական հետազոտության ընթացքը:',3,'{}'::jsonb,'reasoning','"C"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S05_INQUIRY_CHAIN'),
('PHY7-U01-S05-I04','PHY7-U01-S05','single_choice','Աշակերտը ենթադրում է, որ մագնիսը ձգում է միայն երկաթ պարունակող առարկաները: Ո՞ր գործողությունն է ամենահարմարն այդ վարկածը ստուգելու համար:',3,'{}'::jsonb,'reasoning','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S05_TEST_HYPOTHESIS'),
('PHY7-U01-S05-I05','PHY7-U01-S05','single_choice','Աշակերտը մեկ անգամ տեսնում է, որ ավելի ծանր առարկան առաջինն է հասնում հատակին և եզրակացնում է՝ «բոլոր ծանր մարմինները միշտ ավելի արագ են ընկնում»: Ի՞նչ խնդիր կա այս եզրակացության մեջ:',4,'{}'::jsonb,'reasoning','"C"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S05_EVIDENCE'),
('PHY7-U01-S05-I06','PHY7-U01-S05','single_choice','Վարկած առաջադրելուց հետո ո՞րն է ամենահարմար հաջորդ քայլը:',2,'{}'::jsonb,'reasoning','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S05_TEST_HYPOTHESIS'),
('PHY7-U01-S06-I03','PHY7-U01-S06','single_choice','Ո՞րն է ժամանակի ՄՀ հիմնական միավորը:',1,'{}'::jsonb,'knowledge','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S06_UNITS'),
('PHY7-U01-S06-I04','PHY7-U01-S06','single_choice','Ո՞րն է զանգվածի ՄՀ հիմնական միավորը:',1,'{}'::jsonb,'knowledge','"C"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S06_UNITS'),
('PHY7-U01-S06-I05','PHY7-U01-S06','single_choice','Ո՞ր սարքն է առավել հարմար հեղուկի ծավալը չափելու համար:',2,'{}'::jsonb,'application','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S06_INSTRUMENT'),
('PHY7-U01-S06-I06','PHY7-U01-S06','single_choice','Ո՞ր եռյակն է ճիշտ՝ ֆիզիկական մեծություն → չափիչ սարք → չափման միավոր:',2,'{}'::jsonb,'application','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S06_MATCH'),
('PHY7-U01-S07-I04','PHY7-U01-S07','numeric','4500 մմ-ը արտահայտեք մետրերով: Գրեք միայն թիվը:',2,'{}'::jsonb,'application','4.5'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S07_CONVERT'),
('PHY7-U01-S07-I05','PHY7-U01-S07','numeric','2.5 ժամը արտահայտեք վայրկյաններով: Գրեք միայն թիվը:',3,'{}'::jsonb,'application','9000'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S07_CONVERT'),
('PHY7-U01-S07-I06','PHY7-U01-S07','quantity','2500 մլ-ը արտահայտեք լիտրերով: Մուտքագրեք թվային արժեքը և միավորը:',3,'{"kind":"unit_conversion","from_value":2500,"from_unit":"mL","to_unit":"L"}'::jsonb,'application','2.5'::jsonb,0.000001,'L',array['L','l','լ']::text[],'PHY7-U01-S07_CONVERT'),
('PHY7-U01-S08-I04','PHY7-U01-S08','numeric','Ջերմաչափի 0°C և 10°C նշումների միջև կա 5 հավասար բաժանում: Որքա՞ն է մեկ բաժանման արժեքը °C-ով: Գրեք միայն թիվը:',2,'{"kind":"scale_spec","orientation":"vertical","lower":0,"upper":10,"divisions":5,"unit":"°C"}'::jsonb,'application','2'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S08_SCALE'),
('PHY7-U01-S08-I05','PHY7-U01-S08','numeric','Քանոնի 0 սմ և 5 սմ նշումների միջև կա 50 հավասար բաժանում: Որքա՞ն է մեկ բաժանման արժեքը սմ-ով: Գրեք միայն թիվը:',3,'{"kind":"scale_spec","orientation":"horizontal","lower":0,"upper":5,"divisions":50,"unit":"cm"}'::jsonb,'application','0.1'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S08_SCALE'),
('PHY7-U01-S08-I06','PHY7-U01-S08','numeric','Սանդղակի հիմքային նշումը 20 է, մեկ բաժանումը՝ 2 միավոր, և ցուցիչը գտնվում է հիմքից 3 բաժանում վեր: Ի՞նչ արժեք է ցույց տալիս սարքը:',3,'{"kind":"scale_spec","orientation":"vertical","base":20,"division_value":2,"mark_offset":3,"unit":"arb"}'::jsonb,'application','26'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S08_SCALE'),
('PHY7-U01-S09-I04','PHY7-U01-S09','numeric','Չափման արդյունքը գրված է l=(12.5±0.05) սմ: Ըստ դասագրքի կանոնի՝ որքա՞ն է օգտագործված քանոնի մեկ բաժանման արժեքը սմ-ով: Գրեք միայն թիվը:',3,'{"kind":"measurement_result","value":12.5,"error":0.05,"unit":"cm"}'::jsonb,'reasoning','0.1'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S09_ERROR'),
('PHY7-U01-S09-I05','PHY7-U01-S09','numeric','Ջերմաչափի մեկ բաժանման արժեքը 5°C է: Ըստ դասագրքի կանոնի՝ որքա՞ն է չափման սխալը °C-ով: Գրեք միայն թիվը:',2,'{"kind":"scale_spec","orientation":"vertical","division_value":5,"unit":"°C"}'::jsonb,'reasoning','2.5'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S09_ERROR'),
('PHY7-U01-S09-I06','PHY7-U01-S09','single_choice','Գրքի մեկ թերթի հաստությունը որոշում են՝ գրքի ընդհանուր հաստությունը չափելով և այն թերթերի թվին բաժանելով: Սա ինչպիսի՞ չափում է:',3,'{"kind":"stack_measurement","object":"book_sheets"}'::jsonb,'reasoning','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S09_DIRECT_INDIRECT'),
('PHY7-U01-S10-I04','PHY7-U01-S10','numeric','Չափագլանում ջրի սկզբնական ծավալը 60 սմ³ է, իսկ մարմինը լրիվ խորասուզելուց հետո՝ 84 սմ³: Որքա՞ն է մարմնի ծավալը սմ³-ով:',2,'{"kind":"displacement","V1":60,"V2":84,"unit":"cm3"}'::jsonb,'transfer','24'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S10_DISPLACEMENT'),
('PHY7-U01-S10-I05','PHY7-U01-S10','single_choice','Անկանոն մարմնի ծավալը ջրի տեղահանմամբ որոշելիս ո՞ր գործողությունը կդարձնի արդյունքը անվստահելի:',4,'{"kind":"displacement_procedure"}'::jsonb,'transfer','"C"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S10_PROCEDURE'),
('PHY7-U01-S10-I06','PHY7-U01-S10','numeric','40 նույնական թերթերի ընդհանուր հաստությունը 8 մմ է: Որքա՞ն է մեկ թերթի հաստությունը մմ-ով:',3,'{"kind":"stack_measurement","count":40,"total_thickness":8,"unit":"mm"}'::jsonb,'transfer','0.2'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S10_INDIRECT')
), upserted as (
insert into public.items(code,skill_id,item_type,prompt_hy,stimulus,difficulty,config,status)
select b.code,s.id,b.item_type::public.item_type,b.prompt_hy,b.stimulus,b.difficulty,
jsonb_build_object('bank','PHY7-U01-V0.2','pilot_ready',false,'source_basis','Ֆիզիկա 7 (Մելիքյան, Մաիլյան), 2023, Գլուխ I','validation_state','provisional_no_sme_review','official_2026_outcome_verified',false,'item_family',b.item_family),
'published'::public.content_status
from bank b join public.skills s on s.code=b.skill_code
on conflict(code) where code is not null do update set
  skill_id=excluded.skill_id,
  item_type=excluded.item_type,
  prompt_hy=excluded.prompt_hy,
  stimulus=excluded.stimulus,
  difficulty=excluded.difficulty,
  config=excluded.config,
  status=excluded.status,
  updated_at=now()
returning id,code
)
insert into public.item_answer_keys(item_id,answer,tolerance,canonical_unit,accepted_units,feedback_code)
select i.id,b.answer,b.tolerance,b.canonical_unit,b.accepted_units,b.feedback_code
from bank b join public.items i on i.code=b.code
on conflict(item_id) do update set
  answer=excluded.answer,
  tolerance=excluded.tolerance,
  canonical_unit=excluded.canonical_unit,
  accepted_units=excluded.accepted_units,
  feedback_code=excluded.feedback_code,
  updated_at=now();
