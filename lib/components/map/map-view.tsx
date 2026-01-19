'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { IonIcon } from '@ionic/react'
import { alertCircleOutline, mapOutline } from 'ionicons/icons'
import { mockFeatures, publicLands, scannedAreas } from '@/lib/mock-data'
import type { Feature, MapFilter } from '@/lib/types'

interface MapViewProps {
  onFeatureSelect: (feature: Feature) => void
  filter: MapFilter
  showSatellite: boolean
  goToFeature: Feature | null
  userLocation: { lat: number; lng: number; heading: number } | null
}

export function MapView({ onFeatureSelect, filter, showSatellite, goToFeature, userLocation }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const routeLayerRef = useRef<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const filterFeatures = useCallback((features: Feature[]) => {
    return features.filter((f) => {
      if (!filter.types.includes(f.type)) return false
      if (filter.seenByAnyone !== null && f.seenByAnyone !== filter.seenByAnyone) return false
      if (filter.seenByUser !== null && f.isSeen !== filter.seenByUser) return false
      if (filter.minHeight !== null && f.height < filter.minHeight) return false
      if (filter.maxHeight !== null && f.height > filter.maxHeight) return false
      if (filter.maxDistanceToRoad !== null && f.distanceToRoad > filter.maxDistanceToRoad) return false
      if (filter.maxBushwhack !== null && f.bushwhackDistance > filter.maxBushwhack) return false
      if (filter.favorites && !f.isFavorite) return false
      if (filter.hasClimbs && f.climbs.filter((c) => c.status === 'send').length === 0) return false
      if (filter.hasProjects && f.climbs.filter((c) => c.status === 'project').length === 0) return false
      if (filter.hasPossibleLines && f.climbs.filter((c) => c.status === 'possible').length === 0) return false
      if (!filter.notARock && f.notARock !== null) return false
      return true
    })
  }, [filter])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!token || token === 'pk.demo' || !token.startsWith('pk.')) {
      setMapError('Missing or invalid Mapbox token. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables.')
      return
    }

    mapboxgl.accessToken = token

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: showSatellite ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/outdoors-v12',
        center: [-91.68565, 47.78407],
        zoom: 14,
        pitch: showSatellite ? 45 : 0,
        // Mobile optimizations
        attributionControl: false,
        logoPosition: 'bottom-left',
        touchZoomRotate: true,
        touchPitch: true,
        dragRotate: true,
        // Performance optimizations for mobile
        fadeDuration: 0,
        maxTileCacheSize: 50,
      })

      map.current.on('error', (e) => {
        if (e.error?.message?.includes('access token')) {
          setMapError('Invalid Mapbox access token. Please check your NEXT_PUBLIC_MAPBOX_TOKEN.')
        }
      })

      // Mobile-friendly scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 80, unit: 'imperial' }),
        'bottom-left'
      )

      // Add attribution control in a less obtrusive position
      map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

      map.current.on('load', () => {
        setMapLoaded(true)
        addPublicLandsLayer()
        addScannedAreasLayer()
      })
    } catch (err) {
      setMapError('Failed to initialize map. Please check your Mapbox token.')
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [token])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    map.current.setStyle(
      showSatellite ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/outdoors-v12'
    )

    map.current.once('style.load', () => {
      addPublicLandsLayer()
      addScannedAreasLayer()
      if (showSatellite) {
        map.current?.easeTo({ pitch: 45 })
      } else {
        map.current?.easeTo({ pitch: 0 })
      }
    })
  }, [showSatellite, mapLoaded])

  const addPublicLandsLayer = () => {
    if (!map.current) return

    publicLands.forEach((land) => {
      const sourceId = `public-land-${land.id}`
      if (map.current?.getSource(sourceId)) return

      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: land.name, type: land.type },
          geometry: {
            type: 'Polygon',
            coordinates: [[...land.bounds, land.bounds[0]]],
          },
        },
      })

      map.current?.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.1,
        },
      })

      map.current?.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#22c55e',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      })
    })
  }

  const addScannedAreasLayer = () => {
    if (!map.current) return

    scannedAreas.forEach((area) => {
      const sourceId = `scanned-${area.id}`
      if (map.current?.getSource(sourceId)) return

      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[...area.bounds, area.bounds[0]]],
          },
        },
      })

      map.current?.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#60a5fa',
          'fill-opacity': 0.08,
        },
      })
    })
  }

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const filteredFeatures = filterFeatures(mockFeatures)

    filteredFeatures.forEach((feature) => {
      const el = document.createElement('div')
      el.className = 'feature-marker native-button'

      const isGray = feature.notARock !== null
      const color = isGray ? '#6b7280' : feature.type === 'boulder' ? '#f97316' : '#3b82f6'

      // Larger touch targets for mobile (44px minimum)
      el.innerHTML = `
        <div style="
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 28px;
            height: 28px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.1s ease;
          ">
            ${feature.isFavorite ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : ''}
          </div>
        </div>
      `

      // Add active state styling
      el.addEventListener('touchstart', () => {
        const inner = el.querySelector('div > div') as HTMLElement
        if (inner) inner.style.transform = 'scale(0.9)'
      })
      el.addEventListener('touchend', () => {
        const inner = el.querySelector('div > div') as HTMLElement
        if (inner) inner.style.transform = 'scale(1)'
      })

      const marker = new mapboxgl.Marker(el)
        .setLngLat([feature.longitude, feature.latitude])
        .addTo(map.current!)

      el.addEventListener('click', () => {
        onFeatureSelect(feature)
      })

      markersRef.current.push(marker)
    })
  }, [filter, mapLoaded, filterFeatures, onFeatureSelect])

  useEffect(() => {
    if (!map.current || !userLocation) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat])
      const el = userMarkerRef.current.getElement()
      const arrow = el.querySelector('.user-heading')
      if (arrow) {
        (arrow as HTMLElement).style.transform = `rotate(${userLocation.heading}deg)`
      }
    } else {
      const el = document.createElement('div')
      el.innerHTML = `
        <div style="position: relative;">
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.4);
          "></div>
          <div class="user-heading" style="
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%) rotate(${userLocation.heading}deg);
            transform-origin: center bottom;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 12px solid #3b82f6;
          "></div>
        </div>
      `

      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current)
    }
  }, [userLocation])

  useEffect(() => {
    if (!map.current || !mapLoaded || !goToFeature || !userLocation) return

    if (routeLayerRef.current) {
      if (map.current.getLayer(routeLayerRef.current)) {
        map.current.removeLayer(routeLayerRef.current)
      }
      if (map.current.getSource(routeLayerRef.current)) {
        map.current.removeSource(routeLayerRef.current)
      }
    }

    const routeId = `route-${Date.now()}`
    routeLayerRef.current = routeId

    map.current.addSource(routeId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [userLocation.lng, userLocation.lat],
            [goToFeature.longitude, goToFeature.latitude],
          ],
        },
      },
    })

    map.current.addLayer({
      id: routeId,
      type: 'line',
      source: routeId,
      paint: {
        'line-color': '#f97316',
        'line-width': 4,
        'line-dasharray': [2, 2],
      },
    })

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([userLocation.lng, userLocation.lat])
    bounds.extend([goToFeature.longitude, goToFeature.latitude])
    map.current.fitBounds(bounds, { padding: 100 })
  }, [goToFeature, userLocation, mapLoaded])

  if (mapError) {
    return (
      <div className="w-full h-full bg-secondary flex flex-col items-center justify-center p-8">
        <div className="bg-card rounded-xl p-8 max-w-md text-center shadow-lg border border-border">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IonIcon icon={mapOutline} className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Map Configuration Required</h2>
          <p className="text-muted-foreground mb-4">{mapError}</p>
          <div className="bg-muted rounded-lg p-4 text-left">
            <p className="text-sm text-muted-foreground mb-2">To get a free Mapbox token:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to mapbox.com and create an account</li>
              <li>Navigate to your account tokens page</li>
              <li>Copy your default public token</li>
              <li>Add it as NEXT_PUBLIC_MAPBOX_TOKEN</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapContainer} className="w-full h-full" />
  )
}
