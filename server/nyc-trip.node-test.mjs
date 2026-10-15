import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import webpush from 'web-push'
import { createNycTripService, normalizeFix, normalizeSubscription, dueAlerts, schedule } from './nyc-trip.mjs'

const admin = 'A'.repeat(43)
const instant = Date.parse('2026-10-24T18:21:00-04:00')
const subscription = { endpoint: 'https://web.push.apple.com/test', keys: { p256dh: Buffer.alloc(65, 1).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }
function memoryPool() {
  const devices = [], fixes = [], deliveries = new Set()
  return { devices, fixes, deliveries, async query(sql, p = []) {
    if (sql.startsWith('INSERT INTO nyc_devices')) { devices.push({ id: p[0], label: p[1], write_hash: p[2], read_hash: p[3], pair_hash: p[4], sharing: false }); return { rows: [] } }
    if (sql.startsWith('UPDATE nyc_devices SET write_hash')) { const d = devices.find(d => d.pair_hash === p[1]); if (!d) return { rows: [] }; d.write_hash = p[0]; d.pair_hash = null; return { rows: [{ id: d.id, label: d.label }] } }
    if (sql.includes('SELECT * FROM nyc_devices WHERE write_hash')) return { rows: devices.filter(d => d.write_hash === p[0]) }
    if (sql.includes('SELECT * FROM nyc_devices WHERE read_hash')) return { rows: devices.filter(d => d.read_hash === p[0]) }
    if (sql.startsWith('UPDATE nyc_devices SET updated_at')) { const d = devices.find(d => d.id === p[0]); if (d.updated_at) return { rows: [] }; d.updated_at = instant; d.sharing = true; return { rows: [{ id: d.id }] } }
    if (sql.startsWith('INSERT INTO nyc_fixes')) { fixes.push({ device_id: p[0], captured_at: p[1], latitude: p[2], longitude: p[3], accuracy: p[4] }); return { rows: [] } }
    if (sql.startsWith('SELECT latitude')) return { rows: fixes.filter(f => f.device_id === p[0]).reverse() }
    if (sql.startsWith('UPDATE nyc_devices SET sharing')) { devices.find(d => d.id === p[0]).sharing = false; return { rows: [] } }
    if (sql.startsWith('UPDATE nyc_devices SET subscription=$2')) { Object.assign(devices.find(d => d.id === p[0]), { subscription: p[1], subscription_created: new Date(instant - 60000), app_url: p[2] }); return { rows: [] } }
    if (sql.startsWith('UPDATE nyc_devices SET subscription=NULL')) { devices.find(d => d.id === p[0]).subscription = null; return { rows: [] } }
    if (sql.startsWith('SELECT * FROM nyc_devices WHERE subscription')) return { rows: devices.filter(d => d.subscription) }
    if (sql.startsWith('INSERT INTO nyc_alert_deliveries')) { const key = p.join(':'); if (deliveries.has(key)) return { rows: [] }; deliveries.add(key); return { rows: [{ event_id: p[1] }] } }
    if (sql.startsWith('DELETE FROM nyc_devices WHERE id')) { const index = devices.findIndex(d => d.id === p[0]); if (index >= 0) devices.splice(index, 1); for (let i = fixes.length - 1; i >= 0; i--) if (fixes[i].device_id === p[0]) fixes.splice(i, 1); return { rows: [] } }
    if (sql.startsWith('DELETE ') || sql.startsWith('UPDATE nyc_alert_deliveries')) return { rows: [] }
    throw new Error('Unexpected test query: ' + sql)
  } }
}
async function fixture(t, { configured = true, push = false, sendPush, events } = {}) {
  const app = express(), pool = memoryPool(), keys = webpush.generateVAPIDKeys()
  app.use(express.json({ limit: '8kb' }))
  const service = createNycTripService({ app, pool, isDbReady: () => true, now: () => instant, env: { NYC_TRIP_ADMIN_TOKEN: configured ? admin : '', ...(push ? { NYC_VAPID_PUBLIC_KEY: keys.publicKey, NYC_VAPID_PRIVATE_KEY: keys.privateKey, NYC_VAPID_SUBJECT: 'mailto:test@example.com' } : {}) }, sendPush, events })
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}/api/nyc-trip/`
  const request = (path, token, method = 'GET', body, origin) => fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const pair = async () => {
    const created = await (await request('devices', admin, 'POST', { label: 'Test phone' })).json()
    const paired = await (await request('pair', null, 'POST', { code: created.pairingCode })).json()
    return { ...created, writeToken: paired.token }
  }
  return { service, pool, request, pair }
}

test('GPS validation rejects stale, future, imprecise and nonnumeric positions', () => {
  const fix = { latitude: 40.75, longitude: -73.98, accuracy: 10, timestamp: instant }
  assert.deepEqual(normalizeFix(fix, instant), fix)
  for (const change of [{ timestamp: instant - 120001 }, { timestamp: instant + 30001 }, { accuracy: 1001 }, { latitude: 91 }, { longitude: '0' }, { latitude: null }]) assert.equal(normalizeFix({ ...fix, ...change }, instant), null)
})
test('push endpoint validation blocks arbitrary URLs, local hosts and credentials', () => {
  assert.ok(normalizeSubscription(subscription))
  for (const endpoint of ['http://web.push.apple.com/test', 'https://127.0.0.1/test', 'https://web.push.apple.com.evil.test/', 'https://user:pass@web.push.apple.com/', 'https://web.push.apple.com:8443/']) assert.equal(normalizeSubscription({ ...subscription, endpoint }), null)
  assert.equal(normalizeSubscription({ ...subscription, keys: { auth: '', p256dh: '' } }), null)
})
test('unconfigured service is closed; config exposes no secrets', async t => {
  const f = await fixture(t, { configured: false })
  assert.equal((await f.request('fix', admin, 'POST', {})).status, 503)
  const config = await (await f.request('config')).json(); assert.equal(config.ready, false); assert.equal(config.publicKey, null)
})
test('pairing is one-use; reader and reporter capabilities cannot be interchanged', async t => {
  const f = await fixture(t), device = await f.pair()
  assert.equal((await f.request('pair', null, 'POST', { code: device.pairingCode })).status, 401)
  assert.equal((await f.request('follow', device.writeToken)).status, 401)
  assert.equal((await f.request('fix', device.readToken, 'POST', {})).status, 401)
  assert.equal((await f.request('follow')).status, 401)
  assert.equal((await f.request('follow', device.readToken)).status, 200)
  assert.equal(f.pool.devices[0].write_hash.includes(device.writeToken), false)
})
test('private endpoint CORS rejects other origins including preflight', async t => {
  const f = await fixture(t)
  assert.equal((await f.request('config', null, 'OPTIONS', null, 'https://evil.test')).status, 403)
  const response = await f.request('config', null, 'OPTIONS', null, 'https://frost-design.be')
  assert.equal(response.status, 204); assert.equal(response.headers.get('access-control-allow-origin'), 'https://frost-design.be')
})
test('real reports are bounded, paused explicitly and erased with the device', async t => {
  const f = await fixture(t), device = await f.pair(), fix = { latitude: 40.75, longitude: -73.98, accuracy: 10, timestamp: instant }
  assert.equal((await f.request('fix', device.writeToken, 'POST', { ...fix, timestamp: instant - 300000 })).status, 400)
  assert.equal((await f.request('fix', device.writeToken, 'POST', fix)).status, 201)
  assert.equal((await f.request('fix', device.writeToken, 'POST', fix)).status, 429)
  assert.equal((await f.request('follow', device.readToken)).headers.get('cache-control'), 'no-store')
  assert.equal((await (await f.request('follow', device.readToken)).json()).fixes.length, 1)
  assert.equal((await f.request('sharing', device.writeToken, 'PUT', { active: false })).status, 204)
  assert.equal((await (await f.request('follow', device.readToken)).json()).sharing, false)
  assert.equal((await f.request('device', device.writeToken, 'DELETE')).status, 204)
  assert.equal((await f.request('follow', device.readToken)).status, 401); assert.equal(f.pool.fixes.length, 0)
})
test('reminders use UTC instants derived from NYC departure times and do not replay missed events', () => {
  const event = schedule.events.find(e => e.id === 'nyc-24-8-5')
  assert.equal(new Date(event.at).toISOString(), '2026-10-24T22:21:00.000Z')
  assert.equal(dueAlerts(event.at - 1).includes(event), false)
  assert.equal(dueAlerts(event.at).includes(event), true)
  assert.equal(dueAlerts(event.at + 90000).includes(event), false)
  assert.equal(dueAlerts(Date.parse('2026-10-27T05:00:00Z')).length, 0)
})
test('push scheduling claims each device/event once and keeps the app URL scoped', async t => {
  const sent = [], event = { id: 'test', at: instant, title: 'Depart', body: 'Next stop' }
  const f = await fixture(t, { push: true, events: [event], sendPush: async (...args) => sent.push(args) }), device = await f.pair()
  assert.equal((await f.request('subscription', device.writeToken, 'PUT', { subscription, url: 'https://evil.test/' })).status, 400)
  assert.equal((await f.request('subscription', device.writeToken, 'PUT', { subscription, url: 'https://frost-design.be/dpnyc/' })).status, 204)
  await f.service.tick(); await f.service.tick()
  assert.equal(sent.length, 1); assert.equal(JSON.parse(sent[0][1]).url, 'https://frost-design.be/dpnyc/'); assert.equal(sent[0][2].TTL, 90)
  assert.equal((await f.request('subscription', device.writeToken, 'DELETE')).status, 204)
  assert.equal((await (await f.request('subscription', device.writeToken)).json()).active, false)
})
