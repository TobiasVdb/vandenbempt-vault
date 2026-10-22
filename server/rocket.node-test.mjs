import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import path from 'node:path'
import express from 'express'
import { createRocketHttp } from '../vendor/rocket/server/rocket-http.mjs'

test('Rocket owns its prefix, redirects only the bare path and leaves other host routes intact', async (t) => {
  const app = express()
  const handle = createRocketHttp({ root: path.resolve('vendor/rocket'), getService: () => null })
  app.get(/^\/rocket$/, (_request, response) => response.redirect(302, '/rocket/'))
  app.use('/rocket', (request, response) => { void handle(request, response) })
  app.get('/api/health', (_request, response) => response.json({ ok: true }))
  app.get('/bob/', (_request, response) => response.send('Existing BOB mount'))
  app.get('*', (_request, response) => response.send('Existing host SPA'))
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const url = `http://127.0.0.1:${server.address().port}`
  const redirect = await fetch(url + '/rocket', { redirect: 'manual' })
  assert.equal(redirect.status, 302)
  assert.equal(redirect.headers.get('location'), '/rocket/')
  const game = await fetch(url + '/rocket/')
  assert.equal(game.status, 200)
  assert.match(await game.text(), /<base href="\.\/game\/">/)
  assert.equal((await fetch(url + '/rocket/game/online.js')).status, 200)
  assert.equal((await fetch(url + '/rocket/vendor/three/examples/jsm/utils/SkeletonUtils.js')).status, 200)
  assert.equal((await fetch(url + '/rocket/api/health')).status, 503)
  assert.equal((await fetch(url + '/rocket/missing.js')).status, 404)
  assert.equal((await fetch(url + '/rocket/server/ship-hulls.json')).status, 404)
  assert.match(await (await fetch(url + '/rocket/hangar/')).text(), /<base href="\.\.\/">/)
  assert.match(await (await fetch(url + '/bob/')).text(), /Existing BOB mount/)
  assert.deepEqual(await (await fetch(url + '/api/health')).json(), { ok: true })
  assert.match(await (await fetch(url + '/')).text(), /Existing host SPA/)
  assert.match(await (await fetch(url + '/rockets')).text(), /Existing host SPA/)
})
