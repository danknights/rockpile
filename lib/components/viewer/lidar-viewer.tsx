'use client'

import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Environment, PerspectiveCamera } from '@react-three/drei'
import { Maximize2, Minimize2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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

  // Generate mock point cloud
  const count = 2000
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
        size={0.05}
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
        <pointsMaterial size={0.03} color="#f472b6" />
      </points>
    </group>
  )
}

function Scene({ showSurface, contextOpacity }: { showSurface: boolean; contextOpacity: number }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[4, 2, 5]} fov={50} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={15}
      />
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
  const [showRefinementMenu, setShowRefinementMenu] = useState(false)

  return (
    <div className={`relative bg-[#0a0f1a] ${isFullscreen ? 'fixed inset-0 z-50' : 'h-64 rounded-t-lg overflow-hidden'}`}>
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas>
          <Suspense fallback={
            <Html center>
              <div className="text-white text-sm">Loading 3D view...</div>
            </Html>
          }>
            <Scene showSurface={showSurface} contextOpacity={contextOpacity} />
            <Environment preset="night" />
          </Suspense>
        </Canvas>
      </div>

      {/* Feature ID */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-sm font-mono">
        {feature.id}
      </div>

      {/* Fullscreen toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white"
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-3 space-y-3 min-w-[140px]">
        {/* Context slider */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Context</Label>
          <Slider
            value={[contextOpacity * 100]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setContextOpacity(v / 100)}
            className="w-full"
          />
        </div>

        {/* Surface toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-300">Surface</Label>
          <Switch
            checked={showSurface}
            onCheckedChange={setShowSurface}
          />
        </div>

        {/* Needs refinement */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 justify-start"
            onClick={() => setShowRefinementMenu(!showRefinementMenu)}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs refinement
          </Button>
          
          {showRefinementMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              <button
                className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors text-foreground"
                onClick={() => { onNeedsRefinement('missing'); setShowRefinementMenu(false) }}
              >
                Missing some points
              </button>
              <button
                className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors text-foreground"
                onClick={() => { onNeedsRefinement('extra'); setShowRefinementMenu(false) }}
              >
                Has extra points
              </button>
              <button
                className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors text-foreground"
                onClick={() => { onNeedsRefinement('both'); setShowRefinementMenu(false) }}
              >
                Both
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 text-[10px] text-gray-400 space-y-0.5">
        <p>Drag to rotate | Scroll to zoom | Right-click to pan</p>
        <p>
          <span className="text-red-400">Red=Top</span>,{' '}
          <span className="text-pink-400">Pink=Sides</span>,{' '}
          <span className="text-blue-400">Blue=Ground</span>,{' '}
          <span className="text-gray-300">White=Context</span>
        </p>
      </div>
    </div>
  )
}
