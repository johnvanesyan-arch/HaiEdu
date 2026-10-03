import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
export const ids = Object.freeze({actor:'10000000-0000-4000-8000-000000000010',wrongRole:'30000000-0000-4000-8000-000000000010',guide:'10000000-0000-4000-8000-000000000011',skill:'10000000-0000-4000-8000-000000000007',item:'30000000-0000-4000-8000-000000000001',template:'10000000-0000-4000-8000-000000000009'});
export async function database() {
 const db = new PGlite(); // In-memory only. No connection string, URL, credentials, or remote client.
 await db.waitReady;
 for(const path of ['tests/fixtures/sprint-15a-remediation-authoring.sql','tests/fixtures/phase3-questions.sql','supabase/migrations/20260930120000_sprint_15a_remediation_authoring_foundation.sql','supabase/migrations/20260930204139_sprint_15a_authoring_role_cast.sql','supabase/migrations/20261001000000_sprint_15b_governed_guide_creation.sql','supabase/migrations/20261001070000_content_revision_preserve_draft_misconceptions.sql','supabase/migrations/20261002080000_sprint_15b8_atomic_family_approval.sql']) await db.exec(readFileSync(path,'utf8'));
 // Apply the superseding production function only; exclude the migration's content DML.
 const latest=readFileSync('supabase/migrations/20261001071000_sprint_15b3_mapping_integrity_gate.sql','utf8');
 await db.exec(latest.slice(latest.indexOf('create or replace function public.service_save_item_content_revision'),latest.indexOf('-- Templates can opt')));
 return db;
}
export function payload(overrides={}) {return {promptHy:'Փորձնական փոփոխված հարց',promptEn:null,stimulus:{},difficulty:2,itemFamily:'application',sourceReference:'QA fixture',options:[{key:'A',contentHy:'Տարբերակ Ա'},{key:'B',contentHy:'Տարբերակ Բ'}],answerKey:{answer:'A'},misconceptions:[{code:'QA_ATTACHED_DRAFT',responseKey:'B',mappingNote:'Approved isolated fixture'}],changeSummary:'Isolated Phase 3 QA revision',...overrides};}
export function revise(db,p=payload(),actor=ids.actor) {return db.query('select service_save_item_content_revision($1,$2,$3::jsonb) result',[ids.item,actor,JSON.stringify(p)]);}
export async function snapshot(db) {const result={};for(const table of ['items','item_options','item_answer_keys','item_misconception_mappings','item_versions','item_reviews','item_qa_runs']) result[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) state from ${table} t`)).rows[0].state;return result;}
