'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  IonPage,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonToast,
  useIonViewDidEnter,
} from '@ionic/react'
import { menuOutline, filterOutline, locateOutline, layersOutline, downloadOutline } from 'ionicons/icons'
import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

import { MapLegend } from '@/components/map/map-legend'
import { FilterPanel } from '@/components/map/filter-panel'
import { FeaturePopup } from '@/components/feature/feature-popup'
import { HamburgerMenu } from '@/components/menu/hamburger-menu'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { ProfilePanel } from '@/components/profile/profile-panel'
import { OfflinePanel } from '@/components/offline/offline-panel'
import { HelpPanel } from '@/components/support/help-panel'
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
  minBoulderDifficulty: null,
  maxBoulderDifficulty: null,
  minRouteDifficulty: null,
  maxRouteDifficulty: null,
}

function smoothAngle(prev: number, next: number, alpha = 0.05) {
  if (prev < 0) return next
  let delta = next - prev
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return (prev + delta * alpha + 360) % 360
}

export default function Home() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [goToFeature, setGoToFeature] = useState<Feature | null>(null)
  const [filter, setFilter] = useState<MapFilter>(defaultFilter)
  const [showSatellite, setShowSatellite] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'data' | 'privacy' | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOfflineOpen, setIsOfflineOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [centerOnUserTrigger, setCenterOnUserTrigger] = useState(0)

  // Device orientation support - SIMPLIFIED VERSION
  // Initialize real GPS location with unified compass handling
  useEffect(() => {
    let watchId: string | null = null
    let fallbackInterval: NodeJS.Timeout | null = null
    let isUsingGPSHeading = false

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Don't update if GPS is providing heading
      if (isUsingGPSHeading) return

      let heading: number | null = null

      if ((event as any).webkitCompassHeading !== undefined) {
        heading = (event as any).webkitCompassHeading
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha
      }

      if (heading !== null) {
        setUserLocation(prev => {
          if (!prev) return null
          // Larger deadband (5°) to reduce jitter
          if (Math.abs(heading! - prev.heading) < 5) return prev
          return { ...prev, heading }
        })
      }
    }

    const startFallbackSimulation = () => {
      // Fall back to simulated location for development
      setUserLocation({ lat: 47.783, lng: -91.687, heading: 45 })

      // Simulate heading changes in dev mode
      const interval = setInterval(() => {
        setUserLocation(prev => prev ? {
          ...prev,
          heading: (prev.heading + 1) % 360,
        } : null)
      }, 100)

      return interval
    }

    const initLocation = async () => {
      try {
        // Check if we're on a native platform
        if (Capacitor.isNativePlatform()) {
          // Request permissions
          const permission = await Geolocation.requestPermissions()
          if (permission.location !== 'granted') {
            setLocationError('Location permission denied')
            // Fall back to simulated location
            fallbackInterval = startFallbackSimulation()
            return
          }
        }

        // Request compass permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
            await (DeviceOrientationEvent as any).requestPermission()
          } catch (e) {
            console.warn('Compass permission denied')
          }
        }

        // Attach compass listener
        window.addEventListener('deviceorientation', handleOrientation)

        // Get initial position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        })

        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: (position.coords.heading !== null && position.coords.heading >= 0) ? position.coords.heading : -1,
        })

        // Watch position changes
        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (err) {
              console.error('Location watch error:', {
                code: (err as any).code,
                message: (err as any).message,
                original: err
              })
              // If watch fails, trigger fallback simulation if not already started
              fallbackInterval = startFallbackSimulation()
              return
            }
            if (position) {
              const gpsHeading = position.coords.heading
              const speed = position.coords.speed ?? 0

              // Toggle compass based on speed
              if (speed > 1 && gpsHeading !== null && gpsHeading >= 0) {
                // We're moving with valid GPS heading - use GPS, ignore compass
                isUsingGPSHeading = true
                setUserLocation(prev => {
                  const smoothed = smoothAngle(prev?.heading ?? -1, gpsHeading, 0.3) // Faster smoothing for GPS
                  return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    heading: smoothed,
                  }
                })
              } else {
                // We're stationary - enable compass
                isUsingGPSHeading = false
                setUserLocation(prev => {
                  return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    heading: prev?.heading ?? -1, // Keep current heading
                  }
                })
              }
            }
          }
        )
      } catch (err) {
        console.error('Location error:', err)
        fallbackInterval = startFallbackSimulation()
      }
    }

    initLocation()

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId })
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
      }
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])



  // Haptic feedback helper
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style })
      } catch (e) {
        // Haptics not available
      }
    }
  }, [])

  const handleFeatureSelect = useCallback((feature: Feature) => {
    triggerHaptic(ImpactStyle.Medium)
    setSelectedFeature(feature)
    setGoToFeature(null)
  }, [triggerHaptic])

  const handleGoTo = useCallback((feature: Feature) => {
    triggerHaptic(ImpactStyle.Light)
    setSelectedFeature(null)
    setGoToFeature(feature)
    setToastMessage(`Navigating to ${feature.type}...`)
    setShowToast(true)
  }, [triggerHaptic])

  const handleDownloadRegion = useCallback(() => {
    triggerHaptic(ImpactStyle.Medium)
    setIsDownloading(true)
    setToastMessage('Downloading region for offline use...')
    setShowToast(true)
    setTimeout(() => {
      setIsDownloading(false)
      setToastMessage('Region downloaded successfully!')
      setShowToast(true)
    }, 3000)
  }, [triggerHaptic])

  const handleCenterOnUser = useCallback(async () => {
    triggerHaptic(ImpactStyle.Light)

    // Request device orientation permission (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission()
        if (permissionState === 'granted') {
          // Listener already attached in useEffect, but maybe re-attach or it just starts working
        }
      } catch (e) {
        console.error('Orientation permission error:', e)
      }
    }

    // If we have location, just center
    if (userLocation) {
      setCenterOnUserTrigger(prev => prev + 1)
      return
    }

    setToastMessage('Locating you...')
    setShowToast(true)

    try {
      // Check permissions first
      const permissionStatus = await Geolocation.checkPermissions()

      if (permissionStatus.location !== 'granted') {
        const requested = await Geolocation.requestPermissions()
        if (requested.location !== 'granted') {
          setToastMessage('Location permission denied.')
          setShowToast(true)
          return
        }
      }

      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      })

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: (position.coords.heading !== null && position.coords.heading >= 0)
          ? position.coords.heading
          : -1
      })
      setToastMessage('Found you!')
      setShowToast(true)
      // Also trigger center
      setCenterOnUserTrigger(prev => prev + 1)

    } catch (e) {
      console.error('Manual location check failed:', e)
      setToastMessage('Could not find location.')
      setShowToast(true)
    }
  }, [userLocation, triggerHaptic])

  const handleToggleSatellite = useCallback(() => {
    triggerHaptic(ImpactStyle.Light)
    setShowSatellite(!showSatellite)
  }, [showSatellite, triggerHaptic])

  // Get nearby features for swipe navigation
  const nearbyFeatures = mockFeatures.filter(f => {
    if (!filter.types.includes(f.type)) return false
    if (!filter.notARock && f.notARock !== null) return false
    return true
  })

  return (
    <>
      {/* Side Menu */}
      <IonMenu contentId="main-content" side="start">
        <HamburgerMenu
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
          onOpenSettings={(section) => {
            setIsMenuOpen(false)
            setSettingsSection(section)
          }}
          onOpenProfile={() => {
            setIsMenuOpen(false)
            setIsProfileOpen(true)
          }}
          onOpenOffline={() => {
            setIsMenuOpen(false)
            setIsOfflineOpen(true)
          }}
          onOpenHelp={() => {
            setIsMenuOpen(false)
            setIsHelpOpen(true)
          }}
        />
      </IonMenu>

      <IonPage id="main-content">
        <IonContent fullscreen scrollY={false}>
          {/* Map Container */}
          <div className="map-container">
            <MapView
              onFeatureSelect={handleFeatureSelect}
              filter={filter}
              showSatellite={showSatellite}
              goToFeature={goToFeature}
              userLocation={userLocation}
              centerOnUserTrigger={centerOnUserTrigger}
            />
          </div>

          {/* Map legend */}
          <MapLegend showScannedAreas={true} />

          {/* Menu Button - Top Left with Safe Area */}
          <IonFab vertical="top" horizontal="start" slot="fixed" style={{ marginTop: 'env(safe-area-inset-top, 16px)' }}>
            <IonFabButton
              size="small"
              color="dark"
              className="native-button"
            >
              <IonMenuButton />
            </IonFabButton>
          </IonFab>

          {/* Map Controls - Bottom Right */}
          <div
            className="fixed right-4 flex flex-col gap-2 z-10"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 16px) + 80px)' }}
          >
            {/* Filter Button */}
            <IonFabButton
              size="small"
              color="dark"
              onClick={() => {
                triggerHaptic()
                setIsFilterOpen(true)
              }}
              className="native-button"
            >
              <IonIcon icon={filterOutline} />
            </IonFabButton>

            {/* Satellite Toggle */}
            <IonFabButton
              size="small"
              color={showSatellite ? 'primary' : 'dark'}
              onClick={handleToggleSatellite}
              className="native-button"
            >
              <IonIcon icon={layersOutline} />
            </IonFabButton>

            {/* Download Region */}
            <IonFabButton
              size="small"
              color="dark"
              onClick={handleDownloadRegion}
              disabled={isDownloading}
              className="native-button"
            >
              <IonIcon icon={downloadOutline} />
            </IonFabButton>

            {/* Center on User */}
            <IonFabButton
              size="small"
              color="dark"
              onClick={handleCenterOnUser}
              className="native-button"
            >
              <IonIcon icon={locateOutline} />
            </IonFabButton>
          </div>

          {/* Go mode indicator */}
          {goToFeature && (
            <div
              className="fixed left-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border z-20"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Navigating to {goToFeature.type === 'boulder' ? 'Boulder' : 'Cliff'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{goToFeature.id}</p>
                </div>
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => {
                    triggerHaptic()
                    setGoToFeature(null)
                  }}
                >
                  Cancel
                </IonButton>
              </div>
            </div>
          )}
        </IonContent>

        {/* Filter Modal */}
        <IonModal
          isOpen={isFilterOpen}
          onDidDismiss={() => setIsFilterOpen(false)}
          initialBreakpoint={0.75}
          breakpoints={[0, 0.5, 0.75, 1]}
          handleBehavior="cycle"
        >
          <FilterPanel
            filter={filter}
            onFilterChange={setFilter}
            isOpen={true}
            onToggle={() => setIsFilterOpen(false)}
          />
        </IonModal>

        {/* Feature Popup Modal */}
        <IonModal
          isOpen={selectedFeature !== null}
          onDidDismiss={() => setSelectedFeature(null)}
          initialBreakpoint={0.85}
          breakpoints={[0, 0.5, 0.85, 1]}
          handleBehavior="cycle"
        >
          {selectedFeature && (
            <FeaturePopup
              feature={selectedFeature}
              onClose={() => setSelectedFeature(null)}
              onGoTo={handleGoTo}
              nearbyFeatures={nearbyFeatures}
            />
          )}
        </IonModal>

        {/* Settings Modal */}
        <IonModal isOpen={settingsSection !== null} onDidDismiss={() => setSettingsSection(null)}>
          <SettingsPanel
            isOpen={settingsSection !== null}
            onClose={() => {
              setSettingsSection(null)
              setIsMenuOpen(true)
            }}
            section={settingsSection || 'appearance'}
          />
        </IonModal>

        {/* Profile Modal */}
        <IonModal isOpen={isProfileOpen} onDidDismiss={() => setIsProfileOpen(false)}>
          <ProfilePanel
            isOpen={isProfileOpen}
            onClose={() => {
              setIsProfileOpen(false)
              setIsMenuOpen(true)
            }}
          />
        </IonModal>

        {/* Help Panel */}
        <IonModal isOpen={isHelpOpen} onDidDismiss={() => setIsHelpOpen(false)}>
          <HelpPanel
            isOpen={isHelpOpen}
            onClose={() => {
              setIsHelpOpen(false)
              setIsMenuOpen(true)
            }}
          />
        </IonModal>

        {/* Offline Modal */}
        <IonModal isOpen={isOfflineOpen} onDidDismiss={() => setIsOfflineOpen(false)}>
          <OfflinePanel
            isOpen={isOfflineOpen}
            onClose={() => {
              setIsOfflineOpen(false)
              setIsMenuOpen(true)
            }}
          />
        </IonModal>

        {/* Toast notifications */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="bottom"
          positionAnchor="main-content"
        />
      </IonPage>
    </>
  )
}
