import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';

export async function serveWeb(initialRoot) {
  let root = path.resolve(initialRoot);
  const requests = [];
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    let name = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if (!path.extname(name)) name += '.html';
    const filename = path.resolve(root, name);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      const bytes = await readFile(filename), etag = '"' + createHash('sha256').update(bytes).digest('hex') + '"';
      const headers = { 'Content-Type': types[path.extname(name)] ?? 'application/octet-stream', ETag: etag,
        'Cache-Control': name.startsWith('_assets/') ? 'public, max-age=31536000, immutable' : /^(release|asset-manifest)\.json$/.test(name) ? 'no-store' : 'public, max-age=0, must-revalidate', Vary: 'Accept-Encoding' };
      if (request.headers['if-none-match'] === etag) { requests.push({ path: url.pathname, status: 304, bytes: 0 }); response.writeHead(304, headers).end(); return; }
      const gzip = /\bgzip\b/.test(request.headers['accept-encoding'] ?? '') && /\.(?:m?js|html|css|json|svg)$/.test(name);
      const body = gzip ? gzipSync(bytes) : bytes;
      if (gzip) headers['Content-Encoding'] = 'gzip';
      requests.push({ path: url.pathname, status: 200, bytes: body.length });
      response.writeHead(200, headers).end(body);
    } catch {
      requests.push({ path: url.pathname, status: 404, bytes: 0 }); response.writeHead(404).end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, requests, setRoot: value => { root = path.resolve(value); },
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

export function installSignedOutClient() {
  const client = { auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: callback => { queueMicrotask(() => callback('INITIAL_SESSION', null)); return { data: { subscription: { unsubscribe() {} } } }; },
    signOut: async () => ({ error: null }),
  }, functions: { invoke: async () => ({ data: null, error: Error('Synthetic signed-out fixture') }) },
  from() { const query = { select: () => query, eq: () => query, is: () => query, order: () => query, limit: () => query, maybeSingle: async () => ({ data: null }) }; return query; } };
  window.__haieduSupabaseClient = client;
}
