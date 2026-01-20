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
  IonTextarea,
  IonSpinner,
  IonNote,
  IonActionSheet,
  useIonToast,
  useIonAlert,
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
  helpCircleOutline,
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
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkType, setNewLinkType] = useState('other')
  const [newLinkDesc, setNewLinkDesc] = useState('')
  const [showFixSheet, setShowFixSheet] = useState(false)
  const scrollRef = useRef<HTMLIonContentElement>(null)
  const startX = useRef(0)

  const [present] = useIonToast()
  const [presentAlert] = useIonAlert()

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
        {feature.viewerUrl ? (
          <div className={`relative bg-background ${isViewerFullscreen ? 'fixed inset-0 z-50' : 'h-64 rounded-t-xl overflow-hidden'}`}>
            <iframe
              src={feature.viewerUrl}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {/* Fullscreen toggle removed
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
            */}
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

        {/* Publish toggle moved down */}

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
              className="native-button px-3"
            >
              <IonIcon icon={feature.isFavorite ? heart : heartOutline} className="mr-2" />
              <IonLabel>{feature.isFavorite ? 'Favorited' : 'Favorite'}</IonLabel>
            </IonChip>

            <IonChip
              color={feature.isSeen ? 'primary' : 'medium'}
              onClick={() => {
                triggerHaptic(ImpactStyle.Medium)
                setFeature({ ...feature, isSeen: !feature.isSeen })
                handleEdit()
              }}
              className="native-button px-3"
            >
              <IonIcon icon={feature.isSeen ? eye : eyeOutline} className="mr-2" />
              <IonLabel>{feature.isSeen ? 'Seen' : 'Mark Seen'}</IonLabel>
            </IonChip>

            <IonChip
              color={feature.notARock || feature.needsRefinement ? 'warning' : 'medium'}
              onClick={() => {
                triggerHaptic()
                setShowFixSheet(true)
              }}
              className="native-button px-3"
            >
              <IonIcon icon={alertCircleOutline} className="mr-2" />
              <IonLabel>Suggest a fix</IonLabel>
            </IonChip>
          </div>

          {/* Properties */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {/* Left Column: Dimensions */}
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="text-right text-muted-foreground">Height</div>
                <div className="text-left font-medium text-foreground">{feature.height.toFixed(1)}m / {metersToFeet(feature.height)}ft</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="text-right text-muted-foreground">Length</div>
                <div className="text-left font-medium text-foreground">{feature.length.toFixed(1)}m / {metersToFeet(feature.length)}ft</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="text-right text-muted-foreground">Width</div>
                <div className="text-left font-medium text-foreground">{feature.width.toFixed(1)}m / {metersToFeet(feature.width)}ft</div>
              </div>
            </div>

            {/* Right Column: Location/Access Stats */}
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="text-right text-muted-foreground">Elevation</div>
                <div className="text-left font-medium text-foreground">{feature.elevation.toFixed(1)}m / {metersToFeet(feature.elevation)}ft</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="text-right text-muted-foreground">To road</div>
                <div className="text-left font-medium text-foreground">{feature.distanceToRoad.toFixed(1)}m / {metersToFeet(feature.distanceToRoad)}ft</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="text-right text-muted-foreground">Bushwhack</div>
                <div className="text-left font-medium text-foreground">{feature.bushwhackDistance.toFixed(1)}m / {metersToFeet(feature.bushwhackDistance)}ft</div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-mono text-foreground">
                {feature.latitude.toFixed(7)}° N, {Math.abs(feature.longitude).toFixed(7)}° W
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

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Description</h3>
            <div className="bg-muted/30 rounded-lg p-2">
              <IonTextarea
                className="text-sm"
                placeholder="Add a description..."
                value={feature.description}
                onIonChange={e => {
                  setFeature({ ...feature, description: e.detail.value! })
                  handleEdit()
                }}
                autoGrow={true}
              />
            </div>
          </div>

          {/* Access */}
          <div className="space-y-2">
            <div className="space-y-1">
              <h3 className="font-medium text-foreground">Access</h3>
              <p className="text-xs text-muted-foreground">How to get there? Access concerns?</p>
            </div>
            {/* reusing comment section for now, or just a textarea like description? 
                 User said: "This will also allow comments regarding accessibility... I can't, people can "like" and reply to access issues posts."
                 Implies a full comment section. For now I'll add a placeholder or a secondary comment section.
                 Let's add a "Access details" text area for the main feature, and we can add a comment section specifically for access later if needed, 
                 but the user prompt suggests it acts like a forum.
                 Let's stick to a simple textarea for 'access notes' on the feature for now to match 'Description'.
              */}
            <div className="bg-muted/30 rounded-lg p-2">
              <IonTextarea
                className="text-sm"
                placeholder="Add access details..."
                value={feature.access || ''}
                onIonChange={e => {
                  setFeature({ ...feature, access: e.detail.value! })
                  handleEdit()
                }}
                autoGrow={true}
              />
            </div>
          </div>

          {/* Quick Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">Quick Notes (Private)</h3>
              <IonIcon
                icon={helpCircleOutline}
                className="text-muted-foreground"
                onClick={() => present({ message: 'Quick notes are for your eyes only. Use Comments for public notes.', duration: 3000 })}
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <IonTextarea
                className="text-sm"
                placeholder="Private notes..."
                value={feature.quickNotes}
                onIonChange={e => {
                  setFeature({ ...feature, quickNotes: e.detail.value! })
                  handleEdit()
                }}
                autoGrow={true}
              />
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
            publishControl={
              <div className="flex items-center justify-between px-3 py-2 border rounded-lg bg-card/50">
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
                        onIonChange={(e) => {
                          const checked = e.detail.checked;
                          if (!checked) {
                            // Prevent immediate toggle, show alert
                            // But IonToggle might have already changed state visually.
                            // We need to handle this carefully.
                            // Usually we let it toggle, then if they cancel, toggling it back.
                            // Better: check e.detail.value/checked.
                            // If Unpublishing (checked == false)
                            setIsPublished(false); // Update state to reflect user action for now
                            presentAlert({
                              header: 'Unpublish?',
                              message: 'Unpublishing will make your edits invisible to other users. Your comments will remain visible. Are you sure?',
                              buttons: [
                                {
                                  text: 'Cancel',
                                  role: 'cancel',
                                  handler: () => setIsPublished(true) // Revert
                                },
                                {
                                  text: 'Unpublish',
                                  role: 'confirm',
                                  handler: () => handlePublishToggle(false)
                                }
                              ]
                            })
                          } else {
                            handlePublishToggle(true)
                          }
                        }}
                        disabled={!hasLocalEdits}
                        style={{ '--handle-width': '22px', '--handle-height': '22px' }}
                      />
                    </>
                  )}
                </div>
                {waitingForSignal && (
                  <IonNote color="warning" className="text-xs">Waiting for signal...</IonNote>
                )}
              </div>
            }
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
                {showAddLink ? (
                  <>Cancel</>
                ) : (
                  <>
                    <IonIcon icon={addOutline} slot="start" />
                    Add Link
                  </>
                )}
              </IonButton>
            </div>

            {showAddLink && (
              <div className="bg-muted/30 p-3 rounded-lg space-y-3">
                <div className="flex gap-2">
                  <select
                    className="bg-card rounded px-2 py-1 text-sm border-none flex-1"
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                  >
                    <option value="mountainProject">Mountain Project</option>
                    <option value="beta">Beta.io</option>
                    <option value="thecrag">TheCrag.com</option>
                    <option value="video">Video</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <IonInput
                  type="url"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onIonInput={(e) => setNewLinkUrl(e.detail.value || '')}
                  className="flex-1 bg-card rounded px-2 text-sm"
                />
                <IonInput
                  placeholder="Description (optional)"
                  value={newLinkDesc}
                  onIonInput={(e) => setNewLinkDesc(e.detail.value || '')}
                  className="bg-card rounded px-2 text-sm"
                />
                <div className="flex justify-end gap-2">
                  <IonButton
                    size="small"
                    fill="clear"
                    onClick={() => setShowAddLink(false)}
                  >
                    Cancel
                  </IonButton>
                  <IonButton
                    size="small"
                    onClick={() => {
                      if (newLinkUrl) {
                        triggerHaptic()
                        handleEdit()
                        setFeature({
                          ...feature,
                          links: [...feature.links, { type: newLinkType as any, url: newLinkUrl, label: newLinkDesc }]
                        })
                        setNewLinkUrl('')
                        setNewLinkDesc('')
                        setShowAddLink(false)
                      }
                    }}
                  >
                    <IonIcon icon={navigateOutline /* Send arrow? navigateOutline looks like one */} slot="end" />
                    Add
                  </IonButton>
                </div>
              </div>
            )}

            {feature.links.length > 0 ? (
              <div className="space-y-2">
                {feature.links.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl active:bg-muted transition-colors"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-2"
                    >
                      <IonIcon
                        icon={link.type === 'video' ? logoYoutube : linkOutline}
                        className={link.type === 'video' ? 'text-red-500' : 'text-muted-foreground'}
                      />
                      <span className="text-sm text-foreground flex-1">{link.label || link.url}</span>
                    </a>
                    <IonButton
                      fill="clear"
                      size="small"
                      color="medium"
                      onClick={() => {
                        setFeature({
                          ...feature,
                          links: feature.links.filter((_, index) => index !== i)
                        })
                        handleEdit()
                      }}
                    >
                      <IonIcon icon={closeOutline} />
                    </IonButton>
                  </div>
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
            onUpdatePhoto={(updatedPhoto) => {
              const old = feature.photos.find(p => p.id === updatedPhoto.id)
              const isVisibilityChange = old && old.isPrivate !== updatedPhoto.isPrivate

              if (isVisibilityChange) {
                presentAlert({
                  header: updatedPhoto.isPrivate ? 'Unpublish Photo?' : 'Publish Photo?',
                  message: updatedPhoto.isPrivate
                    ? 'This photo will no longer be visible to others. Continue?'
                    : 'This photo will be visible to everyone. Continue?',
                  buttons: [
                    { text: 'Cancel', role: 'cancel' },
                    {
                      text: 'Confirm',
                      role: 'confirm',
                      handler: () => {
                        setFeature({
                          ...feature,
                          photos: feature.photos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p)
                        })
                        handleEdit()
                      }
                    }
                  ]
                })
              } else {
                setFeature({
                  ...feature,
                  photos: feature.photos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p)
                })
                handleEdit()
              }
            }}
            onDeletePhoto={(photoId) => {
              presentAlert({
                header: 'Delete Photo?',
                message: 'Are you sure you want to delete this photo?',
                buttons: [
                  { text: 'Cancel', role: 'cancel' },
                  {
                    text: 'Delete',
                    role: 'destructive',
                    handler: () => {
                      setFeature({
                        ...feature,
                        photos: feature.photos.filter(p => p.id !== photoId)
                      })
                      handleEdit()
                    }
                  }
                ]
              })
            }}
            onReportPhoto={(photoId) => {
              present({
                message: 'Photo reported. Thank you.',
                duration: 2000,
                color: 'success'
              })
            }}
          />

          {/* Comments */}
          <CommentSection
            comments={feature.comments}
            onCommentsChange={(newComments) => {
              setFeature({ ...feature, comments: newComments })
              handleEdit()
            }}
          />

          {/* Bottom padding for safe area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
        </div>
      </IonContent>

      <IonActionSheet
        isOpen={showFixSheet}
        onDidDismiss={() => setShowFixSheet(false)}
        header="Suggest a fix"
        buttons={[
          {
            text: 'Tree / Vegetation',
            handler: () => {
              setFeature({ ...feature, notARock: 'tree', needsRefinement: null })
              handleEdit()
            },
          },
          {
            text: 'Building / Structure',
            handler: () => {
              setFeature({ ...feature, notARock: 'building', needsRefinement: null })
              handleEdit()
            },
          },
          {
            text: 'Missing part of rock',
            handler: () => {
              setFeature({ ...feature, notARock: null, needsRefinement: 'missing' })
              handleEdit()
            },
          },
          {
            text: 'Includes non-rock',
            handler: () => {
              setFeature({ ...feature, notARock: null, needsRefinement: 'extra' })
              handleEdit()
            },
          },
          {
            text: 'Other',
            handler: () => {
              setFeature({ ...feature, notARock: 'other', needsRefinement: null })
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
