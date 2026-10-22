import {readFileSync,readdirSync} from 'node:fs';
import {fixture as materials,id,scopes} from './unit-materials-api.mjs';
import {compile} from './learning-acceptance.mjs';
import {createUnitGuidesHandler} from '../../supabase/functions/_shared/unit-guides-handler.mjs';
export {id,scopes};
export {launch,finish,operation} from './governed-runtime-db.mjs';
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(n=>n.endsWith('_sprint_16_1c_unit_guide_delivery.sql'));
export const selection=(i=0)=>({enrollmentId:id(scopes[i].enrollment),curriculumReleaseId:id(scopes[i].release),unitId:id(scopes[i].unit)});
export async function readiness(db,i=0){const s=scopes[i];for(const skill of s.skills)await db.query("insert into student_skill_mastery_by_release values($1,$2,$3,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set alpha_evidence=9,beta_evidence=1,mastery_score=.9,evidence_count=10",[id(s.release),id(10),id(skill)]);}
export async function fixture(){
 const f=await materials();try{
  await f.db.exec(readFileSync(migrationPath,'utf8'));
  const rpc=f.admin.rpc.bind(f.admin);
  f.admin.rpc=async(...args)=>{if(!f.db.fixtureTransaction)return rpc(...args);await f.db.exec('savepoint guide_rpc');try{const r=await rpc(...args);if(r.error)await f.db.exec('rollback to guide_rpc');return r;}finally{await f.db.exec('release guide_rpc');}};
  const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
  const handler=createUnitGuidesHandler({createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
  const request=(body=selection(),options={})=>{
   const actor=options.actor??10,auth=options.auth??(actor===30?430:actor===20?420:401);
   const token=options.token??'fixture.'+Buffer.from(JSON.stringify({session_id:id(auth),aal:'aal1'})).toString('base64url')+'.'+actor;
   return handler(new Request('https://fixture.invalid/guides',{method:options.method??'POST',headers:options.headers??{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:options.method==='GET'?undefined:options.raw??JSON.stringify(body)}));
  };
  const guides=async(index=0,options={})=>{const r=await request(options.body??selection(index),options);const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error),{status:r.status});return data;};
  const approve=async(mid)=>{const m=(await f.call('get',{id:mid})).material;const p={id:mid,fingerprint:m.fingerprint};await f.call('qa',p);return (await f.call('approve',p)).material;};
  return {...f,request,guides,approve};
 }catch(e){await f.db.close();throw e;}
}
