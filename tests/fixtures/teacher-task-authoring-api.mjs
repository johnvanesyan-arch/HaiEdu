import {createTeacherTaskDeliveryHandler} from '../../supabase/functions/_shared/teacher-task-delivery-handler.mjs';
import {readFileSync} from 'node:fs';
import {fixture} from './writing-assignments-api.mjs';
import {compile} from './learning-acceptance.mjs';
import {createTeacherTaskDraftsHandler} from '../../supabase/functions/_shared/teacher-task-drafts-handler.mjs';
import {createTeacherTaskSourcesHandler} from '../../supabase/functions/_shared/teacher-task-sources-handler.mjs';
export {id,context,token} from './writing-assignments-api.mjs';
export async function authoringFixture({delivery=false}={}){
 const f=await fixture();
 await f.db.exec(readFileSync('supabase/migrations/20261029203041_teacher_task_drafts.sql','utf8'));
 await f.db.exec(readFileSync('supabase/migrations/20261029203950_teacher_task_source_attachments.sql','utf8'));
 if(delivery)await f.db.exec(readFileSync('supabase/proposals/teacher-task-delivery.sql','utf8'));
 const objects=new Map();
 f.admin.storage={from:()=>({upload:async(path,bytes)=>{if(objects.has(path))return{error:{message:'exists'}};objects.set(path,new Blob([bytes]));return{data:{path}};},download:async path=>objects.has(path)?{data:objects.get(path)}:{error:{message:'missing'}}})};
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 const options={createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture'}};
 return{...f,objects,handleDelivery:delivery?createTeacherTaskDeliveryHandler(options):null,handleDraft:createTeacherTaskDraftsHandler(options),handleSource:createTeacherTaskSourcesHandler(options)};
}
