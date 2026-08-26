import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import express from 'express'
import multer from 'multer'
import pg from 'pg'
import { seedFlights } from '../scripts/import-flights-once.mjs'
import { createRingEaterService, initializeRingEaterDatabase } from './ring-eater.mjs'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 8080)
const distDir = path.resolve(process.cwd(), 'dist')
const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i
const DIGITALOCEAN_APP_ORIGIN_PATTERN = /^https:\/\/[\w-]+\.ondigitalocean\.app$/i
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)
const INTEGRATION_TABLES = {
  kubernetes: 'integration_kubernetes',
  gcp: 'integration_gcp',
  azure: 'integration_azure',
  aikido: 'integration_aikido',
  aws: 'integration_aws',
}
const CONTENT_TABLES = {
  projects: 'projects',
  games: 'games',
  videos: 'videos',
}
const CONTENT_GROUP_TABLES = {
  projects: 'project_groups',
  games: 'game_groups',
  videos: 'video_groups',
}
  

const CONTENT_THUMBNAILS_TABLE = 'content_thumbnails'
const FLIGHT_AIRPORT_TABLE = 'flight_airports'
const SCRIBE_API_BASE_URL = 'https://scribe-qui2s.ondigitalocean.app/api'
const THUMBNAIL_WAIT_MS = 4000
const THUMBNAIL_NAVIGATION_TIMEOUT_MS = 40000
const THUMBNAIL_SCREENSHOT_TIMEOUT_MS = 30000
const THUMBNAIL_BOOT_ENABLED = process.env.ENABLE_BOOT_THUMBNAILS === 'true'
const THUMBNAIL_DEFAULT_BATCH_SIZE = 5
const THUMBNAIL_ALLOWED_HOSTS = new Set(
  (process.env.THUMBNAIL_ALLOWED_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
const THUMBNAIL_BLOCKED_HOSTS = new Set(
  (process.env.THUMBNAIL_BLOCKED_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
const TEAM_NAMES = ['Platform', 'Security', 'Compliance', 'Leadership']
const USER_ROLES = ['owner', 'platform_admin', 'security_reviewer', 'compliance_auditor', 'viewer']
const USER_SSO_MODES = ['enforced', 'optional', 'break_glass']
const AIRPORT_OVERRIDES = {
  SXF: {
    resolvedName: 'Berlin Schoenefeld Airport',
    latitude: 52.380001,
    longitude: 13.5225,
  },
}
const INITIAL_WORKSPACE_USERS = [
  {
    id: 'user-1',
    name: 'Anouk Vermeer',
    email: 'anouk@houseoftobias.io',
    team: 'Platform',
    role: 'platform_admin',
    lastActivityAtExpression: "NOW() - INTERVAL '14 minutes'",
    sso: 'enforced',
    canApproveProduction: true,
  },
  {
    id: 'user-2',
    name: 'Milan Dreesen',
    email: 'milan@houseoftobias.io',
    team: 'Security',
    role: 'security_reviewer',
    lastActivityAtExpression: "NOW() - INTERVAL '58 minutes'",
    sso: 'enforced',
    canApproveProduction: true,
  },
  {
    id: 'user-3',
    name: 'Sofia Peeters',
    email: 'sofia@houseoftobias.io',
    team: 'Compliance',
    role: 'compliance_auditor',
    lastActivityAtExpression: "NOW() - INTERVAL '6 hours'",
    sso: 'optional',
    canApproveProduction: false,
  },
  {
    id: 'user-4',
    name: 'Jules Martens',
    email: 'jules@houseoftobias.io',
    team: 'Leadership',
    role: 'viewer',
    lastActivityAtExpression: "NOW() - INTERVAL '28 hours'",
    sso: 'break_glass',
    canApproveProduction: false,
  },
]

function isAllowedOrigin(origin) {
  return (
    LOCALHOST_ORIGIN_PATTERN.test(origin)
    || DIGITALOCEAN_APP_ORIGIN_PATTERN.test(origin)
    || allowedOrigins.has(origin)
  )
}

app.use((request, response, next) => {
  const origin = request.headers.origin

  if (origin && isAllowedOrigin(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  if (request.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      response.status(403).json({ error: 'Origin not allowed.' })
      return
    }

    response.sendStatus(204)
    return
  }

  next()
})

app.use(express.json({ limit: '1mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

function getPoolConfig() {
  const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true'

  if (process.env.DATABASE_URL) {
    const rawDatabaseUrl = String(process.env.DATABASE_URL).trim()

    if (rawDatabaseUrl.startsWith('${') && rawDatabaseUrl.endsWith('}')) {
      dbInitError = `DATABASE_URL is a literal placeholder (${rawDatabaseUrl}). Resolve the DigitalOcean env reference before boot.`
      return null
    }

    let url
    try {
      url = new URL(rawDatabaseUrl)
    } catch {
      dbInitError = 'DATABASE_URL is present but not a valid URL.'
      return null
    }

    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require')
    }
    if (!url.searchParams.has('uselibpqcompat')) {
      url.searchParams.set('uselibpqcompat', 'true')
    }

    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized },
    }
  }

  if (!process.env.PGHOST) return null

  return {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized },
  }
}

let dbReady = false
let dbInitError = 'Database is not configured.'
const poolConfig = getPoolConfig()
const pool = poolConfig ? new Pool(poolConfig) : null
const ringEater = createRingEaterService({
  app,
  pool,
  isDbReady: () => dbReady,
  isAllowedOrigin,
})

async function initializeDatabase() {
  if (!pool) return

  await initializeRingEaterDatabase(pool)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS glb_models (
      id UUID PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      model_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  for (const tableName of Object.values(INTEGRATION_TABLES)) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        integration_id TEXT PRIMARY KEY,
        settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        lifecycle_state TEXT NOT NULL DEFAULT 'draft',
        approved BOOLEAN NOT NULL DEFAULT FALSE,
        connectivity_health JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      team TEXT NOT NULL,
      role TEXT NOT NULL,
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sso TEXT NOT NULL,
      can_approve_production BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  for (const tableName of Object.values(CONTENT_TABLES)) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        image_url TEXT,
        description TEXT,
        rating NUMERIC(4,2) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

  for (const tableName of Object.values(CONTENT_GROUP_TABLES)) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

  await pool.query(`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES project_groups(id) ON DELETE SET NULL;
  `)

  await pool.query(`
    ALTER TABLE games
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES game_groups(id) ON DELETE SET NULL;
  `)

  await pool.query(`
    ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES video_groups(id) ON DELETE SET NULL;
  `)

  for (const tableName of Object.values(CONTENT_TABLES)) {
    await pool.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN IF NOT EXISTS thumbnail_status TEXT NOT NULL DEFAULT 'pending';
    `)

    await pool.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN IF NOT EXISTS thumbnail_attempted_at TIMESTAMPTZ;
    `)

    await pool.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN IF NOT EXISTS thumbnail_error TEXT;
    `)
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flights (
      id UUID PRIMARY KEY,
      flight_date DATE,
      flight_number TEXT,
      from_airport TEXT,
      to_airport TEXT,
      distance NUMERIC(10,2),
      departure_time TIMESTAMPTZ,
      arrival_time TIMESTAMPTZ,
      airline TEXT,
      aircraft TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    WITH ranked_flights AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY
            COALESCE(flight_date, DATE '0001-01-01'),
            COALESCE(flight_number, ''),
            COALESCE(from_airport, ''),
            COALESCE(to_airport, ''),
            COALESCE(distance, -1),
            COALESCE(departure_time, TIMESTAMPTZ '0001-01-01 00:00:00+00'),
            COALESCE(arrival_time, TIMESTAMPTZ '0001-01-01 00:00:00+00'),
            COALESCE(airline, ''),
            COALESCE(aircraft, ''),
            COALESCE(notes, '')
          ORDER BY created_at ASC, id ASC
        ) AS duplicate_rank
      FROM flights
    )
    DELETE FROM flights
    WHERE id IN (
      SELECT id
      FROM ranked_flights
      WHERE duplicate_rank > 1
    );
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS flights_dedup_idx
    ON flights (
      COALESCE(flight_date, DATE '0001-01-01'),
      COALESCE(flight_number, ''),
      COALESCE(from_airport, ''),
      COALESCE(to_airport, ''),
      COALESCE(distance, -1),
      COALESCE(departure_time, TIMESTAMPTZ '0001-01-01 00:00:00+00'),
      COALESCE(arrival_time, TIMESTAMPTZ '0001-01-01 00:00:00+00'),
      COALESCE(airline, ''),
      COALESCE(aircraft, ''),
      COALESCE(notes, '')
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${FLIGHT_AIRPORT_TABLE} (
      airport_key TEXT PRIMARY KEY,
      airport_label TEXT NOT NULL,
      resolved_name TEXT,
      latitude NUMERIC(9,6),
      longitude NUMERIC(9,6),
      mapbox_feature_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${CONTENT_THUMBNAILS_TABLE} (
      id UUID PRIMARY KEY,
      content_kind TEXT NOT NULL,
      content_item_id UUID NOT NULL,
      content_type TEXT NOT NULL,
      image_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (content_kind, content_item_id)
    );
  `)

  const flightSeedResult = await seedFlights(pool)
  console.log('Imported ' + flightSeedResult.created + ' flights, skipped ' + flightSeedResult.skipped + ' existing flights, source rows ' + flightSeedResult.sourceRows + ', unique rows ' + flightSeedResult.uniqueRows + '.')

  const unresolvedAirportLabels = await pool.query(`
    SELECT DISTINCT airport_label
    FROM (
      SELECT TRIM(from_airport) AS airport_label FROM flights WHERE from_airport IS NOT NULL AND TRIM(from_airport) <> ''
      UNION
      SELECT TRIM(to_airport) AS airport_label FROM flights WHERE to_airport IS NOT NULL AND TRIM(to_airport) <> ''
    ) AS labels
    ORDER BY airport_label ASC
  `)
  const resolvedAirportCount = await resolveAirportLabels(unresolvedAirportLabels.rows.map((row) => row.airport_label))
  console.log('Resolved ' + resolvedAirportCount + ' airport coordinates during initialization.')

  const userCountResult = await pool.query('SELECT COUNT(*)::int AS count FROM workspace_users')
  if (userCountResult.rows[0]?.count === 0) {
    for (const user of INITIAL_WORKSPACE_USERS) {
      await pool.query(
        `
        INSERT INTO workspace_users (id, name, email, team, role, last_activity_at, sso, can_approve_production)
        VALUES ($1, $2, $3, $4, $5, ${user.lastActivityAtExpression}, $6, $7)
        `,
        [user.id, user.name, user.email, user.team, user.role, user.sso, user.canApproveProduction],
      )
    }
  }

  dbReady = true
  dbInitError = ''
}

function ensureDbReady(response) {
  if (dbReady) return true
  response.status(503).json({ error: dbInitError || 'Database is not ready.' })
  return false
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function resolveIntegrationTable(integrationType) {
  return INTEGRATION_TABLES[integrationType] ?? null
}

function mapWorkspaceUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    team: row.team,
    role: row.role,
    lastActivityAt: row.last_activity_at,
    sso: row.sso,
    canApproveProduction: Boolean(row.can_approve_production),
  }
}

function isDuplicateFlightError(error) {
  return error && typeof error === 'object' && 'code' in error && error.code === '23505'
}

function resolveContentTable(kind) {
  return CONTENT_TABLES[kind] ?? null
}

function resolveContentGroupTable(kind) {
  return CONTENT_GROUP_TABLES[kind] ?? null
}

function mapContentGroup(row) {
  return {
    id: row.id,
    name: row.name,
  }
}

function mapContentItem(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    imageUrl: row.image_url ?? null,
    description: row.description ?? null,
    rating: Number(row.rating),
    timestamp: row.timestamp,
    groupId: row.group_id ?? null,
    groupName: row.group_name ?? null,
  }
}

function isGeneratedThumbnailPath(value) {
  return /^\/api\/content-thumbnails\/[0-9a-f-]+$/i.test(String(value ?? '').trim())
}

function getThumbnailStateForImageUrl(imageUrl) {
  const normalized = String(imageUrl ?? '').trim()
  if (!normalized) {
    return { status: 'pending', attemptedAt: null, error: null }
  }

  if (isGeneratedThumbnailPath(normalized)) {
    return { status: 'generated', attemptedAt: new Date().toISOString(), error: null }
  }

  return { status: 'external', attemptedAt: null, error: null }
}

function isYoutubeUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl).trim())
    const hostname = url.hostname.toLowerCase()
    return hostname === 'youtube.com'
      || hostname === 'www.youtube.com'
      || hostname === 'm.youtube.com'
      || hostname === 'youtu.be'
      || hostname === 'www.youtu.be'
  } catch {
    return false
  }
}

function isThumbnailHostAllowed(rawUrl) {
  try {
    const url = new URL(String(rawUrl).trim())
    const hostname = url.hostname.toLowerCase()

    if (THUMBNAIL_BLOCKED_HOSTS.has(hostname)) return false
    if (THUMBNAIL_ALLOWED_HOSTS.size > 0) {
      return THUMBNAIL_ALLOWED_HOSTS.has(hostname)
    }

    return true
  } catch {
    return false
  }
}

function normalizeAirportKey(value) {
  return String(value ?? '').trim().toUpperCase()
}

function getAirportOverride(label) {
  const airportKey = normalizeAirportKey(label)
  return airportKey ? AIRPORT_OVERRIDES[airportKey] ?? null : null
}

function mapFlight(row) {
  return {
    id: row.id,
    flightDate: row.flight_date ?? null,
    flightNumber: row.flight_number ?? null,
    fromAirport: row.from_airport ?? null,
    toAirport: row.to_airport ?? null,
    distance: row.distance === null || row.distance === undefined ? null : Number(row.distance),
    departureTime: row.departure_time ?? null,
    arrivalTime: row.arrival_time ?? null,
    airline: row.airline ?? null,
    aircraft: row.aircraft ?? null,
    notes: row.notes ?? null,
    fromAirportResolvedName: row.from_airport_resolved_name ?? null,
    fromAirportLatitude: row.from_airport_latitude === null || row.from_airport_latitude === undefined ? null : Number(row.from_airport_latitude),
    fromAirportLongitude: row.from_airport_longitude === null || row.from_airport_longitude === undefined ? null : Number(row.from_airport_longitude),
    toAirportResolvedName: row.to_airport_resolved_name ?? null,
    toAirportLatitude: row.to_airport_latitude === null || row.to_airport_latitude === undefined ? null : Number(row.to_airport_latitude),
    toAirportLongitude: row.to_airport_longitude === null || row.to_airport_longitude === undefined ? null : Number(row.to_airport_longitude),
  }
}

async function getCachedAirportByLabel(label) {
  const airportKey = normalizeAirportKey(label)
  if (!airportKey) return null

  const result = await pool.query(
    `
    SELECT airport_key, airport_label, resolved_name, latitude, longitude, mapbox_feature_id
    FROM ${FLIGHT_AIRPORT_TABLE}
    WHERE airport_key = $1
    `,
    [airportKey],
  )

  return result.rows[0] ?? null
}

async function upsertAirportCache(label, resolvedName, latitude, longitude, featureId = null) {
  const airportKey = normalizeAirportKey(label)
  if (!airportKey) return

  await pool.query(
    `
    INSERT INTO ${FLIGHT_AIRPORT_TABLE} (airport_key, airport_label, resolved_name, latitude, longitude, mapbox_feature_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (airport_key)
    DO UPDATE SET
      airport_label = EXCLUDED.airport_label,
      resolved_name = EXCLUDED.resolved_name,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      mapbox_feature_id = EXCLUDED.mapbox_feature_id,
      updated_at = NOW()
    `,
    [airportKey, String(label).trim(), resolvedName, latitude, longitude, featureId],
  )
}

function buildAirportSearchQueries(label) {
  const normalizedLabel = String(label ?? '').trim()
  if (!normalizedLabel) return []

  const queries = [normalizedLabel]
  if (!/\bairport\b/i.test(normalizedLabel)) {
    queries.push(`${normalizedLabel} airport`)
  }

  return [...new Set(queries)]
}

function selectNominatimAirportCandidate(candidates) {
  if (!Array.isArray(candidates)) return null

  return (
    candidates.find((candidate) => candidate?.category === 'aeroway' && candidate?.type === 'aerodrome')
    ?? candidates.find((candidate) => candidate?.category === 'aeroway')
    ?? candidates.find((candidate) => /airport/i.test(candidate?.display_name ?? '') || /airport/i.test(candidate?.name ?? ''))
    ?? null
  )
}

async function resolveAirportWithNominatim(label) {
  for (const query of buildAirportSearchQueries(label)) {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '5')

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'house-of-tobias/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim airport lookup failed with status ${response.status}.`)
    }

    const payload = await response.json()
    const candidate = selectNominatimAirportCandidate(payload)
    if (!candidate) continue

    const latitude = Number(candidate.lat)
    const longitude = Number(candidate.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

    return {
      resolvedName: candidate.display_name ?? candidate.name ?? query,
      latitude,
      longitude,
      featureId: candidate.osm_type && candidate.osm_id ? `${candidate.osm_type}:${candidate.osm_id}` : null,
    }
  }

  return null
}

async function resolveAirportCoordinates(label) {
  const normalizedLabel = String(label ?? '').trim()
  if (!normalizedLabel) return null

  const cached = await getCachedAirportByLabel(normalizedLabel)
  if (cached && cached.latitude !== null && cached.longitude !== null) {
    const override = getAirportOverride(normalizedLabel)
    if (override && cached.resolved_name !== override.resolvedName) {
      await upsertAirportCache(
        normalizedLabel,
        override.resolvedName,
        Number(cached.latitude),
        Number(cached.longitude),
        cached.mapbox_feature_id ?? null,
      )
      return await getCachedAirportByLabel(normalizedLabel)
    }

    return cached
  }

  const override = getAirportOverride(normalizedLabel)
  if (override && override.latitude !== null && override.longitude !== null) {
    await upsertAirportCache(
      normalizedLabel,
      override.resolvedName,
      override.latitude,
      override.longitude,
      cached?.mapbox_feature_id ?? null,
    )
    return await getCachedAirportByLabel(normalizedLabel)
  }

  const resolvedAirport = await resolveAirportWithNominatim(normalizedLabel).catch((error) => {
    console.warn(`Airport lookup failed for "${normalizedLabel}":`, error)
    return cached
  })
  if (!resolvedAirport) {
    return cached
  }

  await upsertAirportCache(
    normalizedLabel,
    resolvedAirport.resolvedName,
    resolvedAirport.latitude,
    resolvedAirport.longitude,
    resolvedAirport.featureId,
  )

  return await getCachedAirportByLabel(normalizedLabel)
}

async function resolveAirportLabels(labels) {
  const uniqueLabels = Array.from(
    new Set(
      labels
        .map((label) => String(label ?? '').trim())
        .filter(Boolean),
    ),
  )

  let resolved = 0
  for (const label of uniqueLabels) {
    const cached = await getCachedAirportByLabel(label)
    if (cached && cached.latitude !== null && cached.longitude !== null) continue

    const airport = await resolveAirportCoordinates(label)
    if (airport && airport.latitude !== null && airport.longitude !== null) {
      resolved += 1
    }
  }

  return resolved
}

async function resolveAirportsForFlight(flight) {
  return await resolveAirportLabels([flight?.fromAirport, flight?.toAirport])
}

function flattenScribeBooks(items) {
  if (!Array.isArray(items)) return []

  return items.flatMap((item) => {
    if (item?.type === 'book' && item.book) return [item.book]
    if (item?.type === 'series' && Array.isArray(item.books)) return item.books
    return []
  })
}

async function fetchScribeLibrarySummary() {
  const pageSize = 100
  let page = 1
  let totalBooks = 0
  let totalGroups = 0
  let booksRead = 0
  let physicalBooks = 0
  let digitalBooks = 0

  while (true) {
    const url = new URL('books', `${SCRIBE_API_BASE_URL}/`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('pageSize', String(pageSize))

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'house-of-tobias/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Scribe books lookup failed with status ${response.status}.`)
    }

    const payload = await response.json()
    const books = flattenScribeBooks(payload.items)

    if (page === 1) {
      totalBooks = Number(payload.totalBooks ?? 0)
      totalGroups = Number(payload.totalGroups ?? 0)
      booksRead = Number(payload.quickFilterCounts?.read ?? 0)
    }

    for (const book of books) {
      if (book?.hasFile) digitalBooks += 1
      else physicalBooks += 1
    }

    if (!books.length || page * pageSize >= totalGroups) {
      break
    }

    page += 1
  }

  return {
    totalBooks,
    booksRead,
    physicalBooks,
    digitalBooks,
  }
}

async function saveGeneratedThumbnail(kind, itemId, imageBuffer, contentType = 'image/jpeg') {
  const existing = await pool.query(
    `
    SELECT id
    FROM ${CONTENT_THUMBNAILS_TABLE}
    WHERE content_kind = $1 AND content_item_id = $2
    `,
    [kind, itemId],
  )

  const thumbnailId = existing.rows[0]?.id ?? randomUUID()

  await pool.query(
    `
    INSERT INTO ${CONTENT_THUMBNAILS_TABLE} (id, content_kind, content_item_id, content_type, image_data, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (content_kind, content_item_id)
    DO UPDATE SET
      content_type = EXCLUDED.content_type,
      image_data = EXCLUDED.image_data,
      updated_at = NOW()
    `,
    [thumbnailId, kind, itemId, contentType, imageBuffer],
  )

  await pool.query(
    `
    UPDATE ${resolveContentTable(kind)}
    SET image_url = $2, thumbnail_status = 'generated', thumbnail_attempted_at = NOW(), thumbnail_error = NULL, updated_at = NOW()
    WHERE id = $1
    `,
    [itemId, `/api/content-thumbnails/${thumbnailId}`],
  )

  return thumbnailId
}

async function markThumbnailFailure(kind, itemId, errorMessage) {
  await pool.query(
    `
    UPDATE ${resolveContentTable(kind)}
    SET thumbnail_status = 'failed', thumbnail_attempted_at = NOW(), thumbnail_error = $2, updated_at = NOW()
    WHERE id = $1
    `,
    [itemId, errorMessage],
  )
}

async function captureItemThumbnail(page, item) {
  const screenshotOptions = {
    type: 'jpeg',
    quality: 76,
    fullPage: false,
    animations: 'disabled',
    timeout: THUMBNAIL_SCREENSHOT_TIMEOUT_MS,
  }

  await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {})
  await page.route('**/*', (route) => {
    const type = route.request().resourceType()
    if (type === 'font' || type === 'media' || type === 'websocket' || type === 'manifest') {
      route.abort().catch(() => {})
      return
    }
    route.continue().catch(() => {})
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: THUMBNAIL_NAVIGATION_TIMEOUT_MS })
  await page.waitForTimeout(THUMBNAIL_WAIT_MS)
  await page.evaluate(() => {
    document.querySelectorAll('video, audio, iframe[allow*="autoplay"], canvas').forEach((element) => {
      element.remove()
    })
  }).catch(() => {})

  try {
    return await page.screenshot(screenshotOptions)
  } catch (error) {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(800)
    try {
      return await page.screenshot(screenshotOptions)
    } catch {
      const mainLocator = page.locator('main').first()
      if (await mainLocator.count()) {
        return await mainLocator.screenshot(screenshotOptions)
      }

      const bodyLocator = page.locator('body').first()
      if (await bodyLocator.count()) {
        return bodyLocator.screenshot(screenshotOptions)
      }

      throw error
    }
  }
}

async function generateMissingContentThumbnails({ retryFailed = false, limit = THUMBNAIL_DEFAULT_BATCH_SIZE } = {}) {
  if (!pool || !dbReady) return

  let chromium
  try {
    ;({ chromium } = await import('@playwright/test'))
  } catch (error) {
    console.warn('Thumbnail generator disabled: failed to load Playwright.', error)
    return
  }

    let browser
  try {
    const pendingItems = []

    for (const [kind, tableName] of Object.entries(CONTENT_TABLES)) {
      const result = await pool.query(
        `
        SELECT id, url
        FROM ${tableName}
        WHERE COALESCE(TRIM(image_url), '') = ''
          AND thumbnail_status = ANY($1)
        ORDER BY created_at ASC
        LIMIT $2
        `,
        [retryFailed ? ['pending', 'failed'] : ['pending'], limit],
      )

      for (const row of result.rows.map((entry) => ({ kind, id: entry.id, url: entry.url }))) {
        if (!isThumbnailHostAllowed(row.url)) {
          await markThumbnailFailure(row.kind, row.id, 'Thumbnail generation is not allowed for this host.')
          continue
        }

        pendingItems.push(row)
      }
    }

    if (!pendingItems.length) return

    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()

    for (const item of pendingItems) {
      try {
        const imageBuffer = await captureItemThumbnail(page, item)
        await saveGeneratedThumbnail(item.kind, item.id, imageBuffer)
        console.log(`Generated thumbnail for ${item.kind}/${item.id}.`)
      } catch (error) {
        const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
        await markThumbnailFailure(item.kind, item.id, message)
        console.warn(`Failed to generate thumbnail for ${item.kind}/${item.id}: ${message}`)
      }
    }

    await context.close()
  } catch (error) {
    console.warn('Thumbnail generator failed during boot:', error)
  } finally {
    await browser?.close()
  }
}

async function loadContentItemById(kind, itemId) {
  const tableName = resolveContentTable(kind)
  const groupTableName = resolveContentGroupTable(kind)
  if (!tableName || !groupTableName) return null

  const result = await pool.query(
    `
    SELECT
      item.id,
      item.name,
      item.url,
      item.image_url,
      item.description,
      item.rating,
      item.timestamp,
      item.group_id,
      group_item.name AS group_name
    FROM ${tableName} AS item
    LEFT JOIN ${groupTableName} AS group_item ON group_item.id = item.group_id
    WHERE item.id = $1
    `,
    [itemId],
  )

  if (!result.rowCount) return null
  return mapContentItem(result.rows[0])
}

async function generateContentThumbnailForItem(kind, itemId) {
  const tableName = resolveContentTable(kind)
  if (!tableName) {
    return { error: 'Unknown content type.', status: 400 }
  }

  const itemResult = await pool.query(
    `
    SELECT id, url
    FROM ${tableName}
    WHERE id = $1
    `,
    [itemId],
  )

  if (!itemResult.rowCount) {
    return { error: 'Item not found.', status: 404 }
  }

  const item = { kind, id: itemResult.rows[0].id, url: itemResult.rows[0].url }

  if (!isThumbnailHostAllowed(item.url)) {
    const message = 'Thumbnail generation is not allowed for this host.'
    await markThumbnailFailure(kind, itemId, message)
    return { error: message, status: 400 }
  }

  let chromium
  let browser
  let context

  try {
    ;({ chromium } = await import('@playwright/test'))
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()
    const imageBuffer = await captureItemThumbnail(page, item)
    await saveGeneratedThumbnail(kind, itemId, imageBuffer)
    const refreshedItem = await loadContentItemById(kind, itemId)
    return { item: refreshedItem, status: 200 }
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    await markThumbnailFailure(kind, itemId, message)
    return { error: message, status: 500 }
  } finally {
    await context?.close().catch(() => {})
    await browser?.close().catch(() => {})
  }
}

function buildFlightsSelectQuery(whereClause = '', values = []) {
  return pool.query(
    `
    SELECT
      flight.id,
      flight.flight_date,
      flight.flight_number,
      flight.from_airport,
      flight.to_airport,
      flight.distance,
      flight.departure_time,
      flight.arrival_time,
      flight.airline,
      flight.aircraft,
      flight.notes,
      departure.resolved_name AS from_airport_resolved_name,
      departure.latitude AS from_airport_latitude,
      departure.longitude AS from_airport_longitude,
      arrival.resolved_name AS to_airport_resolved_name,
      arrival.latitude AS to_airport_latitude,
      arrival.longitude AS to_airport_longitude
    FROM flights AS flight
    LEFT JOIN ${FLIGHT_AIRPORT_TABLE} AS departure ON departure.airport_key = UPPER(TRIM(flight.from_airport))
    LEFT JOIN ${FLIGHT_AIRPORT_TABLE} AS arrival ON arrival.airport_key = UPPER(TRIM(flight.to_airport))
    ${whereClause}
    ORDER BY COALESCE(flight.departure_time, flight.arrival_time, flight.flight_date::timestamp, flight.created_at) DESC, flight.created_at DESC
    `,
    values,
  )
}

function validateFlightPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Invalid request body.' }
  }

  const normalized = {
    flightDate: String(payload.flightDate ?? '').trim() || null,
    flightNumber: String(payload.flightNumber ?? '').trim() || null,
    fromAirport: String(payload.fromAirport ?? '').trim() || null,
    toAirport: String(payload.toAirport ?? '').trim() || null,
    distance: String(payload.distance ?? '').trim() || null,
    departureTime: String(payload.departureTime ?? '').trim() || null,
    arrivalTime: String(payload.arrivalTime ?? '').trim() || null,
    airline: String(payload.airline ?? '').trim() || null,
    aircraft: String(payload.aircraft ?? '').trim() || null,
    notes: String(payload.notes ?? '').trim() || null,
  }

  if (!Object.values(normalized).some(Boolean)) {
    return { error: 'Add at least one flight detail before saving.' }
  }

  if (normalized.flightDate) {
    const parsed = new Date(`${normalized.flightDate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Date must be a valid date.' }
    }
  }

  const parsedDeparture = normalized.departureTime ? new Date(normalized.departureTime) : null
  const parsedArrival = normalized.arrivalTime ? new Date(normalized.arrivalTime) : null
  if (parsedDeparture && Number.isNaN(parsedDeparture.getTime())) return { error: 'Departure time must be a valid date/time.' }
  if (parsedArrival && Number.isNaN(parsedArrival.getTime())) return { error: 'Arrival time must be a valid date/time.' }

  if (parsedDeparture && parsedArrival && parsedArrival.getTime() < parsedDeparture.getTime()) {
    return { error: 'Arrival time cannot be earlier than departure time.' }
  }

  let distance = null
  if (normalized.distance) {
    distance = Number(normalized.distance)
    if (!Number.isFinite(distance) || distance < 0) {
      return { error: 'Distance must be a positive number.' }
    }
  }

  return {
    value: {
      flightDate: normalized.flightDate,
      flightNumber: normalized.flightNumber,
      fromAirport: normalized.fromAirport,
      toAirport: normalized.toAirport,
      distance,
      departureTime: parsedDeparture ? parsedDeparture.toISOString() : null,
      arrivalTime: parsedArrival ? parsedArrival.toISOString() : null,
      airline: normalized.airline,
      aircraft: normalized.aircraft,
      notes: normalized.notes,
    },
  }
}

async function resolveValidatedGroupId(kind, rawGroupId) {
  const normalizedGroupId = String(rawGroupId ?? '').trim()
  if (!normalizedGroupId) return { groupId: null }

  const groupTableName = resolveContentGroupTable(kind)
  if (!groupTableName) {
    return { error: 'Unknown content type.' }
  }

  const result = await pool.query(`SELECT id FROM ${groupTableName} WHERE id = $1`, [normalizedGroupId])
  if (!result.rowCount) {
    return { error: 'Selected group was not found.' }
  }

  return { groupId: normalizedGroupId }
}

async function validateContentItemPayload(kind, payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Invalid request body.' }
  }

  const { name, url, imageUrl, description, rating, timestamp, groupId } = payload
  if (!String(name ?? '').trim()) return { error: 'Name is required.' }
  if (!String(url ?? '').trim()) return { error: 'URL is required.' }

  try {
    new URL(String(url).trim())
  } catch {
    return { error: 'URL must be a valid absolute URL.' }
  }

  if (kind === 'videos' && !isYoutubeUrl(url)) {
    return { error: 'Video URL must be a valid YouTube link.' }
  }

  if (imageUrl !== undefined && imageUrl !== null && String(imageUrl).trim()) {
    const normalizedImageUrl = String(imageUrl).trim()
    if (!isGeneratedThumbnailPath(normalizedImageUrl)) {
      try {
        new URL(normalizedImageUrl)
      } catch {
        return { error: 'Image URL must be a valid absolute URL or generated thumbnail path.' }
      }
    }
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return { error: 'Description must be a string.' }
  }

  const numericRating = Number(rating)
  if (!Number.isFinite(numericRating)) return { error: 'Rating must be a number.' }
  if (numericRating < 0 || numericRating > 5) return { error: 'Rating must be between 0 and 5.' }

  const parsedTimestamp = new Date(String(timestamp ?? ''))
  if (Number.isNaN(parsedTimestamp.getTime())) return { error: 'Timestamp must be a valid date/time.' }

  const resolvedGroup = await resolveValidatedGroupId(kind, groupId)
  if (resolvedGroup.error) return resolvedGroup

  return { groupId: resolvedGroup.groupId }
}

function validateContentGroupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Invalid request body.'
  }

  if (!String(payload.name ?? '').trim()) {
    return 'Group name is required.'
  }

  return null
}

function validateWorkspaceUserPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Invalid request body.'
  }

  const { name, email, team, role, sso, canApproveProduction } = payload
  if (!String(name ?? '').trim()) return 'User name is required.'
  if (!String(email ?? '').trim()) return 'User email is required.'
  if (!TEAM_NAMES.includes(team)) return 'Invalid team.'
  if (!USER_ROLES.includes(role)) return 'Invalid role.'
  if (!USER_SSO_MODES.includes(sso)) return 'Invalid SSO mode.'
  if (typeof canApproveProduction !== 'boolean') return 'canApproveProduction must be a boolean.'
  return null
}

function buildOpenApiSpec(request) {
  const baseUrl = `${request.protocol}://${request.get('host')}`
  const integrationTypes = Object.keys(INTEGRATION_TABLES)

  return {
    openapi: '3.1.0',
    info: {
      title: 'House of Tobias API',
      version: '1.0.0',
      description: 'Backend API for integration state management and GLB model storage/preview.',
    },
    servers: [{ url: baseUrl }],
    tags: [
      { name: 'System', description: 'Runtime and health endpoints.' },
      { name: 'Integrations', description: 'Connector state persistence APIs.' },
      { name: 'Users', description: 'Workspace user directory CRUD APIs.' },
      { name: 'GLB Models', description: '3D model upload, listing, download, preview, and deletion APIs.' },
    ],
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          required: ['ok', 'dbReady'],
          properties: {
            ok: { type: 'boolean', example: true },
            dbReady: { type: 'boolean', example: true },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string', example: 'Failed to load integration state.' },
          },
        },
        ConnectivityHealth: {
          oneOf: [
            { type: 'null' },
            {
              type: 'object',
              properties: {
                connectivity: {
                  type: 'string',
                  enum: ['passing', 'degraded', 'failing', 'disabled'],
                  example: 'passing',
                },
                lastSyncAt: { type: 'string', format: 'date-time', example: '2026-03-18T09:30:00.000Z' },
                latencyMs: { type: 'integer', nullable: true, example: 184 },
                quotaIssue: { type: 'boolean', example: false },
                authFailure: { type: 'boolean', example: false },
              },
              additionalProperties: false,
            },
          ],
        },
        IntegrationStateResponse: {
          type: 'object',
          required: [
            'integrationSettings',
            'enabledIntegrations',
            'lifecycleState',
            'approvalState',
            'connectivityHealth',
          ],
          properties: {
            integrationSettings: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                additionalProperties: true,
              },
            },
            enabledIntegrations: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
            lifecycleState: {
              type: 'object',
              additionalProperties: {
                type: 'string',
                enum: ['draft', 'pending_approval', 'active', 'disabled', 'degraded', 'archived'],
              },
            },
            approvalState: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
            connectivityHealth: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/ConnectivityHealth' },
            },
          },
        },
        IntegrationStateUpsertRequest: {
          type: 'object',
          properties: {
            settings: {
              type: 'object',
              additionalProperties: true,
            },
            enabled: { type: 'boolean', example: true },
            lifecycleState: {
              type: 'string',
              enum: ['draft', 'pending_approval', 'active', 'disabled', 'degraded', 'archived'],
              example: 'active',
            },
            approved: { type: 'boolean', example: false },
            connectivityHealth: { $ref: '#/components/schemas/ConnectivityHealth' },
          },
          additionalProperties: false,
        },
        OkResponse: {
          type: 'object',
          required: ['ok'],
          properties: {
            ok: { type: 'boolean', example: true },
          },
        },
        WorkspaceUser: {
          type: 'object',
          required: ['id', 'name', 'email', 'team', 'role', 'lastActivityAt', 'sso', 'canApproveProduction'],
          properties: {
            id: { type: 'string', example: 'user-1' },
            name: { type: 'string', example: 'Anouk Vermeer' },
            email: { type: 'string', format: 'email', example: 'anouk@houseoftobias.io' },
            team: { type: 'string', enum: TEAM_NAMES, example: 'Platform' },
            role: { type: 'string', enum: USER_ROLES, example: 'platform_admin' },
            lastActivityAt: { type: 'string', format: 'date-time', example: '2026-03-18T09:30:00.000Z' },
            sso: { type: 'string', enum: USER_SSO_MODES, example: 'enforced' },
            canApproveProduction: { type: 'boolean', example: true },
          },
        },
        WorkspaceUserInput: {
          type: 'object',
          required: ['name', 'email', 'team', 'role', 'sso', 'canApproveProduction'],
          properties: {
            name: { type: 'string', example: 'Anouk Vermeer' },
            email: { type: 'string', format: 'email', example: 'anouk@houseoftobias.io' },
            team: { type: 'string', enum: TEAM_NAMES, example: 'Platform' },
            role: { type: 'string', enum: USER_ROLES, example: 'platform_admin' },
            sso: { type: 'string', enum: USER_SSO_MODES, example: 'enforced' },
            canApproveProduction: { type: 'boolean', example: true },
          },
          additionalProperties: false,
        },
        WorkspaceUserListResponse: {
          type: 'object',
          required: ['users'],
          properties: {
            users: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkspaceUser' },
            },
          },
        },
        WorkspaceUserResponse: {
          type: 'object',
          required: ['user'],
          properties: {
            user: { $ref: '#/components/schemas/WorkspaceUser' },
          },
        },
        GlbModelSummary: {
          type: 'object',
          required: ['id', 'fileName', 'fileSize', 'createdAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            fileName: { type: 'string', example: 'cluster.glb' },
            fileSize: { type: 'integer', example: 2457600 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        GlbListResponse: {
          type: 'object',
          required: ['models'],
          properties: {
            models: {
              type: 'array',
              items: { $ref: '#/components/schemas/GlbModelSummary' },
            },
          },
        },
        GlbUploadResponse: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['System'],
          summary: 'Get service health',
          responses: {
            200: {
              description: 'Current API and database readiness.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/api/integrations/state': {
        get: {
          tags: ['Integrations'],
          summary: 'List persisted integration state',
          responses: {
            200: {
              description: 'Full integration state maps keyed by integration id.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/IntegrationStateResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/integrations/{type}/{id}': {
        put: {
          tags: ['Integrations'],
          summary: 'Create or update a single integration record',
          parameters: [
            {
              name: 'type',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: integrationTypes },
            },
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'aws-cloud-prod' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IntegrationStateUpsertRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'State saved.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/OkResponse' },
                },
              },
            },
            400: {
              description: 'Unknown integration type.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/glb': {
        get: {
          tags: ['GLB Models'],
          summary: 'List stored GLB models',
          responses: {
            200: {
              description: 'Stored GLB model metadata.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GlbListResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        post: {
          tags: ['GLB Models'],
          summary: 'Upload a GLB model',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Model stored.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GlbUploadResponse' },
                },
              },
            },
            400: {
              description: 'Missing file or invalid file type.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'List workspace users',
          responses: {
            200: {
              description: 'Workspace directory users ordered by name.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WorkspaceUserListResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Create a workspace user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkspaceUserInput' },
              },
            },
          },
          responses: {
            201: {
              description: 'User created.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WorkspaceUserResponse' },
                },
              },
            },
            400: {
              description: 'Invalid request body.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            409: {
              description: 'Email already exists.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/users/{id}': {
        put: {
          tags: ['Users'],
          summary: 'Update a workspace user',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'user-1' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkspaceUserInput' },
              },
            },
          },
          responses: {
            200: {
              description: 'User updated.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WorkspaceUserResponse' },
                },
              },
            },
            400: {
              description: 'Invalid request body.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            404: {
              description: 'User not found.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            409: {
              description: 'Email already exists.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Users'],
          summary: 'Delete a workspace user',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'user-1' },
            },
          ],
          responses: {
            200: {
              description: 'User deleted.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/OkResponse' },
                },
              },
            },
            404: {
              description: 'User not found.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            503: {
              description: 'Database unavailable.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/glb/{id}/download': {
        get: {
          tags: ['GLB Models'],
          summary: 'Download a stored GLB model',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Binary GLB payload.',
              content: {
                'model/gltf-binary': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            404: {
              description: 'Model not found.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/glb/{id}/preview': {
        get: {
          tags: ['GLB Models'],
          summary: 'Open the HTML preview page for a GLB model',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'HTML preview page.',
              content: {
                'text/html': {
                  schema: { type: 'string' },
                },
              },
            },
            404: {
              description: 'Model not found.',
              content: {
                'text/plain': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
      '/api/glb/{id}': {
        delete: {
          tags: ['GLB Models'],
          summary: 'Delete a stored GLB model',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Model deleted.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/OkResponse' },
                },
              },
            },
            404: {
              description: 'Model not found.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
  }
}

app.get('/api/openapi.json', (request, response) => {
  response.json(buildOpenApiSpec(request))
})

app.get('/swagger', (request, response) => {
  const specUrl = `${request.protocol}://${request.get('host')}/api/openapi.json`

  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>House of Tobias API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body {
        margin: 0;
        background: #101319;
      }
      #swagger-ui {
        min-height: 100vh;
      }
      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
      })
    </script>
  </body>
</html>`)
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, dbReady })
})

app.get('/api/home/library-stats', async (_request, response) => {
  try {
    const summary = await fetchScribeLibrarySummary()
    response.json(summary)
  } catch (error) {
    console.error('Failed to load home library stats:', error)
    response.status(500).json({ error: 'Failed to load home library stats.' })
  }
})

app.get('/api/integrations/state', async (_request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const integrationSettings = {}
    const enabledIntegrations = {}
    const lifecycleState = {}
    const approvalState = {}
    const connectivityHealth = {}

    for (const [integrationType, tableName] of Object.entries(INTEGRATION_TABLES)) {
      const result = await pool.query(
        `
        SELECT integration_id, settings, enabled, lifecycle_state, approved, connectivity_health
        FROM ${tableName}
        `,
      )

      result.rows.forEach((row) => {
        integrationSettings[row.integration_id] = row.settings ?? {}
        enabledIntegrations[row.integration_id] = Boolean(row.enabled)
        lifecycleState[row.integration_id] = row.lifecycle_state ?? 'draft'
        approvalState[row.integration_id] = Boolean(row.approved)
        connectivityHealth[row.integration_id] = row.connectivity_health ?? null
      })

      // Keeps the type used and documents intention that each type maps to its own table.
      if (!integrationType) {
        console.warn('Unexpected empty integration type while loading state.')
      }
    }

    response.json({
      integrationSettings,
      enabledIntegrations,
      lifecycleState,
      approvalState,
      connectivityHealth,
    })
  } catch (error) {
    console.error('Failed to load integration state:', error)
    response.status(500).json({ error: 'Failed to load integration state.' })
  }
})

app.put('/api/integrations/:type/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const integrationType = request.params.type
  const integrationId = request.params.id
  const tableName = resolveIntegrationTable(integrationType)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown integration type.' })
    return
  }

  const {
    settings = {},
    enabled = false,
    lifecycleState = 'draft',
    approved = false,
    connectivityHealth = null,
  } = request.body ?? {}

  try {
    await pool.query(
      `
      INSERT INTO ${tableName} (integration_id, settings, enabled, lifecycle_state, approved, connectivity_health, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb, NOW())
      ON CONFLICT (integration_id)
      DO UPDATE SET
        settings = EXCLUDED.settings,
        enabled = EXCLUDED.enabled,
        lifecycle_state = EXCLUDED.lifecycle_state,
        approved = EXCLUDED.approved,
        connectivity_health = EXCLUDED.connectivity_health,
        updated_at = NOW()
      `,
      [
        integrationId,
        JSON.stringify(settings ?? {}),
        Boolean(enabled),
        String(lifecycleState ?? 'draft'),
        Boolean(approved),
        JSON.stringify(connectivityHealth ?? null),
      ],
    )

    response.json({ ok: true })
  } catch (error) {
    console.error('Failed to save integration state:', error)
    response.status(500).json({ error: 'Failed to save integration state.' })
  }
})

app.get('/api/users', async (_request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      SELECT id, name, email, team, role, last_activity_at, sso, can_approve_production
      FROM workspace_users
      ORDER BY lower(name) ASC, lower(email) ASC
      `,
    )

    response.json({
      users: result.rows.map(mapWorkspaceUser),
    })
  } catch (error) {
    console.error('Failed to load workspace users:', error)
    response.status(500).json({ error: 'Failed to load workspace users.' })
  }
})

app.post('/api/users', async (request, response) => {
  if (!ensureDbReady(response)) return

  const validationError = validateWorkspaceUserPayload(request.body)
  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  const { name, email, team, role, sso, canApproveProduction } = request.body
  const id = randomUUID()

  try {
    const result = await pool.query(
      `
      INSERT INTO workspace_users (id, name, email, team, role, last_activity_at, sso, can_approve_production, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, NOW())
      RETURNING id, name, email, team, role, last_activity_at, sso, can_approve_production
      `,
      [id, String(name).trim(), String(email).trim().toLowerCase(), team, role, sso, canApproveProduction],
    )

    response.status(201).json({ user: mapWorkspaceUser(result.rows[0]) })
  } catch (error) {
    console.error('Failed to create workspace user:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      response.status(409).json({ error: 'A user with that email already exists.' })
      return
    }
    response.status(500).json({ error: 'Failed to create workspace user.' })
  }
})

app.put('/api/users/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const validationError = validateWorkspaceUserPayload(request.body)
  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  const { name, email, team, role, sso, canApproveProduction } = request.body

  try {
    const result = await pool.query(
      `
      UPDATE workspace_users
      SET
        name = $2,
        email = $3,
        team = $4,
        role = $5,
        sso = $6,
        can_approve_production = $7,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, team, role, last_activity_at, sso, can_approve_production
      `,
      [
        request.params.id,
        String(name).trim(),
        String(email).trim().toLowerCase(),
        team,
        role,
        sso,
        canApproveProduction,
      ],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'User not found.' })
      return
    }

    response.json({ user: mapWorkspaceUser(result.rows[0]) })
  } catch (error) {
    console.error('Failed to update workspace user:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      response.status(409).json({ error: 'A user with that email already exists.' })
      return
    }
    response.status(500).json({ error: 'Failed to update workspace user.' })
  }
})

app.delete('/api/users/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      DELETE FROM workspace_users
      WHERE id = $1
      RETURNING id
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'User not found.' })
      return
    }

    response.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete workspace user:', error)
    response.status(500).json({ error: 'Failed to delete workspace user.' })
  }
})

app.get('/api/:kind(projects|games|videos)', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentTable(request.params.kind)
  const groupTableName = resolveContentGroupTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  try {
    const result = await pool.query(`
      SELECT
        item.id,
        item.name,
        item.url,
        item.image_url,
        item.description,
        item.rating,
        item.timestamp,
        item.group_id,
        group_item.name AS group_name
      FROM ${tableName} AS item
      LEFT JOIN ${groupTableName} AS group_item ON group_item.id = item.group_id
      ORDER BY item.timestamp DESC, item.created_at DESC
    `)

    response.json({ items: result.rows.map(mapContentItem) })
  } catch (error) {
    console.error(`Failed to load ${request.params.kind}:`, error)
    response.status(500).json({ error: `Failed to load ${request.params.kind}.` })
  }
})

app.post('/api/:kind(projects|games|videos)', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentTable(request.params.kind)
  const groupTableName = resolveContentGroupTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  const validation = await validateContentItemPayload(request.params.kind, request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  const id = randomUUID()
  const { name, url, imageUrl, description, rating, timestamp } = request.body
  const thumbnailState = getThumbnailStateForImageUrl(imageUrl)

  try {
    const result = await pool.query(
      `
      INSERT INTO ${tableName} (
        id, name, url, image_url, description, rating, timestamp, group_id,
        thumbnail_status, thumbnail_attempted_at, thumbnail_error, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
      `,
      [
        id,
        String(name).trim(),
        String(url).trim(),
        String(imageUrl ?? '').trim() || null,
        String(description ?? '').trim() || null,
        Number(rating),
        new Date(String(timestamp)).toISOString(),
        validation.groupId,
        thumbnailState.status,
        thumbnailState.attemptedAt,
        thumbnailState.error,
      ],
    )

    const createdItem = await pool.query(
      `
      SELECT
        item.id,
        item.name,
        item.url,
        item.image_url,
        item.description,
        item.rating,
        item.timestamp,
        item.group_id,
        group_item.name AS group_name
      FROM ${tableName} AS item
      LEFT JOIN ${groupTableName} AS group_item ON group_item.id = item.group_id
      WHERE item.id = $1
      `,
      [result.rows[0].id],
    )

    response.status(201).json({ item: mapContentItem(createdItem.rows[0]) })
  } catch (error) {
    console.error(`Failed to create ${request.params.kind.slice(0, -1)}:`, error)
    response.status(500).json({ error: `Failed to create ${request.params.kind.slice(0, -1)}.` })
  }
})

app.put('/api/:kind(projects|games|videos)/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentTable(request.params.kind)
  const groupTableName = resolveContentGroupTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  const validation = await validateContentItemPayload(request.params.kind, request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  const { name, url, imageUrl, description, rating, timestamp } = request.body
  const thumbnailState = getThumbnailStateForImageUrl(imageUrl)

  try {
    const result = await pool.query(
      `
      UPDATE ${tableName}
      SET
        name = $2,
        url = $3,
        image_url = $4,
        description = $5,
        rating = $6,
        timestamp = $7,
        group_id = $8,
        thumbnail_status = $9,
        thumbnail_attempted_at = $10,
        thumbnail_error = $11,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
      `,
      [
        request.params.id,
        String(name).trim(),
        String(url).trim(),
        String(imageUrl ?? '').trim() || null,
        String(description ?? '').trim() || null,
        Number(rating),
        new Date(String(timestamp)).toISOString(),
        validation.groupId,
        thumbnailState.status,
        thumbnailState.attemptedAt,
        thumbnailState.error,
      ],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Item not found.' })
      return
    }

    const updatedItem = await pool.query(
      `
      SELECT
        item.id,
        item.name,
        item.url,
        item.image_url,
        item.description,
        item.rating,
        item.timestamp,
        item.group_id,
        group_item.name AS group_name
      FROM ${tableName} AS item
      LEFT JOIN ${groupTableName} AS group_item ON group_item.id = item.group_id
      WHERE item.id = $1
      `,
      [request.params.id],
    )

    response.json({ item: mapContentItem(updatedItem.rows[0]) })
  } catch (error) {
    console.error(`Failed to update ${request.params.kind.slice(0, -1)}:`, error)
    response.status(500).json({ error: `Failed to update ${request.params.kind.slice(0, -1)}.` })
  }
})

app.post('/api/:kind(projects|games|videos)/:id/refresh-thumbnail', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await generateContentThumbnailForItem(request.params.kind, request.params.id)
    if (result.error || !result.item) {
      response.status(result.status ?? 500).json({ error: result.error ?? 'Failed to refresh thumbnail.' })
      return
    }

    response.json({ item: result.item })
  } catch (error) {
    console.error(`Failed to refresh thumbnail for ${request.params.kind}/${request.params.id}:`, error)
    response.status(500).json({ error: 'Failed to refresh thumbnail.' })
  }
})

app.get('/api/:kind(projects|games|videos)/groups', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentGroupTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  try {
    const result = await pool.query(`
      SELECT id, name
      FROM ${tableName}
      ORDER BY LOWER(name) ASC
    `)

    response.json({ groups: result.rows.map(mapContentGroup) })
  } catch (error) {
    console.error(`Failed to load ${request.params.kind} groups:`, error)
    response.status(500).json({ error: `Failed to load ${request.params.kind} groups.` })
  }
})

app.post('/api/:kind(projects|games|videos)/groups', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentGroupTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  const validationError = validateContentGroupPayload(request.body)
  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO ${tableName} (id, name, updated_at)
      VALUES ($1, $2, NOW())
      RETURNING id, name
      `,
      [randomUUID(), String(request.body.name).trim()],
    )

    response.status(201).json({ group: mapContentGroup(result.rows[0]) })
  } catch (error) {
    console.error(`Failed to create ${request.params.kind} group:`, error)
    response.status(500).json({ error: `Failed to create ${request.params.kind} group.` })
  }
})

app.put('/api/:kind(projects|games|videos)/groups/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentGroupTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  const validationError = validateContentGroupPayload(request.body)
  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  try {
    const result = await pool.query(
      `
      UPDATE ${tableName}
      SET name = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name
      `,
      [request.params.id, String(request.body.name).trim()],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Group not found.' })
      return
    }

    response.json({ group: mapContentGroup(result.rows[0]) })
  } catch (error) {
    console.error(`Failed to update ${request.params.kind} group:`, error)
    response.status(500).json({ error: `Failed to update ${request.params.kind} group.` })
  }
})

app.delete('/api/:kind(projects|games|videos)/groups/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentGroupTable(request.params.kind)
  const contentTableName = resolveContentTable(request.params.kind)
  if (!tableName || !contentTableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  try {
    const usage = await pool.query(`SELECT COUNT(*)::int AS count FROM ${contentTableName} WHERE group_id = $1`, [request.params.id])
    if (usage.rows[0]?.count > 0) {
      response.status(400).json({ error: 'Remove or reassign items in this group before deleting it.' })
      return
    }

    const result = await pool.query(
      `
      DELETE FROM ${tableName}
      WHERE id = $1
      RETURNING id
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Group not found.' })
      return
    }

    response.json({ ok: true })
  } catch (error) {
    console.error(`Failed to delete ${request.params.kind} group:`, error)
    response.status(500).json({ error: `Failed to delete ${request.params.kind} group.` })
  }
})

app.delete('/api/:kind(projects|games|videos)/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const tableName = resolveContentTable(request.params.kind)
  if (!tableName) {
    response.status(400).json({ error: 'Unknown content type.' })
    return
  }

  try {
    await pool.query(
      `
      DELETE FROM ${CONTENT_THUMBNAILS_TABLE}
      WHERE content_kind = $1 AND content_item_id = $2
      `,
      [request.params.kind, request.params.id],
    )

    const result = await pool.query(
      `
      DELETE FROM ${tableName}
      WHERE id = $1
      RETURNING id
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Item not found.' })
      return
    }

    response.json({ ok: true })
  } catch (error) {
    console.error(`Failed to delete ${request.params.kind.slice(0, -1)}:`, error)
    response.status(500).json({ error: `Failed to delete ${request.params.kind.slice(0, -1)}.` })
  }
})

app.get('/api/flights', async (_request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await buildFlightsSelectQuery()
    response.json({ flights: result.rows.map(mapFlight) })
  } catch (error) {
    console.error('Failed to load flights:', error)
    response.status(500).json({ error: 'Failed to load flights.' })
  }
})

app.post('/api/flights', async (request, response) => {
  if (!ensureDbReady(response)) return

  const validation = validateFlightPayload(request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  const flight = validation.value
  const id = randomUUID()

  try {
    const result = await pool.query(
      `
      INSERT INTO flights (
        id,
        flight_date,
        flight_number,
        from_airport,
        to_airport,
        distance,
        departure_time,
        arrival_time,
        airline,
        aircraft,
        notes,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
      `,
      [
        id,
        flight.flightDate,
        flight.flightNumber,
        flight.fromAirport,
        flight.toAirport,
        flight.distance,
        flight.departureTime,
        flight.arrivalTime,
        flight.airline,
        flight.aircraft,
        flight.notes,
      ],
    )

    await resolveAirportsForFlight(flight)

    const createdFlight = await buildFlightsSelectQuery('WHERE flight.id = $1', [result.rows[0].id])
    response.status(201).json({ flight: mapFlight(createdFlight.rows[0]) })
  } catch (error) {
    if (isDuplicateFlightError(error)) {
      response.status(409).json({ error: 'This flight already exists.' })
      return
    }
    console.error('Failed to create flight:', error)
    response.status(500).json({ error: 'Failed to create flight.' })
  }
})

app.put('/api/flights/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  const validation = validateFlightPayload(request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  const flight = validation.value

  try {
    const result = await pool.query(
      `
      UPDATE flights
      SET
        flight_date = $2,
        flight_number = $3,
        from_airport = $4,
        to_airport = $5,
        distance = $6,
        departure_time = $7,
        arrival_time = $8,
        airline = $9,
        aircraft = $10,
        notes = $11,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
      `,
      [
        request.params.id,
        flight.flightDate,
        flight.flightNumber,
        flight.fromAirport,
        flight.toAirport,
        flight.distance,
        flight.departureTime,
        flight.arrivalTime,
        flight.airline,
        flight.aircraft,
        flight.notes,
      ],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Flight not found.' })
      return
    }

    await resolveAirportsForFlight(flight)

    const updatedFlight = await buildFlightsSelectQuery('WHERE flight.id = $1', [request.params.id])
    response.json({ flight: mapFlight(updatedFlight.rows[0]) })
  } catch (error) {
    if (isDuplicateFlightError(error)) {
      response.status(409).json({ error: 'This flight already exists.' })
      return
    }
    console.error('Failed to update flight:', error)
    response.status(500).json({ error: 'Failed to update flight.' })
  }
})

app.delete('/api/flights/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      DELETE FROM flights
      WHERE id = $1
      RETURNING id
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Flight not found.' })
      return
    }

    response.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete flight:', error)
    response.status(500).json({ error: 'Failed to delete flight.' })
  }
})

app.post('/api/content-thumbnails/generate', async (request, response) => {
  if (!ensureDbReady(response)) return

  const retryFailed = Boolean(request.body?.retryFailed)
  const rawLimit = Number(request.body?.limit)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(50, Math.floor(rawLimit)) : THUMBNAIL_DEFAULT_BATCH_SIZE

  try {
    await generateMissingContentThumbnails({ retryFailed, limit })
    response.json({ ok: true, retryFailed, limit })
  } catch (error) {
    console.error('Failed to trigger thumbnail generation:', error)
    response.status(500).json({ error: 'Failed to trigger thumbnail generation.' })
  }
})

app.get('/api/content-thumbnails/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      SELECT content_type, image_data
      FROM ${CONTENT_THUMBNAILS_TABLE}
      WHERE id = $1
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Thumbnail not found.' })
      return
    }

    response.setHeader('Content-Type', result.rows[0].content_type || 'image/jpeg')
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    response.send(result.rows[0].image_data)
  } catch (error) {
    console.error('Failed to load content thumbnail:', error)
    response.status(500).json({ error: 'Failed to load content thumbnail.' })
  }
})

app.post('/api/flights/resolve-airports', async (_request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(`
      SELECT DISTINCT airport_label
      FROM (
        SELECT TRIM(from_airport) AS airport_label FROM flights WHERE from_airport IS NOT NULL AND TRIM(from_airport) <> ''
        UNION
        SELECT TRIM(to_airport) AS airport_label FROM flights WHERE to_airport IS NOT NULL AND TRIM(to_airport) <> ''
      ) AS labels
      ORDER BY airport_label ASC
    `)

    const resolved = await resolveAirportLabels(result.rows.map((row) => row.airport_label))

    response.json({ ok: true, resolved })
  } catch (error) {
    console.error('Failed to resolve flight airports:', error)
    response.status(500).json({ error: 'Failed to resolve flight airports.' })
  }
})

app.get('/api/glb', async (_request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      SELECT id, file_name, file_size, created_at
      FROM glb_models
      ORDER BY created_at DESC
      `,
    )

    response.json({
      models: result.rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        fileSize: Number(row.file_size),
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error('Failed to list GLB models:', error)
    response.status(500).json({ error: 'Failed to load GLB models.' })
  }
})

app.post('/api/glb', upload.single('file'), async (request, response) => {
  if (!ensureDbReady(response)) return

  const file = request.file
  if (!file) {
    response.status(400).json({ error: 'No file uploaded.' })
    return
  }

  if (!file.originalname.toLowerCase().endsWith('.glb')) {
    response.status(400).json({ error: 'Only .glb files are allowed.' })
    return
  }

  try {
    const id = randomUUID()
    await pool.query(
      `
      INSERT INTO glb_models (id, file_name, file_size, content_type, model_data)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [id, file.originalname, file.size, file.mimetype || 'model/gltf-binary', file.buffer],
    )

    response.status(201).json({ id })
  } catch (error) {
    console.error('Failed to save GLB model:', error)
    response.status(500).json({ error: 'Failed to save GLB model.' })
  }
})

app.get('/api/glb/:id/download', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      SELECT file_name, file_size, content_type, model_data
      FROM glb_models
      WHERE id = $1
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Model not found.' })
      return
    }

    const model = result.rows[0]
    response.setHeader('Content-Type', model.content_type || 'model/gltf-binary')
    response.setHeader('Content-Length', String(model.file_size))
    response.setHeader('Content-Disposition', `inline; filename="${model.file_name}"`)
    response.send(model.model_data)
  } catch (error) {
    console.error('Failed to download GLB model:', error)
    response.status(500).json({ error: 'Failed to download GLB model.' })
  }
})

app.get('/api/glb/:id/preview', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      SELECT file_name
      FROM glb_models
      WHERE id = $1
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).send('Model not found.')
      return
    }

    const fileName = escapeHtml(result.rows[0].file_name)
    const modelUrl = `/api/glb/${encodeURIComponent(request.params.id)}/download`

    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GLB Preview - ${fileName}</title>
    <script type="importmap">
      {
        "imports": {
          "three": "https://unpkg.com/three@0.171.0/build/three.module.js",
          "three/addons/": "https://unpkg.com/three@0.171.0/examples/jsm/"
        }
      }
    </script>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #0f1115;
        color: #e7eaf0;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      #app {
        width: 100%;
        height: 100%;
      }
      .label {
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 2;
        background: rgba(0,0,0,0.48);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="label">${fileName}</div>
    <div id="app"></div>
    <script type="module">
      import * as THREE from 'three'
      import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

      const container = document.getElementById('app')
      const root = document.documentElement
      const fileLabel = document.querySelector('.label')
      const parentOrigin = document.referrer ? new URL(document.referrer).origin : '*'
      const scene = new THREE.Scene()
      const themePalettes = {
        dark: {
          background: 0x0f1115,
          text: '#e7eaf0',
          overlayBackground: 'rgba(0,0,0,0.48)',
          overlayBorder: 'rgba(255,255,255,0.18)',
          gridMajor: 0x354055,
          gridMinor: 0x232935,
          hemiSky: 0xffffff,
          hemiGround: 0x2f3644,
          fill: 0x8ab4ff,
        },
        light: {
          background: 0xf4f5f7,
          text: '#151922',
          overlayBackground: 'rgba(255,255,255,0.84)',
          overlayBorder: 'rgba(17,24,39,0.12)',
          gridMajor: 0xc8d0de,
          gridMinor: 0xe2e8f0,
          hemiSky: 0xffffff,
          hemiGround: 0xd9e1ec,
          fill: 0x6d8ecf,
        },
      }
      let activeTheme = 'dark'
      scene.background = new THREE.Color(themePalettes.dark.background)
      const clock = new THREE.Clock()
      let mixer = null
      let animationsPaused = false

      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000)
      camera.position.set(2.4, 1.8, 2.8)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(window.innerWidth, window.innerHeight)
      container.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.target.set(0, 0.6, 0)

      const hemi = new THREE.HemisphereLight(
        themePalettes.dark.hemiSky,
        themePalettes.dark.hemiGround,
        1.4,
      )
      scene.add(hemi)

      const key = new THREE.DirectionalLight(0xffffff, 1.2)
      key.position.set(3, 5, 3)
      scene.add(key)

      const fill = new THREE.DirectionalLight(themePalettes.dark.fill, 0.4)
      fill.position.set(-4, 2, -3)
      scene.add(fill)

      const grid = new THREE.GridHelper(24, 24, themePalettes.dark.gridMajor, themePalettes.dark.gridMinor)
      scene.add(grid)

      const reportAnimationAvailability = (hasAnimation) => {
        window.parent.postMessage(
          {
            type: 'house-of-tobias-playground-animation-availability',
            hasAnimation,
          },
          parentOrigin,
        )
      }

      const applyTheme = (theme) => {
        const palette = themePalettes[theme] || themePalettes.dark
        activeTheme = theme in themePalettes ? theme : 'dark'

        scene.background.setHex(palette.background)
        hemi.color.setHex(palette.hemiSky)
        hemi.groundColor.setHex(palette.hemiGround)
        fill.color.setHex(palette.fill)
        grid.material.color.setHex(palette.gridMajor)
        if (Array.isArray(grid.material)) {
          grid.material[0]?.color?.setHex(palette.gridMajor)
          grid.material[1]?.color?.setHex(palette.gridMinor)
        } else {
          grid.material.opacity = 1
        }
        if (Array.isArray(grid.material)) {
          grid.material.forEach((material, index) => {
            material.color.setHex(index === 0 ? palette.gridMajor : palette.gridMinor)
          })
        }

        root.style.color = palette.text
        if (fileLabel) {
          fileLabel.style.color = palette.text
          fileLabel.style.background = palette.overlayBackground
          fileLabel.style.borderColor = palette.overlayBorder
        }
      }

      applyTheme(activeTheme)

      const loader = new GLTFLoader()
      loader.load(
        '${modelUrl}',
        (gltf) => {
          const model = gltf.scene || gltf.scenes?.[0]
          if (!model) {
            throw new Error('GLB did not contain a renderable scene.')
          }

          scene.add(model)

          const hasAnimation = Array.isArray(gltf.animations) && gltf.animations.length > 0
          reportAnimationAvailability(hasAnimation)

          if (hasAnimation) {
            mixer = new THREE.AnimationMixer(model)
            gltf.animations.forEach((clip) => {
              const action = mixer.clipAction(clip)
              action.enabled = true
              action.clampWhenFinished = false
              action.setLoop(THREE.LoopRepeat, Infinity)
              action.reset()
              action.play()
            })
          }

          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3()).length()
          const fit = Math.max(1, size)

          controls.target.copy(center)
          camera.position.set(center.x + fit * 0.7, center.y + fit * 0.5, center.z + fit * 0.9)
          camera.near = fit / 100
          camera.far = fit * 100
          camera.updateProjectionMatrix()
          controls.update()
        },
        undefined,
        (error) => {
          reportAnimationAvailability(false)
          console.error('Failed to load GLB preview:', error)
          alert('Failed to load model preview.')
        },
      )

      window.addEventListener('message', (event) => {
        if (parentOrigin !== '*' && event.origin !== parentOrigin) return
        if (!event.data) return

        if (event.data.type === 'house-of-tobias-playground-animation') {
          animationsPaused = Boolean(event.data.paused)
          clock.getDelta()
          return
        }

        if (event.data.type === 'house-of-tobias-playground-theme') {
          applyTheme(event.data.theme)
        }
      })

      renderer.setAnimationLoop(() => {
        const delta = Math.min(clock.getDelta(), 0.1)
        if (mixer && !animationsPaused) mixer.update(delta)
        controls.update()
        renderer.render(scene, camera)
      })

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      })
    </script>
  </body>
</html>`)
  } catch (error) {
    console.error('Failed to load GLB preview page:', error)
    response.status(500).send('Failed to load preview.')
  }
})

app.delete('/api/glb/:id', async (request, response) => {
  if (!ensureDbReady(response)) return

  try {
    const result = await pool.query(
      `
      DELETE FROM glb_models
      WHERE id = $1
      RETURNING id
      `,
      [request.params.id],
    )

    if (!result.rowCount) {
      response.status(404).json({ error: 'Model not found.' })
      return
    }

    response.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete GLB model:', error)
    response.status(500).json({ error: 'Failed to delete GLB model.' })
  }
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      next()
      return
    }

    response.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.get('/', (_request, response) => {
    response.status(503).send('Build artifacts not found. Run "npm run build".')
  })
}

const server = http.createServer(app)
ringEater.attachWebSocketServer(server)

initializeDatabase()
  .catch((error) => {
    dbInitError = error instanceof Error ? error.message : 'Database initialization failed.'
    console.error('Database initialization failed:', error)
  })
  .finally(() => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on port ${port}.`)
      if (!dbReady) {
        console.warn(`Database not ready: ${dbInitError}`)
        return
      }

      if (THUMBNAIL_BOOT_ENABLED) {
        void generateMissingContentThumbnails()
      }
    })
  })
