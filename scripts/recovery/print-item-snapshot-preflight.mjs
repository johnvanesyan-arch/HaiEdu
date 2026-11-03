// Prints a SELECT-only preflight; it never opens a database connection.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('docs/evidence/unit1-snapshot-recovery-manifest-20261103.json','utf8'));
const migration=readFileSync('supabase/migrations/20261103061948_item_snapshot_integrity.sql','utf8');
const body=migration.match(/function private\.item_snapshot_assessment_content\(p_snapshot jsonb\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/)?.[1].trim().replace(/;$/,'');
if(!body)throw Error('Canonical assessment contract missing');
const literal=v=>"'"+String(v).replaceAll("'","''")+"'";
const rows=manifest.entries.map(e=>'('+[e.itemId,e.version,e.assessmentHash,e.fingerprint,e.templateId].map(literal).join(',')+')').join(',\n');
console.log(`-- SELECT-only: no learner data, writes, helper creation or remote calls.
with candidates(item_id,version,expected_hash,fingerprint,template_id) as (values ${rows}),
payloads as (
 select c.*,v.item_id is not null already_present,
 jsonb_build_object('item',to_jsonb(i),'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.display_order,o.option_key) from public.item_options o where o.item_id=i.id),'[]'::jsonb),'answerKey',(select to_jsonb(k) from public.item_answer_keys k where k.item_id=i.id)) p_snapshot
 from candidates c left join public.items i on i.id=c.item_id::uuid
 left join public.item_versions v on v.item_id=c.item_id::uuid and v.version_no=c.version::integer
), verified as (
 select p.*,md5((${body})::text)=expected_hash content_matches,
 p_snapshot#>>'{item,item_template_id}'=template_id and p_snapshot#>>'{item,variant_fingerprint}'=fingerprint source_identity_matches,
 exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id join public.curriculum_releases r on r.id=bp.curriculum_release_id
  where r.release_key=${literal(manifest.scope)} and bi.item_id=p.item_id::uuid and bi.item_version_snapshot=p.version::integer) has_reference,
 not exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id join public.curriculum_releases r on r.id=bp.curriculum_release_id
  where r.release_key=${literal(manifest.scope)} and bi.item_id=p.item_id::uuid and bi.item_version_snapshot=p.version::integer
   and (bi.variant_fingerprint_snapshot is distinct from p.fingerprint or bi.item_template_id is distinct from p.template_id::uuid or bi.template_version_snapshot is distinct from 1)) references_match
 from payloads p
)
select count(*) candidate_versions,count(*) filter(where content_matches and source_identity_matches and has_reference and references_match) verified_versions,
 count(*) filter(where already_present) already_present from verified;`);
