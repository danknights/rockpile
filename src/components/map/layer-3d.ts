import maplibregl from 'maplibre-gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export function createCustomLayer3D(startMap: maplibregl.Map) {
    const layer: any = {
        id: '3d-boulders',
        type: 'custom',
        renderingMode: '3d',

        onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
            this.camera = new THREE.Camera()
            this.scene = new THREE.Scene()
            this.map = map // Use the map instance passed to onAdd
            this.loader = new GLTFLoader()
            this.loadedModels = {} // url -> model data
            this.visibleModels = {} // id -> { group, transform }

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
            this.scene.add(ambientLight)

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
            directionalLight.position.set(0, -70, 100).normalize()
            this.scene.add(directionalLight)

            // Renderer setup
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true,
            })
            this.renderer.autoClear = false
        },

        render(gl: WebGLRenderingContext, args: any) {
            if (!this.map) return;

            // Get the projection matrix from MapLibre
            // Check both v4 and v5 locations just in case
            const m = args.defaultProjectionData ? args.defaultProjectionData.mainMatrix : null;

            if (!m) {
                console.warn('DEBUG: No mainMatrix found in args');
                return;
            }

            // Get camera center in Mercator coordinates for RTC (relative-to-center)
            const mapCenter = this.map.getCenter()
            const cameraMercator = maplibregl.MercatorCoordinate.fromLngLat(mapCenter, 0)

            Object.values(this.visibleModels as Record<string, any>).forEach(({ group, transform }) => {
                if (!group.visible) return

                // RTC: Compute position relative to camera center
                const relX = transform.x - cameraMercator.x
                const relY = transform.y - cameraMercator.y
                const relZ = transform.z - cameraMercator.z

                // Build model matrix with RTC offset
                const cameraOffsetMatrix = new THREE.Matrix4().makeTranslation(
                    cameraMercator.x,
                    cameraMercator.y,
                    cameraMercator.z
                )

                const modelMatrix = new THREE.Matrix4()
                    .makeTranslation(relX, relY, relZ)
                    .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))

                // Combine: projection * cameraOffset * model
                const mvpMatrix = new THREE.Matrix4()
                    .fromArray(m)
                    .multiply(cameraOffsetMatrix)
                    .multiply(modelMatrix)

                this.camera.projectionMatrix.copy(mvpMatrix)

                // Render just this group
                this.renderer.resetState()
                this.renderer.render(group, this.camera)
            })

            this.map.triggerRepaint()
        },
    }

    // Attach updateMeshes method to the layer object (to be called externally)
    // We explicitly define it here so we can call it.
    layer.updateMeshes = function () {
        if (!this.map) return
        const zoom = this.map.getZoom()
        const show3D = true // Could be a prop

        // Only show 3D models at high zoom levels
        // console.log('DEBUG: Zoom level:', zoom);
        if (zoom < 15.0 || !show3D) { // Lowered to 15 for testing
            if (this.visibleModels) {
                Object.values(this.visibleModels as Record<string, any>).forEach(({ group }) => {
                    group.visible = false
                })
            }
            return
        }

        // Get visible features with mesh_url
        const features = this.map.queryRenderedFeatures({
            layers: ['boulders', 'cliffs'],
        }).filter((f: any) => f.properties.mesh_url)

        const currentIds = new Set()

        features.forEach((f: any) => {
            const id = f.properties.id || f.id
            const meshUrl = f.properties.mesh_url

            if (!id || !meshUrl) return
            currentIds.add(id)

            // If already visible
            if (this.visibleModels[id]) {
                this.visibleModels[id].group.visible = true
                return
            }

            if (!this.map) return;
            const terrain = this.map.getTerrain();

            // Load if not already loading/loaded
            if (!this.loadedModels[meshUrl]) {
                this.loadedModels[meshUrl] = 'loading'

                // Capture feature data
                const featureProps = { ...f.properties }
                const lng = featureProps.lon ?? f.geometry.coordinates[0]
                const lat = featureProps.lat ?? f.geometry.coordinates[1]
                const featureId = id

                this.loader.load(
                    meshUrl,
                    (gltf: any) => {
                        const model = gltf.scene

                        // === CENTER THE GLB GEOMETRY ===
                        const box = new THREE.Box3().setFromObject(model)
                        const center = box.getCenter(new THREE.Vector3())
                        const size = box.getSize(new THREE.Vector3())

                        // Translate geometry to center at origin XY, base at Z=0
                        model.traverse((child: any) => {
                            if (child.isMesh && child.geometry) {
                                child.geometry.translate(-center.x, -center.y, -box.min.z)
                                child.geometry.computeBoundingSphere()
                                child.geometry.computeBoundingBox()
                            }
                        })

                        // === GET MERCATOR TRANSFORM ===
                        const terrain = this.map.getTerrain()
                        const exaggeration = terrain ? terrain.exaggeration : 1.0
                        const mapGround = this.map.queryTerrainElevation([lng, lat])
                        const fileGround = featureProps.elevation_m || 0
                        const ground = (mapGround !== null && mapGround !== undefined)
                            ? mapGround
                            : (fileGround * exaggeration)

                        const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat(
                            { lng, lat },
                            ground
                        )
                        const scale = mercatorCoord.meterInMercatorCoordinateUnits()

                        const transform = {
                            x: mercatorCoord.x,
                            y: mercatorCoord.y,
                            z: mercatorCoord.z,
                            scale: scale,
                            lng: lng,
                            lat: lat,
                        }

                        // console.log(`DEBUG: ${featureId} ground=${ground.toFixed(2)}, z=${mercatorCoord.z}, scale=${scale}`)

                        // Create a scene for this model
                        const modelScene = new THREE.Scene()
                        modelScene.add(new THREE.AmbientLight(0xffffff, 0.8))

                        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
                        dirLight.position.set(50, 50, 100)
                        modelScene.add(dirLight)

                        const modelGroup = new THREE.Group()
                        modelGroup.add(model)
                        modelScene.add(modelGroup)

                        // Apply material
                        model.traverse((child: any) => {
                            child.frustumCulled = false
                            if (child.isMesh) {
                                child.material = new THREE.MeshStandardMaterial({
                                    color: 0x9a9a9a,
                                    roughness: 0.4,
                                    metalness: 0.15,
                                    side: THREE.DoubleSide,
                                    flatShading: true,
                                })
                            }
                        })

                        // Store
                        this.loadedModels[meshUrl] = { model, transform }
                        this.visibleModels[featureId] = {
                            group: modelScene,
                            transform,
                        }
                        this.visibleModels[featureId].group.visible = true

                        this.map.triggerRepaint()
                    },
                    undefined,
                    (error: any) => {
                        console.warn('Failed to load mesh:', meshUrl, error)
                        delete this.loadedModels[meshUrl]
                    }
                )
            } else if (this.loadedModels[meshUrl] !== 'loading') {
                // Model is loaded - recompute transform for THIS feature's location
                const cached = this.loadedModels[meshUrl]
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

                    // Recompute transform for this feature's position
                    // ... (existing code) ...

                    this.visibleModels[id] = {
                        group: cached.model.parent.parent, // Get the scene
                        transform: transform
                    };
                    this.visibleModels[id].group.visible = true;

                    // Ensure frustum culling is disabled on reuse
                    cached.model.traverse((child: any) => {
                        child.frustumCulled = false;
                    });
                }
            }
        })

        // Hide models no longer in view
        // FILTERING: We only hide models if they are significantly far away or if we have too many.
        // For now, to prevent flickering during rotation/pitch (where queryRenderedFeatures might miss visible items),
        // we will be lenient and NOT hide them immediately if they drop out of the query.
        // Only hide if we zoomed out too much (handled at top of function).

        // Uncomment this to restore strict culling:
        /*
        Object.keys(this.visibleModels).forEach((id) => {
            if (!currentIds.has(id)) {
                this.visibleModels[id].group.visible = false
            }
        })
        */
    }

    return layer
}
