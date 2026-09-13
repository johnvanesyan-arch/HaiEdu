-- Grade 7 Physics Chapter I provisional deterministic item bank v0.1
-- Source basis: Գ. Մելիքյան, Ս. Մաիլյան, Ֆիզիկա 7, Էդիթ Պրինտ, 2023, Chapter I §§1–6.
-- SME review is deferred by product-owner decision. These items are DEVELOPMENT content.
-- Current 2026 official outcome wording remains a separate verification task.

begin;

with bank(code,skill_code,item_type,prompt_hy,difficulty,answer,stimulus,feedback_code) as (
  values
  ('PHY7-U01-S01-I01','PHY7-U01-S01','single_choice','Ո՞րն է ֆիզիկական երևույթ:',1,'"B"'::jsonb,'{}'::jsonb,'PHY7-U01-S01_REVIEW'),
  ('PHY7-U01-S01-I02','PHY7-U01-S01','true_false','Ջրի եռալը ֆիզիկական երևույթ է:',1,'true'::jsonb,'{}'::jsonb,'PHY7-U01-S01_REVIEW'),
  ('PHY7-U01-S02-I01','PHY7-U01-S02','single_choice','Ո՞ր զույգում առաջինը ֆիզիկական մարմին է, իսկ երկրորդը՝ նյութ:',1,'"B"'::jsonb,'{}'::jsonb,'PHY7-U01-S02_REVIEW'),
  ('PHY7-U01-S02-I02','PHY7-U01-S02','true_false','Նյութը այն է, ինչից կազմված են ֆիզիկական մարմինները:',1,'true'::jsonb,'{}'::jsonb,'PHY7-U01-S02_REVIEW'),
  ('PHY7-U01-S03-I01','PHY7-U01-S03','single_choice','Ո՞ր գիտնականն է դասագրքում ներկայացված որպես բնության հետազոտման փորձարարական մեթոդի հիմնադիր:',1,'"A"'::jsonb,'{}'::jsonb,'PHY7-U01-S03_REVIEW'),
  ('PHY7-U01-S03-I02','PHY7-U01-S03','true_false','Անանիա Շիրակացին գիտականորեն բացատրել է Արեգակի և Լուսնի խավարումները:',1,'true'::jsonb,'{}'::jsonb,'PHY7-U01-S03_REVIEW'),
  ('PHY7-U01-S04-I01','PHY7-U01-S04','single_choice','Ո՞ր իրավիճակն է առավել ճիշտ նկարագրում փորձ, այլ ոչ միայն դիտում:',2,'"B"'::jsonb,'{}'::jsonb,'PHY7-U01-S04_REVIEW'),
  ('PHY7-U01-S04-I02','PHY7-U01-S04','true_false','Փորձի առավելություններից մեկն այն է, որ երևույթը կարելի է նույն պայմաններում բազմիցս կրկնել:',1,'true'::jsonb,'{}'::jsonb,'PHY7-U01-S04_REVIEW'),
  ('PHY7-U01-S05-I01','PHY7-U01-S05','single_choice','Ֆիզիկական երևույթը բացատրելու համար առաջարկված ենթադրությունը կոչվում է՝',1,'"B"'::jsonb,'{}'::jsonb,'PHY7-U01-S05_REVIEW'),
  ('PHY7-U01-S05-I02','PHY7-U01-S05','true_false','Ֆիզիկական տեսությունը կարող է ոչ միայն բացատրել հայտնի երևույթները, այլ նաև կանխատեսել նոր երևույթներ և դրանց հետևանքները:',2,'true'::jsonb,'{}'::jsonb,'PHY7-U01-S05_REVIEW'),
  ('PHY7-U01-S06-I01','PHY7-U01-S06','single_choice','Ո՞րն է երկարության ՄՀ հիմնական միավորը:',1,'"A"'::jsonb,'{}'::jsonb,'PHY7-U01-S06_REVIEW'),
  ('PHY7-U01-S06-I02','PHY7-U01-S06','true_false','Ֆիզիկական մեծության չափման արդյունքը պետք է ներառի թվային արժեք և համապատասխան միավոր:',1,'true'::jsonb,'{}'::jsonb,'PHY7-U01-S06_REVIEW'),
  ('PHY7-U01-S07-I01','PHY7-U01-S07','numeric','2 կմ-ը արտահայտեք մետրերով: Գրեք միայն թիվը:',1,'2000'::jsonb,'{}'::jsonb,'PHY7-U01-S07_REVIEW'),
  ('PHY7-U01-S07-I02','PHY7-U01-S07','numeric','35 սմ-ը արտահայտեք մետրերով: Գրեք միայն թիվը:',2,'0.35'::jsonb,'{}'::jsonb,'PHY7-U01-S07_REVIEW'),
  ('PHY7-U01-S07-I03','PHY7-U01-S07','numeric','3 րոպեն արտահայտեք վայրկյաններով: Գրեք միայն թիվը:',1,'180'::jsonb,'{}'::jsonb,'PHY7-U01-S07_REVIEW'),
  ('PHY7-U01-S08-I01','PHY7-U01-S08','numeric','Չափագլանի սանդղակում 100 սմ³ և 150 սմ³ նշումների միջև կա 10 հավասար բաժանում: Որքա՞ն է մեկ բաժանման արժեքը սմ³-ով: Գրեք միայն թիվը:',2,'5'::jsonb,'{"kind":"scale_spec","lower":100,"upper":150,"divisions":10,"unit":"cm3"}'::jsonb,'PHY7-U01-S08_REVIEW'),
  ('PHY7-U01-S08-I02','PHY7-U01-S08','numeric','Նույն սանդղակում հեղուկի մակարդակը գտնվում է 100 սմ³ նշումից վեր 6-րդ գծիկի վրա, իսկ մեկ բաժանումը 5 սմ³ է: Որքա՞ն է հեղուկի ծավալը սմ³-ով: Գրեք միայն թիվը:',2,'130'::jsonb,'{"kind":"scale_spec","base":100,"division_value":5,"mark_offset":6,"unit":"cm3"}'::jsonb,'PHY7-U01-S08_REVIEW'),
  ('PHY7-U01-S08-I03','PHY7-U01-S08','single_choice','Չափիչ սարքի սանդղակի ամենամեծ արժեքը ինչպե՞ս է կոչվում:',1,'"B"'::jsonb,'{}'::jsonb,'PHY7-U01-S08_REVIEW'),
  ('PHY7-U01-S09-I01','PHY7-U01-S09','numeric','Չափիչ սարքի մեկ բաժանման արժեքը 0.4 սմ է: Ընդունված կանոնով որքա՞ն է չափման սխալը սմ-ով: Գրեք միայն թիվը:',2,'0.2'::jsonb,'{}'::jsonb,'PHY7-U01-S09_REVIEW'),
  ('PHY7-U01-S09-I02','PHY7-U01-S09','single_choice','Միևնույն երկարությունը չափվում է երկու քանոնով. A-ի բաժանման արժեքը 0.5 սմ է, B-ինը՝ 0.1 սմ: Ո՞ր քանոնը սովորաբար կտա ավելի ճշգրիտ արդյունք:',2,'"B"'::jsonb,'{}'::jsonb,'PHY7-U01-S09_REVIEW'),
  ('PHY7-U01-S09-I03','PHY7-U01-S09','single_choice','Ո՞րն է անուղղակի չափման օրինակ:',2,'"D"'::jsonb,'{}'::jsonb,'PHY7-U01-S09_REVIEW'),
  ('PHY7-U01-S10-I01','PHY7-U01-S10','numeric','Չափագլանում սկզբում կա 35 սմ³ ջուր: Մարմինը լրիվ խորասուզելուց հետո ցուցմունքը դառնում է 52 սմ³: Որքա՞ն է մարմնի ծավալը սմ³-ով: Գրեք միայն թիվը:',2,'17'::jsonb,'{"kind":"displacement","V1":35,"V2":52,"unit":"cm3"}'::jsonb,'PHY7-U01-S10_REVIEW'),
  ('PHY7-U01-S10-I02','PHY7-U01-S10','single_choice','Անկանոն ձև ունեցող փոքր մարմնի ծավալը չափագլանով որոշելու ճիշտ գործողությունը ո՞րն է:',3,'"A"'::jsonb,'{}'::jsonb,'PHY7-U01-S10_REVIEW'),
  ('PHY7-U01-S10-I03','PHY7-U01-S10','numeric','Փորձում ջրի սկզբնական ծավալը 48 սմ³ է, իսկ մարմնի խորասուզումից հետո՝ 73 սմ³: Գտեք մարմնի ծավալը սմ³-ով:',2,'25'::jsonb,'{"kind":"displacement","V1":48,"V2":73,"unit":"cm3"}'::jsonb,'PHY7-U01-S10_REVIEW')
), upserted as (
  insert into public.items(code,skill_id,item_type,prompt_hy,stimulus,difficulty,config,status)
  select b.code,s.id,b.item_type::public.item_type,b.prompt_hy,b.stimulus,b.difficulty,
         jsonb_build_object('bank','PHY7-U01-V0.1','validation_state','provisional_no_sme_review','pilot_ready',false,'source_basis','Ֆիզիկա 7 (Մելիքյան, Մաիլյան), 2023, Գլուխ I','official_2026_outcome_verified',false),
         'published'::public.content_status
  from bank b join public.skills s on s.code=b.skill_code
  on conflict (code) where code is not null do update set skill_id=excluded.skill_id,item_type=excluded.item_type,prompt_hy=excluded.prompt_hy,stimulus=excluded.stimulus,difficulty=excluded.difficulty,config=excluded.config,status=excluded.status,updated_at=now()
  returning id,code
)
insert into public.item_answer_keys(item_id,answer,tolerance,accepted_units,feedback_code)
select i.id,b.answer,case when b.item_type='numeric' then 0.000001::numeric else null end,'{}'::text[],b.feedback_code
from bank b join public.items i on i.code=b.code
on conflict(item_id) do update set answer=excluded.answer,tolerance=excluded.tolerance,accepted_units=excluded.accepted_units,feedback_code=excluded.feedback_code,updated_at=now();

-- Refresh MCQ options for this provisional bank.
delete from public.item_options io using public.items i where io.item_id=i.id and i.code like 'PHY7-U01-%';

insert into public.item_options(item_id,option_key,content_hy,display_order)
select i.id,v.option_key,v.content_hy,v.display_order
from (values
('PHY7-U01-S01-I01','A','Ծառի ծաղկելը',1),('PHY7-U01-S01-I01','B','Սառույցի հալվելը',2),('PHY7-U01-S01-I01','C','Բույսի աճելը',3),('PHY7-U01-S01-I01','D','Թթվածնի և ջրածնի միացումից ջուր առաջանալը',4),
('PHY7-U01-S02-I01','A','Երկաթ — դռան բռնակ',1),('PHY7-U01-S02-I01','B','Դռան բռնակ — երկաթ',2),('PHY7-U01-S02-I01','C','Հալվել — սառույց',3),('PHY7-U01-S02-I01','D','Ջուր — ջրի կաթիլ',4),
('PHY7-U01-S03-I01','A','Գալիլեո Գալիլեյ',1),('PHY7-U01-S03-I01','B','Իսահակ Նյուտոն',2),('PHY7-U01-S03-I01','C','Ալբերտ Այնշտայն',3),('PHY7-U01-S03-I01','D','Նիլս Բոր',4),
('PHY7-U01-S04-I01','A','Դիտել ծիածանը անձրևից հետո',1),('PHY7-U01-S04-I01','B','Նույն պայմաններում մի քանի անգամ կրկնել երևույթը և չափումներ կատարել',2),('PHY7-U01-S04-I01','C','Դիտել Լուսնի խավարումը',3),('PHY7-U01-S04-I01','D','Նայել, թե ինչպես է սառույցը հալվում սենյակում',4),
('PHY7-U01-S05-I01','A','չափման սահման',1),('PHY7-U01-S05-I01','B','վարկած',2),('PHY7-U01-S05-I01','C','միավոր',3),('PHY7-U01-S05-I01','D','սանդղակ',4),
('PHY7-U01-S06-I01','A','մետր',1),('PHY7-U01-S06-I01','B','վայրկյան',2),('PHY7-U01-S06-I01','C','կիլոգրամ',3),('PHY7-U01-S06-I01','D','լիտր',4),
('PHY7-U01-S08-I03','A','Չափման սխալ',1),('PHY7-U01-S08-I03','B','Չափման սահման',2),('PHY7-U01-S08-I03','C','Թվային արժեք',3),('PHY7-U01-S08-I03','D','Ուղղակի չափում',4),
('PHY7-U01-S09-I02','A','A քանոնը',1),('PHY7-U01-S09-I02','B','B քանոնը',2),('PHY7-U01-S09-I02','C','Երկուսն էլ միշտ նույն ճշտությամբ',3),('PHY7-U01-S09-I02','D','Չի կարելի համեմատել բաժանման արժեքներով',4),
('PHY7-U01-S09-I03','A','Ջերմաստիճանը չափել ջերմաչափով',1),('PHY7-U01-S09-I03','B','Զանգվածը չափել կշեռքով',2),('PHY7-U01-S09-I03','C','Երկարությունը չափել չափաքանոնով',3),('PHY7-U01-S09-I03','D','Արագությունը որոշել ճանապարհի և ժամանակի չափումներից',4),
('PHY7-U01-S10-I02','A','Չափել ջրի սկզբնական ծավալը V1, մարմինը լրիվ խորասուզել, չափել V2 և հաշվել V2−V1',1),('PHY7-U01-S10-I02','B','Միայն կշռել մարմինը',2),('PHY7-U01-S10-I02','C','Չափել միայն մարմնի բարձրությունը',3),('PHY7-U01-S10-I02','D','Ջուրը եռացնել և չափել ժամանակը',4)
) as v(item_code,option_key,content_hy,display_order)
join public.items i on i.code=v.item_code;

commit;
