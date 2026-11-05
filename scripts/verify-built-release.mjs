import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function verifyBuiltRelease({ expectedCommit = process.env.GITHUB_SHA, baseUrl = 'https://www.haiedu.am', manifestPath = new URL('../web-build/current.json', import.meta.url), fetchImpl = fetch } = {}) {
  if (!/^[a-f0-9]{40}$/i.test(expectedCommit ?? '')) throw Error('A full reviewed commit is required for built-asset verification');
  const origin = new URL(baseUrl).origin;
  const manifestBytes = await readFile(manifestPath), manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.buildId)) throw Error('Invalid local browser build manifest');
  async function get(path) {
    const url = new URL(path, origin);
    url.searchParams.set('source_probe', expectedCommit);
    const response = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`Built source read failed: ${path} HTTP${response.status}`);
    const cache = response.headers.get('cache-control') ?? '';
    const validCache = path.startsWith('/_assets/') ? /\bmax-age=31536000\b/.test(cache) && /\bimmutable\b/.test(cache)
      : /\.json$/.test(path) ? /\bno-store\b/.test(cache)
        : /\bmax-age=0\b/.test(cache) && /\bmust-revalidate\b/.test(cache);
    if (!validCache) throw Error(`Unexpected browser cache policy: ${path}`);
    return Buffer.from(await response.arrayBuffer());
  }
  async function identity() {
    const release = JSON.parse(await get('/release.json'));
    if (release.schemaVersion !== 1 || release.commit !== expectedCommit) throw Error('Production commit changed during built-asset verification');
  }
  await identity();
  if (!manifestBytes.equals(await get('/asset-manifest.json'))) throw Error('Production browser manifest does not match the reviewed source');
  const files = [...Object.entries(manifest.pages), ...Object.entries(manifest.assets)];
  for (let start = 0; start < files.length; start += 6) {
    const batch = files.slice(start, start + 6);
    const results = await Promise.allSettled(batch.map(async ([name, record]) => {
      if (name.includes('..') || name.startsWith('/')) throw Error('Unsafe manifest path');
      if (hash(await get('/' + name)) !== record.sha256) throw Error(`Executed browser artifact differs: ${name}`);
    }));
    for (const result of results) if (result.status === 'rejected') throw result.reason;
  }
  await identity();
  return { commit: expectedCommit, buildId: manifest.buildId, pages: Object.keys(manifest.pages).length, assets: Object.keys(manifest.assets).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyBuiltRelease()));
}
