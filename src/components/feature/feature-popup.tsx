'use client'

import React from "react"
import { useState, useRef } from 'react'
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonInput,
  IonToggle,
  IonSpinner,
  IonNote,
  IonActionSheet,
  useIonToast,
} from '@ionic/react'
import {
  closeOutline,
  heartOutline,
  heart,
  eyeOutline,
  eye,
  chevronBackOutline,
  chevronForwardOutline,
  copyOutline,
  navigateOutline,
  addOutline,
  linkOutline,
  logoYoutube,
  alertCircleOutline,
  expandOutline,
  contractOutline,
} from 'ionicons/icons'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LidarViewer } from '@/components/viewer/lidar-viewer'
import { ClimbSection } from './climb-section'
import { PhotoSection } from './photo-section'
import { CommentSection } from './comment-section'
import type { Feature } from '@/lib/types'

interface FeaturePopupProps {
  feature: Feature
  onClose: () => void
  onGoTo: (feature: Feature) => void
  nearbyFeatures: Feature[]
}

export function FeaturePopup({ feature: initialFeature, onClose, onGoTo, nearbyFeatures }: FeaturePopupProps) {
  const [feature, setFeature] = useState(initialFeature)
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false)
  const [isPublished, setIsPublished] = useState(feature.isPublished)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasLocalEdits, setHasLocalEdits] = useState(feature.hasLocalEdits)
  const [waitingForSignal, setWaitingForSignal] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [showNotARockSheet, setShowNotARockSheet] = useState(false)
  const scrollRef = useRef<HTMLIonContentElement>(null)
  const startX = useRef(0)

  const [present] = useIonToast()

  const currentIndex = nearbyFeatures.findIndex(f => f.id === feature.id)

  // Haptic feedback helper
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style })
      } catch (e) {
        // Haptics not available
      }
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    triggerHaptic(ImpactStyle.Light)
    if (direction === 'right' && currentIndex > 0) {
      setFeature(nearbyFeatures[currentIndex - 1])
    } else if (direction === 'left' && currentIndex < nearbyFeatures.length - 1) {
      setFeature(nearbyFeatures[currentIndex + 1])
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX
    const diff = startX.current - endX
    if (Math.abs(diff) > 50) {
      handleSwipe(diff > 0 ? 'left' : 'right')
    }
  }

  const handlePublishToggle = async (checked: boolean) => {
    setIsPublishing(true)
    triggerHaptic(ImpactStyle.Medium)

    const isOnline = navigator.onLine
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (!isOnline) {
      setWaitingForSignal(true)
    }

    setIsPublished(checked)
    setIsPublishing(false)

    present({
      message: checked ? 'Changes published' : 'Changes unpublished',
      duration: 1500,
      position: 'bottom',
    })
  }

  const copyGPS = () => {
    triggerHaptic()
    navigator.clipboard.writeText(`${feature.latitude}, ${feature.longitude}`)
    present({
      message: 'GPS coordinates copied',
      duration: 1500,
      position: 'bottom',
    })
  }

  const handleEdit = () => {
    setHasLocalEdits(true)
  }

  const metersToFeet = (m: number) => (m * 3.28084).toFixed(1)

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {currentIndex > 0 && (
              <IonButton onClick={() => handleSwipe('right')} className="native-button">
                <IonIcon icon={chevronBackOutline} />
              </IonButton>
            )}
          </IonButtons>
          <IonTitle>
            <div className="text-center">
              <div className="font-semibold">
                {feature.type === 'boulder' ? 'Boulder' : 'Cliff'}
              </div>
              <div className="text-xs text-muted-foreground font-mono">{feature.id}</div>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            {currentIndex < nearbyFeatures.length - 1 && (
              <IonButton onClick={() => handleSwipe('left')} className="native-button">
                <IonIcon icon={chevronForwardOutline} />
              </IonButton>
            )}
            <IonButton onClick={onClose} className="native-button">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        ref={scrollRef}
        scrollY={true}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 3D Viewer */}
        {/* 3D Viewer */}
        {feature.viewerUrl ? (
          <div className={`relative bg-background ${isViewerFullscreen ? 'fixed inset-0 z-50' : 'h-64 rounded-t-xl overflow-hidden'}`}>
            <iframe
              src={feature.viewerUrl}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {/* Fullscreen toggle */}
            <IonButton
              fill="clear"
              size="small"
              className="absolute bg-black/40 rounded-full native-button"
              style={{
                top: isViewerFullscreen ? 'calc(env(safe-area-inset-top, 16px) + 8px)' : '12px',
                right: '12px',
                '--padding-start': '8px',
                '--padding-end': '8px',
              }}
              onClick={() => setIsViewerFullscreen(!isViewerFullscreen)}
            >
              <IonIcon icon={isViewerFullscreen ? contractOutline : expandOutline} className="text-white text-xl" />
            </IonButton>
          </div>
        ) : (
          <LidarViewer
            feature={feature}
            isFullscreen={isViewerFullscreen}
            onToggleFullscreen={() => setIsViewerFullscreen(!isViewerFullscreen)}
            onNeedsRefinement={(type) => {
              console.log('Needs refinement:', type)
              handleEdit()
            }}
          />
        )}

        {/* Publish toggle bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            {isPublishing ? (
              <IonSpinner name="crescent" className="w-4 h-4" />
            ) : (
              <>
                <IonLabel className={`text-sm ${!hasLocalEdits ? 'text-muted-foreground' : 'text-foreground'}`}>
                  Publish
                </IonLabel>
                <IonToggle
                  checked={isPublished}
                  onIonChange={(e) => handlePublishToggle(e.detail.checked)}
                  disabled={!hasLocalEdits}
                  style={{ '--handle-width': '20px', '--handle-height': '20px' }}
                />
              </>
            )}
          </div>
          {waitingForSignal && (
            <IonNote color="warning" className="text-xs">Waiting for signal...</IonNote>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <IonChip
              color={feature.isFavorite ? 'primary' : 'medium'}
              onClick={() => {
                triggerHaptic(ImpactStyle.Medium)
                setFeature({ ...feature, isFavorite: !feature.isFavorite })
                handleEdit()
              }}
              className="native-button"
            >
              <IonIcon icon={feature.isFavorite ? heart : heartOutline} />
              <IonLabel>{feature.isFavorite ? 'Favorited' : 'Favorite'}</IonLabel>
            </IonChip>

            <IonChip
              color={feature.isSeen ? 'primary' : 'medium'}
              onClick={() => {
                triggerHaptic(ImpactStyle.Medium)
                setFeature({ ...feature, isSeen: !feature.isSeen })
                handleEdit()
              }}
              className="native-button"
            >
              <IonIcon icon={feature.isSeen ? eye : eyeOutline} />
              <IonLabel>{feature.isSeen ? 'Seen' : 'Mark Seen'}</IonLabel>
            </IonChip>

            <IonChip
              color={feature.notARock ? 'warning' : 'medium'}
              onClick={() => {
                triggerHaptic()
                setShowNotARockSheet(true)
              }}
              className="native-button"
            >
              <IonIcon icon={alertCircleOutline} />
              <IonLabel>{feature.notARock ? `Not a rock: ${feature.notARock}` : 'Not a rock?'}</IonLabel>
            </IonChip>
          </div>

          {/* Properties */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Height</span>
                <span className="text-foreground font-medium">{feature.height}m ({metersToFeet(feature.height)}ft)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length</span>
                <span className="text-foreground font-medium">{feature.length}m ({metersToFeet(feature.length)}ft)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Width</span>
                <span className="text-foreground font-medium">{feature.width}m ({metersToFeet(feature.width)}ft)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elevation</span>
                <span className="text-foreground font-medium">{feature.elevation}m ({metersToFeet(feature.elevation)}ft)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To road</span>
                <span className="text-foreground font-medium">{feature.distanceToRoad}m ({metersToFeet(feature.distanceToRoad)}ft)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bushwhack</span>
                <span className="text-foreground font-medium">{feature.bushwhackDistance}m ({metersToFeet(feature.bushwhackDistance)}ft)</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-mono text-foreground">
                {feature.latitude.toFixed(5)}° N, {Math.abs(feature.longitude).toFixed(5)}° W
              </p>
            </div>
            <div className="flex gap-2">
              <IonButton fill="outline" size="small" onClick={copyGPS} className="native-button">
                <IonIcon icon={copyOutline} slot="start" />
                Copy
              </IonButton>
              <IonButton size="small" onClick={() => {
                triggerHaptic(ImpactStyle.Medium)
                onGoTo(feature)
              }} className="native-button">
                <IonIcon icon={navigateOutline} slot="start" />
                Go
              </IonButton>
            </div>
          </div>

          {/* Climbs section */}
          <ClimbSection
            climbs={feature.climbs}
            photos={feature.photos}
            onAddClimb={(climb) => {
              setFeature({ ...feature, climbs: [...feature.climbs, climb] })
              handleEdit()
            }}
          />

          {/* Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Links</h3>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => setShowAddLink(!showAddLink)}
                className="native-button"
              >
                <IonIcon icon={addOutline} slot="start" />
                Add
              </IonButton>
            </div>

            {showAddLink && (
              <div className="flex gap-2">
                <IonInput
                  type="url"
                  placeholder="Paste URL..."
                  value={newLink}
                  onIonInput={(e) => setNewLink(e.detail.value || '')}
                  className="flex-1 bg-input rounded-lg"
                />
                <IonButton
                  size="small"
                  onClick={() => {
                    if (newLink) {
                      triggerHaptic()
                      handleEdit()
                      setNewLink('')
                      setShowAddLink(false)
                    }
                  }}
                  className="native-button"
                >
                  Add
                </IonButton>
              </div>
            )}

            {feature.links.length > 0 ? (
              <div className="space-y-2">
                {feature.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl active:bg-muted transition-colors"
                  >
                    <IonIcon
                      icon={link.type === 'video' ? logoYoutube : linkOutline}
                      className={link.type === 'video' ? 'text-red-500' : 'text-muted-foreground'}
                    />
                    <span className="text-sm text-foreground flex-1">{link.label || link.url}</span>
                  </a>
                ))}
              </div>
            ) : !showAddLink && (
              <p className="text-sm text-muted-foreground">No links added yet</p>
            )}
          </div>

          {/* Photos */}
          <PhotoSection
            photos={feature.photos}
            onAddPhoto={(photo) => {
              setFeature({ ...feature, photos: [...feature.photos, photo] })
              handleEdit()
            }}
          />

          {/* Comments */}
          <CommentSection
            comments={feature.comments}
            onAddComment={(comment) => {
              setFeature({ ...feature, comments: [...feature.comments, comment] })
              handleEdit()
            }}
          />

          {/* Bottom padding for safe area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
        </div>
      </IonContent>

      {/* Not A Rock Action Sheet */}
      <IonActionSheet
        isOpen={showNotARockSheet}
        onDidDismiss={() => setShowNotARockSheet(false)}
        header="Mark as not a rock"
        buttons={[
          {
            text: 'Tree / Vegetation',
            handler: () => {
              setFeature({ ...feature, notARock: 'tree' })
              handleEdit()
            },
          },
          {
            text: 'Building / Structure',
            handler: () => {
              setFeature({ ...feature, notARock: 'building' })
              handleEdit()
            },
          },
          {
            text: 'Other',
            handler: () => {
              setFeature({ ...feature, notARock: 'other' })
              handleEdit()
            },
          },
          {
            text: 'Clear (it is a rock)',
            handler: () => {
              setFeature({ ...feature, notARock: null })
              handleEdit()
            },
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />
    </>
  )
}
