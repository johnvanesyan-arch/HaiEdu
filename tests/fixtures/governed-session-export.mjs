import {readFileSync} from 'node:fs';
import {predecessorSQL,legacyGuardsSQL,migrationPath,seed} from './governed-session-db.mjs';
const queries=[];
await seed({query:async(sql,params)=>{queries.push({sql,params});return {rows:[]};}});
process.stdout.write(JSON.stringify({predecessor:predecessorSQL()+legacyGuardsSQL(),migration:readFileSync(migrationPath,'utf8'),queries}));
