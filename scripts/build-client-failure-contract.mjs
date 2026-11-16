import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source = new URL('../web/client-failure-contract.mjs', import.meta.url);
const target = new URL('../supabase/functions/_shared/client-failure-contract.mjs', import.meta.url);
const bytes = await readFile(source);
if (process.argv.includes('--check')) {
  if (!bytes.equals(await readFile(target))) throw Error('client_failure_contract_out_of_date');
} else await writeFile(target, bytes);
console.log('Client failure contract matches: ' + fileURLToPath(target).split('/').at(-1));
