import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { registerRootAccess } from './root-access.mjs'

test('root access blocks aliases, validates passwords, and expires secure sessions without changing mounted apps', async () => {
  const app = express()
  let time = Date.now()
  app.get(['/rocket/', '/bob/', '/nyc-follow/', '/api/health'], (_request, response) => response.send('public service'))
  app.use(registerRootAccess(app, { now: () => time }))
  app.get('*', (_request, response) => response.send('private household'))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const unlock = (password, headers = {}) => fetch(`${base}/__house/unlock`, {
    method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams({ password }),
  })
  try {
    for (const path of ['/', '/home', '/index.html', '/%69ndex.html', '/family', '/assets/private.js', '/unknown']) {
      const response = await fetch(base + path)
      assert.equal(response.status, 401, path)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      const html = await response.text()
      assert.ok(html.includes('type="password"'))
      assert.ok(!html.includes('private household'))
      assert.ok(!html.includes('sofias'))
    }
    assert.equal((await fetch(base, { method: 'HEAD' })).status, 401)
    for (const path of ['/rocket/', '/bob/', '/nyc-follow/', '/api/health']) assert.equal((await fetch(base + path)).status, 200)
    assert.equal((await unlock('wrong')).status, 401)
    assert.equal((await unlock('sofias', { origin: 'https://evil.example' })).status, 403)
    const response = await unlock('sofias', { origin: base })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), '/')
    const cookie = response.headers.get('set-cookie')
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=43200']) assert.ok(cookie.includes(flag), flag)
    const headers = { cookie: cookie.split(';')[0] }
    assert.equal(await (await fetch(base, { headers })).text(), 'private household')
    assert.equal((await fetch(base, { headers: { cookie: 'house_access=forged' } })).status, 401)
    time += 12 * 60 * 60 * 1000
    assert.equal((await fetch(base, { headers })).status, 401)
    for (let i = 0; i < 3; i++) await unlock('wrong')
    assert.equal((await unlock('wrong')).status, 429)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})
