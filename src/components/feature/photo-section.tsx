'use client'

import React from "react"
import { useState, useRef, useEffect } from 'react'
import { Camera, Plus, Check, Undo, Redo, X, Eye, EyeOff, MoreHorizontal, Flag, Trash2, PenTool, Copy, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Photo } from '@/lib/types'

interface PhotoSectionProps {
  photos: Photo[]
  onAddPhoto: (photo: Photo) => void
  onUpdatePhoto?: (photo: Photo) => void
  onDeletePhoto?: (photoId: string) => void
  onReportPhoto?: (photoId: string) => void
}

export function PhotoSection({ photos, onAddPhoto, onUpdatePhoto, onDeletePhoto, onReportPhoto }: PhotoSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [annotations, setAnnotations] = useState<string[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<{ x: number; y: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isPrivate, setIsPrivate] = useState(true) // Default to private
  const fileInputRef = useRef<HTMLInputElement>(null)

  const myPhotos = photos.filter(p => p.userId === 'user-1')
  const otherPhotos = photos.filter(p => p.userId !== 'user-1')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setIsAdding(true)
      setIsAnnotating(true) // Immediately enable drawing
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotating) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCurrentAnnotation([{ x, y }])
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotating || currentAnnotation.length === 0) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCurrentAnnotation(prev => [...prev, { x, y }])

    // Draw
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && currentAnnotation.length > 0) {
      const last = currentAnnotation[currentAnnotation.length - 1]
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#ec4899' // Pink
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  }

  const handleCanvasMouseUp = () => {
    if (currentAnnotation.length > 0) {
      setAnnotations(prev => [...prev, JSON.stringify(currentAnnotation)])
      setCurrentAnnotation([])
    }
  }

  const handleUndo = () => {
    if (annotations.length > 0) {
      setAnnotations(prev => prev.slice(0, -1))
      redrawCanvas()
    }
  }

  const redrawCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    if (ctx && previewUrl) {
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
        ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height)

        annotations.slice(0, -1).forEach(annotation => {
          const points = JSON.parse(annotation)
          if (points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            points.forEach((p: { x: number; y: number }) => ctx.lineTo(p.x, p.y))
            ctx.strokeStyle = '#ec4899'
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.stroke()
          }
        })
      }
      img.src = previewUrl
    }
  }

  useEffect(() => {
    if (previewUrl && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (ctx && canvasRef.current) {
          // Responsive sizing based on image aspect ratio, max height 50vh (approx 300-400px on mobile)
          const MAX_HEIGHT = window.innerHeight * 0.5;
          const scale = Math.min(1, MAX_HEIGHT / img.height);

          canvasRef.current.width = img.width * scale
          canvasRef.current.height = img.height * scale
          ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
      img.src = previewUrl
    }
  }, [previewUrl])

  const handleSave = () => {
    const newPhoto: Photo = {
      id: `photo-${Date.now()}`,
      url: previewUrl || '',
      thumbnailUrl: previewUrl || '',
      userId: 'user-1',
      userName: 'Current User',
      note: note || undefined,
      annotations: annotations.length > 0 ? JSON.stringify(annotations) : undefined,
      createdAt: new Date().toISOString(),
      isPrivate,
    }

    onAddPhoto(newPhoto)
    setIsAdding(false)
    setPreviewUrl(null)
    setNote('')
    setAnnotations([])
    setIsAnnotating(false)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setPreviewUrl(null)
    setNote('')
    setAnnotations([])
    setIsAnnotating(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Photos</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-4 w-4 mr-1" />
          Add
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {isAdding && previewUrl && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg cursor-crosshair touch-none" // touch-none for drawing
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            // Add touch events for drawing
            />

            {/* Pink Marker Icon Indicator */}
            {isAnnotating && (
              <div className="absolute top-2 left-2 bg-pink-500 rounded-full p-1.5 shadow-lg">
                <PenTool className="h-4 w-4 text-white" />
              </div>
            )}

            <div className="absolute top-2 right-2 flex gap-1">
              {annotations.length > 0 && (
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={handleUndo}>
                  <Undo className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isAnnotating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsAnnotating(!isAnnotating)}
              className={isAnnotating ? 'bg-pink-500 hover:bg-pink-600' : ''}
            >
              {isAnnotating ? 'Drawing Active' : 'Draw annotations on the image'}
            </Button>
          </div>

          <textarea
            placeholder="Add a note..."
            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIsPrivate(!isPrivate)}
            >
              {isPrivate ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
              <span className="text-sm">{isPrivate ? 'Keep Private' : 'Public'}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave} className="px-6">Save Photo</Button>
            </div>
          </div>
        </div>
      )}

      {/* My Photos */}
      {myPhotos.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground ml-1">My Photos</span>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {myPhotos.map((photo) => (
              <div key={photo.id} className="relative group flex-shrink-0">
                <button
                  className="w-32 h-32 rounded-lg overflow-hidden border border-border relative"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={photo.thumbnailUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                </button>

                {/* Visibility Toggle */}
                <button
                  className="absolute top-1 left-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdatePhoto) {
                      const isPrivate = (photo as any).isPrivate; // Checking current status
                      // Logic handled by parent or here?
                      // User said: "If user clicks the eye, a little window pops up... publish this photo? ... unpublish this photo?"
                      // Currently I assume I just fire the update and the parent handles the alert/logic, 
                      // OR I do the alert here?
                      // The FeaturePopup handles alerts well (ionic). 
                      // Pass the intent to update, parent can intercept?
                      // Actually cleaner to do it here if I have useIonAlert? 
                      // PhotoSection doesn't use ionic.
                      // So I should trigger onUpdatePhoto with the NEW desired state, and parent can confirm?
                      // Or simply: onUpdatePhoto({ ...photo, isPrivate: !isPrivate })
                      // And parent does the checking?
                      // I'll assume passing the update to parent is enough for now, 
                      // but user wanted the popup. 
                      // I'll make onUpdatePhoto handle the logic. 'handlePhotoVisibilityToggle' in parent.
                      onUpdatePhoto({ ...photo, isPrivate: !(photo as any).isPrivate } as any)
                    }
                  }}
                >
                  {(photo as any).isPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>

                {/* Actions ... */}
                <div className="absolute top-1 right-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="bg-black/50 p-1 rounded-full text-white hover:bg-black/70">
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          // Annotation Copy Workflow
                          if (confirm("This will create a new copy of the image for you to annotate. Proceed?")) {
                            setPreviewUrl(photo.url)
                            setIsAdding(true)
                            setIsAnnotating(true)
                            // Note: We start fresh with annotations on the NEW copy. 
                            // To preserve existing annotations, we'd need to parse `photo.annotations` 
                            // and set `setAnnotations` state.
                            if (photo.annotations) {
                              try {
                                setAnnotations(JSON.parse(photo.annotations))
                              } catch (e) { console.error("Failed to parse annotations", e) }
                            }
                          }
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Annotate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDeletePhoto?.(photo.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Photos */}
      {otherPhotos.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground ml-1">Other Photos</span>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {otherPhotos.map((photo) => (
              <div key={photo.id} className="relative group flex-shrink-0">
                <button
                  className="w-32 h-32 rounded-lg overflow-hidden border border-border relative"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={photo.thumbnailUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-[10px] text-white truncate">
                    {photo.note || photo.userName}
                  </div>
                </button>

                <div className="absolute top-1 right-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="bg-black/50 p-1 rounded-full text-white hover:bg-black/70">
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onReportPhoto?.(photo.id)}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground">No photos added yet</p>
      )}

      {/* Photo viewer modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
            <img
              src={selectedPhoto.url || "/placeholder.svg"}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 rounded-full opacity-90 shadow-lg"
              onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>

          {/* Description Section */}
          <div className="bg-card border-t border-border p-4 pb-8 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{selectedPhoto.userName}</span>
              <span className="text-xs text-muted-foreground">{new Date(selectedPhoto.createdAt).toLocaleDateString()}</span>
            </div>
            {selectedPhoto.note && (
              <p className="text-sm text-foreground">{selectedPhoto.note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
