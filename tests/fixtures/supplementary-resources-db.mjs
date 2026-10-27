import {readFileSync,readdirSync} from 'node:fs';
import {database as base,id,context,scopes} from './written-work-db.mjs';
export {id,context,scopes};
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(x=>x.endsWith('_sprint_16_5b_supplementary_materials.sql'));
export const definition={title:'Read and explore',description:'A short optional classroom resource.',goal:'Explain an idea in your own words',topic:'Exploration',purpose:'reading',format:'link',url:'https://example.org/resource',locale:'en',sourceReference:'Synthetic classroom author',rightsConfirmed:true,assessmentSafe:true};
export async function database(){const db=await base();try{
 await db.exec("create schema if not exists storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);insert into auth.users(id) values('"+id(30)+"');insert into auth.sessions(id,user_id) values('"+id(430)+"','"+id(30)+"');");
 await db.exec(readFileSync(migrationPath,'utf8'));return db;
}catch(e){await db.close();throw e;}}
export async function call(db,action,payload={},options={}){const actor=options.actor??20;const ctx=actor===30?Object.fromEntries(Object.entries(context()).filter(([k])=>k!=='enrollmentId')):context(options.index??0,actor===20||actor===21);
 return(await db.query('select service_supplementary_resources($1,$2,$3,$4,$5,$6) result',[id(actor),id(options.auth??(actor===30?430:actor===20?420:actor===21?421:401)),options.aal??'aal1',action,JSON.stringify(options.context??(action==='contexts'?{}:ctx)),JSON.stringify(payload)])).rows[0].result;}
