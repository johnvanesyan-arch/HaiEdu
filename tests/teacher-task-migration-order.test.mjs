import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {database} from './fixtures/resource-assignments-db.mjs';
import {privacyFoundationSQL} from './fixtures/teacher-task-privacy-api.mjs';

test('production task migrations apply in filename order to the pre-task schema',async t=>{
 const db=await database();t.after(()=>db.close());await db.exec(privacyFoundationSQL());
 const suffixes=['teacher_writing_assignments','teacher_task_drafts','teacher_task_source_attachments','teacher_task_delivery','teacher_task_student_work','teacher_task_review','teacher_task_privacy'];
 const files=readdirSync('supabase/migrations').filter(f=>suffixes.some(s=>f.endsWith('_'+s+'.sql'))).sort();
 assert.equal(files.length,7);
 assert.deepEqual(files.map(f=>suffixes.find(s=>f.endsWith('_'+s+'.sql'))),suffixes);
 for(const file of files)await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 const marker=await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='account_deletion_requests' and column_name='execution_started_at'");
 assert.equal(marker.rows.length,1);
 assert.equal((await db.query("select has_function_privilege('authenticated','service_teacher_task_privacy(uuid,uuid,text,jsonb)','execute') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_function_privilege('service_role','service_teacher_task_privacy(uuid,uuid,text,jsonb)','execute') allowed")).rows[0].allowed,true);
});
