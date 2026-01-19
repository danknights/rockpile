'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, Environment, PerspectiveCamera, useGLTF } from '@react-three/drei'
import {
  IonButton,
  IonIcon,
  IonToggle,
  IonLabel,
  IonActionSheet,
} from '@ionic/react'
import {
  expandOutline,
  contractOutline,
  warningOutline,
} from 'ionicons/icons'
import type { Feature } from '@/lib/types'
import * as THREE from 'three'

interface LidarViewerProps {
  feature: Feature
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onNeedsRefinement: (type: 'missing' | 'extra' | 'both') => void
}

interface ModelProps {
  url: string
  showSurface: boolean
}

function Model({ url, showSurface }: ModelProps) {
  const { scene } = useGLTF(url)

  // Clone scene to avoid modifying cached asset
  const clone = scene.clone()

  // Apply material override if needed based on showSurface
  // For now, we assume the GLB comes with correct materials.
  // If showSurface is false, we could apply a wireframe material.

  if (!showSurface) {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = new THREE.MeshBasicMaterial({
          color: 0xf87171,
          wireframe: true
        })
      }
    })
  }

  return <primitive object={clone} />
}

function HumanFigure() {
  return (
    <group position={[2, -1, 2]}>
      {/* Positioned slightly away for scale reference */}
      {/* Body */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  )
}

// Mobile-optimized controls with touch support
function MobileOrbitControls() {
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.1}
      minDistance={2}
      maxDistance={20}
      enablePan={true}
      panSpeed={0.5}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      // Touch settings
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  )
}

function Scene({ feature, showSurface }: { feature: Feature; showSurface: boolean }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 4, 5]} fov={50} />
      <MobileOrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />

      {feature.modelUrl ? (
        <Model url={feature.modelUrl} showSurface={showSurface} />
      ) : (
        <mesh>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="gray" wireframe />
        </mesh>
      )}

      <HumanFigure />

      {/* Ground reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      <gridHelper args={[20, 20]} position={[0, -0.99, 0]} />
    </>
  )
}

export function LidarViewer({ feature, isFullscreen, onToggleFullscreen, onNeedsRefinement }: LidarViewerProps) {
  const [showSurface, setShowSurface] = useState(true)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)

  // Get device pixel ratio on mount (mobile optimization)
  useEffect(() => {
    setDevicePixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap at 2 for performance
  }, [])

  return (
    <div className={`relative bg-[#0a0f1a] ${isFullscreen ? 'fixed inset-0 z-50' : 'h-64 rounded-t-xl overflow-hidden'}`}>
      {/* 3D Canvas - Mobile Optimized */}
      <div className="absolute inset-0">
        <Canvas
          dpr={devicePixelRatio}
          performance={{ min: 0.5 }}
          shadows
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={
            <Html center>
              <div className="text-white text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading Model...
              </div>
            </Html>
          }>
            <Scene feature={feature} showSurface={showSurface} />
            <Environment preset="night" />
          </Suspense>
        </Canvas>
      </div>

      {/* Feature ID */}
      <div
        className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm font-mono"
        style={{ top: isFullscreen ? 'calc(env(safe-area-inset-top, 16px) + 8px)' : '12px' }}
      >
        {feature.id}
      </div>

      {/* Fullscreen toggle */}
      <IonButton
        fill="clear"
        size="small"
        className="absolute bg-black/40 rounded-full native-button"
        style={{
          top: isFullscreen ? 'calc(env(safe-area-inset-top, 16px) + 8px)' : '12px',
          right: '12px',
          '--padding-start': '8px',
          '--padding-end': '8px',
        }}
        onClick={onToggleFullscreen}
      >
        <IonIcon icon={isFullscreen ? contractOutline : expandOutline} className="text-white text-xl" />
      </IonButton>

      {/* Controls */}
      <div
        className="absolute right-3 bg-black/60 backdrop-blur-sm rounded-xl p-3 space-y-4 min-w-[160px]"
        style={{ bottom: isFullscreen ? 'calc(env(safe-area-inset-bottom, 16px) + 16px)' : '16px' }}
      >
        {/* Surface toggle */}
        <div className="flex items-center justify-between">
          <IonLabel className="text-xs text-gray-300">Surface</IonLabel>
          <IonToggle
            checked={showSurface}
            onIonChange={(e) => setShowSurface(e.detail.checked)}
            style={{ '--handle-width': '24px', '--handle-height': '24px' }}
          />
        </div>

        {/* Needs refinement */}
        <IonButton
          fill="clear"
          size="small"
          className="w-full text-yellow-400 native-button"
          onClick={() => setShowActionSheet(true)}
        >
          <IonIcon icon={warningOutline} className="mr-1" />
          Needs refinement
        </IonButton>
      </div>

      {/* Action Sheet */}
      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        header="What's wrong with this scan?"
        buttons={[
          {
            text: 'Missing some points',
            handler: () => onNeedsRefinement('missing'),
          },
          {
            text: 'Has extra points',
            handler: () => onNeedsRefinement('extra'),
          },
          {
            text: 'Both',
            handler: () => onNeedsRefinement('both'),
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />

      {/* Legend */}
      <div
        className="absolute left-3 text-[10px] text-gray-400 space-y-0.5 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5"
        style={{ bottom: isFullscreen ? 'calc(env(safe-area-inset-bottom, 16px) + 16px)' : '16px' }}
      >
        <p>Pinch to zoom | Drag to rotate</p>
      </div>
    </div>
  )
}
