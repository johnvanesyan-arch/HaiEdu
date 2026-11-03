-- SELECT-only inventory: active release/blueprint coverage, no learner data.
with refs as (
 select distinct b.curriculum_release_id,b.id blueprint_id,bi.item_id,bi.item_version_snapshot
 from public.assessment_blueprints b join public.curriculum_releases r on r.id=b.curriculum_release_id
 join public.assessment_blueprint_items bi on bi.assessment_blueprint_id=b.id
 where r.status in('pilot','production') and b.status in('pilot','production')
)
select r.release_key,count(*) as references,
 count(distinct(refs.item_id,refs.item_version_snapshot)) as distinct_versions,
 count(*) filter(where v.item_id is null) as missing_references,
 count(distinct(refs.item_id,refs.item_version_snapshot)) filter(where v.item_id is null) as missing_versions
from refs join public.curriculum_releases r on r.id=refs.curriculum_release_id
left join public.item_versions v on v.item_id=refs.item_id and v.version_no=refs.item_version_snapshot
group by r.release_key order by r.release_key;
