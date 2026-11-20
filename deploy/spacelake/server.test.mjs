import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createActivity } from './activity.mjs';
import { createSite } from './server.mjs';

test('Activity deduplicates, counts visible presence, and persists only daily aggregates', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spacelake-'));
  try {
    let now = Date.parse('2026-11-05T12:00:00Z');
    const file = path.join(directory, 'activity.json');
    const activity = await createActivity({ file, now: () => now });
    const data = { session: randomUUID(), sequence: 1, activeMs: 1000, visible: true };
    assert.equal(activity.accept(data), true);
    activity.accept(data);
    activity.accept({ ...data, sequence: 2, activeMs: 59000 });
    assert.deepEqual(activity.snapshot(), { visits_today: 1, active_minutes_today: 1, active_visits: 1 });
    activity.accept({ ...data, sequence: 1, activeMs: 1000 });
    assert.equal(activity.snapshot().active_minutes_today, 1);
    await activity.flush();
    assert.equal((await fs.readFile(file, 'utf8')).includes(data.session), false);
    const restarted = await createActivity({ file, now: () => now });
    assert.equal(restarted.snapshot().visits_today, 1);
    restarted.accept({ ...data, sequence: 3, activeMs: 1000 });
    assert.equal(restarted.snapshot().visits_today, 1);
    now += 46000;
    assert.equal(activity.snapshot().active_visits, 0);
  } finally { await fs.rm(directory, { recursive: true }); }
});

test('Invalid activity is rejected without changing counters', async () => {
  const activity = await createActivity();
  for (const data of [null, {}, { session: randomUUID(), sequence: 1, activeMs: -1, visible: true },
    { session: randomUUID(), sequence: 1, activeMs: 120001, visible: true }]) assert.equal(activity.accept(data), false);
  assert.equal(activity.snapshot().visits_today, 0);
});

test('Public routes reject cross-origin activity and keep aggregate metrics private', async () => {
  const site = await createSite({ root: new URL('../../public/spacelake/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
    origins: ['https://spacelake.planetarypixel.be'] });
  site.server.listen(0, '127.0.0.1');
  await once(site.server, 'listening');
  const url = `http://127.0.0.1:${site.server.address().port}`;
  const post = (origin, extra = {}) => fetch(url + '/api/events', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify({ session: randomUUID(), sequence: 1, activeMs: 1000, visible: true }) });
  try {
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(url + '/server.mjs')).status, 404);
    assert.equal((await fetch(url + '/metrics')).status, 404);
    assert.equal((await post('https://other.example')).status, 403);
    assert.equal((await post('https://spacelake.planetarypixel.be', { DNT: '1' })).status, 202);
    assert.equal(site.activity.snapshot().visits_today, 0);
    assert.equal((await post('https://spacelake.planetarypixel.be')).status, 202);
    assert.equal(site.activity.snapshot().visits_today, 1);
  } finally { site.server.closeAllConnections(); site.server.close(); }
});

test('The main and preserved pages are separate, with canonical URLs and shared assets', async () => {
  const root = new URL('../../public/spacelake/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
  const site = await createSite({ root, origins: ['https://spacelake.eu'] });
  site.server.listen(0, '127.0.0.1');
  await once(site.server, 'listening');
  const url = `http://127.0.0.1:${site.server.address().port}`;
  try {
    const original = await (await fetch(url + '/')).text();
    const redirect = await fetch(url + '/2?source=test', { redirect: 'manual' });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), '/2/?source=test');
    const alternative = await fetch(url + '/2/');
    assert.equal(alternative.status, 200);
    const html = await alternative.text();
    const preservedRedirect = await fetch(url + '/3?source=test', { redirect: 'manual' });
    assert.equal(preservedRedirect.status, 308);
    assert.equal(preservedRedirect.headers.get('location'), '/3/?source=test');
    const preserved = await fetch(url + '/3/');
    assert.equal(preserved.status, 200);
    const preservedHtml = await preserved.text();
    assert.ok(original.includes('Interactive environments for exploring complex data.'));
    assert.ok(!original.includes('id="research"'));
    assert.ok(!original.includes('Thrustlings'));
    assert.ok(html.includes('id="research"'));
    assert.ok(html.includes('Thrustlings'));
    assert.ok(preservedHtml.includes('We build our own products and create interactive 3D visualisations for organisations.'));
    assert.ok(preservedHtml.includes('context, relationships and effects behind an AI-driven conclusion'));
    for (const asset of ['hero.js', 'activity.js', 'favicon.svg', 'kubetown.png', 'thrustlings.png']) {
      assert.ok(html.includes(`../${asset}`));
      assert.equal((await fetch(new URL(`../${asset}`, url + '/2/'))).status, 200, asset);
      assert.ok(preservedHtml.includes(`../${asset}`));
      assert.equal((await fetch(new URL(`../${asset}`, url + '/3/'))).status, 200, asset);
    }
    assert.equal((await fetch(url + '/2/not-a-file')).status, 404);
  } finally { site.server.closeAllConnections(); site.server.close(); }
});
