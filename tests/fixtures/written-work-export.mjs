import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {seed,migrationPath} from './written-work-db.mjs';
const setup=JSON.parse(execFileSync(process.execPath,['tests/fixtures/learning-dashboard-export.mjs'],{encoding:'utf8'}));
const writtenQueries=[];await seed({exec:async sql=>writtenQueries.push({sql,params:[]}),query:async(sql,params)=>writtenQueries.push({sql,params})});
process.stdout.write(JSON.stringify({...setup,writtenMigration:readFileSync(migrationPath,'utf8'),writtenQueries}));
