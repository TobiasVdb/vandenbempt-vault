import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { registerDirectorate } from './directorate.mjs'

test('Directorate forwards credentials to a fixed TLS collector and isolates errors', async () => {
  const calls = []
  const app = express()
  registerDirectorate(app, { request: async (url, options) => {
    calls.push({ url: String(url), options })
    if (url.searchParams.has('fail')) throw new Error('sensitive internal error')
    return new Response('{"projects":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  } })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}/directorate/api`
  const headers = { Authorization: 'Bearer test-token' }
  try {
    assert.equal((await fetch(base.replace('/api', ''), { redirect: 'manual' })).status, 301)
    assert.equal((await fetch(base.replace('/api', '/') )).status, 200)
    assert.equal((await fetch(base + '/projects')).status, 401)
    assert.equal((await fetch(base + '/projects', { headers: { ...headers, Origin: 'https://foreign.example' } })).status, 403)
    assert.equal((await fetch(base + '/projects', { headers })).status, 200)
    assert.equal(calls[0].url, 'https://atelierav.be/directorate/api/projects')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token')
    assert.equal(calls[0].options.redirect, 'error')
    assert.equal((await fetch(base + '/unknown', { headers })).status, 404)
    assert.equal((await fetch(base + '/v1/ingest', { method: 'POST', headers, body: 'x'.repeat(65537) })).status, 413)
    const failed = await fetch(base + '/projects?fail=true', { headers })
    assert.equal(failed.status, 502)
    assert.doesNotMatch(await failed.text(), /sensitive/)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})

test('BOB aggregates require collector-verified admin authentication', async () => {
  let snapshots=0;
  const app=express();
  registerDirectorate(app,{bobSnapshot:()=>{snapshots++;return {metrics:{online_users:2}}},
    request:async (_url,options)=>new Response('{}',{status:options.headers.Authorization==='Bearer valid-admin'?200:401})});
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const url=`http://127.0.0.1:${server.address().port}/directorate/api/bob-metrics`;
  try {
    assert.equal((await fetch(url)).status,401);
    assert.equal((await fetch(url,{headers:{Authorization:'Bearer invalid'}})).status,401);
    assert.equal(snapshots,0);
    const response=await fetch(url,{headers:{Authorization:'Bearer valid-admin'}});
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{metrics:{online_users:2}});
    assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(snapshots,1);
  } finally {await new Promise(resolve=>server.close(resolve))}
})
