import {readFileSync} from 'node:fs';
import {database as v2Database,configure,blueprintId,id,scopes} from './assessment-v2-db.mjs';
export * from './assessment-v2-db.mjs';
export const typedMigration='supabase/migrations/20261020140928_sprint_16_1b_typed_fields.sql';
export const definition={schemaVersion:'haiedu-typed-fields-v1',layout:'gap_fill',locale:'en',fields:[{id:'colour',label:'The sky is ____.',maxLength:30},{id:'manner',label:'Please move ____.',maxLength:60}]};
export const key={schemaVersion:definition.schemaVersion,fields:{colour:{accepted:['blue'],normalization:{trim:true,collapseWhitespace:false,apostrophes:false,caseMode:'ascii-insensitive'}},manner:{accepted:['more slowly'],normalization:{trim:true,collapseWhitespace:true,apostrophes:true,caseMode:'sensitive'}}}};
export const response=(colour=' blue ',manner='most slowly')=>({schemaVersion:definition.schemaVersion,fields:{colour,manner}});
export async function installTyped(db) {
 await db.exec('alter table items add column if not exists config jsonb default \'{}\';');
 await db.exec(readFileSync(typedMigration,'utf8'));
}
export async function database(options={}) {const db=await v2Database(options);try{await installTyped(db);return db;}catch(e){await db.close();throw e;}}
export async function configureTyped(db,idx=0,mode='diagnostic') {
 const policy=await configure(db,idx,mode);
 Object.assign(policy,{schemaVersion:'haiedu-assessment-policy-v3',scoringStrategy:'normalized-item-score-v1',responseTypes:['single_choice','true_false','typed_fields'],responseCapabilities:{typed_fields:definition.schemaVersion},itemWeight:1});
 await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(idx,mode),JSON.stringify(policy)]);
 await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[id(scopes[idx].model),JSON.stringify(policy)]);
 const items=(await db.query('select item_id from assessment_blueprint_items where assessment_blueprint_id=$1',[blueprintId(idx,mode)])).rows;
 for(const {item_id} of items){
  await db.query("update items set item_type='typed_fields',config=jsonb_build_object('responseDefinition',$2::jsonb) where id=$1",[item_id,JSON.stringify(definition)]);
  await db.query('delete from item_options where item_id=$1',[item_id]);
  await db.query('update item_answer_keys set answer=$2 where item_id=$1',[item_id,JSON.stringify(key)]);
 }
 return policy;
}
