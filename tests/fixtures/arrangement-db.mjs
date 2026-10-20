import {readFileSync} from 'node:fs';
import {database as typedDatabase,configure,blueprintId,id,scopes} from './typed-fields-db.mjs';
export * from './typed-fields-db.mjs';
export const arrangementMigration='supabase/migrations/20261020153856_sprint_16_1b_matching_ordering.sql';
export const matchingDefinition={schemaVersion:'haiedu-matching-v1',locale:'en',cardinality:'one_to_one',sources:[{id:'red',label:'Red'},{id:'blue',label:'Blue'}],targets:[{id:'warm',label:'A warm colour'},{id:'cool',label:'A cool colour'},{id:'neutral',label:'A neutral colour'}]};
export const matchingKey={schemaVersion:matchingDefinition.schemaVersion,pairs:{red:'warm',blue:'cool'}};
export const matchingResponse=(red='warm',blue='')=>({schemaVersion:matchingDefinition.schemaVersion,pairs:{red,blue}});
export const orderingDefinition={schemaVersion:'haiedu-ordering-v1',locale:'en',segments:[{id:'a',label:'She'},{id:'b',label:'is'},{id:'c',label:'reading.'}]};
export const orderingKey={schemaVersion:orderingDefinition.schemaVersion,acceptedSequences:[['a','b','c']]};
export const orderingResponse=(sequence=['a','','c'])=>({schemaVersion:orderingDefinition.schemaVersion,sequence});
export async function installArrangement(db){await db.exec(readFileSync(arrangementMigration,'utf8'));}
export async function database(options={}){const db=await typedDatabase(options);try{await installArrangement(db);return db;}catch(e){await db.close();throw e;}}
export async function configureArrangement(db,idx=0,mode='diagnostic',type='matching') {
 const policy=await configure(db,idx,mode),definition=type==='matching'?matchingDefinition:orderingDefinition,key=type==='matching'?matchingKey:orderingKey;
 Object.assign(policy,{schemaVersion:'haiedu-assessment-policy-v3',scoringStrategy:'normalized-item-score-v1',responseTypes:['single_choice','true_false',type],responseCapabilities:{[type]:definition.schemaVersion},itemWeight:1});
 await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(idx,mode),JSON.stringify(policy)]);
 await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[id(scopes[idx].model),JSON.stringify(policy)]);
 const items=(await db.query('select item_id from assessment_blueprint_items where assessment_blueprint_id=$1',[blueprintId(idx,mode)])).rows;
 for(const {item_id} of items){
  await db.query("update items set item_type=$2,config=jsonb_build_object('responseDefinition',$3::jsonb) where id=$1",[item_id,type,JSON.stringify(definition)]);
  await db.query('delete from item_options where item_id=$1',[item_id]);
  await db.query('update item_answer_keys set answer=$2 where item_id=$1',[item_id,JSON.stringify(key)]);
 }
 return policy;
}
