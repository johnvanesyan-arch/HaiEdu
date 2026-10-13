import {readFileSync} from 'node:fs';
import {seedForms,schemaSQL,migrationPath} from './governed-mastery-forms-db.mjs';
const queries=[];
await seedForms({query:async(sql,params)=>{queries.push({sql,params});return{rows:[]};}});
process.stdout.write(JSON.stringify({schema:schemaSQL,migration:readFileSync(migrationPath,'utf8'),queries}));
