'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
// Removed mapbox-request-transformer imports
import { IonIcon } from '@ionic/react'
import { mapOutline } from 'ionicons/icons'
import { publicLands } from '@/lib/mock-data'
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
  const map = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const routeLayerRef = useRef<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY

  const featuresUrl = 'https://f005.backblazeb2.com/file/rocky-static-assets/tiles/features.pmtiles'
  const coverageUrl = 'https://f005.backblazeb2.com/file/rocky-static-assets/coverage/scanned.pmtiles'

  // Register PMTiles protocol (only once)
  useEffect(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)
    return () => {
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  // Construct Filter expression from MapFilter state
  const getMapFilterExpression = useCallback(() => {
    const filters: any[] = ['all']

    // Filter by Type
    if (filter.types.length > 0) {
      filters.push(['in', ['get', 'feature_type'], ['literal', filter.types]])
    } else {
      filters.push(false) // Show nothing if no types selected
    }

    // Min Height
    if (filter.minHeight !== null) {
      filters.push(['>=', ['get', 'height_m'], filter.minHeight])
    }

    // Max Height
    if (filter.maxHeight !== null) {
      filters.push(['<=', ['get', 'height_m'], filter.maxHeight])
    }

    return filters
  }, [filter])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Update filters for both layers
    try {
      const filterExpr = getMapFilterExpression()
      if (map.current.getLayer('boulders')) {
        map.current.setFilter('boulders', ['all', ['==', ['get', 'feature_type'], 'boulder'], ...filterExpr.slice(1)])
      }
      if (map.current.getLayer('cliffs')) {
        map.current.setFilter('cliffs', ['all', ['==', ['get', 'feature_type'], 'cliff'], ...filterExpr.slice(1)])
      }
    } catch (e) {
      console.error("Error setting filter:", e)
    }

  }, [filter, mapLoaded, getMapFilterExpression])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!apiKey) {
      setMapError('Missing MapTiler API Key. Please add NEXT_PUBLIC_MAPTILER_KEY to your environment variables.')
      return
    }

    try {
      // MapTiler Style URLs
      const satelliteStyle = `https://api.maptiler.com/maps/hybrid/style.json?key=${apiKey}`;
      const outdoorStyle = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${apiKey}`;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: showSatellite ? satelliteStyle : outdoorStyle,
        center: [-91.68565, 47.78407],
        zoom: 13,
        pitch: showSatellite ? 60 : 0,
        attributionControl: false,
        logoPosition: 'bottom-left',
        fadeDuration: 0,
        maxTileCacheSize: 50,
        validateStyle: false,
      })

      // Add these event listeners for debugging
      map.current.on('error', (e) => {
        console.error('Map error:', e.error?.message || e);
      });

      map.current.on('tileerror', (e) => {
        console.error('Tile error:', e);
      });

      map.current.on('load', () => {
        console.log('Map style fully loaded');
      });

      // Handle invalid key errors
      map.current.on('error', (e) => {
        if (e.error?.status === 403 || e.error?.message?.includes('Forbidden')) {
          setMapError('Invalid MapTiler API Key. Please check your NEXT_PUBLIC_MAPTILER_KEY.')
        }
      })

      map.current.addControl(
        new maplibregl.ScaleControl({ maxWidth: 80, unit: 'imperial' }),
        'bottom-left'
      )
      map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      map.current.on('load', () => {
        setMapLoaded(true)
        initializeLayers()
      })
    } catch (err) {
      setMapError('Failed to initialize map. Please check your API Key.')
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [apiKey])

  const initializeLayers = () => {
    if (!map.current) return

    // Add Coverage Source
    if (!map.current.getSource('coverage')) {
      map.current.addSource('coverage', {
        type: 'vector',
        url: 'pmtiles://' + coverageUrl
      })
    }

    // Add Features Source
    if (!map.current.getSource('features')) {
      map.current.addSource('features', {
        type: 'vector',
        url: 'pmtiles://' + featuresUrl
      })
    }

    // Scanned Areas Layer
    if (!map.current.getLayer('scanned-areas-fill')) {
      map.current.addLayer({
        id: 'scanned-areas-fill',
        type: 'fill',
        source: 'coverage',
        'source-layer': 'coverage',
        paint: { 'fill-color': '#00cc00', 'fill-opacity': 0.15 }
      })
    }

    if (!map.current.getLayer('scanned-areas-outline')) {
      map.current.addLayer({
        id: 'scanned-areas-outline',
        type: 'line',
        source: 'coverage',
        'source-layer': 'coverage',
        paint: { 'line-color': '#009900', 'line-width': 1, 'line-opacity': 0.4 }
      })
    }

    // Boulders Layer
    if (!map.current.getLayer('boulders')) {
      map.current.addLayer({
        id: 'boulders',
        type: 'circle',
        source: 'features',
        'source-layer': 'features',
        filter: ['==', ['get', 'feature_type'], 'boulder'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 10, 18, 14],
          'circle-color': '#ff6600',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      })
    }

    // Cliffs Layer
    if (!map.current.getLayer('cliffs')) {
      map.current.addLayer({
        id: 'cliffs',
        type: 'circle',
        source: 'features',
        'source-layer': 'features',
        filter: ['==', ['get', 'feature_type'], 'cliff'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 10, 18, 14],
          'circle-color': '#0066ff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      })
    }

    // Handle Interactions
    const interactionLayers = ['boulders', 'cliffs']

    interactionLayers.forEach(layer => {
      // Remove existing listeners to avoid duplicates if re-initializing
      map.current?.off('click', layer)
      map.current?.off('mouseenter', layer)
      map.current?.off('mouseleave', layer)

      map.current?.on('click', layer, (e) => {
        if (e.features && e.features.length > 0) {
          const f = e.features[0]
          const props = f.properties || {}

          const appFeature: Feature = {
            id: props.id || f.id?.toString() || 'unknown',
            type: props.feature_type === 'cliff' ? 'cliff' : 'boulder',
            name: props.name || undefined,
            latitude: props.lat ?? (f.geometry as any).coordinates[1],
            longitude: props.lon ?? (f.geometry as any).coordinates[0],
            elevation: props.elevation_m || 0,
            height: props.height_m || 0,
            length: props.length_m || 0,
            width: props.width_m || 0,
            distanceToRoad: 0,
            bushwhackDistance: 0,
            hardness: 0,
            isFavorite: false,
            isSeen: false,
            seenByAnyone: true,
            notARock: null,
            modelUrl: props.mesh_url || undefined,
            climbs: [],
            photos: [],
            comments: [],
            links: [],
            isPublished: true,
            hasLocalEdits: false
          }

          onFeatureSelect(appFeature)
        }
      })

      map.current?.on('mouseenter', layer, () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })

      map.current?.on('mouseleave', layer, () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })
    })

    addPublicLandsLayer()
  }

  useEffect(() => {
    if (!map.current || !mapLoaded || !apiKey) return

    const satelliteStyle = `https://api.maptiler.com/maps/hybrid/style.json?key=${apiKey}`;
    const outdoorStyle = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${apiKey}`;

    map.current.setStyle(showSatellite ? satelliteStyle : outdoorStyle)

    map.current.once('style.load', () => {
      // Re-add sources and layers when style changes
      initializeLayers()

      if (showSatellite) {
        map.current?.easeTo({ pitch: 60 })
      } else {
        map.current?.easeTo({ pitch: 0 })
      }
    })
  }, [showSatellite, mapLoaded, apiKey])

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

      userMarkerRef.current = new maplibregl.Marker({ element: el })
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

    const bounds = new maplibregl.LngLatBounds()
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
            <p className="text-sm text-muted-foreground mb-2">To get a free MapTiler Key:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to maptiler.com and create an account</li>
              <li>Navigate to your account keys page</li>
              <li>Copy your API key</li>
              <li>Add it as NEXT_PUBLIC_MAPTILER_KEY</li>
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