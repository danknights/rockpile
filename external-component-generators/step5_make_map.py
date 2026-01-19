#!/usr/bin/env python3
"""
Step 5: Generate Interactive Map with PMTiles

Generates an interactive HTML map using MapLibre GL JS with PMTiles for
efficient vector tile display of boulder/cliff features.

The map uses:
- Mapbox satellite-streets base layer
- PMTiles for features (boulders/cliffs as points)
- PMTiles for coverage (scanned areas as polygons)
- Click-to-view functionality for 3D viewers
- Donut chart clusters showing boulder/cliff ratios at lower zoom levels

Usage:
    python -m publishing_steps.step5_make_map -o map.html

    # With custom center/zoom
    python -m publishing_steps.step5_make_map -o map.html --center 46.3 -91.0 --zoom 10

    # With custom PMTiles URLs
    python -m publishing_steps.step5_make_map -o map.html \\
        --features-url https://bucket/tiles/features.pmtiles \\
        --coverage-url https://bucket/coverage/scanned.pmtiles
"""

import argparse
import logging
import os
from pathlib import Path
from string import Template
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import B2_PUBLIC_URL_BASE

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Default PMTiles URLs (relative to B2 bucket)
DEFAULT_FEATURES_PMTILES = "tiles/features.pmtiles"
DEFAULT_COVERAGE_PMTILES = "coverage/scanned.pmtiles"

# Map defaults
DEFAULT_CENTER_LAT = 47.8
DEFAULT_CENTER_LON = -91.7
DEFAULT_ZOOM = 12

# =============================================================================
# Cluster/Marker Size Configuration
# =============================================================================
# Adjust these values to change marker and font sizes

# Individual feature marker sizes at different zoom levels
# Format: [zoom1, size1, zoom2, size2, ...] - interpolates between these
INDIVIDUAL_MARKER_SIZES = "8, 4, 12, 8, 16, 12, 18, 16"  # ← EDIT HERE for individual markers

# Cluster donut chart size range
CLUSTER_MIN_SIZE = 36      # ← EDIT HERE: minimum donut size in pixels
CLUSTER_MAX_SIZE = 70      # ← EDIT HERE: maximum donut size in pixels
CLUSTER_SIZE_SCALE = 3     # ← EDIT HERE: pixels to add per feature in cluster

# Cluster donut stroke width
CLUSTER_STROKE_WIDTH = 8   # ← EDIT HERE: thickness of the donut ring

# Cluster count font size
CLUSTER_FONT_SIZE = 13     # ← EDIT HERE: font size for the count number



# bigger?
CLUSTER_MIN_SIZE = 50
CLUSTER_MAX_SIZE = 90
CLUSTER_STROKE_WIDTH = 10
CLUSTER_FONT_SIZE = 16
INDIVIDUAL_MARKER_SIZES = "8, 6, 12, 10, 16, 14, 18, 18"

# =============================================================================
# HTML Template
# =============================================================================

MAP_HTML_TEMPLATE = Template('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Climbing Features Map</title>
    <link href="https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.css" rel="stylesheet" />
    <script src="https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.js"></script>
    <script src="https://unpkg.com/pmtiles@3.0.3/dist/pmtiles.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; }
        .map-overlay {
            position: absolute; top: 10px; left: 10px; background: rgba(255, 255, 255, 0.95);
            padding: 12px 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1; max-width: 300px;
        }
        .map-overlay h2 { font-size: 16px; margin-bottom: 8px; color: #333; }
        .legend { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .legend-section { display: flex; flex-wrap: wrap; gap: 12px; }
        .legend-section-title { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
        .legend-item { display: flex; align-items: center; font-size: 13px; color: #555; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .legend-rect { width: 18px; height: 12px; margin-right: 6px; border: 1px solid rgba(0,0,0,0.2); }
        .legend-donut { width: 20px; height: 20px; margin-right: 6px; }
        .stats { margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #777; }
        .toggle-container { margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }
        .toggle-label { display: flex; align-items: center; cursor: pointer; font-size: 13px; color: #555; }
        .toggle-label input { margin-right: 8px; }
        .maplibregl-popup-content { padding: 15px; font-size: 13px; }
        .popup-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #333; }
        .popup-row { display: flex; justify-content: space-between; margin: 4px 0; color: #555; }
        .popup-row span:first-child { color: #888; }
        .popup-link { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; font-weight: 500; text-align: center; width: 100%; }
        .popup-link:hover { background: #0055aa; }
        
        /* Cluster popup styles */
        .cluster-popup { text-align: center; }
        .cluster-popup .popup-title { margin-bottom: 12px; }
        .cluster-chart { margin: 10px auto; }
        .cluster-stats { display: flex; justify-content: center; gap: 20px; margin-top: 10px; }
        .cluster-stat { text-align: center; }
        .cluster-stat-value { font-size: 18px; font-weight: 600; }
        .cluster-stat-label { font-size: 11px; color: #888; text-transform: uppercase; }
        .cluster-stat.boulder .cluster-stat-value { color: #ff6600; }
        .cluster-stat.cliff .cluster-stat-value { color: #0066ff; }
        
        /* Donut marker styles */
        .cluster-marker {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cluster-marker:hover {
            transform: scale(1.1);
        }
        .cluster-marker svg {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .cluster-count {
            position: absolute;
            font-size: ${cluster_font_size}px;
            font-weight: 600;
            color: #333;
            text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;
        }
    </style>
    <!-- Three.js ES Modules for 3D Model Rendering -->
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
        }
    }
    </script>
</head>
<body>
    <div id="map"></div>
    <div class="map-overlay">
        <div class="legend">
            <div class="legend-section">
                <div class="legend-item"><span class="legend-dot" style="background: #ff6600;"></span>Boulder</div>
                <div class="legend-item"><span class="legend-dot" style="background: #0066ff;"></span>Cliff</div>
                <div class="legend-item"><span class="legend-rect" style="background: rgba(0, 200, 0, 0.15); border-color: rgba(0, 150, 0, 0.4);"></span>Scanned Area</div>
            </div>
        </div>
    </div>

    <script type="module">
        // Import Three.js as ES modules
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

        // Import the specific functions needed to handle Mapbox URLs
        import { isMapboxURL, transformMapboxUrl } from 'https://esm.sh/maplibregl-mapbox-request-transformer@0.0.3';

        // =================================================================
        // SIZE CONFIGURATION (edit these to adjust marker/font sizes)
        // =================================================================
        const CLUSTER_MIN_SIZE = $cluster_min_size;      // Minimum donut size in pixels
        const CLUSTER_MAX_SIZE = $cluster_max_size;      // Maximum donut size in pixels
        const CLUSTER_SIZE_SCALE = $cluster_size_scale;  // Pixels to add per feature
        const CLUSTER_STROKE_WIDTH = $cluster_stroke_width;  // Donut ring thickness
        const CLUSTER_FONT_SIZE = $cluster_font_size;    // Count label font size
        // =================================================================

        // 1. Initialize PMTiles protocol
        const protocol = new pmtiles.Protocol();

        // 2. Register the pmtiles protocol with MapLibre
        maplibregl.addProtocol("pmtiles", protocol.tile);

        // Mapbox Token
        maplibregl.accessToken = '$mapbox_token';

        const featuresUrl = '$features_url';
        const coverageUrl = '$coverage_url';

        // 3. Define the transformer
        const transformRequest = (url, resourceType) => {
            if (isMapboxURL(url)) {
                return transformMapboxUrl(url, resourceType, maplibregl.accessToken);
            }
            return { url };
        };

        const map = new maplibregl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [$center_lon, $center_lat],
            zoom: $zoom,
            pitch: 60, // Start with some pitch for 3D effect
            transformRequest: transformRequest,
            validateStyle: false
        });

        // Expose map to window for debugging
        window.map = map;

        // Store cluster markers
        const clusterMarkers = {};

        map.addControl(new maplibregl.NavigationControl());
        map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }));

        // =================================================================
        // THREE.JS CUSTOM LAYER FOR 3D MESHES (Updated for MapLibre 5.x)
        // =================================================================

        const customLayer3D = {
            id: '3d-boulders',
            type: 'custom',
            renderingMode: '3d',

            onAdd(map, gl) {
                this.camera = new THREE.Camera();
                this.scene = new THREE.Scene();
                this.map = map;
                this.loader = new GLTFLoader();
                this.loadedModels = {}; // url -> model data
                this.visibleModels = {}; // id -> { group, transform }

                // Add lights to the scene (they'll be transformed with everything else)
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                this.scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(0, -70, 100).normalize();
                this.scene.add(directionalLight);

                // Renderer setup
                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true
                });
                this.renderer.autoClear = false;
            },

            render(gl, args) {
                // Get the projection matrix from MapLibre 5.x
                const m = args.defaultProjectionData.mainMatrix;

                // Get camera center in Mercator coordinates for RTC (relative-to-center)
                // This reduces floating-point precision issues at high zoom
                const mapCenter = this.map.getCenter();
                const cameraMercator = maplibregl.MercatorCoordinate.fromLngLat(mapCenter, 0);

                // Render each visible model with its own transform
                Object.values(this.visibleModels).forEach(({ group, transform }) => {
                    if (!group.visible) return;

                    // RTC: Compute position relative to camera center to maintain precision
                    // This keeps the translation values small even at high zoom
                    const relX = transform.x - cameraMercator.x;
                    const relY = transform.y - cameraMercator.y;
                    const relZ = transform.z - cameraMercator.z;

                    // Build model matrix with RTC offset
                    // First translate camera to origin, then apply model transform
                    const cameraOffsetMatrix = new THREE.Matrix4()
                        .makeTranslation(cameraMercator.x, cameraMercator.y, cameraMercator.z);

                    const modelMatrix = new THREE.Matrix4()
                        .makeTranslation(relX, relY, relZ)
                        .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale));

                    // Combine: projection * cameraOffset * model
                    const mvpMatrix = new THREE.Matrix4()
                        .fromArray(m)
                        .multiply(cameraOffsetMatrix)
                        .multiply(modelMatrix);

                    this.camera.projectionMatrix.copy(mvpMatrix);

                    // Render just this group
                    this.renderer.resetState();
                    this.renderer.render(group, this.camera);
                });

                this.map.triggerRepaint();
            },

            updateMeshes() {
                const zoom = this.map.getZoom();
                const show3D = true;

                // Only show 3D models at high zoom levels
                if (zoom < 16.0 || !show3D) {
                    Object.values(this.visibleModels).forEach(({ group }) => {
                        group.visible = false;
                    });
                    return;
                }

                // Get visible features with mesh_url
                const features = this.map.queryRenderedFeatures({
                    layers: ['boulders', 'cliffs']
                }).filter(f => f.properties.mesh_url);

                const currentIds = new Set();

                features.forEach(f => {
                    const id = f.properties.id || f.id;
                    const meshUrl = f.properties.mesh_url;

                    if (!id || !meshUrl) return;
                    currentIds.add(id);

                    // If already visible
                    if (this.visibleModels[id]) {
                        this.visibleModels[id].group.visible = true;
                        return;
                    }

                    // Load if not already loading/loaded
                    if (!this.loadedModels[meshUrl]) {
                        console.log('Loading mesh:', meshUrl);
                        this.loadedModels[meshUrl] = 'loading';

                        // Capture feature data
                        // IMPORTANT: Use properties lat/lon, NOT geometry coordinates!
                        // Vector tiles quantize geometry coords to tile grid, losing precision.
                        // The properties retain the original full-precision values.
                        const featureProps = { ...f.properties };
                        const lng = featureProps.lon ?? f.geometry.coordinates[0];
                        const lat = featureProps.lat ?? f.geometry.coordinates[1];
                        const featureId = id;

                        this.loader.load(
                            meshUrl,
                            (gltf) => {
                                console.log('Successfully loaded mesh:', meshUrl);
                                const model = gltf.scene;

                                // === CENTER THE GLB GEOMETRY ===
                                const box = new THREE.Box3().setFromObject(model);
                                const center = box.getCenter(new THREE.Vector3());
                                const size = box.getSize(new THREE.Vector3());

                                console.log(`GLB $${featureId} original center:`, center);
                                console.log(`GLB $${featureId} size:`, size);

                                // Translate geometry to center at origin XY, base at Z=0
                                model.traverse((child) => {
                                    if (child.isMesh && child.geometry) {
                                        child.geometry.translate(-center.x, -center.y, -box.min.z);
                                        child.geometry.computeBoundingSphere();
                                        child.geometry.computeBoundingBox();
                                    }
                                });

                                // === GET MERCATOR TRANSFORM ===
                                const terrain = this.map.getTerrain();
                                const exaggeration = terrain ? terrain.exaggeration : 1.0;
                                const mapGround = this.map.queryTerrainElevation([lng, lat]);
                                const fileGround = featureProps.elevation_m || 0;
                                const ground = (mapGround !== null && mapGround !== undefined)
                                    ? mapGround
                                    : (fileGround * exaggeration);

                                // DIAGNOSTIC: Log positioning data
                                console.log(`POSITION $${featureId}: lng=$${lng.toFixed(8)}, lat=$${lat.toFixed(8)}`);
                                console.log(`ELEVATION $${featureId}: mapGround=$${mapGround}, fileGround=$${fileGround}, used=$${ground.toFixed(4)}`);

                                const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat(
                                    { lng, lat },
                                    ground
                                );
                                const scale = mercatorCoord.meterInMercatorCoordinateUnits();

                                // DIAGNOSTIC: Log mercator coordinates with high precision
                                console.log(`MERCATOR $${featureId}: x=$${mercatorCoord.x.toPrecision(15)}, y=$${mercatorCoord.y.toPrecision(15)}, z=$${mercatorCoord.z}, scale=$${scale}`);

                                // Store transform data (NOT applying it to object position)
                                // Store lng/lat so we can recompute if needed
                                const transform = {
                                    x: mercatorCoord.x,
                                    y: mercatorCoord.y,
                                    z: mercatorCoord.z,
                                    scale: scale,
                                    lng: lng,
                                    lat: lat
                                };

                                // Create a scene for this model (positioned at origin in model space)
                                const modelScene = new THREE.Scene();
                                modelScene.add(new THREE.AmbientLight(0xffffff, 0.8));

                                const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
                                dirLight.position.set(50, 50, 100);
                                modelScene.add(dirLight);

                                // Create group at ORIGIN (transform applied via matrix in render)
                                // No rotation needed - GLB from LiDAR is already Z-up
                                const modelGroup = new THREE.Group();
                                modelGroup.add(model);
                                modelScene.add(modelGroup);

                                // Apply material with visible lighting response
                                model.traverse((child) => {
                                    child.frustumCulled = false;
                                    if (child.isMesh) {
                                        child.material = new THREE.MeshStandardMaterial({
                                            color: 0x9a9a9a,
                                            roughness: 0.4,      // Lower = more reflective highlights
                                            metalness: 0.15,
                                            side: THREE.DoubleSide,
                                            flatShading: true    // Emphasizes facets for better shape visibility
                                        });
                                    }
                                });

                                // Store
                                this.loadedModels[meshUrl] = { model, transform };
                                this.visibleModels[featureId] = {
                                    group: modelScene,
                                    transform
                                };

                                this.map.triggerRepaint();
                                console.log(`Placed boulder $${featureId} at ($${lng}, $${lat}), ground=$${ground.toFixed(1)}m`);
                            },
                            undefined,
                            (error) => {
                                console.warn('Failed to load mesh:', meshUrl, error);
                                delete this.loadedModels[meshUrl];
                            }
                        );
                    } else if (this.loadedModels[meshUrl] !== 'loading') {
                        // Model is loaded - recompute transform for THIS feature's location
                        // (Don't reuse cached transform - it may be for a different feature or stale)
                        const cached = this.loadedModels[meshUrl];
                        if (cached && cached.model) {
                            // Use properties lat/lon for full precision (geometry coords are quantized)
                            const lng = f.properties.lon ?? f.geometry.coordinates[0];
                            const lat = f.properties.lat ?? f.geometry.coordinates[1];

                            // Recompute transform for this feature's position
                            const terrain = this.map.getTerrain();
                            const exaggeration = terrain ? terrain.exaggeration : 1.0;
                            const mapGround = this.map.queryTerrainElevation([lng, lat]);
                            const fileGround = f.properties.elevation_m || 0;
                            const ground = (mapGround !== null && mapGround !== undefined)
                                ? mapGround
                                : (fileGround * exaggeration);

                            const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat(
                                { lng, lat },
                                ground
                            );
                            const scale = mercatorCoord.meterInMercatorCoordinateUnits();

                            const transform = {
                                x: mercatorCoord.x,
                                y: mercatorCoord.y,
                                z: mercatorCoord.z,
                                scale: scale,
                                lng: lng,
                                lat: lat
                            };

                            console.log(`REUSE $${id}: recomputed transform at ($${lng.toFixed(6)}, $${lat.toFixed(6)}), ground=$${ground.toFixed(2)}`);

                            this.visibleModels[id] = {
                                group: cached.model.parent.parent, // Get the scene
                                transform: transform
                            };
                            this.visibleModels[id].group.visible = true;
                        }
                    }
                });

                // Hide models no longer in view
                Object.keys(this.visibleModels).forEach(id => {
                    if (!currentIds.has(id)) {
                        this.visibleModels[id].group.visible = false;
                    }
                });
            }
        };

        // Create donut chart SVG for cluster marker
        function createDonutChart(boulders, cliffs, size) {
            const total = boulders + cliffs;
            if (total === 0) return null;
            
            const radius = size / 2 - 4;
            const cx = size / 2;
            const cy = size / 2;
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', `0 0 $${size} $${size}`);
            
            // White background circle
            const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            bgCircle.setAttribute('cx', cx);
            bgCircle.setAttribute('cy', cy);
            bgCircle.setAttribute('r', radius + 4);
            bgCircle.setAttribute('fill', 'white');
            svg.appendChild(bgCircle);
            
            // Use path arcs for precise control
            const strokeWidth = CLUSTER_STROKE_WIDTH;
            const arcRadius = radius;
            
            // Calculate angles (starting from top, going clockwise)
            const boulderAngle = (boulders / total) * 360;
            const cliffAngle = (cliffs / total) * 360;
            
            // Helper to convert polar to cartesian (starting from top)
            function polarToCartesian(angleDeg) {
                const angleRad = (angleDeg - 90) * Math.PI / 180;
                return {
                    x: cx + arcRadius * Math.cos(angleRad),
                    y: cy + arcRadius * Math.sin(angleRad)
                };
            }
            
            // Helper to create arc path
            function createArc(startAngle, endAngle, color) {
                const start = polarToCartesian(startAngle);
                const end = polarToCartesian(endAngle);
                const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M $${start.x} $${start.y} A $${arcRadius} $${arcRadius} 0 $${largeArc} 1 $${end.x} $${end.y}`;
                path.setAttribute('d', d);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', color);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('stroke-linecap', 'butt');
                return path;
            }
            
            // Draw arcs
            let currentAngle = 0;
            
            if (boulders > 0 && boulders < total) {
                svg.appendChild(createArc(currentAngle, currentAngle + boulderAngle, '#ff6600'));
                currentAngle += boulderAngle;
            } else if (boulders === total) {
                // All boulders - draw full circle
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', cx);
                circle.setAttribute('cy', cy);
                circle.setAttribute('r', arcRadius);
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#ff6600');
                circle.setAttribute('stroke-width', strokeWidth);
                svg.appendChild(circle);
            }
            
            if (cliffs > 0 && cliffs < total) {
                svg.appendChild(createArc(currentAngle, currentAngle + cliffAngle, '#0066ff'));
            } else if (cliffs === total) {
                // All cliffs - draw full circle
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', cx);
                circle.setAttribute('cy', cy);
                circle.setAttribute('r', arcRadius);
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#0066ff');
                circle.setAttribute('stroke-width', strokeWidth);
                svg.appendChild(circle);
            }
            
            return svg;
        }

        // Create cluster marker element
        function createClusterMarker(boulders, cliffs) {
            const total = boulders + cliffs;
            const size = Math.min(CLUSTER_MAX_SIZE, Math.max(CLUSTER_MIN_SIZE, CLUSTER_MIN_SIZE + total * CLUSTER_SIZE_SCALE));
            
            const el = document.createElement('div');
            el.className = 'cluster-marker';
            el.style.width = `$${size}px`;
            el.style.height = `$${size}px`;
            
            const svg = createDonutChart(boulders, cliffs, size);
            if (svg) {
                el.appendChild(svg);
            }
            
            // Add count in center
            const count = document.createElement('div');
            count.className = 'cluster-count';
            count.textContent = total;
            el.appendChild(count);
            
            return el;
        }

        // Update cluster markers
        function updateClusterMarkers() {
            // Remove existing markers
            Object.values(clusterMarkers).forEach(marker => marker.remove());
            Object.keys(clusterMarkers).forEach(key => delete clusterMarkers[key]);
            
            // Query cluster features (these only exist at zoom levels below cluster-maxzoom)
            const clusters = map.querySourceFeatures('features', {
                sourceLayer: 'features',
                filter: ['has', 'point_count']
            });
            
            // Create markers for each cluster
            clusters.forEach((cluster, index) => {
                const coords = cluster.geometry.coordinates;
                const props = cluster.properties;
                const boulders = props.is_boulder || 0;
                const cliffs = props.is_cliff || 0;
                const total = props.point_count || (boulders + cliffs);
                
                // Create unique key for this cluster
                const key = `$${coords[0].toFixed(4)}_$${coords[1].toFixed(4)}`;
                
                // Skip if we already have a marker here
                if (clusterMarkers[key]) return;
                
                const el = createClusterMarker(boulders, cliffs);
                
                // Add click handler
                el.addEventListener('click', () => {
                    showClusterPopup(coords, boulders, cliffs, total);
                });
                
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(coords)
                    .addTo(map);
                
                clusterMarkers[key] = marker;
            });
        }

        // Show popup for cluster
        function showClusterPopup(coords, boulders, cliffs, total) {
            const boulderPct = total > 0 ? Math.round((boulders / total) * 100) : 0;
            const cliffPct = total > 0 ? Math.round((cliffs / total) * 100) : 0;
            
            // Calculate arc paths for popup donut
            const cx = 40, cy = 40, r = 25;
            const boulderAngle = (boulders / total) * 360;
            
            function polarToCartesian(angleDeg) {
                const angleRad = (angleDeg - 90) * Math.PI / 180;
                return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
            }
            
            let boulderArc = '', cliffArc = '';
            
            if (boulders === total) {
                boulderArc = `<circle cx="$${cx}" cy="$${cy}" r="$${r}" fill="none" stroke="#ff6600" stroke-width="10"/>`;
            } else if (cliffs === total) {
                cliffArc = `<circle cx="$${cx}" cy="$${cy}" r="$${r}" fill="none" stroke="#0066ff" stroke-width="10"/>`;
            } else {
                if (boulders > 0) {
                    const start = polarToCartesian(0);
                    const end = polarToCartesian(boulderAngle);
                    const largeArc = boulderAngle > 180 ? 1 : 0;
                    boulderArc = `<path d="M $${start.x} $${start.y} A $${r} $${r} 0 $${largeArc} 1 $${end.x} $${end.y}" fill="none" stroke="#ff6600" stroke-width="10"/>`;
                }
                if (cliffs > 0) {
                    const start = polarToCartesian(boulderAngle);
                    const end = polarToCartesian(360);
                    const largeArc = (360 - boulderAngle) > 180 ? 1 : 0;
                    cliffArc = `<path d="M $${start.x} $${start.y} A $${r} $${r} 0 $${largeArc} 1 $${end.x} $${end.y}" fill="none" stroke="#0066ff" stroke-width="10"/>`;
                }
            }
            
            const popupContent = `
                <div class="cluster-popup">
                    <div class="popup-title">Feature Cluster</div>
                    <svg class="cluster-chart" width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="30" fill="white" stroke="#eee" stroke-width="1"/>
                        $${boulderArc}
                        $${cliffArc}
                        <text x="40" y="44" text-anchor="middle" font-size="14" font-weight="600" fill="#333">$${total}</text>
                    </svg>
                    <div class="cluster-stats">
                        <div class="cluster-stat boulder">
                            <div class="cluster-stat-value">$${boulders}</div>
                            <div class="cluster-stat-label">Boulders ($${boulderPct}%)</div>
                        </div>
                        <div class="cluster-stat cliff">
                            <div class="cluster-stat-value">$${cliffs}</div>
                            <div class="cluster-stat-label">Cliffs ($${cliffPct}%)</div>
                        </div>
                    </div>
                </div>
            `;
            
            new maplibregl.Popup()
                .setLngLat(coords)
                .setHTML(popupContent)
                .addTo(map);
        }

        map.on('load', () => {
            // Add terrain source for 3D rendering
            map.addSource('terrain', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.terrain-rgb',
                tileSize: 512,
                maxzoom: 14
            });

            // Enable 3D terrain
            map.setTerrain({ source: 'terrain', exaggeration: 3.0 });

            map.addSource('coverage', {
                type: 'vector',
                url: 'pmtiles://' + coverageUrl
            });

            map.addLayer({
                id: 'scanned-areas',
                type: 'fill',
                source: 'coverage',
                'source-layer': 'coverage',
                paint: { 'fill-color': '#00cc00', 'fill-opacity': 0.15 }
            });

            map.addLayer({
                id: 'scanned-areas-outline',
                type: 'line',
                source: 'coverage',
                'source-layer': 'coverage',
                paint: { 'line-color': '#009900', 'line-width': 1, 'line-opacity': 0.4 }
            });

            map.addSource('features', {
                type: 'vector',
                url: 'pmtiles://' + featuresUrl
            });

            map.addLayer(customLayer3D);

            // Individual boulders (unclustered)
            map.addLayer({
                id: 'boulders',
                type: 'circle',
                source: 'features',
                'source-layer': 'features',
                filter: ['==', ['get', 'feature_type'], 'boulder'],
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], $individual_marker_sizes],
                    'circle-color': '#ff6600',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 1
                }
            });

            // Individual cliffs (unclustered)
            map.addLayer({
                id: 'cliffs',
                type: 'circle',
                source: 'features',
                'source-layer': 'features',
                filter: ['==', ['get', 'feature_type'], 'cliff'],
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], $individual_marker_sizes],
                    'circle-color': '#0066ff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 1
                }
            });


            updateClusterMarkers();

            // Initial mesh update
            customLayer3D.updateMeshes();
        });

        // Update cluster markers on map move/zoom
        map.on('moveend', () => {
            updateClusterMarkers();

            customLayer3D.updateMeshes();
        });

        map.on('zoomend', () => {
            updateClusterMarkers();
            customLayer3D.updateMeshes();
        });

        map.on('sourcedata', (e) => {
            if (e.sourceId === 'features' && e.isSourceLoaded) {
                updateClusterMarkers();

                customLayer3D.updateMeshes();
            }
        });

        // Click handler for individual features
        map.on('click', ['boulders', 'cliffs'], (e) => {
            if (e.features.length === 0) return;
            const feature = e.features[0];
            const props = feature.properties;

            // Helper to format meters with feet conversion
            const formatMeters = (m) => {
                if (m === undefined || m === null) return 'N/A';
                const ft = (m * 3.28084).toFixed(1);
                return m.toFixed(1) + 'm (' + ft + 'ft)';
            };

            // Helper to format coordinates
            const formatCoord = (val, posChar, negChar) => {
                if (val === undefined || val === null) return 'N/A';
                const abs = Math.abs(val).toFixed(5);
                return abs + '° ' + (val >= 0 ? posChar : negChar);
            };

            let popupContent = '<div class="popup-title">' + (props.feature_type === 'cliff' ? 'Cliff' : 'Boulder') + ': ' + (props.id || 'Unknown') + '</div>';
            popupContent += '<div class="popup-row"><span>Height:</span><span>' + formatMeters(props.height) + '</span></div>';
            popupContent += '<div class="popup-row"><span>Length:</span><span>' + formatMeters(props.length) + '</span></div>';
            popupContent += '<div class="popup-row"><span>Width:</span><span>' + formatMeters(props.width) + '</span></div>';
            popupContent += '<div class="popup-row"><span>Elevation:</span><span>' + formatMeters(props.elevation_m) + '</span></div>';
            popupContent += '<div class="popup-row"><span>Dist to road:</span><span>' + formatMeters(props.distance_to_road) + '</span></div>';
            popupContent += '<div class="popup-row"><span>Bushwhack:</span><span>' + formatMeters(props.distance_to_trail) + '</span></div>';
            popupContent += '<div class="popup-row"><span>Location:</span><span>' + formatCoord(props.lat, 'N', 'S') + ', ' + formatCoord(props.lon, 'E', 'W') + '</span></div>';
            if (props.viewer_url) {
                popupContent += '<a href="' + props.viewer_url + '" target="_blank" class="popup-link">View in 3D</a>';
            }
            new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        });

        map.on('mouseenter', ['boulders', 'cliffs'], () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', ['boulders', 'cliffs'], () => map.getCanvas().style.cursor = '');


    </script>
</body>
</html>''')


# =============================================================================
# Map Generation
# =============================================================================

def generate_map_html(
    output_path: str,
    mapbox_token: str,
    features_url: str = None,
    coverage_url: str = None,
    center_lat: float = DEFAULT_CENTER_LAT,
    center_lon: float = DEFAULT_CENTER_LON,
    zoom: int = DEFAULT_ZOOM,
) -> str:
    """
    Generate an interactive HTML map using MapLibre + PMTiles.

    Args:
        output_path: Path to write HTML file
        mapbox_token: Mapbox access token
        features_url: URL to features.pmtiles
        coverage_url: URL to scanned.pmtiles
        center_lat: Initial map center latitude
        center_lon: Initial map center longitude
        zoom: Initial zoom level

    Returns:
        Path to generated HTML file
    """
    # Default URLs if not provided
    if features_url is None:
        features_url = f"{B2_PUBLIC_URL_BASE}/{DEFAULT_FEATURES_PMTILES}"
    if coverage_url is None:
        coverage_url = f"{B2_PUBLIC_URL_BASE}/{DEFAULT_COVERAGE_PMTILES}"

    # Generate HTML from template
    html_content = MAP_HTML_TEMPLATE.substitute(
        mapbox_token=mapbox_token,
        features_url=features_url,
        coverage_url=coverage_url,
        center_lat=center_lat,
        center_lon=center_lon,
        zoom=zoom,
        # Size configuration
        cluster_min_size=CLUSTER_MIN_SIZE,
        cluster_max_size=CLUSTER_MAX_SIZE,
        cluster_size_scale=CLUSTER_SIZE_SCALE,
        cluster_stroke_width=CLUSTER_STROKE_WIDTH,
        cluster_font_size=CLUSTER_FONT_SIZE,
        individual_marker_sizes=INDIVIDUAL_MARKER_SIZES,
    )

    # Write file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    logger.info(f"Generated map HTML: {output_path}")
    return output_path


# =============================================================================
# Main Entry Point
# =============================================================================

def run(args, context: dict = None) -> Optional[str]:
    """
    Main entry point for Step 5.

    Args:
        args: Parsed arguments
        context: Optional shared context from pipeline

    Returns:
        Path to generated HTML file, or None on failure
    """
    # Get Mapbox token from args or environment
    mapbox_token = getattr(args, 'mapbox_token', None) or os.environ.get('MAPBOX_TOKEN')

    if not mapbox_token:
        logger.error("Mapbox token required. Set MAPBOX_TOKEN env var or use --mapbox-token")
        return None

    # Get PMTiles URLs
    features_url = getattr(args, 'features_url', None)
    coverage_url = getattr(args, 'coverage_url', None)

    # Get center/zoom
    center_lat = args.center[0] if hasattr(args, 'center') and args.center else DEFAULT_CENTER_LAT
    center_lon = args.center[1] if hasattr(args, 'center') and args.center else DEFAULT_CENTER_LON
    zoom = getattr(args, 'zoom', DEFAULT_ZOOM)

    # Determine output path
    if hasattr(args, 'output_dir') and args.output_dir:
        # Use output_dir + basename
        basename = getattr(args, 'output_basename', 'features')
        if not basename.lower().endswith('.html'):
            basename += '.html'
        output_path_str = os.path.join(args.output_dir, basename)
    else:
        # Fallback to simple filename if neither output nor output_dir is specified
        basename = getattr(args, 'output_basename', 'features')
        if not basename.lower().endswith('.html'):
            basename += '.html'
        output_path_str = basename

    # Ensure output directory exists if we have a path with directories
    output_dir = os.path.dirname(output_path_str)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Generate map
    output_path = generate_map_html(
        output_path=output_path_str,
        mapbox_token=mapbox_token,
        features_url=features_url,
        coverage_url=coverage_url,
        center_lat=center_lat,
        center_lon=center_lon,
        zoom=zoom,
    )

    return output_path


def add_arguments(parser: argparse.ArgumentParser) -> None:
    """Add step-specific arguments to parser."""
    parser.add_argument(
        '--output-dir', type=str,
        help='Directory for output file'
    )
    parser.add_argument(
        '--output-basename', type=str, default='features',
        help='Basename for output file (default: features)'
    )
    parser.add_argument(
        '--mapbox-token', type=str,
        help='Mapbox access token (or set MAPBOX_TOKEN env var)'
    )
    parser.add_argument(
        '--features-url', type=str,
        help='URL to features.pmtiles (defaults to B2 bucket)'
    )
    parser.add_argument(
        '--coverage-url', type=str,
        help='URL to scanned.pmtiles (defaults to B2 bucket)'
    )
    parser.add_argument(
        '--center', nargs=2, type=float,
        metavar=('LAT', 'LON'),
        help='Initial map center (default: 46.3, -91.0)'
    )
    parser.add_argument(
        '--zoom', type=int, default=DEFAULT_ZOOM,
        help=f'Initial zoom level (default: {DEFAULT_ZOOM})'
    )


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Generate interactive MapLibre + PMTiles map'
    )
    add_arguments(parser)
    parser.add_argument('--verbose', '-v', action='store_true')

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    result = run(args)

    if result:
        print(f"\nGenerated map: {result}")
        print(f"Open in browser to view")
    else:
        print("\nFailed to generate map")
        sys.exit(1)


if __name__ == '__main__':
    main()