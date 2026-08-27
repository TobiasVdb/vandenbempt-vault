import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isValidMiningSite,
  materialForMining,
  ringEdgeAt,
  structureCost,
} from './ring-eater.mjs'

describe('Ring Eater server rules', () => {
  it('matches the deterministic ring edge and accepts only nearby surface sites', () => {
    assert.equal(ringEdgeAt(0), 1.2)
    assert.equal(isValidMiningSite(0, 0.75), true)
    assert.equal(isValidMiningSite(0, 8), false)
    assert.equal(isValidMiningSite(Number.NaN, 1.2), false)
  })

  it('matches deterministic material yields', () => {
    const site = { x: 4.25, z: ringEdgeAt(4.25) - 0.45 }
    assert.deepEqual(Array.from({ length: 8 }, (_, index) => materialForMining(site, index + 1)), [
      'iron', 'iron', 'iron', 'iron', 'iron', 'iron', 'iron', 'iron',
    ])
  })

  it('keeps construction costs aligned with the game', () => {
    assert.equal(structureCost('install-tunnel-panels'), 90)
    assert.equal(structureCost('line-chamber-walls'), 305)
    assert.equal(structureCost('install-tunnel-door'), 0)
    assert.equal(structureCost('build-chamber-habitat'), 0)
    assert.equal(structureCost('unknown'), null)
  })
})
