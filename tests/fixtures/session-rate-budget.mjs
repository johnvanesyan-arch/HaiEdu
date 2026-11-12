import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {fixtureSql,actor} from './actor-rate-limiter.mjs';
export {actor};
export const session = n => `16100000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const migrationPath = 'supabase/migrations/'+readdirSync('supabase/migrations').find(x=>x.endsWith('_bf16_actor_rate_budgets.sql'));
export async function sessionDatabase() {
  const db=new PGlite(); await db.waitReady;
  try {
    await db.exec(fixtureSql);
    await db.exec(`alter table auth.users add column deleted_at timestamptz, add column banned_until timestamptz;
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
      insert into auth.sessions select replace(id::text,'16000000-','16100000-')::uuid,id,null from auth.users;`);
    await db.exec(readFileSync(migrationPath,'utf8'));
    return db;
  } catch(error) {await db.close();throw error;}
}
export const token = (n=1,extra={}) => 'synthetic.'+Buffer.from(JSON.stringify({sub:actor(n),session_id:session(n),aal:'aal1',...extra})).toString('base64url')+'.verified-by-fixture';
export function sqlRateAdmin(db) {
  const calls=[];
  return {calls,async rpc(name,args) {
    calls.push({name,args});
    if(name!=='service_reserve_session_rate_budgets')throw Error('Unexpected fixture RPC');
    try {
      const r=await db.query('select public.service_reserve_session_rate_budgets($1,$2,$3::jsonb) result',[args.p_actor,args.p_session,JSON.stringify(args.p_costs)]);
      return {data:r.rows[0].result,error:null};
    }catch(error){return {data:null,error:{code:error.code,message:error.message}};}
  }};
}
