import {readFileSync} from 'node:fs';
import {predecessorSQL,legacyGuardsSQL,migrationPath as foundationMigration,seed} from './governed-session-db.mjs';
import {extensionSQL,seedRuntime,migrationPath} from './governed-runtime-db.mjs';
const queries=[],runtimeQueries=[];
await seed({query:async(sql,params)=>{queries.push({sql,params});return{rows:[]};}});
await seedRuntime({query:async(sql,params)=>{runtimeQueries.push({sql,params});return{rows:[]};},exec:async sql=>{runtimeQueries.push({sql,params:[]});}});
process.stdout.write(JSON.stringify({predecessor:predecessorSQL()+legacyGuardsSQL(),foundation:readFileSync(foundationMigration,'utf8'),queries,extension:extensionSQL(),runtimeQueries,migration:readFileSync(migrationPath,'utf8')}));
