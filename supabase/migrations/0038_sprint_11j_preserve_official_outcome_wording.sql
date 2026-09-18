-- Sprint 11J follow-up: preserve the Physics 7 programme's printed wording exactly.
-- In particular, mandatory outcome 1(5) prints "(Հ4, 28)"; this migration
-- records that source anomaly without silently inferring a missing "Հ".

alter table public.learning_outcomes
  add column if not exists source_transcription_notes text;

comment on column public.learning_outcomes.source_transcription_notes is
  'Editorial notes about an exact source transcription; never used to silently repair the normative text.';

with current_outcomes(source_locator, statement_hy, transcription_note) as (
  values
    (
      '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(1)',
      'ներկայացնել ֆիզիկայի ուսումնասիրության առարկան (Հ9),',
      null::text
    ),
    (
      '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(2)',
      'ներկայացնել հայ անվանի ֆիզիկոսներին (Հ30),',
      null::text
    ),
    (
      '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(3)',
      'բերել ֆիզիկական երևույթների օրինակներ (Հ9),',
      null::text
    ),
    (
      '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)',
      'կատարել պարզագույն դիտումներ, չափումներ և փորձեր,(Հ4, Հ28),',
      null::text
    ),
    (
      '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)',
      'չափումներ կատարելիս դրսևորել պատասխանատու վերաբերմունք, անհրաժեշտ հետևողականություն և ճշգրտություն,(Հ4, 28),',
      'The official current programme appendix prints the cross-reference as "(Հ4, 28)". This transcription preserves the source and does not infer a missing "Հ".'
    ),
    (
      '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
      'ներկայացնել ժամանակի, հեռավորության, ծավալի, զանգվածի չափման միավորները ՄՀ համակարգում',
      null::text
    )
)
update public.learning_outcomes lo
set statement_hy = o.statement_hy,
    source_transcription_notes = o.transcription_note
from current_outcomes o
where lo.source_locator = o.source_locator
  and lo.source_document_id = (
    select r.programme_document_id
    from public.curriculum_reconciliation_runs r
    where r.reconciliation_key = 'physics7_u01_2026_08_14'
  );

update public.learning_outcome_normative_mappings lom
set framework_references = array['Հ4', '28']::text[],
    mapping_notes = 'This current-2026 official outcome was absent before Sprint 11J and is now stored verbatim. The programme directly requires responsibility, consistency and precision during measurement. The official appendix prints the cross-reference as "(Հ4, 28)"; no missing designator is inferred.'
from public.curriculum_reconciliation_runs r,
     public.learning_outcomes lo
where r.reconciliation_key = 'physics7_u01_2026_08_14'
  and lom.reconciliation_id = r.id
  and lom.learning_outcome_id = lo.id
  and lo.source_document_id = r.programme_document_id
  and lo.source_locator = '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)';

do $$
declare
  v_outcome_count integer;
  v_exact_anomaly_count integer;
begin
  select count(*)
  into v_outcome_count
  from public.learning_outcomes lo
  join public.curriculum_reconciliation_runs r
    on r.programme_document_id = lo.source_document_id
  where r.reconciliation_key = 'physics7_u01_2026_08_14'
    and lo.source_locator like '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ /%';

  if v_outcome_count <> 6 then
    raise exception 'Expected 6 current Theme 1 outcomes, found %', v_outcome_count;
  end if;

  select count(*)
  into v_exact_anomaly_count
  from public.curriculum_reconciliation_runs r
  join public.learning_outcome_normative_mappings lom
    on lom.reconciliation_id = r.id
  join public.learning_outcomes lo
    on lo.id = lom.learning_outcome_id
  where r.reconciliation_key = 'physics7_u01_2026_08_14'
    and lo.source_locator = '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)'
    and lo.statement_hy = 'չափումներ կատարելիս դրսևորել պատասխանատու վերաբերմունք, անհրաժեշտ հետևողականություն և ճշգրտություն,(Հ4, 28),'
    and lo.source_transcription_notes is not null
    and lom.framework_references = array['Հ4', '28']::text[];

  if v_exact_anomaly_count <> 1 then
    raise exception 'Mandatory outcome 1(5) was not preserved exactly with its source note';
  end if;
end;
$$;
