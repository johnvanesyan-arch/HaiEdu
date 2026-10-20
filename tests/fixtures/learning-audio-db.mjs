import {readFileSync} from 'node:fs';
import {database as arrangementDatabase,id,scopes,launch,finish,operation} from './arrangement-db.mjs';
export * from './arrangement-db.mjs';
export const audioMigration='supabase/migrations/20261020170445_sprint_16_1b_protected_audio.sql';
export async function installAudio(db){await db.exec(readFileSync('supabase/migrations/0012_live_session_gate.sql','utf8'));await db.exec(readFileSync(audioMigration,'utf8'));}
export async function database(options={}){const db=await arrangementDatabase(options);try{await installAudio(db);return db;}catch(e){await db.close();throw e;}}
export function wav(){const samples=2400,buffer=Buffer.alloc(44+samples*2);buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);for(let n=0;n<samples;n++)buffer.writeInt16LE(Math.round(2000*Math.sin(2*Math.PI*440*n/8000)),44+n*2);return buffer;}
export async function seedAudio(db,idx=0){
 const {createHash}=await import('node:crypto'),bytes=wav(),sha=createHash('sha256').update(bytes).digest('hex'),s=scopes[idx];
 const audioId=id(9000+idx);
 await db.query("insert into profiles values($1,'content_admin','active') on conflict do nothing",[id(30)]);
 await db.query(`insert into learning_audio_versions(id,curriculum_release_id,unit_id,source_family_id,locale,title,bucket_id,object_path,sha256,mime_type,byte_length,duration_ms,source_reference,permission_reference,listening_review_reference,reviewed_by,reviewed_at)
 values($1,$2,$3,$4,'en','Synthetic tone','fixture-audio',$5,$6,'audio/wav',$7,300,'Synthetic browser tone, not curriculum','Test fixture only','Technical fixture only; no editorial claim',$8,now())`,[audioId,id(s.release),id(s.unit),id(9500+idx),sha+'.wav',sha,bytes.length,id(30)]);
 return {audioId,bytes,sha,stimulus:{kind:'audio',schemaVersion:'haiedu-audio-v1',audioVersionId:audioId}};
}
export async function audioPractice(db,idx=0){
 const baseline=await launch(db,idx);await finish(db,baseline.session.id);
 const audio=await seedAudio(db,idx);
 const item=(await db.query('select bi.item_id from assessment_blueprint_items bi join assessment_blueprints bp on bp.id=bi.assessment_blueprint_id join items i on i.id=bi.item_id where bp.curriculum_release_id=$1 and bp.unit_id=$2 and bp.purpose=$3 and i.skill_id=$4 order by i.code limit 1',[id(scopes[idx].release),id(scopes[idx].unit),'practice',id(scopes[idx].skills[0])])).rows[0].item_id;
 await db.query('update items set stimulus=$2 where id=$1',[item,JSON.stringify(audio.stimulus)]);
 const start=await launch(db,idx,'practice',{skill:id(scopes[idx].skills[0])});
 const served=await operation(db,start.session.id,'serve');
 return {...audio,session:start.session.id,served,baseline};
}
export async function audioOperation(db,session,item,action,overrides={}){
 return (await db.query('select service_learning_audio($1,$2,$3,$4,$5,$6) result',[overrides.student??id(10),overrides.auth??id(401),action,session,item,overrides.itemId??null])).rows[0].result;
}
