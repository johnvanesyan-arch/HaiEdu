import {readFileSync} from 'node:fs';
import {database as audioDatabase,id,scopes,blueprintId} from './learning-audio-db.mjs';
export * from './learning-audio-db.mjs';
export const taskSetMigration='supabase/migrations/20261020175526_sprint_16_1b_shared_task_sets.sql';
export async function installTaskSets(db){await db.exec(readFileSync(taskSetMigration,'utf8'));}
export async function database(options={}){const db=await audioDatabase(options);try{await installTaskSets(db);return db;}catch(error){await db.close();throw error;}}
export async function seedTaskSet(db,{idx=0,mode='diagnostic',setId=id(9800),family=id(9900),items,stimulus,attach=true,versionOffset=0}={}){
 const s=scopes[idx];
 await db.query("insert into profiles values($1,'content_admin','active') on conflict do nothing",[id(30)]);
 if(!items)items=(await db.query('select item_id from assessment_blueprint_items where assessment_blueprint_id=$1 order by item_id',[blueprintId(idx,mode)])).rows.map(x=>x.item_id);
 const members=[];for(const item of items){const i=(await db.query('select id,version_no,skill_id from items where id=$1',[item])).rows[0];members.push({itemId:i.id,version:i.version_no+versionOffset,skillId:i.skill_id});}
 stimulus??={kind:'text',schemaVersion:'haiedu-text-v1',locale:'en',content:'A synthetic passage. This is not curriculum content.\n<em>Plain text stays plain.</em>'};
 await db.query(`insert into learning_task_set_versions(id,curriculum_release_id,unit_id,source_family_id,locale,title,stimulus,members,source_reference,permission_reference,review_reference,reviewed_by,reviewed_at)
 values($1,$2,$3,$4,'en','Synthetic shared source',$5,$6,'Isolated fixture','Synthetic test permission','Synthetic review, not content approval',$7,now())`,[setId,id(s.release),id(s.unit),family,JSON.stringify(stimulus),JSON.stringify(members),id(30)]);
 const reference={kind:'task_set',schemaVersion:'haiedu-task-set-v1',taskSetVersionId:setId};
 if(attach)await db.query('update items set stimulus=$2 where id=any($1)',[items,JSON.stringify(reference)]);
 return {setId,family,items,members,reference,stimulus};
}
