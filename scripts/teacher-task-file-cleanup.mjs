import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function cleanupRequest(args,now=Date.now()){
 const options={};for(let i=0;i<args.length;i++){
  const k=args[i];if(!['--before','--fingerprint','--request-id','--cleanup-id','--confirm','--execute'].includes(k)||k in options)throw Error('Unknown or repeated option');
  options[k]=k==='--execute'?true:args[++i];if(options[k]===undefined)throw Error('Option value required');
 }
 const writing=options['--execute']||options['--cleanup-id'];
 if(writing&&options['--confirm']!=='REMOVE_UNREFERENCED_TASK_FILES')throw Error('Explicit cleanup confirmation required');
 if(options['--cleanup-id']){
  if(!uuid.test(options['--cleanup-id'])||['--before','--fingerprint','--request-id','--execute'].some(k=>k in options))throw Error('Resume requires only cleanup ID and confirmation');
  return{action:'resume_task_file_cleanup',cleanupId:options['--cleanup-id']};
 }
 const cutoff=Date.parse(options['--before']);if(!Number.isFinite(cutoff)||cutoff>now-86400000)throw Error('Cutoff must be at least one day old');
 const body={action:options['--execute']?'execute_task_file_cleanup':'preview_task_file_cleanup',before:new Date(cutoff).toISOString()};
 if(options['--execute']){
  if(!/^[a-f0-9]{64}$/.test(options['--fingerprint']??'')||!uuid.test(options['--request-id']??''))throw Error('Reviewed preview fingerprint and stable request ID required');
  Object.assign(body,{fingerprint:options['--fingerprint'],requestId:options['--request-id']});
 }else if(['--fingerprint','--request-id','--confirm'].some(k=>k in options))throw Error('Preview takes only a cutoff');
 return body;
}
export function validateCleanupSession(token,now=Date.now()){
 let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));}catch{throw Error('Ordinary MFA administrator session required');}
 if(claims?.role!=='authenticated'||claims.aal!=='aal2'||!uuid.test(claims.sub??'')||!uuid.test(claims.session_id??'')||!Number.isFinite(claims.exp)||claims.exp*1000<=now)throw Error('Ordinary unexpired MFA administrator session required');
 // Signature, live session, active admin role and authorization are checked by
 // the Edge function and transaction. This local check grants no authority.
}
async function main(){
 const body=cleanupRequest(process.argv.slice(2));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const expected=process.env.EXPECTED_MAIN_SHA;
 if(!/^[a-f0-9]{40}$/.test(expected??'')||git('branch','--show-current')!=='main'||git('rev-parse','HEAD')!==expected||git('status','--porcelain','--untracked-files=no'))throw Error('Clean exact reviewed main checkout required');
 const token=process.env.HAIEDU_ADMIN_ACCESS_TOKEN??'';validateCleanupSession(token);
 const config=await readFile(path.join(root,'web/config.js'),'utf8'),url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
 if(!url||!key)throw Error('Reviewed project configuration required');
 const r=await fetch(url+'/functions/v1/manage-admin-account',{method:'POST',redirect:'error',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const data=await r.json();if(!r.ok)throw Error('Cleanup not confirmed: '+String(data?.error??r.status)+'. Retry the same reviewed request or cleanup ID.');
 // No JWT, Storage path, file content, names or email addresses in output.
 console.log(JSON.stringify(Object.fromEntries(['version','fingerprint','files','bytes','hasMore','cleanupId','pendingFiles','completed','replayed'].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]])),null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
