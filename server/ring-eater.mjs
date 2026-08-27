import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

export const RING_WORLD_ID = 'main'
export const RING_PROTOCOL_VERSION = 1
export const MINING_UNITS_PER_LEVEL = 5
export const TUNNEL_DETECTION_LEVEL = 21
export const CHAMBER_COMPLETION_LEVEL = 120
export const CLAIM_RESUME_RADIUS = 1.5
export const FOREIGN_CLAIM_RADIUS = 13.5

const START_POSE = { x: 0, z: -3, heading: Math.PI, phase: 'hovering' }
const POSE_PHASES = new Set([
  'hovering', 'turn-to-depart', 'accelerating', 'coasting', 'flip-to-brake', 'braking',
  'align-to-ring', 'mining', 'checking-tasks', 'installing-panels', 'parked', 'collision',
])
const MATERIALS = ['iron', 'nickel', 'cobalt', 'silicate']
const LIGHT_COLORS = new Set([
  '#ff6b4a', '#ff9f43', '#ffd166', '#a8e063', '#45d483',
  '#4de1ff', '#4a9eff', '#8c78ff', '#e879f9', '#fff4d6',
])
const STRUCTURE_TYPES = new Set([
  'install-tunnel-panels', 'line-chamber-walls', 'install-tunnel-door', 'build-chamber-habitat',
])
const SHIP_COLORS = ['#4de1ff', '#ff9f43', '#a8e063', '#e879f9', '#ffd166', '#8c78ff']
const CALLSIGN_ADJECTIVES = ['Rusty', 'Wobbly', 'Cosmic', 'Sneaky', 'Turbo', 'Sleepy', 'Grumpy', 'Lucky', 'Bouncy', 'Dusty']
const CALLSIGN_NOUNS = ['Moon Badger', 'Ore Goblin', 'Space Turnip', 'Comet Ferret', 'Rock Lobster', 'Void Pigeon', 'Crater Goose', 'Meteor Muffin']
const MINING_SPEEDS = new Set([1, 2, 4])
const TOKEN_BYTES = 32
const MAX_MESSAGE_BYTES = 16 * 1024
const POSE_SAVE_INTERVAL_MS = 5_000
const SOCKET_AUTH_TIMEOUT_MS = 5_000
const SOCKET_HEARTBEAT_MS = 20_000
const SOCKET_STALE_MS = 45_000
const LIGHT_KEY_PATTERN = /^(?:tunnel:)?-?\d+(?:\.\d+)?:-?\d+(?:\.\d+)?:\d+(?::-?1)?$/

function json(response, status, body) {
  response.status(status).json(body)
}

export function ringEdgeAt(x) {
  return 1.2
    + Math.sin(x * 0.035) * 1.25
    + Math.sin(x * 0.19) * 0.62
    + Math.sin(x * 0.57) * 0.34
    + Math.sin(x * 1.71) * 0.15
}

export function isValidMiningSite(x, z) {
  return Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 100_000
    && Math.abs(z - ringEdgeAt(x)) <= 1.25
}

export function materialForMining(site, sequence) {
  const coordinateSeed = (Math.floor(site.x * 97) ^ Math.floor(site.z * 193) ^ Math.imul(sequence, 0x45d9f3b)) | 0
  const normalized = ((coordinateSeed ^ (coordinateSeed >>> 16)) >>> 0) / 4294967296
  if (normalized < 0.42) return 'iron'
  if (normalized < 0.7) return 'nickel'
  if (normalized < 0.88) return 'silicate'
  return 'cobalt'
}

export function structureCost(type) {
  if (type === 'install-tunnel-panels') return 90
  if (type === 'line-chamber-walls') return 305
  if (type === 'install-tunnel-door' || type === 'build-chamber-habitat') return 0
  return null
}

export function territoryConflict(excavations, playerId, x, z) {
  return excavations.find((site) => site.owner_id !== playerId && Math.hypot(Number(site.x) - x, Number(site.z) - z) <= FOREIGN_CLAIM_RADIUS) ?? null
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function bearerToken(request) {
  const header = request.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length >= 32 && token.length <= 256 ? token : null
}

function publicPlayer(row) {
  return {
    id: row.id,
    callsign: row.callsign,
    color: row.ship_color,
    pose: {
      x: Number(row.last_x),
      z: Number(row.last_z),
      heading: Number(row.last_heading),
      phase: row.last_phase,
    },
  }
}

function ownPlayer(row) {
  return {
    ...publicPlayer(row),
    cargo: {
      iron: Number(row.cargo_iron),
      nickel: Number(row.cargo_nickel),
      cobalt: Number(row.cargo_cobalt),
      silicate: Number(row.cargo_silicate),
    },
    minedTotal: Number(row.mined_total),
    imported: Boolean(row.imported_at),
  }
}

function mapExcavation(row) {
  const minedUnits = Number(row.mined_units)
  return {
    id: row.id,
    ownerId: row.owner_id,
    x: Number(row.x),
    z: Number(row.z),
    minedUnits,
    level: Math.floor(minedUnits / MINING_UNITS_PER_LEVEL),
  }
}

function mapStructure(row) {
  return {
    id: row.id,
    excavationId: row.excavation_id,
    ownerId: row.owner_id,
    type: row.structure_type,
    level: Number(row.level),
    position: row.door_position ?? undefined,
    x: Number(row.x),
    z: Number(row.z),
    habitatWorkers: row.habitat_workers === null ? undefined : Number(row.habitat_workers),
  }
}

async function withTransaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function nextRevision(client) {
  const result = await client.query(
    `UPDATE ring_worlds SET revision = revision + 1, updated_at = NOW() WHERE id = $1 RETURNING revision`,
    [RING_WORLD_ID],
  )
  return Number(result.rows[0].revision)
}

async function authenticate(pool, token) {
  if (!pool || !token) return null
  const result = await pool.query(`SELECT * FROM ring_players WHERE token_hash = $1`, [hashToken(token)])
  return result.rows[0] ?? null
}

async function uniqueCallsign(client) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const adjective = CALLSIGN_ADJECTIVES[Math.floor(Math.random() * CALLSIGN_ADJECTIVES.length)]
    const noun = CALLSIGN_NOUNS[Math.floor(Math.random() * CALLSIGN_NOUNS.length)]
    const suffix = attempt < 4 ? '' : ` ${Math.floor(10 + Math.random() * 90)}`
    const callsign = `${adjective} ${noun}${suffix}`
    const existing = await client.query(`SELECT 1 FROM ring_players WHERE callsign = $1`, [callsign])
    if (existing.rowCount === 0) return callsign
  }
  return `Odd Space Potato ${randomBytes(2).toString('hex').toUpperCase()}`
}

export async function initializeRingEaterDatabase(pool) {
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ring_worlds (
      id TEXT PRIMARY KEY,
      revision BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO ring_worlds (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS ring_players (
      id UUID PRIMARY KEY,
      world_id TEXT NOT NULL REFERENCES ring_worlds(id) ON DELETE CASCADE DEFAULT 'main',
      token_hash TEXT NOT NULL UNIQUE,
      callsign TEXT NOT NULL UNIQUE,
      ship_color TEXT NOT NULL,
      cargo_iron INTEGER NOT NULL DEFAULT 0 CHECK (cargo_iron >= 0),
      cargo_nickel INTEGER NOT NULL DEFAULT 0 CHECK (cargo_nickel >= 0),
      cargo_cobalt INTEGER NOT NULL DEFAULT 0 CHECK (cargo_cobalt >= 0),
      cargo_silicate INTEGER NOT NULL DEFAULT 0 CHECK (cargo_silicate >= 0),
      mined_total INTEGER NOT NULL DEFAULT 0 CHECK (mined_total >= 0),
      last_x DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_z DOUBLE PRECISION NOT NULL DEFAULT -3,
      last_heading DOUBLE PRECISION NOT NULL DEFAULT 3.141592653589793,
      last_phase TEXT NOT NULL DEFAULT 'hovering',
      imported_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ring_excavations (
      id UUID PRIMARY KEY,
      world_id TEXT NOT NULL REFERENCES ring_worlds(id) ON DELETE CASCADE DEFAULT 'main',
      owner_id UUID NOT NULL REFERENCES ring_players(id) ON DELETE CASCADE,
      x DOUBLE PRECISION NOT NULL,
      z DOUBLE PRECISION NOT NULL,
      mined_units INTEGER NOT NULL DEFAULT 0 CHECK (mined_units >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ring_excavations_world_idx ON ring_excavations (world_id);
    CREATE INDEX IF NOT EXISTS ring_excavations_owner_idx ON ring_excavations (owner_id);

    CREATE TABLE IF NOT EXISTS ring_structures (
      id UUID PRIMARY KEY,
      excavation_id UUID NOT NULL REFERENCES ring_excavations(id) ON DELETE CASCADE,
      owner_id UUID NOT NULL REFERENCES ring_players(id) ON DELETE CASCADE,
      structure_type TEXT NOT NULL CHECK (structure_type IN ('install-tunnel-panels', 'line-chamber-walls', 'install-tunnel-door', 'build-chamber-habitat')),
      level INTEGER NOT NULL,
      door_position TEXT CHECK (door_position IS NULL OR door_position IN ('inner', 'outer')),
      habitat_workers INTEGER CHECK (habitat_workers IS NULL OR habitat_workers >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ring_structures_unique_idx
      ON ring_structures (excavation_id, structure_type, COALESCE(door_position, ''));

    CREATE TABLE IF NOT EXISTS ring_light_settings (
      excavation_id UUID NOT NULL REFERENCES ring_excavations(id) ON DELETE CASCADE,
      light_key TEXT NOT NULL,
      color TEXT NOT NULL,
      updated_by UUID NOT NULL REFERENCES ring_players(id) ON DELETE CASCADE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (excavation_id, light_key)
    );
  `)
}

function validatePose(value) {
  if (!value || typeof value !== 'object') return null
  const x = Number(value.x)
  const z = Number(value.z)
  const heading = Number(value.heading)
  const phase = String(value.phase ?? 'hovering')
  if (!Number.isFinite(x) || Math.abs(x) > 100_000 || !Number.isFinite(z) || z < -20 || z > 60) return null
  if (!Number.isFinite(heading) || !POSE_PHASES.has(phase)) return null
  return { x, z, heading, phase }
}

function safeArray(value, limit = 2_000) {
  return Array.isArray(value) ? value.slice(0, limit) : []
}

export function createRingEaterService({ app, pool, isDbReady, isAllowedOrigin }) {
  const sockets = new Set()
  const socketsByPlayer = new Map()
  const sessionCreates = new Map()

  function databaseAvailable(response) {
    if (pool && isDbReady()) return true
    json(response, 503, { error: 'Ring Eater database is not ready.', code: 'database_unavailable' })
    return false
  }

  async function requirePlayer(request, response) {
    if (!databaseAvailable(response)) return null
    const player = await authenticate(pool, bearerToken(request))
    if (!player) json(response, 401, { error: 'Invalid or missing player token.', code: 'unauthorized' })
    return player
  }

  async function snapshot(playerId) {
    const snapshotStartedAt = performance.now()
    const [world, me, excavations, structures, lights] = await Promise.all([
      pool.query(`SELECT revision FROM ring_worlds WHERE id = $1`, [RING_WORLD_ID]),
      pool.query(`SELECT id, callsign, cargo_iron, cargo_nickel, cargo_cobalt, cargo_silicate, mined_total, last_x, last_z, last_heading, last_phase, imported_at, ship_color FROM ring_players WHERE id = $1`, [playerId]),
      pool.query(`SELECT id, owner_id, x, z, mined_units FROM ring_excavations WHERE world_id = $1 ORDER BY created_at`, [RING_WORLD_ID]),
      pool.query(`
        SELECT structure.id, structure.excavation_id, structure.owner_id, structure.structure_type, structure.level, structure.door_position, structure.habitat_workers, excavation.x, excavation.z
        FROM ring_structures AS structure
        JOIN ring_excavations AS excavation ON excavation.id = structure.excavation_id
        ORDER BY structure.created_at
      `),
      pool.query(`SELECT excavation_id, light_key, color, updated_by, updated_at FROM ring_light_settings ORDER BY light_key`),
    ])
    const snapshotDbMs = performance.now() - snapshotStartedAt
    const transformStarted = performance.now()
    const transformedLights = lights.rows.map((row) => ({
      excavationId: row.excavation_id,
      key: row.light_key,
      color: row.color,
      updatedBy: row.updated_by,
    }))
    return {
      type: 'world.snapshot',
      protocol: RING_PROTOCOL_VERSION,
      revision: Number(world.rows[0]?.revision ?? 0),
      me: ownPlayer(me.rows[0]),
      excavations: excavations.rows.map(mapExcavation),
      structures: structures.rows.map(mapStructure),
      lights: transformedLights,
      players: [...socketsByPlayer.entries()]
        .filter(([id, playerSockets]) => id !== playerId && playerSockets.size > 0)
        .map(([, playerSockets]) => publicPlayer([...playerSockets][0].player)),
      meta: {
        snapshotDbMs,
        snapshotTransformMs: performance.now() - transformStarted,
      },
    }
  }
  function send(socket, body) {
    if (socket.readyState === 1) socket.send(JSON.stringify(body))
  }

  function broadcast(body, except = null) {
    for (const socket of sockets) {
      if (socket.authenticated && socket !== except) send(socket, body)
    }
  }

  async function createSession(request, response) {
    if (!databaseAvailable(response)) return
    const existingToken = bearerToken(request)
    if (existingToken) {
      const existing = await authenticate(pool, existingToken)
      if (!existing) {
        json(response, 401, { error: 'Invalid player token.', code: 'unauthorized' })
        return
      }
      await pool.query(`UPDATE ring_players SET last_seen_at = NOW() WHERE id = $1`, [existing.id])
      json(response, 200, { player: ownPlayer(existing) })
      return
    }

    const ip = request.ip || request.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const recent = (sessionCreates.get(ip) ?? []).filter((timestamp) => now - timestamp < 60 * 60 * 1000)
    if (recent.length >= 30) {
      json(response, 429, { error: 'Too many player sessions created from this address.', code: 'rate_limited' })
      return
    }
    recent.push(now)
    sessionCreates.set(ip, recent)

    const token = randomBytes(TOKEN_BYTES).toString('base64url')
    const player = await withTransaction(pool, async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('ring-eater:callsigns'))`)
      const callsign = await uniqueCallsign(client)
      const result = await client.query(
        `INSERT INTO ring_players (id, token_hash, callsign, ship_color)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [randomUUID(), hashToken(token), callsign, SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)]],
      )
      return result.rows[0]
    })
    json(response, 201, { player: ownPlayer(player), token })
  }

  app.post('/api/ring-eater/session', (request, response) => {
    createSession(request, response).catch((error) => {
      console.error('Failed to create Ring Eater session:', error)
      json(response, 500, { error: 'Failed to create player session.', code: 'internal_error' })
    })
  })

  app.get('/api/ring-eater/world', async (request, response) => {
    try {
      const player = await requirePlayer(request, response)
      if (!player) return
      response.setHeader('Cache-Control', 'no-store')
      response.json(await snapshot(player.id))
    } catch (error) {
      console.error('Failed to load Ring Eater world:', error)
      json(response, 500, { error: 'Failed to load shared world.', code: 'internal_error' })
    }
  })

  app.post('/api/ring-eater/import', async (request, response) => {
    try {
      const player = await requirePlayer(request, response)
      if (!player) return
      if (player.imported_at) {
        json(response, 409, { error: 'Legacy progress has already been imported.', code: 'already_imported' })
        return
      }

      const body = request.body && typeof request.body === 'object' ? request.body : {}
      const areas = safeArray(body.areas).filter((area) => isValidMiningSite(Number(area?.x), Number(area?.z)) && Number.isSafeInteger(area?.level) && area.level > 0)
      const structures = safeArray(body.structures).filter((item) => item && STRUCTURE_TYPES.has(item.type))
      const lightEntries = body.lightColors && typeof body.lightColors === 'object' && !Array.isArray(body.lightColors)
        ? Object.entries(body.lightColors).slice(0, 4_000)
        : []
      const cargo = body.cargo && typeof body.cargo === 'object' ? body.cargo : {}

      const result = await withTransaction(pool, async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('ring-eater:claims'))`)
        const lockedPlayer = (await client.query(`SELECT * FROM ring_players WHERE id = $1 FOR UPDATE`, [player.id])).rows[0]
        if (lockedPlayer.imported_at) return { alreadyImported: true }
        const foreign = (await client.query(`SELECT * FROM ring_excavations WHERE world_id = $1 AND owner_id <> $2`, [RING_WORLD_ID, player.id])).rows
        const accepted = []
        const skipped = []

        for (const area of areas) {
          const x = Number(area.x)
          const z = Number(area.z)
          const conflict = territoryConflict(foreign, player.id, x, z)
          if (conflict) {
            skipped.push({ x, z, conflictingExcavationId: conflict.id })
            continue
          }
          const existing = (await client.query(
            `SELECT * FROM ring_excavations WHERE owner_id = $1 AND ((x - $2)^2 + (z - $3)^2) <= $4 ORDER BY created_at LIMIT 1`,
            [player.id, x, z, CLAIM_RESUME_RADIUS ** 2],
          )).rows[0]
          const minedUnits = Number(area.level) * MINING_UNITS_PER_LEVEL
          const excavation = existing
            ? (await client.query(`UPDATE ring_excavations SET mined_units = GREATEST(mined_units, $2), updated_at = NOW() WHERE id = $1 RETURNING *`, [existing.id, minedUnits])).rows[0]
            : (await client.query(
                `INSERT INTO ring_excavations (id, owner_id, x, z, mined_units) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [randomUUID(), player.id, x, z, minedUnits],
              )).rows[0]
          accepted.push(excavation)
        }

        for (const item of structures) {
          const excavation = accepted.find((area) => Math.hypot(Number(area.x) - Number(item.x), Number(area.z) - Number(item.z)) <= CLAIM_RESUME_RADIUS)
          if (!excavation) continue
          const position = item.type === 'install-tunnel-door' && item.position === 'outer' ? 'outer'
            : item.type === 'install-tunnel-door' ? 'inner' : null
          const habitatWorkers = Number.isInteger(item.habitatWorkers) && item.habitatWorkers >= 0 ? item.habitatWorkers : null
          await client.query(
            `INSERT INTO ring_structures (id, excavation_id, owner_id, structure_type, level, door_position, habitat_workers)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
            [randomUUID(), excavation.id, player.id, item.type, Number(item.level) || 0, position, habitatWorkers],
          )
        }

        for (const [key, color] of lightEntries) {
          if (!LIGHT_KEY_PATTERN.test(key) || !LIGHT_COLORS.has(color)) continue
          const keyParts = key.split(':')
          const lightX = Number(key.startsWith('tunnel:') ? keyParts[1] : keyParts[0])
          const excavation = accepted.find((area) => Math.abs(Number(area.x) - lightX) <= CLAIM_RESUME_RADIUS)
          if (!excavation) continue
          await client.query(
            `INSERT INTO ring_light_settings (excavation_id, light_key, color, updated_by)
             VALUES ($1, $2, $3, $4) ON CONFLICT (excavation_id, light_key) DO UPDATE SET color = EXCLUDED.color, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
            [excavation.id, key, color, player.id],
          )
        }

        const safeCargo = Object.fromEntries(MATERIALS.map((material) => [material, Number.isSafeInteger(cargo[material]) && cargo[material] >= 0 ? cargo[material] : 0]))
        const minedTotal = Number.isSafeInteger(body.minedTotal) && body.minedTotal >= 0 ? body.minedTotal : 0
        const updatedPlayer = (await client.query(
          `UPDATE ring_players SET
             cargo_iron = GREATEST(cargo_iron, $2), cargo_nickel = GREATEST(cargo_nickel, $3),
             cargo_cobalt = GREATEST(cargo_cobalt, $4), cargo_silicate = GREATEST(cargo_silicate, $5),
             mined_total = GREATEST(mined_total, $6), imported_at = NOW(), updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [player.id, safeCargo.iron, safeCargo.nickel, safeCargo.cobalt, safeCargo.silicate, minedTotal],
        )).rows[0]
        const revision = await nextRevision(client)
        return { accepted, skipped, updatedPlayer, revision }
      })

      if (result.alreadyImported) {
        json(response, 409, { error: 'Legacy progress has already been imported.', code: 'already_imported' })
        return
      }
      const nextSnapshot = await snapshot(player.id)
      broadcast({ type: 'world.invalidated', revision: result.revision })
      response.json({ imported: result.accepted.length, skipped: result.skipped, snapshot: nextSnapshot })
    } catch (error) {
      console.error('Failed to import Ring Eater progress:', error)
      json(response, 500, { error: 'Failed to import legacy progress.', code: 'internal_error' })
    }
  })

  app.delete('/api/ring-eater/me', async (request, response) => {
    try {
      const player = await requirePlayer(request, response)
      if (!player) return
      if (request.body?.confirm !== true) {
        json(response, 400, { error: 'Deletion requires confirm: true.', code: 'confirmation_required' })
        return
      }
      const revision = await withTransaction(pool, async (client) => {
        await client.query(`DELETE FROM ring_players WHERE id = $1`, [player.id])
        return nextRevision(client)
      })
      for (const socket of socketsByPlayer.get(player.id) ?? []) socket.close(4001, 'Player deleted')
      broadcast({ type: 'world.invalidated', revision })
      response.json({ ok: true })
    } catch (error) {
      console.error('Failed to delete Ring Eater player:', error)
      json(response, 500, { error: 'Failed to delete player progress.', code: 'internal_error' })
    }
  })

  async function resolveExcavation(player, x, z) {
    return withTransaction(pool, async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('ring-eater:claims'))`)
      const own = (await client.query(
        `SELECT * FROM ring_excavations WHERE owner_id = $1 AND ((x - $2)^2 + (z - $3)^2) <= $4 ORDER BY created_at LIMIT 1 FOR UPDATE`,
        [player.id, x, z, CLAIM_RESUME_RADIUS ** 2],
      )).rows[0]
      if (own) return { excavation: own, revision: null }
      const foreign = (await client.query(`SELECT * FROM ring_excavations WHERE world_id = $1 AND owner_id <> $2`, [RING_WORLD_ID, player.id])).rows
      const conflict = territoryConflict(foreign, player.id, x, z)
      if (conflict) return { conflict: mapExcavation(conflict) }
      const excavation = (await client.query(
        `INSERT INTO ring_excavations (id, owner_id, x, z) VALUES ($1, $2, $3, $4) RETURNING *`,
        [randomUUID(), player.id, x, z],
      )).rows[0]
      return { excavation, revision: await nextRevision(client) }
    })
  }

  async function mine(socket) {
    if (!socket.mining || socket.mining.busy) return
    socket.mining.busy = true
    try {
      const update = await withTransaction(pool, async (client) => {
        const player = (await client.query(`SELECT * FROM ring_players WHERE id = $1 FOR UPDATE`, [socket.player.id])).rows[0]
        const excavation = (await client.query(`SELECT * FROM ring_excavations WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [socket.mining.excavationId, player.id])).rows[0]
        if (!excavation) throw Object.assign(new Error('Excavation is no longer available.'), { code: 'not_owner' })
        const sequence = Number(player.mined_total) + 1
        const material = materialForMining(excavation, sequence)
        const column = `cargo_${material}`
        const updatedPlayer = (await client.query(
          `UPDATE ring_players SET mined_total = mined_total + 1, ${column} = ${column} + 1, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [player.id],
        )).rows[0]
        const updatedExcavation = (await client.query(
          `UPDATE ring_excavations SET mined_units = mined_units + 1, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [excavation.id],
        )).rows[0]
        return { player: updatedPlayer, excavation: updatedExcavation, material, revision: await nextRevision(client) }
      })
      socket.player = update.player
      send(socket, { type: 'cargo.updated', revision: update.revision, cargo: ownPlayer(update.player).cargo, minedTotal: Number(update.player.mined_total), material: update.material })
      broadcast({ type: 'excavation.updated', revision: update.revision, excavation: mapExcavation(update.excavation) })
    } catch (error) {
      stopMining(socket)
      send(socket, { type: 'error', code: error.code ?? 'mining_failed', error: error.message })
    } finally {
      if (socket.mining) socket.mining.busy = false
    }
  }

  function stopMining(socket) {
    if (socket.mining?.timer) clearInterval(socket.mining.timer)
    socket.mining = null
  }

  async function startMining(socket, message) {
    const x = Number(message.x)
    const z = Number(message.z)
    const speed = Number(message.speed)
    if (!isValidMiningSite(x, z) || !MINING_SPEEDS.has(speed)) {
      send(socket, { type: 'error', requestId: message.requestId, code: 'invalid_mining_request', error: 'Invalid mining site or speed.' })
      return
    }
    const resolved = await resolveExcavation(socket.player, x, z)
    if (resolved.conflict) {
      send(socket, { type: 'error', requestId: message.requestId, code: 'territory_conflict', error: 'This site is too close to another player’s claim.', conflict: resolved.conflict })
      return
    }
    stopMining(socket)
    const excavation = resolved.excavation
    socket.mining = { excavationId: excavation.id, speed, busy: false, timer: null }
    socket.mining.timer = setInterval(() => void mine(socket), 10_000 / speed)
    if (resolved.revision !== null) broadcast({ type: 'excavation.updated', revision: resolved.revision, excavation: mapExcavation(excavation) })
    send(socket, { type: 'ack', requestId: message.requestId, action: 'mining.start', excavation: mapExcavation(excavation) })
  }

  async function buildStructure(socket, message) {
    const excavationId = typeof message.excavationId === 'string' ? message.excavationId : ''
    const type = typeof message.structureType === 'string' ? message.structureType : ''
    const doorPosition = type === 'install-tunnel-door' && message.position === 'outer' ? 'outer'
      : type === 'install-tunnel-door' && message.position === 'inner' ? 'inner' : null
    const habitatWorkers = Number.isInteger(Number(message.habitatWorkers)) && Number(message.habitatWorkers) >= 0
      ? Number(message.habitatWorkers)
      : null
    if (!STRUCTURE_TYPES.has(type) || (type === 'install-tunnel-door' && !doorPosition)) throw Object.assign(new Error('Invalid structure request.'), { code: 'invalid_structure' })

    const result = await withTransaction(pool, async (client) => {
      const player = (await client.query(`SELECT * FROM ring_players WHERE id = $1 FOR UPDATE`, [socket.player.id])).rows[0]
      const excavation = (await client.query(`SELECT * FROM ring_excavations WHERE id = $1 FOR UPDATE`, [excavationId])).rows[0]
      if (!excavation || excavation.owner_id !== player.id) throw Object.assign(new Error('Only the claim owner can build here.'), { code: 'not_owner' })
      const level = Math.floor(Number(excavation.mined_units) / MINING_UNITS_PER_LEVEL)
      const existing = (await client.query(`SELECT structure_type, door_position FROM ring_structures WHERE excavation_id = $1`, [excavation.id])).rows
      if (type === 'install-tunnel-panels' && level < TUNNEL_DETECTION_LEVEL) throw Object.assign(new Error('The tunnel is not deep enough.'), { code: 'prerequisite_failed' })
      if (type !== 'install-tunnel-panels' && level < CHAMBER_COMPLETION_LEVEL) throw Object.assign(new Error('The chamber is not complete.'), { code: 'prerequisite_failed' })
      if (type === 'install-tunnel-door' && !existing.some((item) => item.structure_type === 'line-chamber-walls')) throw Object.assign(new Error('Line the chamber before installing doors.'), { code: 'prerequisite_failed' })
      if (type === 'build-chamber-habitat') {
        const doors = new Set(existing.filter((item) => item.structure_type === 'install-tunnel-door').map((item) => item.door_position))
        if (!doors.has('inner') || !doors.has('outer')) throw Object.assign(new Error('Both airlock doors are required.'), { code: 'prerequisite_failed' })
      }
      const duplicate = existing.find((item) => item.structure_type === type && (item.door_position ?? null) === doorPosition)
      if (duplicate) return { duplicate, excavation, player, revision: null }
      const cost = structureCost(type)
      const cargo = MATERIALS.map((material) => ({ material, amount: Number(player[`cargo_${material}`]) })).sort((a, b) => b.amount - a.amount)
      if (cargo.reduce((sum, entry) => sum + entry.amount, 0) < cost) throw Object.assign(new Error('Not enough cargo.'), { code: 'insufficient_cargo' })
      let remaining = cost
      const spent = Object.fromEntries(MATERIALS.map((material) => [material, 0]))
      for (const entry of cargo) {
        spent[entry.material] = Math.min(entry.amount, remaining)
        remaining -= spent[entry.material]
      }
      const updatedPlayer = (await client.query(
        `UPDATE ring_players SET cargo_iron = cargo_iron - $2, cargo_nickel = cargo_nickel - $3,
          cargo_cobalt = cargo_cobalt - $4, cargo_silicate = cargo_silicate - $5, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [player.id, spent.iron, spent.nickel, spent.cobalt, spent.silicate],
      )).rows[0]
      const structure = (await client.query(
        `INSERT INTO ring_structures (id, excavation_id, owner_id, structure_type, level, door_position, habitat_workers)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [randomUUID(), excavation.id, player.id, type, level, doorPosition, habitatWorkers],
      )).rows[0]
      return { structure, excavation, player: updatedPlayer, revision: await nextRevision(client) }
    })
    socket.player = result.player
    const structure = mapStructure({ ...result.structure ?? result.duplicate, x: result.excavation.x, z: result.excavation.z })
    if (result.revision !== null) {
      broadcast({ type: 'structure.created', revision: result.revision, structure })
      send(socket, { type: 'cargo.updated', revision: result.revision, cargo: ownPlayer(result.player).cargo, minedTotal: Number(result.player.mined_total) })
    }
    send(socket, { type: 'ack', requestId: message.requestId, action: 'structure.build', structure })
  }

  async function setLight(socket, message) {
    const excavationId = typeof message.excavationId === 'string' ? message.excavationId : ''
    const key = typeof message.key === 'string' ? message.key : ''
    const color = typeof message.color === 'string' ? message.color : ''
    if (!LIGHT_KEY_PATTERN.test(key) || !LIGHT_COLORS.has(color)) throw Object.assign(new Error('Invalid light setting.'), { code: 'invalid_light' })
    const result = await withTransaction(pool, async (client) => {
      const excavation = (await client.query(`SELECT * FROM ring_excavations WHERE id = $1 FOR UPDATE`, [excavationId])).rows[0]
      if (!excavation || excavation.owner_id !== socket.player.id) throw Object.assign(new Error('Only the claim owner can change its lights.'), { code: 'not_owner' })
      const requiredType = key.startsWith('tunnel:') ? 'install-tunnel-panels' : 'line-chamber-walls'
      const infrastructure = await client.query(`SELECT 1 FROM ring_structures WHERE excavation_id = $1 AND structure_type = $2`, [excavation.id, requiredType])
      if (infrastructure.rowCount === 0) throw Object.assign(new Error('This light has not been installed.'), { code: 'prerequisite_failed' })
      await client.query(
        `INSERT INTO ring_light_settings (excavation_id, light_key, color, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (excavation_id, light_key) DO UPDATE SET color = EXCLUDED.color, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [excavation.id, key, color, socket.player.id],
      )
      return nextRevision(client)
    })
    const event = { type: 'light.updated', revision: result, light: { excavationId, key, color, updatedBy: socket.player.id } }
    broadcast(event)
    send(socket, { type: 'ack', requestId: message.requestId, action: 'light.set' })
  }

  async function savePose(socket, force = false) {
    if (!socket.pendingPose || (!force && Date.now() - socket.lastPoseSaveAt < POSE_SAVE_INTERVAL_MS)) return
    const pose = socket.pendingPose
    socket.pendingPose = null
    socket.lastPoseSaveAt = Date.now()
    await pool.query(
      `UPDATE ring_players SET last_x = $2, last_z = $3, last_heading = $4, last_phase = $5, last_seen_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [socket.player.id, pose.x, pose.z, pose.heading, pose.phase],
    )
    Object.assign(socket.player, { last_x: pose.x, last_z: pose.z, last_heading: pose.heading, last_phase: pose.phase })
  }

  async function handleSocketMessage(socket, raw) {
    if (raw.length > MAX_MESSAGE_BYTES) {
      socket.close(1009, 'Message too large')
      return
    }
    let message
    try {
      message = JSON.parse(raw.toString())
    } catch {
      send(socket, { type: 'error', code: 'invalid_json', error: 'Message must be valid JSON.' })
      return
    }

    socket.lastMessageAt = Date.now()
    if (!socket.authenticated) {
      if (message.type !== 'auth' || typeof message.token !== 'string' || message.protocol !== RING_PROTOCOL_VERSION) {
        socket.close(4003, 'Authentication required')
        return
      }
      const player = await authenticate(pool, message.token)
      if (!player) {
        socket.close(4003, 'Invalid player token')
        return
      }
      socket.authenticated = true
      socket.player = player
      clearTimeout(socket.authTimer)
      const playerSockets = socketsByPlayer.get(player.id) ?? new Set()
      const firstConnection = playerSockets.size === 0
      playerSockets.add(socket)
      socketsByPlayer.set(player.id, playerSockets)
      send(socket, await snapshot(player.id))
      if (firstConnection) broadcast({ type: 'player.joined', player: publicPlayer(player) }, socket)
      return
    }

    if (message.type === 'ping') {
      send(socket, { type: 'pong', timestamp: Date.now() })
      return
    }
    if (message.type === 'pose') {
      const now = Date.now()
      socket.poseTimes = socket.poseTimes.filter((timestamp) => now - timestamp < 1_000)
      if (socket.poseTimes.length >= 12) return
      const pose = validatePose(message)
      if (!pose) return
      socket.poseTimes.push(now)
      socket.pendingPose = pose
      broadcast({ type: 'player.pose', playerId: socket.player.id, pose, sequence: Number(message.sequence) || 0 }, socket)
      await savePose(socket)
      return
    }
    if (message.type === 'mining.start') return startMining(socket, message)
    if (message.type === 'mining.stop') {
      stopMining(socket)
      send(socket, { type: 'ack', requestId: message.requestId, action: 'mining.stop' })
      return
    }
    try {
      if (message.type === 'structure.build') await buildStructure(socket, message)
      else if (message.type === 'light.set') await setLight(socket, message)
      else send(socket, { type: 'error', requestId: message.requestId, code: 'unknown_message', error: 'Unknown message type.' })
    } catch (error) {
      send(socket, { type: 'error', requestId: message.requestId, code: error.code ?? 'action_failed', error: error.message })
    }
  }

  function attachWebSocketServer(server) {
    const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES })
    server.on('upgrade', (request, socket, head) => {
      let pathname
      try {
        pathname = new URL(request.url, 'http://localhost').pathname
      } catch {
        socket.destroy()
        return
      }
      if (pathname !== '/api/ring-eater/live') {
        socket.destroy()
        return
      }
      const origin = request.headers.origin
      if (!pool || !isDbReady() || (origin && !isAllowedOrigin(origin))) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }
      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => webSocketServer.emit('connection', webSocket, request))
    })

    webSocketServer.on('connection', (socket) => {
      socket.authenticated = false
      socket.lastMessageAt = Date.now()
      socket.lastPoseSaveAt = 0
      socket.poseTimes = []
      socket.pendingPose = null
      socket.mining = null
      socket.authTimer = setTimeout(() => socket.close(4003, 'Authentication timeout'), SOCKET_AUTH_TIMEOUT_MS)
      sockets.add(socket)
      socket.on('message', (raw) => void handleSocketMessage(socket, raw).catch((error) => {
        console.error('Ring Eater WebSocket message failed:', error)
        send(socket, { type: 'error', code: 'internal_error', error: 'Realtime action failed.' })
      }))
      socket.on('close', () => {
        clearTimeout(socket.authTimer)
        stopMining(socket)
        sockets.delete(socket)
        if (!socket.player) return
        void savePose(socket, true).catch((error) => console.error('Failed to save Ring Eater pose:', error))
        const playerSockets = socketsByPlayer.get(socket.player.id)
        playerSockets?.delete(socket)
        if (playerSockets?.size === 0) {
          socketsByPlayer.delete(socket.player.id)
          broadcast({ type: 'player.left', playerId: socket.player.id })
        }
      })
    })

    const heartbeat = setInterval(() => {
      const now = Date.now()
      for (const socket of sockets) {
        if (now - socket.lastMessageAt > SOCKET_STALE_MS) socket.terminate()
        else if (socket.readyState === 1) socket.ping()
      }
    }, SOCKET_HEARTBEAT_MS)
    server.on('close', () => clearInterval(heartbeat))
    return webSocketServer
  }

  return { attachWebSocketServer }
}


