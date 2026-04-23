import mapboxgl, { LngLatBounds } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef } from 'react'
import type { FlightRecord } from '../app/types'

type FlightsMapProps = {
  flights: FlightRecord[]
  theme: 'light' | 'dark'
  token: string
  dimension: '2d' | '3d'
  animatedFlightId?: string | null
}

type MappableFlight = FlightRecord & {
  fromAirportLatitude: number
  fromAirportLongitude: number
  toAirportLatitude: number
  toAirportLongitude: number
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI
}

function normalizeLongitude(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isMappableFlight(flight: FlightRecord): flight is MappableFlight {
  return (
    flight.fromAirportLongitude !== null
    && flight.fromAirportLatitude !== null
    && flight.toAirportLongitude !== null
    && flight.toAirportLatitude !== null
  )
}

function buildFlightLabel(flight: FlightRecord) {
  return (
    [flight.flightNumber, flight.airline].filter(Boolean).join(' · ')
    || [flight.fromAirport, flight.toAirport].filter(Boolean).join(' to ')
    || 'Flight'
  )
}

function buildGreatCircleCoordinates(
  fromLongitude: number,
  fromLatitude: number,
  toLongitude: number,
  toLatitude: number,
) {
  const startLatitude = toRadians(fromLatitude)
  const startLongitude = toRadians(fromLongitude)
  const endLatitude = toRadians(toLatitude)
  const endLongitude = toRadians(toLongitude)

  const startVector = [
    Math.cos(startLatitude) * Math.cos(startLongitude),
    Math.cos(startLatitude) * Math.sin(startLongitude),
    Math.sin(startLatitude),
  ] as const
  const endVector = [
    Math.cos(endLatitude) * Math.cos(endLongitude),
    Math.cos(endLatitude) * Math.sin(endLongitude),
    Math.sin(endLatitude),
  ] as const

  const omega = Math.acos(clamp(
    startVector[0] * endVector[0] + startVector[1] * endVector[1] + startVector[2] * endVector[2],
    -1,
    1,
  ))

  if (!Number.isFinite(omega) || omega < 1e-6) {
    return [
      [fromLongitude, fromLatitude],
      [toLongitude, toLatitude],
    ] as [number, number][]
  }

  const sinOmega = Math.sin(omega)
  const segmentCount = Math.max(24, Math.ceil(omega * 18))
  const coordinates: [number, number][] = []

  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount
    const startWeight = Math.sin((1 - progress) * omega) / sinOmega
    const endWeight = Math.sin(progress * omega) / sinOmega
    const x = startWeight * startVector[0] + endWeight * endVector[0]
    const y = startWeight * startVector[1] + endWeight * endVector[1]
    const z = startWeight * startVector[2] + endWeight * endVector[2]
    const longitude = normalizeLongitude(toDegrees(Math.atan2(y, x)))
    const latitude = toDegrees(Math.atan2(z, Math.sqrt((x * x) + (y * y))))

    coordinates.push([longitude, latitude])
  }

  return coordinates
}

function buildRouteKey(flight: FlightRecord) {
  const endpoints = [
    `${flight.fromAirportLatitude},${flight.fromAirportLongitude}`,
    `${flight.toAirportLatitude},${flight.toAirportLongitude}`,
  ].sort()

  return endpoints.join('|')
}

function interpolateCoordinates(coordinates: [number, number][], progress: number): [number, number] {
  if (!coordinates.length) return [0, 0]
  if (coordinates.length === 1) return coordinates[0]

  const clampedProgress = clamp(progress, 0, 1)
  const segments = coordinates.length - 1
  const scaledProgress = clampedProgress * segments
  const index = Math.min(Math.floor(scaledProgress), segments - 1)
  const localProgress = scaledProgress - index
  const start = coordinates[index]
  const end = coordinates[index + 1]

  return [
    start[0] + ((end[0] - start[0]) * localProgress),
    start[1] + ((end[1] - start[1]) * localProgress),
  ]
}

export function FlightsMap({ flights, theme, token, dimension, animatedFlightId = null }: FlightsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current || !token) return

    mapboxgl.accessToken = token

    const mappableFlights = flights.filter(isMappableFlight)

    const routesByKey = new Map<string, {
      count: number
      feature: {
        type: 'Feature'
        properties: {
          id: string
          label: string
          fromAirport: string
          toAirport: string
          airline: string
          aircraft: string
          flightNumber: string
          flightDate: string
          routeCount: number
        }
        geometry: {
          type: 'LineString'
          coordinates: [number, number][]
        }
      }
    }>()

    mappableFlights.forEach((flight) => {
      const coordinates = buildGreatCircleCoordinates(
        flight.fromAirportLongitude,
        flight.fromAirportLatitude,
        flight.toAirportLongitude,
        flight.toAirportLatitude,
      )
      const routeKey = buildRouteKey(flight)
      const existingRoute = routesByKey.get(routeKey)

      if (existingRoute) {
        existingRoute.count += 1
        existingRoute.feature.properties.routeCount = existingRoute.count
        return
      }

      routesByKey.set(routeKey, {
        count: 1,
        feature: {
          type: 'Feature',
          properties: {
            id: flight.id,
            label: buildFlightLabel(flight),
            fromAirport: flight.fromAirportResolvedName ?? flight.fromAirport ?? 'Unknown departure',
            toAirport: flight.toAirportResolvedName ?? flight.toAirport ?? 'Unknown arrival',
            airline: flight.airline ?? '',
            aircraft: flight.aircraft ?? '',
            flightNumber: flight.flightNumber ?? '',
            flightDate: flight.flightDate ?? '',
            routeCount: 1,
          },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      })
    })

    const routeFeatures = Array.from(routesByKey.values()).map((route) => route.feature)
    const animatedFlight = animatedFlightId ? mappableFlights.find((flight) => flight.id === animatedFlightId) ?? null : null
    const animatedRouteCoordinates = animatedFlight
      ? buildGreatCircleCoordinates(
        animatedFlight.fromAirportLongitude,
        animatedFlight.fromAirportLatitude,
        animatedFlight.toAirportLongitude,
        animatedFlight.toAirportLatitude,
      )
      : null

    const pointFeatures = mappableFlights.flatMap((flight) => {
      const flightLabel = buildFlightLabel(flight)

      return [
        {
          type: 'Feature' as const,
          properties: {
            label: flight.fromAirportResolvedName ?? flight.fromAirport ?? 'Unknown departure',
            kind: 'departure',
            flight: flightLabel,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [flight.fromAirportLongitude, flight.fromAirportLatitude] as [number, number],
          },
        },
        {
          type: 'Feature' as const,
          properties: {
            label: flight.toAirportResolvedName ?? flight.toAirport ?? 'Unknown arrival',
            kind: 'arrival',
            flight: flightLabel,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [flight.toAirportLongitude, flight.toAirportLatitude] as [number, number],
          },
        },
      ]
    })

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [4.3517, 50.8503],
      zoom: 2.1,
      attributionControl: false,
    })
    let animationFrameId = 0

    map.on('load', () => {
      if (dimension === '3d') {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.15 })
        map.setProjection('globe')
      } else {
        map.setTerrain(null)
        map.setProjection('mercator')
      }

      map.addSource('flight-routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: routeFeatures,
        },
      })

      map.addSource('flight-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pointFeatures,
        },
      })

      map.addLayer({
        id: 'flight-routes-line',
        type: 'line',
        source: 'flight-routes',
        paint: {
          'line-color': theme === 'dark' ? '#ff9360' : '#f05a28',
          'line-width': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'routeCount'], 1],
            1,
            3,
            2,
            4.5,
            3,
            6,
            5,
            8.5,
          ],
          'line-opacity': 0.74,
        },
      })

      map.addLayer({
        id: 'flight-points-circle',
        type: 'circle',
        source: 'flight-points',
        paint: {
          'circle-radius': 5,
          'circle-color': [
            'match',
            ['get', 'kind'],
            'departure',
            theme === 'dark' ? '#77d4ff' : '#1976d2',
            theme === 'dark' ? '#ffd166' : '#ef6c00',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': theme === 'dark' ? '#0d1117' : '#ffffff',
        },
      })

      if (animatedRouteCoordinates?.length) {
        map.addSource('active-flight-route', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: animatedRouteCoordinates,
                },
              },
            ],
          },
        })

        map.addSource('active-flight-progress', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: animatedRouteCoordinates[0],
                },
              },
            ],
          },
        })

        map.addLayer({
          id: 'active-flight-route-line',
          type: 'line',
          source: 'active-flight-route',
          paint: {
            'line-color': theme === 'dark' ? '#9be7ff' : '#1565c0',
            'line-width': 5,
            'line-opacity': 0.95,
          },
        })

        map.addLayer({
          id: 'active-flight-progress-circle',
          type: 'circle',
          source: 'active-flight-progress',
          paint: {
            'circle-radius': 7,
            'circle-color': theme === 'dark' ? '#ffffff' : '#fef3c7',
            'circle-stroke-width': 3,
            'circle-stroke-color': theme === 'dark' ? '#1565c0' : '#f05a28',
          },
        })
      }

      if (pointFeatures.length) {
        const bounds = new LngLatBounds()
        pointFeatures.forEach((feature) => {
          bounds.extend(feature.geometry.coordinates)
        })
        map.fitBounds(bounds, { padding: 48, maxZoom: 5.5 })
      }

      map.easeTo({
        pitch: dimension === '3d' ? 58 : 0,
        bearing: dimension === '3d' ? 14 : 0,
        duration: 900,
      })

      if (animatedRouteCoordinates?.length && map.getSource('active-flight-progress')) {
        const progressSource = map.getSource('active-flight-progress') as mapboxgl.GeoJSONSource
        const animationStart = performance.now()
        const animationDuration = 1800

        const animateProgress = (timestamp: number) => {
          const progress = clamp((timestamp - animationStart) / animationDuration, 0, 1)
          progressSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: interpolateCoordinates(animatedRouteCoordinates, progress),
                },
              },
            ],
          })

          if (progress < 1) {
            animationFrameId = window.requestAnimationFrame(animateProgress)
          }
        }

        animationFrameId = window.requestAnimationFrame(animateProgress)
      }
    })

    map.on('click', 'flight-points-circle', (event) => {
      const feature = event.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      const coordinates = [...feature.geometry.coordinates] as [number, number]
      const label = String(feature.properties?.label ?? 'Airport')
      const flightLabel = String(feature.properties?.flight ?? 'Flight')

      new mapboxgl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(coordinates)
        .setHTML(`<strong>${escapeHtml(label)}</strong><p>${escapeHtml(flightLabel)}</p>`)
        .addTo(map)
    })

    map.on('click', 'flight-routes-line', (event) => {
      const feature = event.features?.[0]
      if (!feature) return

      const label = String(feature.properties?.label ?? 'Flight')
      const fromAirport = String(feature.properties?.fromAirport ?? 'Unknown departure')
      const toAirport = String(feature.properties?.toAirport ?? 'Unknown arrival')
      const details = [
        String(feature.properties?.flightDate ?? ''),
        String(feature.properties?.airline ?? ''),
        String(feature.properties?.aircraft ?? ''),
      ]
        .filter(Boolean)
        .map((value) => `<p>${escapeHtml(value)}</p>`)
        .join('')

      new mapboxgl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${escapeHtml(label)}</strong><p>${escapeHtml(fromAirport)} to ${escapeHtml(toAirport)}</p>${details}`,
        )
        .addTo(map)
    })

    map.on('mouseenter', 'flight-points-circle', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'flight-points-circle', () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('mouseenter', 'flight-routes-line', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'flight-routes-line', () => {
      map.getCanvas().style.cursor = ''
    })

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId)
      map.remove()
    }
  }, [animatedFlightId, dimension, flights, theme, token])

  return <div ref={containerRef} className="flights-map-canvas" />
}

export default FlightsMap
