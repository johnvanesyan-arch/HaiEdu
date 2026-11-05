import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, projectRoot } from './build-web-assets.mjs';

export async function checkWebArchive(root = projectRoot, { history = true } = {}) {
  const archive = path.join(root, 'web-build');
  const releases = (await readdir(path.join(archive, 'releases'))).sort();
  const assets = new Map();
  for (const name of releases) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) throw Error(`Invalid archived release name: ${name}`);
    const manifest = JSON.parse(await readFile(path.join(archive, 'releases', name)));
    if (manifest.schemaVersion !== 1 || name !== `${manifest.buildId}.json`) throw Error(`Invalid archived release: ${name}`);
    for (const [asset, record] of Object.entries(manifest.assets)) {
      if (!/^_assets\/[A-Za-z0-9_.-]+$/.test(asset) || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error(`Invalid immutable asset: ${asset}`);
      const previous = assets.get(asset);
      if (previous && previous.sha256 !== record.sha256) throw Error(`Immutable path reused: ${asset}`);
      assets.set(asset, record);
    }
  }
  for (const [asset, record] of assets) {
    const bytes = await readFile(path.join(archive, 'assets', asset.slice('_assets/'.length)));
    if (digest(bytes) !== record.sha256 || bytes.length !== record.bytes) throw Error(`Archived bytes changed: ${asset}`);
  }
  const current = await readFile(path.join(archive, 'current.json'));
  const currentId = JSON.parse(current).buildId;
  if (!current.equals(await readFile(path.join(archive, 'releases', `${currentId}.json`)))) throw Error('Current build is missing its immutable release record');
  if (history) {
    // CI checks out two commits. The PR merge's first parent is main; squash
    // main builds also compare against the preceding main commit.
    const changed = execFileSync('git', ['diff', '--name-status', '--no-renames', 'HEAD^', '--', 'web-build/assets', 'web-build/releases'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    for (const line of changed) if (!line.startsWith('A\t')) throw Error(`Published browser archive must be append-only: ${line}`);
  }
  return { releases: releases.length, assets: assets.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkWebArchive();
  console.log(`Browser archive: ${result.releases} retained releases; ${result.assets} immutable files verified.`);
}
