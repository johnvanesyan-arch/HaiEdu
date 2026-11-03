// Offline replay of immutable repository sources; never opens a remote connection.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const sources=['0015_sprint_11c_deterministic_variants.sql','0017_sprint_11d_conceptual_bank_expansion.sql','0024_sprint_11d_partial_state_recovery.sql','0026_sprint_11d_complete_candidate_bank.sql'];
export const canonical = r => ({item:{id:r.id,code:r.code,version_no:r.version_no,skill_id:r.skill_id,item_type:r.item_type,prompt_hy:r.prompt_hy,prompt_en:r.prompt_en??null,stimulus:r.stimulus??{},difficulty:r.difficulty},options:r.options,answerKey:r.answer_key});
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export async function buildManifest(rows,{replay=false}={}){
 const db=new PGlite();await db.waitReady;
 try{
  let schema=await readFile('tests/fixtures/chapter-ii-expansion-catalogue.sql','utf8');schema=schema.slice(0,schema.indexOf('alter table public.assessment_blueprints'));
  await db.exec(schema+`create schema private;create role anon;create role authenticated;create role service_role;
   create unique index on item_families(code);create unique index on item_templates(code);create unique index on items(code) where code is not null;create unique index on item_answer_keys(item_id);
   create table item_reviews(item_id uuid,version_no integer,reviewer_id uuid,review_type text,decision text,notes text);`);
  const skills=[...new Map(rows.map(r=>[r.skill_id,{id:r.skill_id,code:r.skill_code}])).values()];
  for(const s of skills)await db.query("insert into skills(id,subject_id,grade_id,code,name_hy) values($1,$1,$1,$2,$2)",[s.id,s.code]);
  const sql=Object.fromEntries(await Promise.all(sources.map(async p=>[p,await readFile('supabase/migrations/'+p,'utf8')])));
  const gen=sql[sources[0]];
  // Execute the original helpers and template seeds, excluding service grants and proof materializations.
  await db.exec(gen.slice(0,gen.indexOf('-- Service-role-only preview')));
  await db.exec(gen.slice(gen.indexOf('insert into public.item_families'),gen.indexOf('-- Materialise a s')));
  await db.exec(sql[sources[1]]);await db.exec(sql[sources[2]]);
  const final=sql[sources[3]];await db.exec(final.slice(final.indexOf('-- Two authored S09'),final.indexOf('-- Skill-level misconception')));
  const entries=[],blocked=[],rebuilt=[];
  for(const r of rows){
   let expected;
   if(r.variant_seed){
    const value=(await db.query('select private.render_item_variant($1,$2) r',[r.template_code,r.variant_seed])).rows[0].r;
    expected={...r,skill_id:value.skillId,item_type:value.itemType,prompt_hy:value.promptHy,prompt_en:null,stimulus:{},difficulty:value.difficulty,
     options:value.options.map((o,i)=>({option_key:o.optionKey,content_hy:o.contentHy,display_order:i+1})),
     answer_key:{answer:value.answer,tolerance:value.tolerance,canonical_unit:value.canonicalUnit,accepted_units:value.acceptedUnits}};
   }else{
    const x=(await db.query(`select i.*,coalesce((select jsonb_agg(jsonb_build_object('option_key',o.option_key,'content_hy',o.content_hy,'display_order',o.display_order) order by o.display_order,o.option_key) from item_options o where o.item_id=i.id),'[]'::jsonb) options,(select jsonb_build_object('answer',k.answer,'tolerance',k.tolerance,'canonical_unit',k.canonical_unit,'accepted_units',k.accepted_units) from item_answer_keys k where k.item_id=i.id) answer_key from items i where code=$1`,[r.code])).rows[0];
    if(x)expected={...x,id:r.id,version_no:1};
   }
   if(replay){if(!expected)throw Error("Historical source missing: "+r.code);rebuilt.push({...expected,skill_code:r.skill_code,item_template_id:r.item_template_id,template_code:r.template_code,variant_seed:r.variant_seed,variant_fingerprint:r.variant_fingerprint});continue;}
   const actual=canonical(r), historical=expected&&canonical(expected);
   const reasons=[];
   if(r.version_no!==1)reasons.push('not_v1');
   if(!historical)reasons.push('historical_source_missing');
   else if(stable(actual)!==stable(historical))reasons.push(...Object.keys(actual).filter(k=>stable(actual[k])!==stable(historical[k])).map(k=>'source_mismatch:'+k));
   if(!r.frozen_references?.length||r.frozen_references.some(x=>x.fingerprint!==r.variant_fingerprint||x.template_id!==r.item_template_id||x.template_version!==1))reasons.push('frozen_reference_mismatch');
   if(reasons.length){blocked.push({code:r.code,reasons});continue;}
   // PostgreSQL canonical JSONB text is the shared server/local hashing contract.
   const hash=(await db.query('select md5($1::jsonb::text) hash',[JSON.stringify(historical)])).rows[0].hash;
   entries.push({itemId:r.id,code:r.code,version:1,assessmentHash:hash,fingerprint:r.variant_fingerprint,templateId:r.item_template_id,sourceInputs:{skillId:r.skill_id,skillCode:r.skill_code,templateCode:r.template_code,seed:r.variant_seed}});
  }
  if(replay)return rebuilt;
  return {schemaVersion:'item-snapshot-recovery-v1',scope:'physics7_u01_2026_08_14_pilot_r1',sources:sources.map(p=>({path:'supabase/migrations/'+p,sha256:createHash('sha256').update(sql[p]).digest('hex')})),entries,blocked};
 }finally{await db.close();}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/recovery/build-unit1-snapshot-manifest.mjs private-candidates.json manifest.json');
 const manifest=await buildManifest(JSON.parse(await readFile(input,'utf8')));await writeFile(output,JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({verified:manifest.entries.length,blocked:manifest.blocked.length,reasons:manifest.blocked.slice(0,8)}));if(manifest.blocked.length)process.exitCode=1;
}
