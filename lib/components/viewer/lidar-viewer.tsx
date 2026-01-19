'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Environment, PerspectiveCamera } from '@react-three/drei'
import {
  IonButton,
  IonIcon,
  IonRange,
  IonToggle,
  IonLabel,
  IonItem,
  IonList,
  IonActionSheet,
} from '@ionic/react'
import {
  expandOutline,
  contractOutline,
  warningOutline,
  ellipsisVerticalOutline,
} from 'ionicons/icons'
import type { Feature } from '@/lib/types'
import * as THREE from 'three'

interface LidarViewerProps {
  feature: Feature
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onNeedsRefinement: (type: 'missing' | 'extra' | 'both') => void
}

function HumanFigure() {
  return (
    <group position={[0, -0.9, 2]}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.25, 0.6, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0.25, 0.6, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, -0.1, 0]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0.1, -0.1, 0]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  )
}

function PointCloud({ contextOpacity }: { contextOpacity: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  // Generate mock point cloud - reduced count for mobile performance
  const count = 1500
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const radius = 5 + Math.random() * 8
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = (Math.random() - 0.5) * 4 - 1
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    // Blue color for context points
    colors[i3] = 0.2
    colors[i3 + 1] = 0.4
    colors[i3 + 2] = 0.9
  }

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={contextOpacity}
        sizeAttenuation
      />
    </points>
  )
}

function Boulder({ showSurface }: { showSurface: boolean }) {
  return (
    <group>
      {/* Main boulder shape */}
      <mesh position={[0, 0, 0]}>
        <dodecahedronGeometry args={[1.5, 1]} />
        {showSurface ? (
          <meshStandardMaterial
            color="#dc2626"
            roughness={0.8}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        ) : (
          <meshBasicMaterial wireframe color="#f87171" />
        )}
      </mesh>
      {/* Surface points */}
      <points>
        <dodecahedronGeometry args={[1.52, 2]} />
        <pointsMaterial size={0.04} color="#f472b6" />
      </points>
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
      maxDistance={15}
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

function Scene({ showSurface, contextOpacity }: { showSurface: boolean; contextOpacity: number }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[4, 2, 5]} fov={50} />
      <MobileOrbitControls />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />

      <Boulder showSurface={showSurface} />
      <PointCloud contextOpacity={contextOpacity} />
      <HumanFigure />

      {/* Ground reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.2} />
      </mesh>
    </>
  )
}

export function LidarViewer({ feature, isFullscreen, onToggleFullscreen, onNeedsRefinement }: LidarViewerProps) {
  const [showSurface, setShowSurface] = useState(true)
  const [contextOpacity, setContextOpacity] = useState(0.3)
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
                Loading 3D view...
              </div>
            </Html>
          }>
            <Scene showSurface={showSurface} contextOpacity={contextOpacity} />
            <Environment preset="night" />
          </Suspense>
        </Canvas>
      </div>

      {/* Feature ID - Positioned for safe area */}
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

      {/* Controls - Mobile optimized with larger touch targets */}
      <div
        className="absolute right-3 bg-black/60 backdrop-blur-sm rounded-xl p-3 space-y-4 min-w-[160px]"
        style={{ bottom: isFullscreen ? 'calc(env(safe-area-inset-bottom, 16px) + 16px)' : '16px' }}
      >
        {/* Context slider */}
        <div className="space-y-1">
          <IonLabel className="text-xs text-gray-300">Context</IonLabel>
          <IonRange
            min={0}
            max={100}
            step={5}
            value={contextOpacity * 100}
            onIonInput={(e) => setContextOpacity((e.detail.value as number) / 100)}
            className="py-0"
            style={{ '--bar-height': '4px', '--knob-size': '20px' }}
          />
        </div>

        {/* Surface toggle */}
        <div className="flex items-center justify-between">
          <IonLabel className="text-xs text-gray-300">Surface</IonLabel>
          <IonToggle
            checked={showSurface}
            onIonChange={(e) => setShowSurface(e.detail.checked)}
            style={{ '--handle-width': '24px', '--handle-height': '24px' }}
          />
        </div>

        {/* Needs refinement - Action Sheet trigger */}
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

      {/* Action Sheet for refinement options */}
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

      {/* Legend - Touch friendly */}
      <div
        className="absolute left-3 text-[10px] text-gray-400 space-y-0.5 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5"
        style={{ bottom: isFullscreen ? 'calc(env(safe-area-inset-bottom, 16px) + 16px)' : '16px' }}
      >
        <p>Pinch to zoom | Drag to rotate</p>
        <p>
          <span className="text-red-400">Red=Top</span>,{' '}
          <span className="text-pink-400">Pink=Sides</span>,{' '}
          <span className="text-blue-400">Blue=Ground</span>
        </p>
      </div>
    </div>
  )
}
