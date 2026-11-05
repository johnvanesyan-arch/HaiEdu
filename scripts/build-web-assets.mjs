import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = {
  'teacher-startup.bundle.mjs': 'teacher-startup.mjs',
  'teacher-dependencies.bundle.mjs': 'teacher-dependencies.mjs',
  'supabase-browser.bundle.mjs': 'supabase-browser.mjs',
};
const attribute = (tag, key) => tag.match(new RegExp(`\\b${key}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
const sorted = object => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b, 'en')));

function localPath(page, value) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) throw Error(`Non-local build dependency: ${page} -> ${value}`);
  const clean = value.split(/[?#]/, 1)[0];
  const result = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(page), clean));
  if (result === '..' || result.startsWith('../')) throw Error(`Dependency escapes web root: ${value}`);
  return result;
}

export function pageDependencies(page, html) {
  const result = [];
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    if (/^<script\b/i.test(tag)) {
      const value = attribute(tag, 'src');
      if (!value || attribute(tag, 'type') !== 'module') throw Error(`Expected an external module script in ${page}`);
      result.push({ tag, key: 'src', kind: 'script', source: localPath(page, value) });
    } else {
      const rel = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
      const kind = rel.includes('stylesheet') ? 'style' : rel.includes('modulepreload') ? 'script'
        : rel.includes('preload') && attribute(tag, 'as') === 'font' ? 'font' : null;
      if (kind) result.push({ tag, key: 'href', kind, source: localPath(page, attribute(tag, 'href') ?? '') });
    }
  }
  return result;
}

async function immutableWrite(filename, bytes) {
  let previous;
  try { previous = await readFile(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous) {
    if (!previous.equals(Buffer.from(bytes))) throw Error(`Refusing to overwrite immutable asset: ${filename}`);
    return;
  }
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, bytes, { flag: 'wx' });
}

// Assets are append-only in Git. A new deployment carries every earlier asset,
// so a tab's delayed import remains available without a paid hosting feature.
export async function buildWebAssets({ root = projectRoot, outdir = path.join(root, 'dist-web'), archive = path.join(root, 'web-build'), update = false, emit = true } = {}) {
  root = path.resolve(root); outdir = path.resolve(outdir); archive = path.resolve(archive);
  if (path.dirname(outdir) !== root || !/^dist-web(?:-[a-z0-9-]+)?$/.test(path.basename(outdir)) || outdir === archive) {
    throw Error('Build output must be a dedicated dist-web directory beside the source');
  }
  const web = path.join(root, 'web');
  const names = (await readdir(web, { recursive: true })).sort();
  const pages = {}, dependencies = {}, scriptEntries = new Set(), styleEntries = new Set();
  for (const name of names.filter(name => name.endsWith('.html'))) {
    pages[name] = await readFile(path.join(web, name), 'utf8');
    dependencies[name] = pageDependencies(name, pages[name]);
    for (const item of dependencies[name]) {
      if (item.kind === 'script') scriptEntries.add(item.source);
      if (item.kind === 'style') styleEntries.add(item.source);
    }
  }
  // Include injected styles as entry points. Literal URL rewriting below makes
  // their owning JS hash depend on the exact compiled stylesheet.
  for (const name of names.filter(name => name.endsWith('.css'))) styleEntries.add(name);
  const common = { absWorkingDir: root, outdir: path.join(outdir, '_assets'), publicPath: '/_assets',
    bundle: true, platform: 'browser', target: 'es2022', minify: true, charset: 'utf8',
    write: false, metafile: true, legalComments: 'eof', preserveSymlinks: true,
    entryNames: '[name]-[hash]', chunkNames: 'shared-[hash]', assetNames: '[name]-[hash]' };
  const css = await build({ ...common, entryPoints: [...styleEntries].sort().map(name => `web/${name}`),
    loader: { '.woff2': 'file', '.woff': 'file', '.ttf': 'file', '.svg': 'file', '.png': 'file', '.jpg': 'file' } });
  const assetMap = {};
  function collectEntries(result) {
    for (const [output, info] of Object.entries(result.metafile.outputs)) {
      const relative = path.relative(outdir, path.resolve(root, output)).split(path.sep).join('/');
      if (info.entryPoint?.startsWith('web/')) assetMap[info.entryPoint.slice(4)] = `/${relative}`;
      if (!info.entryPoint && Object.keys(info.inputs).length === 1) {
        const source = Object.keys(info.inputs)[0];
        if (source.startsWith('web/') && !/\.[cm]?js$/.test(source)) assetMap[source.slice(4)] = `/${relative}`;
      }
    }
  }
  collectEntries(css);
  const js = await build({ ...common, format: 'esm', splitting: true,
    entryPoints: [...scriptEntries].sort().map(name => ({ in: `web/${canonical[name] ?? name}`, out: path.parse(name).name })),
    plugins: [{ name: 'canonical-browser-sources', setup(plugin) {
      plugin.onResolve({ filter: /(?:teacher-(?:startup|dependencies)|supabase-browser)\.bundle\.mjs$/ }, args => {
        if (args.importer && (path.resolve(args.resolveDir).startsWith(web + path.sep) || args.resolveDir === web)) {
          return { path: path.join(web, canonical[path.basename(args.path)]) };
        }
      });
      plugin.onLoad({ filter: /\.[cm]?js$/ }, async args => {
        if (!args.path.startsWith(web + path.sep)) return;
        let contents = await readFile(args.path, 'utf8');
        const page = path.relative(web, args.path).split(path.sep).join('/');
        contents = contents.replace(/(["'])(\.\.?\/[^"'\n]+\.css(?:\?[^"'\n]*)?)\1/g, (whole, quote, value) => {
          const mapped = assetMap[localPath(page, value)];
          if (!mapped) throw Error(`Unbuilt dynamic stylesheet: ${page} -> ${value}`);
          return quote + mapped + quote;
        });
        return { contents, loader: 'js', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  collectEntries(js);
  for (const [generated, source] of Object.entries(canonical)) if (assetMap[source]) assetMap[generated] = assetMap[source];
  const outputs = new Map([...css.outputFiles, ...js.outputFiles].map(file => [path.relative(path.join(outdir, '_assets'), file.path).split(path.sep).join('/'), Buffer.from(file.contents)]));
  const assets = sorted(Object.fromEntries([...outputs].map(([name, bytes]) => [`_assets/${name}`, { sha256: digest(bytes), bytes: bytes.length }])));
  const inputNames = new Set([...Object.keys(css.metafile.inputs), ...Object.keys(js.metafile.inputs),
    ...Object.keys(pages).map(name => `web/${name}`), 'package.json', 'package-lock.json', 'scripts/build-web-assets.mjs']);
  const inputs = {};
  for (const name of [...inputNames].sort()) {
    if (path.isAbsolute(name) || name.startsWith('../')) throw Error(`Non-portable build input: ${name}`);
    inputs[name] = digest(await readFile(path.join(root, name)));
  }
  const buildId = digest(JSON.stringify({ inputs: sorted(inputs), assets }));
  const rendered = {}, pageManifest = {};
  for (const [name, original] of Object.entries(pages)) {
    let html = original;
    const paths = [];
    for (const item of dependencies[name]) {
      const href = assetMap[item.source];
      if (!href) throw Error(`Missing compiled dependency: ${name} -> ${item.source}`);
      const replacement = item.tag.replace(new RegExp(`(\\b${item.key}\\s*=\\s*)(["'])([^"']+)\\2`, 'i'), `$1$2${href}$2`);
      html = html.replace(item.tag, replacement); paths.push(href);
    }
    html = html.replace(/<head\b[^>]*>/i, match => `${match}\n<meta name="haiedu-build" content="${buildId}">`);
    rendered[name] = html;
    pageManifest[name] = { sha256: digest(html), assets: [...new Set(paths)] };
  }
  const graph = {};
  for (const [output, info] of Object.entries(js.metafile.outputs)) {
    const key = path.relative(outdir, path.resolve(root, output)).split(path.sep).join('/');
    graph[key] = { inputs: Object.keys(info.inputs).sort(), imports: info.imports.map(item => ({ path: item.path.startsWith('/_assets/') ? item.path.slice(1) : path.relative(outdir, path.resolve(root, item.path)).split(path.sep).join('/'), kind: item.kind })) };
  }
  const manifest = { schemaVersion: 1, buildId, inputs: sorted(inputs), assets, pages: sorted(pageManifest), entries: sorted(assetMap), graph: sorted(graph) };
  const serialized = JSON.stringify(manifest, null, 2) + '\n';
  if (update) {
    for (const [name, bytes] of outputs) await immutableWrite(path.join(archive, 'assets', name), bytes);
    await immutableWrite(path.join(archive, 'releases', `${buildId}.json`), serialized);
    await writeFile(path.join(archive, 'current.json'), serialized);
  } else {
    if (await readFile(path.join(archive, 'current.json'), 'utf8') !== serialized) throw Error('Browser archive is stale; run npm run build:web-assets and commit the new immutable files');
    for (const [name, bytes] of outputs) if (!(await readFile(path.join(archive, 'assets', name))).equals(bytes)) throw Error(`Archived asset differs: ${name}`);
  }
  if (emit) {
    await rm(outdir, { recursive: true, force: true });
    await cp(web, outdir, { recursive: true });
    await cp(path.join(archive, 'assets'), path.join(outdir, '_assets'), { recursive: true });
    for (const [name, html] of Object.entries(rendered)) await writeFile(path.join(outdir, name), html);
    await writeFile(path.join(outdir, 'asset-manifest.json'), serialized);
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildWebAssets({ update: process.argv.includes('--update'), emit: !process.argv.includes('--check') });
  console.log(`Browser build ${manifest.buildId}: ${Object.keys(manifest.pages).length} pages, ${Object.keys(manifest.assets).length} immutable assets.`);
}
