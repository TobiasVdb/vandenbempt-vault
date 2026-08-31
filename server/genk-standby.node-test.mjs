import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGenkPayload } from './genk-standby.mjs'

test('activates a Genk fixture inside the match-day window', () => {
  const now = Date.parse('2026-09-06T14:00:00Z')
  const result = normalizeGenkPayload({ fixtures: [{
    id: 1,
    startTime: '2026-09-06T14:30:00Z',
    status: 'live',
    home: { id: 10, name: 'Anderlecht', score: 1 },
    away: { id: 9987, name: 'Genk', score: 2 },
  }] }, now)
  assert.equal(result.active, true)
  assert.equal(result.match.away.score, 2)
})

test('hides fixtures outside the match-day window', () => {
  const result = normalizeGenkPayload({ fixtures: [{
    id: 1,
    startTime: '2026-09-07T14:30:00Z',
    home: { id: 10, name: 'Anderlecht' },
    away: { id: 9987, name: 'Genk' },
  }] }, Date.parse('2026-09-06T08:00:00Z'))
  assert.equal(result.active, false)
})
