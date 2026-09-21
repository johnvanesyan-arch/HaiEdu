-- Sprint 12.5C provenance correction: Chapter Review receives its own pool and blueprint.

alter table public.assessment_pools drop constraint if exists assessment_pools_purpose_check;
alter table public.assessment_pools add constraint assessment_pools_purpose_check
  check (purpose in ('practice','diagnostic','mastery_check','chapter_review'));

alter table public.assessment_blueprints drop constraint if exists assessment_blueprints_purpose_check;
alter table public.assessment_blueprints add constraint assessment_blueprints_purpose_check
  check (purpose in ('practice','diagnostic','mastery_check','chapter_review'));

insert into public.assessment_pools(code,unit_code,purpose,name,is_protected,status,metadata)
values (
  'phy7_u01_chapter_review','PHY7-U01','chapter_review',
  'Physics 7 Unit 1 Chapter Review',false,'active',
  jsonb_build_object(
    'sourcePurpose','practice',
    'wholeChapter',true,
    'selectionPolicyVersion','12.5C-D-v1',
    'hintsAllowed',true
  )
)
on conflict (code) do nothing;

with source as (
  select ab.*
  from public.assessment_blueprints ab
  join public.curriculum_releases cr on cr.id=ab.curriculum_release_id
  where ab.purpose='practice' and ab.status in ('pilot','production')
    and cr.status in ('pilot','production')
  order by case ab.status when 'production' then 1 else 2 end,ab.published_at desc
  limit 1
), review_pool as (
  select id from public.assessment_pools where code='phy7_u01_chapter_review'
)
insert into public.assessment_blueprints(
  blueprint_key,curriculum_release_id,unit_id,assessment_pool_id,purpose,
  version_number,status,selection_policy_version,configuration_snapshot,
  item_set_fingerprint,published_at,published_by
)
select
  regexp_replace(source.blueprint_key,'practice','chapter_review','g'),
  source.curriculum_release_id,source.unit_id,review_pool.id,'chapter_review',
  1,source.status,'12.5C-D-v1',
  source.configuration_snapshot||jsonb_build_object(
    'purpose','chapter_review','sourceBlueprintId',source.id,
    'targetQuestions',12,'wholeChapter',true,'hintsAllowed',true
  ),
  source.item_set_fingerprint,now(),source.published_by
from source cross join review_pool
on conflict (blueprint_key) do nothing;

insert into public.assessment_blueprint_items(
  assessment_blueprint_id,item_id,item_code_snapshot,item_version_snapshot,
  item_template_id,template_version_snapshot,item_family_id,
  variant_key_snapshot,variant_fingerprint_snapshot
)
select review.id,src_items.item_id,src_items.item_code_snapshot,src_items.item_version_snapshot,
       src_items.item_template_id,src_items.template_version_snapshot,src_items.item_family_id,
       src_items.variant_key_snapshot,src_items.variant_fingerprint_snapshot
from public.assessment_blueprints source
join public.assessment_blueprints review
  on review.curriculum_release_id=source.curriculum_release_id
 and review.unit_id=source.unit_id
 and review.purpose='chapter_review'
join public.assessment_blueprint_items src_items on src_items.assessment_blueprint_id=source.id
where source.purpose='practice' and source.status in ('pilot','production')
  and review.status=source.status
on conflict (assessment_blueprint_id,item_id) do nothing;
