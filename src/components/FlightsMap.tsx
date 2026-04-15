import mapboxgl, { LngLatBounds } from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import type { FlightRecord } from '../app/types'

type FlightsMapProps = {
  flights: FlightRecord[]
  theme: 'light' | 'dark'
  token: string
}

export function FlightsMap({ flights, theme, token }: FlightsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current || !token) return

    mapboxgl.accessToken = token

    const routeFeatures = flights
      .filter(
        (
          flight,
        ): flight is FlightRecord & {
          fromAirportLatitude: number
          fromAirportLongitude: number
          toAirportLatitude: number
          toAirportLongitude: number
        } =>
          flight.fromAirportLongitude !== null
          && flight.fromAirportLatitude !== null
          && flight.toAirportLongitude !== null
          && flight.toAirportLatitude !== null,
      )
      .map((flight) => ({
        type: 'Feature' as const,
        properties: {
          id: flight.id,
          label:
            [flight.flightNumber, flight.airline].filter(Boolean).join(' · ')
            || [flight.fromAirport, flight.toAirport].filter(Boolean).join(' to ')
            || 'Flight',
          fromAirport: flight.fromAirportResolvedName ?? flight.fromAirport ?? 'Unknown departure',
          toAirport: flight.toAirportResolvedName ?? flight.toAirport ?? 'Unknown arrival',
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [flight.fromAirportLongitude, flight.fromAirportLatitude],
            [flight.toAirportLongitude, flight.toAirportLatitude],
          ],
        },
      }))

    const pointFeatures = routeFeatures.flatMap((feature) => {
      const [fromCoordinates, toCoordinates] = feature.geometry.coordinates

      return [
        {
          type: 'Feature' as const,
          properties: {
            label: feature.properties.fromAirport,
            kind: 'departure',
            flight: feature.properties.label,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: fromCoordinates,
          },
        },
        {
          type: 'Feature' as const,
          properties: {
            label: feature.properties.toAirport,
            kind: 'arrival',
            flight: feature.properties.label,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: toCoordinates,
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

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')

    map.on('load', () => {
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
          'line-width': 3,
          'line-opacity': 0.7,
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

      if (pointFeatures.length) {
        const bounds = new LngLatBounds()
        pointFeatures.forEach((feature) => {
          bounds.extend(feature.geometry.coordinates as [number, number])
        })
        map.fitBounds(bounds, { padding: 48, maxZoom: 5.5 })
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
        .setHTML(`<strong>${label}</strong><p>${flightLabel}</p>`)
        .addTo(map)
    })

    map.on('mouseenter', 'flight-points-circle', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'flight-points-circle', () => {
      map.getCanvas().style.cursor = ''
    })

    return () => map.remove()
  }, [flights, theme, token])

  return <div ref={containerRef} className="flights-map-canvas" />
}
