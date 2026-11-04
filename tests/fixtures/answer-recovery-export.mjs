import {readFileSync} from 'node:fs';
import {installAnswerRecovery} from './answer-recovery-db.mjs';
const statements=[];
const runtime=readFileSync('supabase/migrations/20261006065508_sprint_15b12c_learning_runtime.sql','utf8');
const start=runtime.indexOf('create function public.service_is_registered_legacy_learning_session(');
statements.push(runtime.slice(start,runtime.indexOf('-- Governed branch',start)));
await installAnswerRecovery({exec:async sql=>{statements.push(sql);}},{legacy:true});
process.stdout.write(JSON.stringify(statements));
