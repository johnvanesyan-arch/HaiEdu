-- Sprint 12A — Hinting & Remediation v2
-- Deterministic template-aware Practice scaffolding with skill-guide fallback.

create table if not exists public.item_template_remediation_guides (
  id uuid primary key default gen_random_uuid(),
  item_template_id uuid not null references public.item_templates(id) on delete cascade,
  trigger_error_code text,
  guide_version integer not null default 1 check (guide_version > 0),
  title_hy text not null,
  strategy_hy text not null,
  hint_1_hy text not null,
  hint_2_hy text not null,
  worked_example_hy text not null,
  allowed_parameter_keys text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.item_template_remediation_guides is
  'Versioned deterministic Practice remediation guides scoped to an item template; optional error-code specialization.';

create unique index if not exists item_template_remediation_guides_version_uq
  on public.item_template_remediation_guides (
    item_template_id,
    coalesce(trigger_error_code, '__default__'),
    guide_version
  );

create unique index if not exists item_template_remediation_guides_one_published_uq
  on public.item_template_remediation_guides (
    item_template_id,
    coalesce(trigger_error_code, '__default__')
  )
  where status = 'published';

create index if not exists item_template_remediation_guides_lookup_idx
  on public.item_template_remediation_guides (item_template_id, status, trigger_error_code);

alter table public.item_template_remediation_guides enable row level security;
revoke all on table public.item_template_remediation_guides from anon, authenticated;
grant select, insert, update, delete on table public.item_template_remediation_guides to service_role;

alter table public.remediation_events
  add column if not exists context text,
  add column if not exists hint_level integer,
  add column if not exists guide_scope text,
  add column if not exists guide_source_id uuid,
  add column if not exists guide_version integer,
  add column if not exists item_template_id uuid references public.item_templates(id),
  add column if not exists error_code text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'remediation_events_context_check'
  ) then
    alter table public.remediation_events
      add constraint remediation_events_context_check
      check (context is null or context in ('pre_answer','post_error'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'remediation_events_hint_level_check'
  ) then
    alter table public.remediation_events
      add constraint remediation_events_hint_level_check
      check (hint_level is null or hint_level between 1 and 3);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'remediation_events_guide_scope_check'
  ) then
    alter table public.remediation_events
      add constraint remediation_events_guide_scope_check
      check (guide_scope is null or guide_scope in ('template','skill'));
  end if;
end $$;

create index if not exists remediation_events_template_created_idx
  on public.remediation_events (item_template_id, created_at desc);

create index if not exists remediation_events_student_created_idx
  on public.remediation_events (student_id, created_at desc);

-- Backfill richer telemetry for existing help events where it can be derived.
update public.remediation_events r
set
  item_template_id = coalesce(r.item_template_id, i.item_template_id),
  hint_level = coalesce(
    r.hint_level,
    case r.stage
      when 'hint_1' then 1
      when 'hint_2' then 2
      when 'worked_example' then 3
      else null
    end
  ),
  context = coalesce(
    r.context,
    case
      when lsi.answered_at is not null and r.created_at >= lsi.answered_at then 'post_error'
      else 'pre_answer'
    end
  ),
  guide_scope = coalesce(r.guide_scope, 'skill'),
  guide_version = coalesce(r.guide_version, 1),
  guide_source_id = coalesce(
    r.guide_source_id,
    (
      select g.id
      from public.skill_remediation_guides g
      where g.skill_id = r.skill_id and g.status = 'published'
      order by g.updated_at desc
      limit 1
    )
  ),
  error_code = coalesce(
    r.error_code,
    (
      select a.error_code
      from public.attempts a
      where a.id = lsi.attempt_id
      limit 1
    )
  )
from public.items i,
     public.learning_session_items lsi
where r.item_id = i.id
  and r.session_item_id = lsi.id;

with guide_data(template_code, trigger_error_code, title_hy, strategy_hy, hint_1_hy, hint_2_hy, worked_example_hy, allowed_parameter_keys, metadata) as (
  values
  (
    'PHY7-U01-S07-T-LENGTH-TO-M',
    null::text,
    'Երկարության միավորների փոխարկում',
    'Նախ համեմատեք սկզբնական և նպատակային միավորները, ապա ընտրեք ճիշտ բազմապատկման կամ բաժանման քայլը։',
    '{{sourceValue}} {{sourceUnit}}-ը պետք է արտահայտել {{targetUnit}}-երով։ Նախ որոշեք՝ {{sourceUnit}}-ը {{targetUnit}}-ից փոքր միավո՞ր է, թե՞ մեծ։',
    'Փոքր միավորից մեծին անցնելիս թվային արժեքը բաժանվում է համապատասխան փոխարկման գործակցի վրա, իսկ մեծից փոքրին անցնելիս՝ բազմապատկվում։ Գրեք {{sourceUnit}} և {{targetUnit}} միավորների կապը, ապա կիրառեք այն {{sourceValue}} արժեքին։',
    'Օրինակ՝ 350 սմ = 3.5 մ, քանի որ 100 սմ = 1 մ, ուստի 350 ÷ 100 = 3.5։ Այժմ նույն քայլը կիրառեք ձեր առաջադրանքի թվերին։',
    array['sourceValue','sourceUnit','targetUnit']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S07-T-TIME-TO-S',
    null::text,
    'Ժամանակի միավորների փոխարկում',
    'Ժամանակի միավորները փոխարկեք հերթական կապերով՝ ժամ ↔ րոպե ↔ վայրկյան։',
    '{{sourceValue}} {{sourceUnit}}-ը պետք է արտահայտել {{targetUnit}}-երով։ Հիշեք՝ ժամանակի հարևան միավորների միջև հիմնական քայլը 60 է։',
    '1 րոպե = 60 վ, իսկ 1 ժամ = 60 րոպե = 3600 վ։ Ընտրեք {{sourceUnit}} → {{targetUnit}} փոխարկման ճիշտ կապը և կիրառեք այն {{sourceValue}} արժեքին։',
    'Օրինակ՝ 2 րոպե = 2 × 60 = 120 վ։ Եթե սկզբնական միավորը ժամ է, նախ օգտագործեք ժամից վայրկյան կապը։',
    array['sourceValue','sourceUnit','targetUnit']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S07-T-VOLUME-TO-L',
    null::text,
    'Ծավալի միավորների փոխարկում',
    'Միլիլիտրերից լիտրեր անցնելիս օգտագործեք 1 լ = 1000 մլ կապը և մի մոռացեք վերջնական միավորը։',
    '{{sourceValue}} {{sourceUnit}}-ը պետք է արտահայտել {{targetUnit}}-երով։ Նախ հիշեք՝ քանի միլիլիտր է մեկ լիտրը։',
    '1 լ = 1000 մլ։ Միլիլիտրերից լիտրեր անցնելիս թվային արժեքը բաժանեք 1000-ի և վերջում գրեք նպատակային միավորը՝ {{targetUnit}}։',
    'Օրինակ՝ 750 մլ = 750 ÷ 1000 = 0.75 լ։ Այժմ նույն գործողությունը կիրառեք ձեր թվային արժեքին։',
    array['sourceValue','sourceUnit','targetUnit']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S07-T-VOLUME-TO-L',
    'missing_unit',
    'Պատասխանի միավորը նույնպես անհրաժեշտ է',
    'Այս տեսակի առաջադրանքում գնահատվում են և՛ թվային արժեքը, և՛ ճիշտ նպատակային միավորը։',
    'Ձեր պատասխանում թվից բացի պետք է գրեք նպատակային միավորը՝ {{targetUnit}}։',
    'Պատասխանի ձևը պետք է լինի «թվային արժեք + {{targetUnit}}»։ Նախ կատարեք փոխարկումը, հետո ավելացրեք միավորը։',
    'Օրինակ՝ 500 մլ = 0.5 լ։ Այստեղ 0.5-ը թվային արժեքն է, իսկ «լ»-ը՝ պարտադիր միավորը։',
    array['targetUnit']::text[],
    '{"pedagogy":"post_error_format_repair","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S08-T-SCALE-DIVISION',
    null::text,
    'Սանդղակի մեկ բաժանման արժեքը',
    'Նախ գտեք երկու թվային նշումների տարբերությունը, ապա բաժանեք այն նրանց միջև եղած հավասար բաժանումների քանակին։',
    'Նայեք {{lowerMark}} և {{upperMark}} նշումներին։ Նախ գտեք դրանց թվային տարբերությունը։',
    'Մեկ բաժանման արժեք = (վերին նշում − ստորին նշում) ÷ բաժանումների թիվ։ Ձեր առաջադրանքում հավասար բաժանումների թիվը {{divisionCount}} է։',
    'Օրինակ՝ եթե 10 և 20 նշումների միջև կա 5 հավասար բաժանում, ապա մեկ բաժանման արժեքը (20 − 10) ÷ 5 = 2 է։',
    array['lowerMark','upperMark','divisionCount']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S08-T-SCALE-READING',
    null::text,
    'Սանդղակի ցուցմունքի որոշում',
    'Հաշվեք, թե որքան արժեք է ավելանում հիմքային նշումից մինչև ցուցիչը, ապա ավելացրեք դա հիմքային արժեքին։',
    'Սկսեք հիմքային նշումից՝ {{baseMark}}։ Յուրաքանչյուր բաժանումը {{divisionValue}} միավոր է, իսկ ցուցիչը հիմքից {{ticksAboveBase}} բաժանում վեր է։',
    'Ավելացած արժեք = բաժանման արժեք × բաժանումների թիվ։ Դրանից հետո այդ ավելացած արժեքը գումարեք հիմքային նշմանը։',
    'Օրինակ՝ հիմքային նշումը 10 է, մեկ բաժանումը՝ 2, իսկ ցուցիչը 3 բաժանում վեր է. 10 + 2 × 3 = 16։',
    array['baseMark','divisionValue','ticksAboveBase']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S09-T-MEASUREMENT-ERROR',
    null::text,
    'Չափման սխալի գնահատում',
    'Այս առաջադրանքում կիրառվում է դասագրքային կանոնը՝ չափման սխալը վերցնել սանդղակի մեկ բաժանման արժեքի կեսին հավասար։',
    '{{device}} մեկ բաժանման արժեքը {{divisionValue}} {{unit}} է։ Պետք է օգտագործեք դրա կեսը։',
    'Չափման սխալ = մեկ բաժանման արժեք ÷ 2։ Բաժանման արժեքը ձեր առաջադրանքում {{divisionValue}} {{unit}} է։',
    'Օրինակ՝ եթե ջերմաչափի մեկ բաժանումը 2 °C է, ապա ընդունված կանոնով չափման սխալը 2 ÷ 2 = 1 °C է։',
    array['device','divisionValue','unit']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S10-T-DISPLACEMENT-VOLUME',
    null::text,
    'Ծավալը ջրի տեղահանմամբ',
    'Մարմնի ծավալը հավասար է մարմինը խորասուզելուց հետո և առաջ չափագլանի ցուցմունքների տարբերությանը։',
    'Սկզբնական ցուցմունքը {{initialVolumeCm3}} սմ³ է, իսկ խորասուզումից հետո՝ {{finalVolumeCm3}} սմ³։ Ուշադրություն դարձրեք, թե որքանով է աճել ջրի ցուցմունքը։',
    'Մարմնի ծավալ = վերջնական ցուցմունք − սկզբնական ցուցմունք։ Ձեր առաջադրանքում օգտագործեք {{finalVolumeCm3}} և {{initialVolumeCm3}} արժեքները։',
    'Օրինակ՝ եթե սկզբում կա 30 սմ³, իսկ խորասուզումից հետո՝ 44 սմ³, ապա մարմնի ծավալը 44 − 30 = 14 սմ³ է։',
    array['initialVolumeCm3','finalVolumeCm3']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  ),
  (
    'PHY7-U01-S10-T-SHEET-THICKNESS',
    null::text,
    'Մեկ թերթի հաստության անուղղակի չափում',
    'Երբ նույնական թերթերի ընդհանուր հաստությունը հայտնի է, մեկ թերթի հաստությունը գտնելու համար ընդհանուր հաստությունը բաժանեք թերթերի թվին։',
    '{{sheetCount}} նույնական թերթերի ընդհանուր հաստությունը {{totalThicknessMm}} մմ է։ Մեկ թերթի հաստությունը պետք է լինի այդ ընդհանուր հաստությունից փոքր։',
    'Մեկ թերթի հաստություն = ընդհանուր հաստություն ÷ թերթերի քանակ։ Ձեր առաջադրանքում բաժանեք {{totalThicknessMm}} մմ-ը {{sheetCount}}-ի։',
    'Օրինակ՝ եթե 20 նույնական թերթերի ընդհանուր հաստությունը 6 մմ է, ապա մեկ թերթի հաստությունը 6 ÷ 20 = 0.3 մմ է։',
    array['sheetCount','totalThicknessMm']::text[],
    '{"pedagogy":"orient_strategy_analogous_example","answerSafe":true}'::jsonb
  )
)
insert into public.item_template_remediation_guides (
  item_template_id,
  trigger_error_code,
  guide_version,
  title_hy,
  strategy_hy,
  hint_1_hy,
  hint_2_hy,
  worked_example_hy,
  allowed_parameter_keys,
  status,
  metadata
)
select
  t.id,
  gd.trigger_error_code,
  1,
  gd.title_hy,
  gd.strategy_hy,
  gd.hint_1_hy,
  gd.hint_2_hy,
  gd.worked_example_hy,
  gd.allowed_parameter_keys,
  'published',
  gd.metadata
from guide_data gd
join public.item_templates t on t.code = gd.template_code
where not exists (
  select 1
  from public.item_template_remediation_guides existing
  where existing.item_template_id = t.id
    and existing.trigger_error_code is not distinct from gd.trigger_error_code
    and existing.guide_version = 1
);

comment on column public.item_template_remediation_guides.allowed_parameter_keys is
  'Only these raw item.variant_parameters keys may be interpolated into authored guide text. No expression evaluation is permitted.';
