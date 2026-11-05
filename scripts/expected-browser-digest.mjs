import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// HTML is transformed by the browser build. Supplemental source checks must
// compare it with the reviewed compiled record, never the unbuilt template.
// Stable JS/CSS copies remain available for compatibility checks.
export async function expectedBrowserDigest(name, { root = fileURLToPath(new URL('../', import.meta.url)) } = {}) {
  if (!/^[A-Za-z0-9_./-]+$/.test(name) || name.startsWith('/') || name.includes('..')) throw Error('Unsafe browser source path');
  if (name.endsWith('.html')) {
    const manifest = JSON.parse(await readFile(resolve(root, 'web-build/current.json')));
    const expected = manifest.pages?.[name]?.sha256;
    if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(expected ?? '')) throw Error(`Missing compiled HTML digest: ${name}`);
    return expected;
  }
  return hash(await readFile(resolve(root, 'web', name)));
}
