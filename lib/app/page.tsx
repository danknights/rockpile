'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapLegend } from '@/components/map/map-legend'
import { MapControls } from '@/components/map/map-controls'
import { FilterPanel } from '@/components/map/filter-panel'
import { FeaturePopup } from '@/components/feature/feature-popup'
import { HamburgerMenu } from '@/components/menu/hamburger-menu'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { ProfilePanel } from '@/components/profile/profile-panel'
import { OfflinePanel } from '@/components/offline/offline-panel'
import { mockFeatures } from '@/lib/mock-data'
import type { Feature, MapFilter } from '@/lib/types'

// Dynamically import MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import('@/components/map/map-view').then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

const defaultFilter: MapFilter = {
  types: ['boulder', 'cliff'],
  seenByAnyone: null,
  seenByUser: null,
  minHeight: null,
  maxHeight: null,
  minWidth: null,
  maxWidth: null,
  maxDistanceToRoad: null,
  maxBushwhack: null,
  favorites: false,
  hasClimbs: false,
  hasProjects: false,
  hasPossibleLines: false,
  notARock: false,
}

export default function Home() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [goToFeature, setGoToFeature] = useState<Feature | null>(null)
  const [filter, setFilter] = useState<MapFilter>(defaultFilter)
  const [showSatellite, setShowSatellite] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOfflineOpen, setIsOfflineOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null)

  // Simulate user location for demo
  useEffect(() => {
    setUserLocation({
      lat: 47.783,
      lng: -91.687,
      heading: 45,
    })

    // Simulate heading changes
    const interval = setInterval(() => {
      setUserLocation(prev => prev ? {
        ...prev,
        heading: (prev.heading + 1) % 360,
      } : null)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleFeatureSelect = useCallback((feature: Feature) => {
    setSelectedFeature(feature)
    setGoToFeature(null) // Clear navigation when selecting a feature
  }, [])

  const handleGoTo = useCallback((feature: Feature) => {
    setSelectedFeature(null)
    setGoToFeature(feature)
  }, [])

  const handleDownloadRegion = () => {
    setIsDownloading(true)
    setTimeout(() => setIsDownloading(false), 3000)
  }

  const handleCenterOnUser = () => {
    // In real app, this would pan the map to user location
    console.log('Centering on user')
  }

  // Get nearby features for swipe navigation
  const nearbyFeatures = mockFeatures.filter(f => {
    if (!filter.types.includes(f.type)) return false
    if (!filter.notARock && f.notARock !== null) return false
    return true
  })

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map */}
      <MapView
        onFeatureSelect={handleFeatureSelect}
        filter={filter}
        showSatellite={showSatellite}
        goToFeature={goToFeature}
        userLocation={userLocation}
      />

      {/* Map legend */}
      <MapLegend showScannedAreas={true} />

      {/* Hamburger menu button */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onToggle={() => setIsMenuOpen(!isMenuOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenOffline={() => setIsOfflineOpen(true)}
      />

      {/* Filter panel */}
      <FilterPanel
        filter={filter}
        onFilterChange={setFilter}
        isOpen={isFilterOpen}
        onToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      {/* Map controls */}
      <MapControls
        showSatellite={showSatellite}
        onToggleSatellite={() => setShowSatellite(!showSatellite)}
        onDownloadRegion={handleDownloadRegion}
        onCenterOnUser={handleCenterOnUser}
        isDownloading={isDownloading}
      />

      {/* Go mode indicator */}
      {goToFeature && (
        <div className="absolute bottom-24 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Navigating to {goToFeature.type === 'boulder' ? 'Boulder' : 'Cliff'}
              </p>
              <p className="text-xs text-muted-foreground font-mono">{goToFeature.id}</p>
            </div>
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => setGoToFeature(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feature popup */}
      {selectedFeature && (
        <FeaturePopup
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onGoTo={handleGoTo}
          nearbyFeatures={nearbyFeatures}
        />
      )}

      {/* Settings panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Profile panel */}
      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Offline panel */}
      <OfflinePanel
        isOpen={isOfflineOpen}
        onClose={() => setIsOfflineOpen(false)}
      />
    </div>
  )
}
