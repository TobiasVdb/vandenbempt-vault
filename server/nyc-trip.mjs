import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import webpush from 'web-push'

const API = '/api/nyc-trip'
const tripEnd = Date.parse('2026-10-27T04:00:00Z')
const credentialEnd = '2026-11-03T04:00:00Z'
const digest = value => createHash('sha256').update(value).digest('hex')
const secret = () => randomBytes(32).toString('base64url')
const bearer = request => /^Bearer ([A-Za-z0-9_-]{40,128})$/.exec(request.headers.authorization || '')?.[1] || ''
const sameSecret = (a, b) => Boolean(a && b && timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b))))
export const schedule = JSON.parse(readFileSync(new URL('./nyc-schedule.json', import.meta.url), 'utf8'))

export function normalizeFix(value, now = Date.now()) {
  if (!value || typeof value !== 'object') return null
  const { latitude, longitude, accuracy, timestamp } = value
  if (![latitude, longitude, accuracy, timestamp].every(Number.isFinite)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || accuracy < 0 || accuracy > 1000) return null
  if (timestamp < now - 120000 || timestamp > now + 30000) return null
  return { latitude, longitude, accuracy, timestamp }
}

export function normalizeSubscription(value) {
  try {
    const url = new URL(value.endpoint)
    const hosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']
    const allowed = hosts.includes(url.hostname) || url.hostname.endsWith('.notify.windows.com')
    if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.href.length > 2048) return null
    if (!/^[A-Za-z0-9_-]+$/.test(value.keys?.p256dh || '') || !/^[A-Za-z0-9_-]+$/.test(value.keys?.auth || '')) return null
    if (Buffer.from(value.keys.p256dh, 'base64url').length !== 65 || Buffer.from(value.keys.auth, 'base64url').length !== 16) return null
    return { endpoint: url.href, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } }
  } catch { return null }
}

export function dueAlerts(now, events = schedule.events) {
  // Never replay old reminders after downtime or send outside the actual trip.
  if (now >= tripEnd) return []
  return events.filter(event => event.at <= now && event.at > now - 90000)
}

export async function initializeNycTripDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nyc_devices (
      id UUID PRIMARY KEY, label TEXT NOT NULL, write_hash TEXT NOT NULL UNIQUE,
      read_hash TEXT NOT NULL UNIQUE, pair_hash TEXT UNIQUE, pair_expires TIMESTAMPTZ,
      expires TIMESTAMPTZ NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE,
      sharing BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ,
      subscription JSONB, subscription_created TIMESTAMPTZ, app_url TEXT
    );
    CREATE TABLE IF NOT EXISTS nyc_fixes (
      device_id UUID REFERENCES nyc_devices(id) ON DELETE CASCADE,
      captured_at TIMESTAMPTZ NOT NULL, latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION NOT NULL,
      PRIMARY KEY(device_id, captured_at)
    );
    CREATE TABLE IF NOT EXISTS nyc_alert_deliveries (
      device_id UUID REFERENCES nyc_devices(id) ON DELETE CASCADE,
      event_id TEXT NOT NULL, claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'sending', PRIMARY KEY(device_id, event_id)
    );
  `)
}

export function createNycTripService({ app, pool, isDbReady, env = process.env, now = Date.now, sendPush, events = schedule.events }) {
  const origins = new Set(['https://frost-design.be', 'https://www.frost-design.be', 'https://de-pleckers-new-york.ellandir.chatgpt.site', ...(env.NYC_TRIP_ORIGINS || '').split(',').filter(Boolean)])
  let pushReady = false
  if (env.NYC_VAPID_PUBLIC_KEY && env.NYC_VAPID_PRIVATE_KEY && env.NYC_VAPID_SUBJECT) {
    try {
      webpush.setVapidDetails(env.NYC_VAPID_SUBJECT, env.NYC_VAPID_PUBLIC_KEY, env.NYC_VAPID_PRIVATE_KEY)
      pushReady = true
    } catch { console.warn('NYC push configuration is invalid; push remains disabled.') }
  }
  const enabled = () => Boolean(/^[A-Za-z0-9_-]{40,128}$/.test(env.NYC_TRIP_ADMIN_TOKEN || '') && pool && isDbReady())
  const allowedOrigin = request => {
    const origin = request.headers.origin
    return !origin || origins.has(origin) || origin === `https://${request.headers.host}` || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  }
  const wrap = fn => async (request, response) => {
    try { await fn(request, response) } catch {
      // Location, browser push endpoints and credentials must not enter logs.
      response.status(503).json({ error: 'Trip service temporarily unavailable.' })
    }
  }
  // The host bypasses its general CORS handler for this private service.
  app.use(API, (request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    if (!allowedOrigin(request)) { response.status(403).json({ error: 'Origin not allowed.' }); return }
    if (request.headers.origin) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
      response.setHeader('Vary', 'Origin')
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    }
    if (request.method === 'OPTIONS') { response.sendStatus(204); return }
    if (request.path === '/config') { next(); return }
    if (!enabled()) { response.status(503).json({ error: 'Trip service has not been configured.' }); return }
    if (Number(request.headers['content-length'] || 0) > 8192) { response.sendStatus(413); return }
    next()
  })
  app.get(API + '/config', (_request, response) => response.json({ ready: enabled(), pushReady: enabled() && pushReady, publicKey: enabled() && pushReady ? env.NYC_VAPID_PUBLIC_KEY : null, scheduleVersion: schedule.version }))

  const authenticate = async (request, response, kind = 'write') => {
    const token = bearer(request)
    if (!token) { response.sendStatus(401); return null }
    const result = await pool.query(`SELECT * FROM nyc_devices WHERE ${kind === 'read' ? 'read_hash' : 'write_hash'}=$1 AND NOT revoked AND expires>NOW()`, [digest(token)])
    if (!result.rows[0]) { response.sendStatus(401); return null }
    return result.rows[0]
  }
  app.post(API + '/devices', wrap(async (request, response) => {
    if (!sameSecret(bearer(request), env.NYC_TRIP_ADMIN_TOKEN)) { response.sendStatus(401); return }
    const label = typeof request.body?.label === 'string' ? request.body.label.trim() : ''
    if (!label || label.length > 60 || now() >= Date.parse(credentialEnd)) { response.sendStatus(400); return }
    const id = randomUUID(), writeToken = secret(), readToken = secret(), pairingCode = secret()
    await pool.query(`INSERT INTO nyc_devices(id,label,write_hash,read_hash,pair_hash,pair_expires,expires) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '15 minutes',$6)`, [id, label, digest(writeToken), digest(readToken), digest(pairingCode), credentialEnd])
    response.status(201).json({ id, pairingCode, readToken, expires: credentialEnd })
  }))
  app.post(API + '/pair', wrap(async (request, response) => {
    const code = request.body?.code
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code)) { response.sendStatus(400); return }
    const token = secret()
    const result = await pool.query(`UPDATE nyc_devices SET write_hash=$1,pair_hash=NULL,pair_expires=NULL WHERE pair_hash=$2 AND pair_expires>NOW() AND expires>NOW() AND NOT revoked RETURNING id,label`, [digest(token), digest(code)])
    if (!result.rows[0]) { response.status(401).json({ error: 'Pairing code invalid or expired.' }); return }
    response.json({ ...result.rows[0], token })
  }))
  app.post(API + '/fix', wrap(async (request, response) => {
    const device = await authenticate(request, response); if (!device) return
    const fix = normalizeFix(request.body, now())
    if (!fix) { response.status(400).json({ error: 'A fresh accurate GPS fix is required.' }); return }
    // One report per 15 seconds per device, independent of client behaviour.
    const allowed = await pool.query(`UPDATE nyc_devices SET updated_at=NOW(),sharing=TRUE WHERE id=$1 AND (updated_at IS NULL OR updated_at<NOW()-INTERVAL '15 seconds') RETURNING id`, [device.id])
    if (!allowed.rows.length) { response.sendStatus(429); return }
    await pool.query(`INSERT INTO nyc_fixes(device_id,captured_at,latitude,longitude,accuracy) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [device.id, new Date(fix.timestamp), fix.latitude, fix.longitude, fix.accuracy])
    response.status(201).json({ receivedAt: new Date(now()).toISOString() })
  }))
  app.put(API + '/sharing', wrap(async (request, response) => {
    const device = await authenticate(request, response); if (!device) return
    if (request.body?.active !== false) { response.sendStatus(400); return }
    await pool.query('UPDATE nyc_devices SET sharing=FALSE WHERE id=$1', [device.id])
    response.sendStatus(204)
  }))
  app.get(API + '/follow', wrap(async (request, response) => {
    const device = await authenticate(request, response, 'read'); if (!device) return
    const result = await pool.query(`SELECT latitude,longitude,accuracy,captured_at FROM nyc_fixes WHERE device_id=$1 AND captured_at>NOW()-INTERVAL '7 days' ORDER BY captured_at DESC LIMIT 500`, [device.id])
    response.json({ label: device.label, sharing: device.sharing, fixes: result.rows, schedule })
  }))
  app.delete(API + '/device', wrap(async (request, response) => {
    const device = await authenticate(request, response); if (!device) return
    await pool.query('DELETE FROM nyc_devices WHERE id=$1', [device.id])
    response.sendStatus(204)
  }))
  app.delete(API + '/devices/:id', wrap(async (request, response) => {
    if (!sameSecret(bearer(request), env.NYC_TRIP_ADMIN_TOKEN)) { response.sendStatus(401); return }
    if (!/^[a-f0-9-]{36}$/.test(request.params.id)) { response.sendStatus(400); return }
    await pool.query('DELETE FROM nyc_devices WHERE id=$1', [request.params.id])
    response.sendStatus(204)
  }))
  app.put(API + '/subscription', wrap(async (request, response) => {
    const device = await authenticate(request, response); if (!device) return
    if (!pushReady) { response.status(503).json({ error: 'Push has not been configured.' }); return }
    const subscription = normalizeSubscription(request.body?.subscription)
    let url
    try { url = new URL(request.body?.url) } catch { response.sendStatus(400); return }
    if (!subscription || !origins.has(url.origin) || !['/', '/dpnyc/'].includes(url.pathname) || url.search || url.hash) { response.sendStatus(400); return }
    await pool.query('UPDATE nyc_devices SET subscription=$2,subscription_created=NOW(),app_url=$3 WHERE id=$1', [device.id, subscription, url.href])
    response.sendStatus(204)
  }))
  app.delete(API + '/subscription', wrap(async (request, response) => {
    const device = await authenticate(request, response); if (!device) return
    await pool.query('UPDATE nyc_devices SET subscription=NULL,subscription_created=NULL WHERE id=$1', [device.id])
    response.sendStatus(204)
  }))
  app.get(API + '/subscription', wrap(async (request, response) => {
    const device = await authenticate(request, response); if (!device) return
    response.json({ active: Boolean(device.subscription && pushReady) })
  }))

  let running = false, lastPrune = 0
  const tick = async () => {
    if (running || !enabled()) return
    running = true
    try {
      if (now() - lastPrune > 3600000) {
        await pool.query("DELETE FROM nyc_fixes WHERE captured_at<NOW()-INTERVAL '7 days'")
        await pool.query('DELETE FROM nyc_devices WHERE expires<NOW()')
        lastPrune = now()
      }
      if (!pushReady) return
      const due = dueAlerts(now(), events)
      if (!due.length) return
      const devices = await pool.query('SELECT * FROM nyc_devices WHERE subscription IS NOT NULL AND NOT revoked AND expires>NOW()')
      for (const device of devices.rows) for (const event of due) {
        // A new subscription must not receive an alert from before opt-in.
        if (new Date(device.subscription_created).valueOf() > event.at) continue
        const claim = await pool.query('INSERT INTO nyc_alert_deliveries(device_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id', [device.id, event.id])
        if (!claim.rows.length) continue
        try {
          await (sendPush || webpush.sendNotification.bind(webpush))(device.subscription, JSON.stringify({ title: event.title, body: event.body, tag: event.id, url: device.app_url, expires: event.at + 90000 }), { TTL: 90, urgency: 'high', timeout: 10000 })
          await pool.query("UPDATE nyc_alert_deliveries SET status='sent' WHERE device_id=$1 AND event_id=$2", [device.id, event.id])
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) await pool.query('UPDATE nyc_devices SET subscription=NULL WHERE id=$1', [device.id])
          await pool.query("UPDATE nyc_alert_deliveries SET status='failed' WHERE device_id=$1 AND event_id=$2", [device.id, event.id])
        }
      }
    } finally { running = false }
  }
  return { tick }
}
