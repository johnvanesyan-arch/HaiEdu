import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {verifyTeacherReadIdentity} from '../supabase/functions/_shared/teacher-read-identity.mjs';
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const bytes=s=>new TextEncoder().encode(s);
async function setup(label){
 const url='https://'+label+'.supabase.co',calls=[];
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'fixture-es256',alg:'ES256',use:'sig'};
 const client=createClient(url,'synthetic-publishable-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(u)=>{calls.push(String(u));return String(u).endsWith('/.well-known/jwks.json')?new Response(JSON.stringify({keys:[jwk]}),{headers:{'content-type':'application/json'}}):new Response('{"message":"Invalid synthetic credential"}',{status:401,headers:{'content-type':'application/json'}});}}});
 const payload={sub:id(1),session_id:id(2),iss:url+'/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
 async function sign(changes={},header={alg:'ES256',kid:jwk.kid,typ:'JWT'}){const data=enc(header)+'.'+enc({...payload,...changes});const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,bytes(data));return data+'.'+Buffer.from(sig).toString('base64url');}
 return {client,url,calls,sign,payload};
}
test('real SDK verifies ES256 signatures and caches only public keys while concurrent actors stay distinct',async()=>{
 const f=await setup('identity-valid'),a=await f.sign(),b=await f.sign({sub:id(3),session_id:id(4)});
 assert.deepEqual(await verifyTeacherReadIdentity(f.client,a,f.url),{id:id(1),sessionId:id(2)});
 const result=await Promise.all(Array.from({length:20},(_,i)=>verifyTeacherReadIdentity(f.client,i%2?b:a,f.url)));
 assert.ok(result.every((v,i)=>v.id===id(i%2?3:1)&&v.sessionId===id(i%2?4:2)));assert.equal(f.calls.length,1);assert.match(f.calls[0],/jwks/);
});
test('forged signature, unsigned JWT and changed payload cannot become a verified actor',async()=>{
 const f=await setup('identity-forged'),valid=await f.sign(),parts=valid.split('.');
 for(const token of [parts[0]+'.'+enc({...f.payload,sub:id(9)})+'.'+parts[2],parts[0]+'.'+parts[1]+'.'+Buffer.alloc(64).toString('base64url'),enc({alg:'none'})+'.'+parts[1]+'.AA','malformed'])assert.equal(await verifyTeacherReadIdentity(f.client,token,f.url),null);
});
test('valid signatures still require project issuer, authenticated audience, live expiry and a bounded user/session tuple',async()=>{
 const f=await setup('identity-scope');
 for(const change of [{iss:'https://other.supabase.co/auth/v1'},{aud:'service_role'},{exp:Math.floor(Date.now()/1000)-10},{nbf:Math.floor(Date.now()/1000)+60},{sub:'not-an-id'},{session_id:null}])assert.equal(await verifyTeacherReadIdentity(f.client,await f.sign(change),f.url),null);
 assert.equal(await verifyTeacherReadIdentity(f.client,await f.sign({aud:['authenticated']}),f.url).then(v=>v.id),id(1));
});
test('legacy symmetric tokens retain SDK Auth-server verification and forged credentials fail',async()=>{
 const url='https://identity-legacy.supabase.co',key=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},true,['sign','verify']);let calls=0;
 const payload={sub:id(1),session_id:id(2),iss:url+'/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
 const data=enc({alg:'HS256',typ:'JWT'})+'.'+enc(payload),token=data+'.'+Buffer.from(await crypto.subtle.sign('HMAC',key,bytes(data))).toString('base64url');
 const client=createClient(url,'synthetic-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(_url,opts)=>{calls++;const t=new Headers(opts.headers).get('Authorization')?.replace('Bearer ','')??'',p=t.split('.');const valid=p.length===3&&await crypto.subtle.verify('HMAC',key,Buffer.from(p[2],'base64url'),bytes(p[0]+'.'+p[1]));return new Response(JSON.stringify(valid?{id:id(1),aud:'authenticated',role:'authenticated'}:{message:'Invalid synthetic signature'}),{status:valid?200:401,headers:{'content-type':'application/json'}});}}});
 assert.equal((await verifyTeacherReadIdentity(client,token,url)).id,id(1));assert.equal(await verifyTeacherReadIdentity(client,data+'.AA',url),null);assert.equal(calls,2);
});
