import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivity } from './activity.mjs';

export async function createSite({ root, file, origins }) {
  const activity = await createActivity({ file });
  const allowed = new Set(origins);
  const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/2/': ['2/index.html', 'text/html; charset=utf-8'], '/2/index.html': ['2/index.html', 'text/html; charset=utf-8'],
    '/3/': ['3/index.html', 'text/html; charset=utf-8'], '/3/index.html': ['3/index.html', 'text/html; charset=utf-8'],
    '/hero.js': ['hero.js', 'text/javascript'], '/activity.js': ['activity.js', 'text/javascript'],
    '/favicon.svg': ['favicon.svg', 'image/svg+xml'], '/kubetown.png': ['kubetown.png', 'image/png'],
    '/thrustlings.png': ['thrustlings.png', 'image/png'], '/poab-terra.png': ['poab-terra.png', 'image/png'] };
  const json = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(data));
  };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health' && ['GET', 'HEAD'].includes(req.method)) return json(res, 200, { ok: true });
      if (url.pathname === '/api/events' && req.method === 'POST') {
        if (req.headers.dnt === '1' || req.headers['sec-gpc'] === '1') return json(res, 202, { ok: true });
        if (!allowed.has(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: 'Origin not allowed' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required' });
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 4096) return json(res, 413, { error: 'Request too large' });
        }
        let data;
        try { data = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
        if (!activity.accept(data)) return json(res, 400, { error: 'Invalid activity' });
        await activity.flush();
        return json(res, 202, { ok: true });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
      if (url.pathname === '/2' || url.pathname === '/3') {
        res.writeHead(308, { Location: `${url.pathname}/${url.search}` });
        return res.end();
      }
      const asset = assets[url.pathname];
      if (!asset) return json(res, 404, { error: 'Not found' });
      const body = await fs.readFile(path.join(root, asset[0]));
      res.writeHead(200, { 'Content-Type': asset[1], 'Content-Length': body.length,
        'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { if (!res.headersSent) json(res, 500, { error: 'Request failed' }); else res.destroy(); }
  });
  server.requestTimeout = 15000;
  // This listener is never proxied by Nginx. It exposes aggregates only, without visitor IDs.
  const metrics = http.createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/metrics') return json(res, 404, { error: 'Not found' });
    json(res, 200, activity.snapshot());
  });
  return { server, metrics, activity };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const site = await createSite({ root: process.env.SPACELAKE_ROOT || '/opt/spacelake/current/site',
    file: process.env.SPACELAKE_METRICS_FILE || '/var/lib/spacelake/activity.json',
    origins: (process.env.SPACELAKE_ORIGINS || 'https://spacelake.planetarypixel.be').split(',') });
  // 4190 is blocked by Fetch, including Node health probes; keep this on an allowed port.
  site.server.listen(4192, '127.0.0.1');
  site.metrics.listen(4191, '127.0.0.1');
  console.log('SpaceLake ready on loopback ports 4192/4191');
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    site.server.close(); site.metrics.close();
    site.server.closeAllConnections(); site.metrics.closeAllConnections();
  });
}
