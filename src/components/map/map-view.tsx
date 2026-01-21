'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { IonIcon } from '@ionic/react'
import { mapOutline } from 'ionicons/icons'
import { publicLands } from '@/lib/mock-data'
import type { Feature, MapFilter } from '@/lib/types'
import { createCustomLayer3D } from './layer-3d'

interface MapViewProps {
  onFeatureSelect: (feature: Feature) => void
  filter: MapFilter
  showSatellite: boolean
  goToFeature: Feature | null
  userLocation: { lat: number; lng: number; heading: number } | null
  centerOnUserTrigger: number
}

export function MapView({ onFeatureSelect, filter, showSatellite, goToFeature, userLocation, centerOnUserTrigger }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const customLayerRef = useRef<any>(null)
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
      console.log('DEBUG: Applying filter:', JSON.stringify(filterExpr))
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


      map.current.on('load', () => {
        setMapLoaded(true)

        initializeLayers()

        // Setup 3D layer update listeners
        map.current?.on('moveend', () => customLayerRef.current?.updateMeshes())
        map.current?.on('zoomend', () => customLayerRef.current?.updateMeshes())
        map.current?.on('sourcedata', (e) => {
          if (e.sourceId === 'features') {
            if (e.isSourceLoaded) {
              console.log('DEBUG: Features source loaded successfully')
              customLayerRef.current?.updateMeshes()
              map.current?.triggerRepaint()
            }
            // Check for specific error states if available in your MapLibre version, 
            // but generally 'error' event handles it. 
            // We can monitor tile loading state though:
            // console.log('DEBUG: Source state:', map.current?.getSource('features'))
          }
        })
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

    // Add Terrain Source for 3D (Must be re-added if style changes)
    if (!map.current.getSource('terrain')) {
      map.current.addSource('terrain', {
        type: 'raster-dem',
        url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${apiKey}`,
        tileSize: 256,
        maxzoom: 12
      });
      map.current.setTerrain({ source: 'terrain', exaggeration: 1.5 });
    }

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

    // 3D Layer
    if (!map.current.getLayer('3d-boulders')) {
      customLayerRef.current = createCustomLayer3D(map.current)
      // Add before boulders/cliffs if possible, or just add it.
      // MapLibre order: sources, then layers.
      // We want it to be part of the map.
      map.current.addLayer(customLayerRef.current)
      customLayerRef.current.updateMeshes()
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
          console.log('DEBUG: Clicked feature:', f)
          console.log('DEBUG: Raw properties:', f.properties)
          const props = f.properties || {}

          const appFeature: Feature = {
            id: props.id || f.id?.toString() || 'unknown',
            type: props.feature_type === 'cliff' ? 'cliff' : 'boulder',
            name: props.name || undefined,
            latitude: props.lat ?? (f.geometry as any).coordinates[1],
            longitude: props.lon ?? (f.geometry as any).coordinates[0],
            elevation: props.elevation_m || 0,
            height: props.height || 0,
            length: props.length || 0,
            width: props.width || 0,
            distanceToRoad: props.distance_to_road || 0,
            bushwhackDistance: props.distance_to_trail || 0,
            hardness: 0,
            isFavorite: false,
            isSeen: false,
            seenByAnyone: true,
            notARock: null,
            modelUrl: props.mesh_url || undefined,
            viewerUrl: props.viewer_url || undefined,
            climbs: [],
            photos: [],
            comments: [],
            links: props.viewer_url ? [{ type: 'other', url: props.viewer_url, label: 'View in 3D' }] : [],
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

    // addPublicLandsLayer() - Removed based on user feedback (green rectangle)
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

    // Function to update or create marker
    const updateMarker = () => {
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
        // Simplified Chevron SVG for cleaner look
        el.innerHTML = `
              <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
                 <!-- Blue Dot -->
                 <div style="
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    background: #3b82f6;
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 4px rgba(0,0,0,0.3);
                    z-index: 10;
                 "></div>

                 <!-- Heading Chevron -->
                 <div class="user-heading" style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    transform: rotate(${userLocation.heading}deg);
                    transition: transform 0.2s linear;
                 ">
                   <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                       <!-- This path describes a chevron shape pointing UP (negative Y) -->
                       <path d="M 22 4 L 36 34 L 22 26 L 8 34 Z" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                   </svg>
                 </div>
              </div>
            `

        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map.current)

        // Initial FlyTo
        map.current.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: 15,
          speed: 1.2
        })
      }
    }

    updateMarker()

  }, [userLocation])

  // New effect for manual center trigger
  useEffect(() => {
    if (centerOnUserTrigger > 0 && map.current && userLocation) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16, // Zoom in a bit more when manually locating
        speed: 1.5,
        padding: { top: 50, bottom: 50, left: 20, right: 20 }
      })
    }
  }, [centerOnUserTrigger, userLocation])

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

    // Only fit bounds if we just started navigating to a NEW feature
    // We can track the current target ID to avoid re-fitting on every user move
    // For now, simpler check: if we are close (zoom logic) or just let the user control zoom after initial fit.
    // Ideally, we only run fitBounds when goToFeature changes identity.
    // The dependency array includes userLocation, so this runs constantly during nav. BAD.
    // Refactor to separate fitBounds from route update.
  }, [goToFeature, userLocation, mapLoaded])

  // New effect for initial fitBounds
  useEffect(() => {
    if (!map.current || !goToFeature || !userLocation) return

    // Initial fit
    const bounds = new maplibregl.LngLatBounds()
    bounds.extend([userLocation.lng, userLocation.lat])
    bounds.extend([goToFeature.longitude, goToFeature.latitude])
    // Zoom out slowly/smoothly?
    map.current.fitBounds(bounds, { padding: 100, duration: 2000 })

  }, [goToFeature?.id]) // Only run when feature ID changes


  // =================================================================
  // CLUSTER LOGIC
  // =================================================================
  const clusterMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({})

  // SIZE CONFIGURATION
  const CLUSTER_MIN_SIZE = 50      // Minimum donut size in pixels
  const CLUSTER_MAX_SIZE = 90      // Maximum donut size in pixels
  const CLUSTER_SIZE_SCALE = 3     // Pixels to add per feature
  const CLUSTER_STROKE_WIDTH = 10  // Donut ring thickness

  const createDonutChart = (boulders: number, cliffs: number, size: number) => {
    const total = boulders + cliffs
    if (total === 0) return null

    const radius = size / 2 - 4
    const cx = size / 2
    const cy = size / 2

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', size.toString())
    svg.setAttribute('height', size.toString())
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)

    // White background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    bgCircle.setAttribute('cx', cx.toString())
    bgCircle.setAttribute('cy', cy.toString())
    bgCircle.setAttribute('r', (radius + 4).toString())
    bgCircle.setAttribute('fill', 'white')
    svg.appendChild(bgCircle)

    const arcRadius = radius
    const boulderAngle = (boulders / total) * 360
    const cliffAngle = (cliffs / total) * 360

    function polarToCartesian(angleDeg: number) {
      const angleRad = (angleDeg - 90) * Math.PI / 180
      return {
        x: cx + arcRadius * Math.cos(angleRad),
        y: cy + arcRadius * Math.sin(angleRad)
      }
    }

    function createArc(startAngle: number, endAngle: number, color: string) {
      const start = polarToCartesian(startAngle)
      const end = polarToCartesian(endAngle)
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const d = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`
      path.setAttribute('d', d)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', color)
      path.setAttribute('stroke-width', CLUSTER_STROKE_WIDTH.toString())
      path.setAttribute('stroke-linecap', 'butt')
      return path
    }

    let currentAngle = 0

    if (boulders > 0 && boulders < total) {
      svg.appendChild(createArc(currentAngle, currentAngle + boulderAngle, '#ff6600'))
      currentAngle += boulderAngle
    } else if (boulders === total) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', cx.toString())
      circle.setAttribute('cy', cy.toString())
      circle.setAttribute('r', arcRadius.toString())
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', '#ff6600')
      circle.setAttribute('stroke-width', CLUSTER_STROKE_WIDTH.toString())
      svg.appendChild(circle)
    }

    if (cliffs > 0 && cliffs < total) {
      svg.appendChild(createArc(currentAngle, currentAngle + cliffAngle, '#0066ff'))
    } else if (cliffs === total) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', cx.toString())
      circle.setAttribute('cy', cy.toString())
      circle.setAttribute('r', arcRadius.toString())
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', '#0066ff')
      circle.setAttribute('stroke-width', CLUSTER_STROKE_WIDTH.toString())
      svg.appendChild(circle)
    }

    return svg
  }

  const createClusterMarker = (boulders: number, cliffs: number) => {
    const total = boulders + cliffs
    const size = Math.min(CLUSTER_MAX_SIZE, Math.max(CLUSTER_MIN_SIZE, CLUSTER_MIN_SIZE + total * CLUSTER_SIZE_SCALE))

    const el = document.createElement('div')
    el.className = 'cluster-marker'
    el.style.width = `${size}px`
    el.style.height = `${size}px`

    const svg = createDonutChart(boulders, cliffs, size)
    if (svg) {
      el.appendChild(svg)
    }

    const count = document.createElement('div')
    count.className = 'cluster-count'
    count.textContent = total.toString()
    el.appendChild(count)

    return el
  }

  const showClusterPopup = (coords: [number, number], boulders: number, cliffs: number, total: number) => {
    if (!map.current) return

    const boulderPct = total > 0 ? Math.round((boulders / total) * 100) : 0
    const cliffPct = total > 0 ? Math.round((cliffs / total) * 100) : 0

    // Calculate SVG paths for popup donut
    const cx = 40, cy = 40, r = 25
    const boulderAngle = (boulders / total) * 360

    function polarToCartesian(angleDeg: number) {
      const angleRad = (angleDeg - 90) * Math.PI / 180
      return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
    }

    let boulderArc = '', cliffArc = ''

    if (boulders === total) {
      boulderArc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff6600" stroke-width="10"/>`
    } else if (cliffs === total) {
      cliffArc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0066ff" stroke-width="10"/>`
    } else {
      if (boulders > 0) {
        const start = polarToCartesian(0)
        const end = polarToCartesian(boulderAngle)
        const largeArc = boulderAngle > 180 ? 1 : 0
        boulderArc = `<path d="M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}" fill="none" stroke="#ff6600" stroke-width="10"/>`
      }
      if (cliffs > 0) {
        const start = polarToCartesian(boulderAngle)
        const end = polarToCartesian(360)
        const largeArc = (360 - boulderAngle) > 180 ? 1 : 0
        cliffArc = `<path d="M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}" fill="none" stroke="#0066ff" stroke-width="10"/>`
      }
    }

    const popupContent = `
      <div class="cluster-popup">
        <div class="popup-title">Feature Cluster</div>
        <svg class="cluster-chart" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="white" stroke="#eee" stroke-width="1"/>
          ${boulderArc}
          ${cliffArc}
          <text x="40" y="44" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${total}</text>
        </svg>
        <div class="cluster-stats">
          <div class="cluster-stat boulder">
            <div class="cluster-stat-value">${boulders}</div>
            <div class="cluster-stat-label">Boulders (${boulderPct}%)</div>
          </div>
          <div class="cluster-stat cliff">
            <div class="cluster-stat-value">${cliffs}</div>
            <div class="cluster-stat-label">Cliffs (${cliffPct}%)</div>
        </div>
      </div>
    `

    const mapInstance = map.current
    new maplibregl.Popup()
      .setLngLat(coords)
      .setHTML(popupContent)
      .addTo(mapInstance)
  }

  const updateClusterMarkers = useCallback(() => {
    if (!map.current) return

    // Remove existing markers
    Object.values(clusterMarkersRef.current).forEach(marker => marker.remove())
    clusterMarkersRef.current = {}

    // Query cluster features
    // We query the 'features' source directly.
    // Note: The source must be loaded for this to work.
    const features = map.current.querySourceFeatures('features', {
      sourceLayer: 'features',
      filter: ['has', 'point_count']
    })

    features.forEach((cluster) => {
      const coords = (cluster.geometry as any).coordinates as [number, number]
      const props = cluster.properties
      const boulders = props?.is_boulder || 0
      const cliffs = props?.is_cliff || 0
      const total = props?.point_count || (boulders + cliffs)

      const key = `${coords[0].toFixed(4)}_${coords[1].toFixed(4)}`

      if (clusterMarkersRef.current[key]) return

      const el = createClusterMarker(boulders, cliffs)

      el.addEventListener('click', (e) => {
        e.stopPropagation() // Prevent map click
        showClusterPopup(coords, boulders, cliffs, total)
      })

      if (map.current) {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map.current)

        clusterMarkersRef.current[key] = marker
      }
    })
  }, [])

  // Add listeners for cluster updates
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    map.current.on('moveend', updateClusterMarkers)
    map.current.on('zoomend', updateClusterMarkers)
    map.current.on('sourcedata', (e) => {
      if (e.sourceId === 'features' && e.isSourceLoaded) {
        updateClusterMarkers()
      }
    })

    // Initial update
    updateClusterMarkers()

    return () => {
      // Cleanup
      if (map.current) {
        map.current.off('moveend', updateClusterMarkers)
        map.current.off('zoomend', updateClusterMarkers)
      }
    }
  }, [mapLoaded, updateClusterMarkers])


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