import {execFileSync} from 'node:child_process';
import {privacyFoundationSQL} from './teacher-task-privacy-api.mjs';
const setup=JSON.parse(execFileSync(process.execPath,['tests/fixtures/written-work-export.mjs'],{encoding:'utf8'}));
process.stdout.write(JSON.stringify({...setup,privacyFoundation:privacyFoundationSQL()}));
