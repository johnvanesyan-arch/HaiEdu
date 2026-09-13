-- Backfill answer keys for the original 24 Grade 7 Physics Chapter I development items.
-- This file mirrors the live fix applied after detecting that items/options existed but item_answer_keys was empty.

with keys(code,answer,tolerance,canonical_unit,accepted_units,feedback_code) as (values
('PHY7-U01-S01-I01','"B"'::jsonb,null::numeric,null::text,'{}'::text[],'PHY7-U01-S01_REVIEW'),
('PHY7-U01-S01-I02','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S01_REVIEW'),
('PHY7-U01-S02-I01','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S02_REVIEW'),
('PHY7-U01-S02-I02','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S02_REVIEW'),
('PHY7-U01-S03-I01','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S03_REVIEW'),
('PHY7-U01-S03-I02','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S03_REVIEW'),
('PHY7-U01-S04-I01','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S04_REVIEW'),
('PHY7-U01-S04-I02','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S04_REVIEW'),
('PHY7-U01-S05-I01','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S05_REVIEW'),
('PHY7-U01-S05-I02','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S05_REVIEW'),
('PHY7-U01-S06-I01','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S06_REVIEW'),
('PHY7-U01-S06-I02','true'::jsonb,null,null,'{}'::text[],'PHY7-U01-S06_REVIEW'),
('PHY7-U01-S07-I01','2000'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S07_REVIEW'),
('PHY7-U01-S07-I02','0.35'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S07_REVIEW'),
('PHY7-U01-S07-I03','180'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S07_REVIEW'),
('PHY7-U01-S08-I01','5'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S08_REVIEW'),
('PHY7-U01-S08-I02','130'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S08_REVIEW'),
('PHY7-U01-S08-I03','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S08_REVIEW'),
('PHY7-U01-S09-I01','0.2'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S09_REVIEW'),
('PHY7-U01-S09-I02','"B"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S09_REVIEW'),
('PHY7-U01-S09-I03','"D"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S09_REVIEW'),
('PHY7-U01-S10-I01','17'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S10_REVIEW'),
('PHY7-U01-S10-I02','"A"'::jsonb,null,null,'{}'::text[],'PHY7-U01-S10_REVIEW'),
('PHY7-U01-S10-I03','25'::jsonb,0.000001,null,'{}'::text[],'PHY7-U01-S10_REVIEW')
)
insert into public.item_answer_keys(item_id,answer,tolerance,canonical_unit,accepted_units,feedback_code)
select i.id,k.answer,k.tolerance,k.canonical_unit,k.accepted_units,k.feedback_code
from keys k join public.items i on i.code=k.code
on conflict(item_id) do update set
  answer=excluded.answer,
  tolerance=excluded.tolerance,
  canonical_unit=excluded.canonical_unit,
  accepted_units=excluded.accepted_units,
  feedback_code=excluded.feedback_code,
  updated_at=now();
