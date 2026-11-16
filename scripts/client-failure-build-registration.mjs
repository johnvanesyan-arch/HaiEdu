// Produce a reviewable registration statement; never execute a database write.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function buildRegistration(manifest){
 const build=manifest?.buildId;
 if(typeof build!=='string'||!/^[a-f0-9]{64}$/.test(build)||!manifest.inputs||!Object.hasOwn(manifest.inputs,'web/client-failure-reporter.mjs'))throw Error('unreviewed_client_build');
 return `insert into private.client_failure_builds(build_id,expires_at) values ('${build}',clock_timestamp()+interval '30 days') on conflict(build_id) do update set expires_at=excluded.expires_at;\n`;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('Only the committed build manifest is accepted');
 console.log(buildRegistration(JSON.parse(await readFile(new URL('../web-build/current.json',import.meta.url),'utf8'))));
}
