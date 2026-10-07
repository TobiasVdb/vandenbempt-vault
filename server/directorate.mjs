import fs from 'node:fs'
import path from 'node:path'
import express from 'express'

/** Fixed upstream: clients cannot turn this into an arbitrary URL proxy. */
export function registerDirectorate(app, {
  directory = path.resolve('vendor/directorate/dist'),
  upstream = process.env.DIRECTORATE_COLLECTOR_URL || 'https://atelierav.be/directorate',
  request = fetch,
  bobSnapshot,
} = {}) {
  const base = new URL(upstream.replace(/\/$/, '') + '/')
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
    throw new Error('Directorate collector must use HTTPS')
  const api = express.Router()
  api.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin) {
      let sameHost = false
      try { sameHost = new URL(origin).host === req.headers.host } catch { /* Reject malformed origins. */ }
      if (!sameHost) return res.status(403).json({ error: 'Cross-origin Directorate access is disabled.' })
    }
    if (req.path !== '/health' && !req.headers.authorization?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Enter the dashboard admin token to continue.' })
    next()
  })
  api.use(express.raw({ limit: '64kb', type: () => true }))
  api.get('/bob-metrics', async (req, res) => {
    if (!bobSnapshot) return res.status(503).json({ error: 'BOB metrics unavailable.' })
    try {
      const authorized = await request(new URL('api/projects', base), {
        headers: { Authorization: req.headers.authorization }, signal: AbortSignal.timeout(10000), redirect: 'error',
      })
      await authorized.body?.cancel()
      if (authorized.status !== 200) return res.status(authorized.status === 401 ? 401 : 502).json({ error: 'BOB metrics access denied.' })
      res.set('Cache-Control', 'no-store').json(bobSnapshot())
    } catch { res.status(502).json({ error: 'BOB metrics unavailable.' }) }
  })
  api.use(async (req, res) => {
    const valid = (req.method === 'GET' && /^\/(health|projects|activity|push\/config|projects\/[^/]+\/history)$/.test(req.path))
      || (req.method === 'POST' && /^\/(projects|v1\/ingest|push\/(subscribe|unsubscribe|test)|projects\/[^/]+\/(rotate-key|important-metrics))$/.test(req.path))
    if (!valid) return res.status(404).json({ error: 'Not found' })
    const target = new URL('api' + req.url, base)
    // Express paths and query parameters cannot replace the fixed upstream origin.
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname + 'api/'))
      return res.status(400).json({ error: 'Invalid API path' })
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (req.headers.authorization) headers.Authorization = req.headers.authorization
      const response = await request(target, {
        method: req.method, headers,
        ...(req.method === 'POST' ? { body: req.body } : {}),
        signal: AbortSignal.timeout(10000), redirect: 'error',
      })
      res.set('Cache-Control', 'no-store')
      res.set('X-Content-Type-Options', 'nosniff')
      if (response.headers.has('retry-after')) res.set('Retry-After', response.headers.get('retry-after'))
      const body = await response.text()
      if (!response.headers.get('content-type')?.includes('application/json'))
        return res.status(502).json({ error: 'Directorate collector returned an invalid response.' })
      res.status(response.status).type('json').send(body)
    } catch {
      res.status(502).json({ error: 'Directorate collector is unavailable. Retry shortly.' })
    }
  })
  api.use((error, _req, res, _next) => res.status(error.status === 413 ? 413 : 400).json({ error: 'Invalid or oversized request.' }))
  // Before the host's JSON parser and general SPA fallback.
  app.use('/directorate/api', api)
  app.get(/^\/directorate$/, (_req, res) => res.redirect(301, '/directorate/'))
  app.use('/directorate', express.static(directory), (_req, res) => {
    if (fs.existsSync(path.join(directory, 'index.html'))) res.sendFile(path.join(directory, 'index.html'))
    else res.status(503).send('Directorate build is not available.')
  })
}
