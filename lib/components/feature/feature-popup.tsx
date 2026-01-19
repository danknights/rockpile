'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { 
  X, Heart, Eye, Copy, Navigation, Camera, Link as LinkIcon, 
  ChevronLeft, ChevronRight, AlertCircle, Loader2, Plus,
  Mountain, ExternalLink, Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { LidarViewer } from '@/components/viewer/lidar-viewer'
import { ClimbSection } from './climb-section'
import { PhotoSection } from './photo-section'
import { CommentSection } from './comment-section'
import { NotARockDropdown } from './not-a-rock-dropdown'
import type { Feature } from '@/lib/types'
import { mockFeatures } from '@/lib/mock-data'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)

  const currentIndex = nearbyFeatures.findIndex(f => f.id === feature.id)

  const handleSwipe = (direction: 'left' | 'right') => {
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
    // Simulate network request
    const isOnline = navigator.onLine
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (!isOnline) {
      setWaitingForSignal(true)
    }
    
    setIsPublished(checked)
    setIsPublishing(false)
  }

  const copyGPS = () => {
    navigator.clipboard.writeText(`${feature.latitude}, ${feature.longitude}`)
  }

  const handleEdit = () => {
    setHasLocalEdits(true)
  }

  const metersToFeet = (m: number) => (m * 3.28084).toFixed(1)

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="relative w-full max-w-lg h-[85vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full"
            onClick={() => handleSwipe('right')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {currentIndex < nearbyFeatures.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full"
            onClick={() => handleSwipe('left')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        {/* 3D Viewer */}
        <LidarViewer
          feature={feature}
          isFullscreen={isViewerFullscreen}
          onToggleFullscreen={() => setIsViewerFullscreen(!isViewerFullscreen)}
          onNeedsRefinement={(type) => {
            console.log('Needs refinement:', type)
            handleEdit()
          }}
        />

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Header with publish toggle */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-4 py-3 border-b border-border flex items-center justify-between z-10">
            <div>
              <h2 className="font-semibold text-foreground">
                {feature.type === 'boulder' ? 'Boulder' : 'Cliff'}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">{feature.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <>
                  <Label htmlFor="publish" className={`text-sm ${!hasLocalEdits ? 'text-muted-foreground' : 'text-foreground'}`}>
                    Publish
                  </Label>
                  <Switch
                    id="publish"
                    checked={isPublished}
                    onCheckedChange={handlePublishToggle}
                    disabled={!hasLocalEdits}
                  />
                </>
              )}
            </div>
          </div>

          {waitingForSignal && (
            <div className="px-4 py-1 bg-yellow-500/10 text-yellow-500 text-xs text-center">
              Waiting for signal...
            </div>
          )}

          <div className="p-4 space-y-6">
            {/* Quick actions */}
            <div className="flex items-center gap-3">
              <Button
                variant={feature.isFavorite ? 'default' : 'outline'}
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => {
                  setFeature({ ...feature, isFavorite: !feature.isFavorite })
                  handleEdit()
                }}
              >
                <Heart className={`h-4 w-4 ${feature.isFavorite ? 'fill-current' : ''}`} />
                {feature.isFavorite ? 'Favorited' : 'Favorite'}
              </Button>
              <Button
                variant={feature.isSeen ? 'default' : 'outline'}
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => {
                  setFeature({ ...feature, isSeen: !feature.isSeen })
                  handleEdit()
                }}
              >
                <Eye className="h-4 w-4" />
                {feature.isSeen ? 'Seen' : 'Mark Seen'}
              </Button>
              <NotARockDropdown
                value={feature.notARock}
                onChange={(value) => {
                  setFeature({ ...feature, notARock: value })
                  handleEdit()
                }}
              />
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
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-mono text-foreground">
                  {feature.latitude.toFixed(5)}° N, {Math.abs(feature.longitude).toFixed(5)}° W
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyGPS}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
                <Button variant="default" size="sm" onClick={() => onGoTo(feature)}>
                  <Navigation className="h-3.5 w-3.5 mr-1" />
                  Go
                </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddLink(!showAddLink)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {showAddLink && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste URL..."
                    className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newLink) {
                        handleEdit()
                        setNewLink('')
                        setShowAddLink(false)
                      }
                    }}
                  >
                    Add
                  </Button>
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
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      {link.type === 'mountainProject' && <Mountain className="h-4 w-4 text-orange-500" />}
                      {link.type === 'video' && <Play className="h-4 w-4 text-red-500" />}
                      {link.type === 'other' && <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm text-foreground flex-1">{link.label || link.url}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
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
          </div>
        </div>
      </div>
    </div>
  )
}
