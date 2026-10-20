import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import express from 'express'
import { registerVectraUsage } from './vectra-usage.mjs'

test('Vectra intake restricts origins, strips credentials, bounds bodies and isolates upstream failure', async () => {
  const app = express()
  const calls = []
  let status = 202
  registerVectraUsage(app, { request: async (url, options) => {
    calls.push({ url: String(url), options })
    if (status === 0) throw new Error('private upstream message')
    return new Response('{}', { status })
  } })
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api/vectra-usage`
  const origin = 'https://vectra-v734a.ondigitalocean.app'
  const body = { id: randomUUID(), actions: ['flight_select'] }
  const post = (value = body, headers = {}) => fetch(base, { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value) })
  try {
    const preflight = await fetch(base, { method: 'OPTIONS', headers: { Origin: origin } })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
    assert.equal((await post(body, { Origin: 'https://foreign.example' })).status, 403)
    assert.equal((await fetch(base)).status, 403)
    assert.equal((await post({ ...body, email: 'private' })).status, 400)
    assert.equal((await post({ ...body, actions: ['x'.repeat(5000)] })).status, 413)
    assert.equal(calls.length, 0)
    const accepted = await post(body, { Authorization: 'Bearer never-forward', Cookie: 'never=forward', 'X-Forwarded-For': 'private' })
    assert.equal(accepted.status, 202)
    assert.equal(accepted.headers.get('cache-control'), 'no-store')
    assert.equal(calls[0].url, 'https://atelierav.be/directorate/api/vectra-usage')
    assert.deepEqual(calls[0].options.headers, { Origin: origin, 'Content-Type': 'application/json' })
    assert.deepEqual(JSON.parse(calls[0].options.body), body)
    assert.equal(calls[0].options.redirect, 'error')
    status = 429; const limited = await post(); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60')
    status = 0; const failed = await post(); assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /private/)
    for (let i = 0; i < 300; i++) await post()
    assert.equal((await post()).status, 429)
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve))
  }
})
