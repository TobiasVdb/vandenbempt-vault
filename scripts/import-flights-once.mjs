import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

const { Pool } = pg

export const SOURCE_FLIGHTS = [
  { flightDate: '2026-08-08', flightNumber: 'SN3357', fromAirport: 'BRU', toAirport: 'ZAD', distance: 690, departureTime: '10:15', arrivalTime: '12:05', airline: 'BEL' },
  { flightDate: '2026-08-08', flightNumber: 'SN3357', fromAirport: 'BRU', toAirport: 'ZAD', distance: 690, departureTime: '10:15', arrivalTime: '12:05', airline: 'BEL' },
  { flightDate: '2024-11-18', flightNumber: 'UA994', fromAirport: 'EWR', toAirport: 'BRU', distance: 3675, departureTime: '18:55', arrivalTime: '08:05', airline: 'UAL' },
  { flightDate: '2024-08-03', flightNumber: 'SN3802', fromAirport: 'FAO', toAirport: 'BRU', distance: 1140, departureTime: '17:05', arrivalTime: '20:55', airline: 'BEL', aircraft: 'A19N' },
  { flightDate: '2024-07-26', flightNumber: 'SN3801', fromAirport: 'BRU', toAirport: 'FAO', distance: 1140, departureTime: '09:20', arrivalTime: '11:20', airline: 'BEL', aircraft: 'A320' },
  { flightDate: '2023-02-05', flightNumber: 'LH8855', fromAirport: 'EWR', toAirport: 'BRU', distance: 3675, departureTime: '18:55', arrivalTime: '08:05', airline: 'DLH' },
  { flightDate: '2023-02-03', flightNumber: 'LH8854', fromAirport: 'BRU', toAirport: 'EWR', distance: 3675, departureTime: '11:15', arrivalTime: '13:30', airline: 'DLH' },
  { flightDate: '2019-05-17', fromAirport: 'EIN', toAirport: 'NAO', distance: 360 },
  { flightDate: '2018-08-27', flightNumber: 'FR2092', fromAirport: 'LCA', toAirport: 'BRU', distance: 1827 },
  { flightDate: '2018-08-24', flightNumber: 'FR2091', fromAirport: 'BRU', toAirport: 'ATH', distance: 1307, departureTime: '06:15', arrivalTime: '09:45', airline: 'RYR', aircraft: 'B738' },
  { flightDate: '2018-05-04', flightNumber: 'FR163', fromAirport: 'BRU', toAirport: 'SXF', distance: 401, departureTime: '08:15', arrivalTime: '09:40', airline: 'RYR', aircraft: 'B738' },
  { flightDate: '2018-02-25', flightNumber: 'FR2929', fromAirport: 'OPO', toAirport: 'BRU', distance: 917, departureTime: '06:15', arrivalTime: '09:50', airline: 'RYR', aircraft: 'B38M' },
  { flightDate: '2018-02-23', flightNumber: 'FR2928', fromAirport: 'BRU', toAirport: 'OPO', distance: 917, departureTime: '10:20', arrivalTime: '11:55', airline: 'RYR', aircraft: 'B738' },
  { flightDate: '2015-09-27', fromAirport: 'KUL', toAirport: 'AMS', distance: 6367, airline: 'MAS', aircraft: 'B772' },
  { flightDate: '2015-09-27', fromAirport: 'CGK', toAirport: 'KUL', distance: 703, airline: 'MAS', aircraft: 'B731' },
  { flightDate: '2015-09-05', fromAirport: 'KUL', toAirport: 'DPS', distance: 1222, airline: 'MAS', aircraft: 'B772' },
  { flightDate: '2015-09-04', fromAirport: 'AMS', toAirport: 'KUL', distance: 6367, airline: 'MAS', aircraft: 'B772' },
  { flightDate: '2012-09-20', fromAirport: 'LHR', toAirport: 'BRU', distance: 218 },
  { flightDate: '2012-09-20', fromAirport: 'LAX', toAirport: 'LHR', distance: 5449 },
  { flightDate: '2012-09-04', fromAirport: 'LHR', toAirport: 'LAX', distance: 5449 },
  { flightDate: '2012-04-29', flightNumber: 'FR6058', fromAirport: 'SDR', toAirport: 'CRL', distance: 623, departureTime: '21:00', arrivalTime: '22:55', airline: 'RYR', aircraft: 'B738' },
  { flightDate: '2012-04-27', flightNumber: 'FR6057', fromAirport: 'CRL', toAirport: 'SDR', distance: 623, departureTime: '13:10', arrivalTime: '15:05', airline: 'RYR', aircraft: 'B738' },
  { flightDate: '2012-04-04', fromAirport: 'BRU', toAirport: 'LHR', distance: 218 },
]

export function normalizeText(value, uppercase = false) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  return uppercase ? normalized.toUpperCase() : normalized
}

function toFlightDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Invalid flight date input: ${value}`)
    }
    return value.toISOString().slice(0, 10)
  }

  const normalizedValue = String(value).trim()
  if (!normalizedValue) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) return normalizedValue

  const parsed = new Date(normalizedValue)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid flight date input: ${value}`)
  }

  return parsed.toISOString().slice(0, 10)
}

function toFlightTimestamp(date, time, referenceIso = null) {
  if (!date || !time) return null

  if (time instanceof Date) {
    if (Number.isNaN(time.getTime())) {
      throw new Error(`Invalid timestamp input: ${date} ${time}`)
    }
    return time.toISOString()
  }

  const normalizedTime = String(time).trim()
  if (!normalizedTime) return null

  const directTimestamp = new Date(normalizedTime)
  if (!Number.isNaN(directTimestamp.getTime())) {
    return directTimestamp.toISOString()
  }

  const timeMatch = normalizedTime.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!timeMatch) {
    throw new Error(`Invalid timestamp input: ${date} ${time}`)
  }

  const [, hoursText, minutesText, secondsText] = timeMatch
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  const seconds = Number(secondsText ?? '0')
  const base = referenceIso ? new Date(referenceIso) : new Date(`${date}T${hoursText}:${minutesText}:${String(seconds).padStart(2, '0')}Z`)
  if (referenceIso) {
    base.setUTCHours(hours, minutes, seconds, 0)
  }

  if (Number.isNaN(base.getTime())) {
    throw new Error(`Invalid timestamp input: ${date} ${time}`)
  }

  return base.toISOString()
}

export function normalizeFlightRecord(record) {
  const flightDate = toFlightDate(record.flightDate)
  const departureTime = toFlightTimestamp(flightDate, record.departureTime)
  let arrivalTime = toFlightTimestamp(flightDate, record.arrivalTime, departureTime)

  if (departureTime && arrivalTime && new Date(arrivalTime).getTime() < new Date(departureTime).getTime()) {
    const nextDayArrival = new Date(arrivalTime)
    nextDayArrival.setUTCDate(nextDayArrival.getUTCDate() + 1)
    arrivalTime = nextDayArrival.toISOString()
  }

  return {
    flightDate,
    flightNumber: normalizeText(record.flightNumber, true),
    fromAirport: normalizeText(record.fromAirport, true),
    toAirport: normalizeText(record.toAirport, true),
    distance: Number.isFinite(Number(record.distance)) ? Number(record.distance) : null,
    departureTime,
    arrivalTime,
    airline: normalizeText(record.airline, true),
    aircraft: normalizeText(record.aircraft, true),
    notes: normalizeText(record.notes),
  }
}

export function buildFlightKey(record) {
  const normalized = normalizeFlightRecord(record)
  return JSON.stringify([
    normalized.flightDate,
    normalized.flightNumber,
    normalized.fromAirport,
    normalized.toAirport,
    normalized.distance,
    normalized.departureTime,
    normalized.arrivalTime,
    normalized.airline,
    normalized.aircraft,
    normalized.notes,
  ])
}

function getPoolConfig() {
  const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true'

  if (process.env.DATABASE_URL) {
    const rawDatabaseUrl = String(process.env.DATABASE_URL).trim()

    if (rawDatabaseUrl.startsWith('${') && rawDatabaseUrl.endsWith('}')) {
      throw new Error(`DATABASE_URL is a literal placeholder (${rawDatabaseUrl}).`)
    }

    let url
    try {
      url = new URL(rawDatabaseUrl)
    } catch {
      throw new Error('DATABASE_URL is present but not a valid URL.')
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

  if (!process.env.PGHOST) {
    throw new Error('Database is not configured. Set DATABASE_URL or PGHOST/PGDATABASE/PGUSER/PGPASSWORD.')
  }

  return {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized },
  }
}

export async function ensureFlightsTable(pool) {
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
}

async function loadExistingFlightKeys(pool) {
  const result = await pool.query(`
    SELECT
      flight_date AS "flightDate",
      flight_number AS "flightNumber",
      from_airport AS "fromAirport",
      to_airport AS "toAirport",
      distance,
      departure_time AS "departureTime",
      arrival_time AS "arrivalTime",
      airline,
      aircraft,
      notes
    FROM flights
  `)

  return new Set(result.rows.map((row) => buildFlightKey(row)))
}

async function insertFlight(pool, flight) {
  await pool.query(
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
    `,
    [
      randomUUID(),
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
}

function isDuplicateFlightError(error) {
  return error && typeof error === 'object' && 'code' in error && error.code === '23505'
}

export async function seedFlights(pool) {
  const uniqueFlights = []
  const sourceKeys = new Set()

  for (const flight of SOURCE_FLIGHTS) {
    const key = buildFlightKey(flight)
    if (sourceKeys.has(key)) continue
    sourceKeys.add(key)
    uniqueFlights.push(normalizeFlightRecord(flight))
  }

  const existingKeys = await loadExistingFlightKeys(pool)
  let created = 0
  let skipped = 0

  for (const flight of uniqueFlights) {
    const key = buildFlightKey(flight)
    if (existingKeys.has(key)) {
      skipped += 1
      continue
    }

    try {
      await insertFlight(pool, flight)
      existingKeys.add(key)
      created += 1
    } catch (error) {
      if (isDuplicateFlightError(error)) {
        existingKeys.add(key)
        skipped += 1
        continue
      }
      throw error
    }
  }

  return {
    created,
    skipped,
    sourceRows: SOURCE_FLIGHTS.length,
    uniqueRows: uniqueFlights.length,
  }
}

async function main() {
  const pool = new Pool(getPoolConfig())

  try {
    await ensureFlightsTable(pool)
    const result = await seedFlights(pool)
    console.log(`Imported ${result.created} flights, skipped ${result.skipped} existing flights, source rows ${result.sourceRows}, unique rows ${result.uniqueRows}.`)
  } finally {
    await pool.end()
  }
}

const executedDirectly = Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url

if (executedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
