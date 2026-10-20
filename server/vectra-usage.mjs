import express from 'express'

const origins = new Set(['https://vectra-v734a.ondigitalocean.app'])

/** Dedicated bounded anonymous intake; never forward browser credentials. */
export function registerVectraUsage(app, { request = fetch,
  upstream = process.env.DIRECTORATE_COLLECTOR_URL || 'https://atelierav.be/directorate',
} = {}) {
  const target = new URL(upstream.replace(/\/$/, '') + '/api/vectra-usage')
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash)
    throw new Error('Usage collector must use HTTPS')
  const router = express.Router()
  let minute = Date.now()
  let count = 0
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store').set('Vary', 'Origin')
    const origin = req.headers.origin
    if (!origins.has(origin)) return res.status(403).json({ error: 'Vectra origin required.' })
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    if (req.method !== 'POST') return res.sendStatus(405)
    if (Date.now() - minute >= 60000) { minute = Date.now(); count = 0 }
    if (++count > 300) return res.set('Retry-After', '60').status(429).json({ error: 'Retry later.' })
    next()
  })
  router.use(express.json({ limit: '4kb', type: 'application/json' }))
  router.post('/', async (req, res) => {
    const body = req.body
    const presence = body && Object.keys(body).join(',') === 'presence'
      && typeof body.presence === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.presence)
    if (!presence && (!body || Object.keys(body).sort().join(',') !== 'actions,id'
      || typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id)
      || !Array.isArray(body.actions) || !body.actions.length || body.actions.length > 100
      || !body.actions.every(action => typeof action === 'string' && /^[a-z_]{1,32}$/.test(action))))
      return res.status(400).json({ error: 'Invalid usage batch.' })
    try {
      const result = await request(target, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: req.headers.origin },
        body: JSON.stringify(presence ? { presence: body.presence } : { id: body.id, actions: body.actions }),
        signal: AbortSignal.timeout(5000), redirect: 'error',
      })
      await result.body?.cancel()
      if (result.status === 429) res.set('Retry-After', '60')
      if ([200, 202].includes(result.status)) return res.status(result.status).json({ accepted: true })
      if ([400, 413, 429].includes(result.status)) return res.status(result.status).json({ error: 'Usage batch rejected.' })
      res.status(503).json({ error: 'Usage collector unavailable.' })
    } catch { res.status(503).json({ error: 'Usage collector unavailable.' }) }
  })
  router.use((error, _req, res, _next) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid usage batch.' })
  })
  // Register before the host's broad CORS policy and JSON parser.
  app.use('/api/vectra-usage', router)
}
