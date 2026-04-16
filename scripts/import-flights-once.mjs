const API_BASE_URL = getArgValue('--base-url') ?? process.env.HOT_API_BASE_URL ?? 'http://localhost:8080/api'

const SOURCE_FLIGHTS = [
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

function getArgValue(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : null
}

function normalizeText(value, uppercase = false) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  return uppercase ? normalized.toUpperCase() : normalized
}

function toApiTimestamp(date, time, referenceDate = null) {
  if (!date || !time) return null

  const base = referenceDate ? new Date(referenceDate) : new Date(`${date}T${time}`)
  if (referenceDate) {
    const [hours, minutes] = time.split(':').map(Number)
    base.setHours(hours, minutes, 0, 0)
  }

  if (Number.isNaN(base.getTime())) {
    throw new Error(`Invalid timestamp input: ${date} ${time}`)
  }

  return base.toISOString()
}

function normalizeFlightRecord(record) {
  const flightDate = normalizeText(record.flightDate)
  const departureIso = toApiTimestamp(flightDate, record.departureTime)
  let arrivalIso = toApiTimestamp(flightDate, record.arrivalTime, departureIso ? new Date(departureIso) : null)

  if (departureIso && arrivalIso && new Date(arrivalIso).getTime() < new Date(departureIso).getTime()) {
    const rolloverArrival = new Date(arrivalIso)
    rolloverArrival.setDate(rolloverArrival.getDate() + 1)
    arrivalIso = rolloverArrival.toISOString()
  }

  return {
    flightDate,
    flightNumber: normalizeText(record.flightNumber, true),
    fromAirport: normalizeText(record.fromAirport, true),
    toAirport: normalizeText(record.toAirport, true),
    distance: Number.isFinite(Number(record.distance)) ? Number(record.distance) : null,
    departureTime: departureIso,
    arrivalTime: arrivalIso,
    airline: normalizeText(record.airline, true),
    aircraft: normalizeText(record.aircraft, true),
    notes: normalizeText(record.notes),
  }
}

function buildFlightKey(record) {
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

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`)
  }
  return payload
}

async function main() {
  const uniqueFlights = []
  const sourceKeys = new Set()

  for (const flight of SOURCE_FLIGHTS) {
    const key = buildFlightKey(flight)
    if (sourceKeys.has(key)) continue
    sourceKeys.add(key)
    uniqueFlights.push(normalizeFlightRecord(flight))
  }

  const existingResponse = await fetch(`${API_BASE_URL}/flights`)
  const existingPayload = await readJson(existingResponse)
  const existingKeys = new Set((existingPayload.flights ?? []).map((flight) => buildFlightKey(flight)))

  let created = 0
  let skipped = 0

  for (const flight of uniqueFlights) {
    const key = buildFlightKey(flight)
    if (existingKeys.has(key)) {
      skipped += 1
      continue
    }

    const createResponse = await fetch(`${API_BASE_URL}/flights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flight),
    })

    await readJson(createResponse)
    existingKeys.add(key)
    created += 1
  }

  console.log(`Imported ${created} flights, skipped ${skipped} existing flights, source rows ${SOURCE_FLIGHTS.length}, unique rows ${uniqueFlights.length}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
