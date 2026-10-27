import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'
import { registerRocketRedirect } from './rocket-redirect.mjs'

test('legacy Rocket routes move to the dedicated host and preserve paths and queries', async (t) => {
  const app = express()
  registerRocketRedirect(app)
  app.get('*', (_request, response) => response.send('House of Tobias'))
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  for (const [path, destination] of [
    ['/rocket', '/'], ['/rocket?source=old', '/?source=old'],
    ['/rocket/', '/'], ['/rocket/game/?mission=amber', '/game/?mission=amber'],
    ['/rocket/privacy', '/privacy'], ['/rocket//example.com', '//example.com'],
  ]) {
    const response = await fetch(base + path, { redirect: 'manual' })
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), 'https://rocket.planetarypixel.be' + destination)
  }
  const post = await fetch(base + '/rocket/api/join', { method: 'POST', redirect: 'manual' })
  assert.equal(post.status, 308)
  assert.equal(post.headers.get('location'), 'https://rocket.planetarypixel.be/api/join')
  for (const path of ['/', '/bob/', '/rockets', '/api/health']) {
    const response = await fetch(base + path)
    assert.equal(response.status, 200)
    assert.equal(await response.text(), 'House of Tobias')
  }
})
