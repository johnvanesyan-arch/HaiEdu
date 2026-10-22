import {readFileSync,readdirSync} from 'node:fs';
import {database as base,id,scopes,definition as writing} from './written-work-db.mjs';
import {compile,sqlAdmin} from './learning-acceptance.mjs';
import {createUnitMaterialsHandler} from '../../supabase/functions/_shared/unit-materials-handler.mjs';
export {id,scopes};
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(n=>n.endsWith('_sprint_16_1c_unit_material_review.sql'));
export async function fixture(){
 const db=await base();try{
 await db.exec(readFileSync('supabase/migrations/0012_live_session_gate.sql','utf8'));
 await db.exec(readFileSync(migrationPath,'utf8'));
 await db.query('insert into auth.users(id) values($1)',[id(30)]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(430),id(30)]);
 for(let i=0;i<scopes.length;i++){
  const s=scopes[i];for(const kind of ['guide','writing']){
   const d={...(kind==='writing'?writing:{schemaVersion:'teaching-guide-v1',title:'Synthetic guide '+i,text:'A teaching explanation.',workedExample:'A worked example.',locale:i===2?'hy':'en',source:{kind:'synthetic'}}),outcomes:s.skills.map(k=>'SYN-'+k)};
   await db.query('insert into unit_material_versions(id,subject_program_id,curriculum_release_id,unit_id,material_key,kind,version_no,sequence_order,definition,review_package,fingerprint) values($1,$2,$3,$4,$5,$6,1,$7,$8,$9,\'\')',[id(2000+i*2+(kind==='writing'?1:0)),id(s.programme),id(s.release),id(s.unit),'fixture-'+kind,kind,kind==='guide'?1:2,JSON.stringify(d),JSON.stringify({sourceReference:'fixture-source',comparisonReference:'fixture-comparison',placement:'Before a fixture activity',model:{text:'PRIVATE PRACTICE MODEL'},workloadProposal:{teacherMinutes:'Synthetic proposal'}})]);
  }
 }
 const admin=sqlAdmin(db);admin.auth={getUser:async token=>{const actor=Number(token.split('.').at(-1));return token.startsWith('fixture.')&&[10,20,30].includes(actor)?{data:{user:{id:id(actor)}}}:{error:{message:'Invalid synthetic credential'}};}};
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 const handle=createUnitMaterialsHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const request=(action,payload={},options={})=>{const actor=options.actor??30;const token=options.token??'fixture.'+Buffer.from(JSON.stringify({session_id:id(options.session??(actor===30?430:actor===20?420:401)),aal:options.aal??'aal2'})).toString('base64url')+'.'+actor;return handle(new Request('https://fixture.invalid/materials',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,payload})}));};
 const call=async(action,payload={},options={})=>{const r=await request(action,payload,options);const data=await r.json();if(r.status!==200)throw Object.assign(new Error(data.error),{status:r.status});return data;};
 return {db,admin,handle,request,call};
 }catch(e){await db.close();throw e;}
}
