import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dashboardFixtureSQL,dashboardMigration} from './learning-dashboard-db.mjs';
const setup=JSON.parse(execFileSync(process.execPath,['tests/fixtures/governed-runtime-export.mjs'],{encoding:'utf8'}));
process.stdout.write(JSON.stringify({...setup,dashboardFixtureSQL,dashboardMigration:readFileSync(dashboardMigration,'utf8')}));
