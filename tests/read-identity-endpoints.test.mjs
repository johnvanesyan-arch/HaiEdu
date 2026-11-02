import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compile} from './fixtures/learning-acceptance.mjs';
import {verifyReadIdentity,verifyTeacherReadIdentity} from '../supabase/functions/_shared/teacher-read-identity.mjs';

const url='https://fixture.supabase.co',id='10000000-0000-4000-8000-000000000001';
for(const slug of ['get-student-classes','get-teacher-academic-context','get-teacher-student','get-teacher-dashboard']){
 test(slug+': verification outages return 503, invalid tokens 401 and revoked live sessions 403',async()=>{
  for(const kind of ['invalid','outage','revoked']){
   let handle,liveReads=0;
   const admin={auth:{getClaims:async()=>kind==='invalid'?{error:{name:'AuthInvalidJwtError'}}:kind==='outage'?{error:{name:'AuthRetryableFetchError',status:503}}:{data:{claims:{sub:id,session_id:id,iss:url+'/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+60}}}}};
   compile(readFileSync('supabase/functions/'+slug+'/index.ts','utf8'),{
    createClient:()=>admin,verifyReadIdentity,verifyTeacherReadIdentity,
    hasActiveLiveSession:async()=>{liveReads++;return false;},
    Deno:{env:{get:()=>url},serve:fn=>handle=fn},
   },[]);
   const response=await handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:'{}'}));
   assert.equal(response.status,{invalid:401,outage:503,revoked:403}[kind]);
   assert.equal(liveReads,kind==='revoked'?1:0);
   assert.deepEqual(await response.json(),{error:{invalid:'unauthorized',outage:'auth_verification_unavailable',revoked:'account_or_session_inactive'}[kind]});
  }
 });
}
