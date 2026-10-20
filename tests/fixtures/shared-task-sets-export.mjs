import {readFileSync} from 'node:fs';
import {dashboardFixtureSQL,dashboardMigration} from './learning-dashboard-db.mjs';
import {migrationPath as v2} from './assessment-v2-db.mjs';
import {typedMigration} from './typed-fields-db.mjs';
import {arrangementMigration} from './arrangement-db.mjs';
import {audioMigration} from './learning-audio-db.mjs';
import {taskSetMigration} from './shared-task-sets-db.mjs';
const read=p=>readFileSync(p,'utf8');
process.stdout.write(JSON.stringify({dashboard:dashboardFixtureSQL+read(dashboardMigration),upgrades:[read(v2),"alter table items add column if not exists config jsonb default '{}';",read(typedMigration),read(arrangementMigration),read('supabase/migrations/0012_live_session_gate.sql'),read(audioMigration),read(taskSetMigration)].join('\n')}));
