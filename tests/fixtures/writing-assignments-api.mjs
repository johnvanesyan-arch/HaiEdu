import {readFileSync} from 'node:fs';
import {fixture as base,token,id,context} from './supplementary-resources-api.mjs';
import {compile} from './learning-acceptance.mjs';
import {createWritingAssignmentsHandler} from '../../supabase/functions/_shared/writing-assignments-handler.mjs';
import {createWrittenWorkHandler} from '../../supabase/functions/_shared/written-work-handler.mjs';
export {token,id,context};
export async function fixture(){const f=await base();await f.db.exec(readFileSync('supabase/migrations/20261030203359_teacher_writing_assignments.sql','utf8'));const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);const dependencies={createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}};const handle=createWritingAssignmentsHandler(dependencies),handleWork=createWrittenWorkHandler(dependencies);const request=(body,actor=20,credential=token(actor))=>handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)}));return{...f,handle,handleWork,request};}
