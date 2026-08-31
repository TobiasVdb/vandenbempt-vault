const TEAM_ID = 9987
const CACHE_MS = 60_000
const WINDOW_BEFORE_MS = 3 * 60 * 60_000
const WINDOW_AFTER_MS = 2 * 60 * 60_000
let cache = { expiresAt: 0, value: null, inflight: null }

export function createGenkStandbyService({ app, fetchImpl = fetch }) {
  app.get('/api/standby/genk', async (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    try {
      response.json(await readGenkMatch(fetchImpl))
    } catch (error) {
      console.error('Failed to load KRC Genk match:', error)
      if (cache.value) {
        response.json({ ...cache.value, stale: true })
        return
      }
      response.status(502).json({ active: false, match: null, stale: true, error: 'Score feed unavailable.' })
    }
  })
}

export async function readGenkMatch(fetchImpl = fetch, now = Date.now()) {
  if (cache.value && cache.expiresAt > now) return cache.value
  if (cache.inflight) return cache.inflight
  cache.inflight = fetchFotMob(fetchImpl, now)
    .then((value) => {
      cache = { value, expiresAt: Date.now() + CACHE_MS, inflight: null }
      return value
    })
    .catch((error) => {
      cache.inflight = null
      throw error
    })
  return cache.inflight
}

async function fetchFotMob(fetchImpl, now) {
  const response = await fetchImpl(`https://www.fotmob.com/api/data/teams?id=${TEAM_ID}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; HouseOfTobias/1.0)' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`FotMob ${response.status}`)
  const payload = await response.json()
  return normalizeGenkPayload(payload, now)
}

export function normalizeGenkPayload(payload, now = Date.now()) {
  const fixtures = payload?.fixtures?.allFixtures?.fixtures ?? payload?.fixtures ?? []
  const candidates = Array.isArray(fixtures) ? fixtures.map(normalizeFixture).filter(Boolean) : []
  const selected = candidates
    .filter((match) => now >= match.startAtMs - WINDOW_BEFORE_MS && now <= match.endAtMs + WINDOW_AFTER_MS)
    .sort((a, b) => Math.abs(a.startAtMs - now) - Math.abs(b.startAtMs - now))[0] ?? null
  return { active: Boolean(selected), match: selected, stale: false, asOf: new Date(now).toISOString() }
}

function normalizeFixture(item) {
  const home = item?.home ?? item?.homeTeam
  const away = item?.away ?? item?.awayTeam
  const startAtMs = Date.parse(item?.status?.utcTime ?? item?.startTime ?? item?.time?.utcTime ?? '')
  if (!home || !away || !Number.isFinite(startAtMs)) return null
  const status = String(item?.status?.short ?? item?.status?.reason?.short ?? (item?.status?.started ? 'live' : 'scheduled')).toLowerCase()
  const live = !item?.status?.finished && (item?.status?.started || ['live', 'in progress', '1st half', '2nd half', 'halftime'].some((value) => status.includes(value)))
  const finished = item?.status?.finished === true || status.includes('finished') || status === 'ft'
  const minute = Number(item?.status?.liveTime?.short?.replace?.(/\D/g, '') ?? item?.minute)
  return {
    id: String(item.id ?? `${startAtMs}-${home.id}-${away.id}`),
    competition: item?.tournament?.name ?? item?.league?.name ?? 'Match',
    startAt: new Date(startAtMs).toISOString(),
    startAtMs,
    endAtMs: startAtMs + (finished ? 2 : 4) * 60 * 60_000,
    status: finished ? 'finished' : live ? 'live' : status,
    minute: Number.isFinite(minute) ? minute : null,
    venue: item?.venue?.name ?? null,
    home: normalizeTeam(home, item?.home?.score ?? item?.homeScore),
    away: normalizeTeam(away, item?.away?.score ?? item?.awayScore),
  }
}

function normalizeTeam(team, score) {
  const id = Number(team?.id)
  return {
    id,
    name: team?.name ?? 'Unknown',
    score: Number.isFinite(Number(score)) ? Number(score) : null,
    crestUrl: Number.isFinite(id) ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null,
  }
}
