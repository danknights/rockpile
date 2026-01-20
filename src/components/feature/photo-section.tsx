'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { Camera, Plus, Check, Undo, Redo, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Photo } from '@/lib/types'

interface PhotoSectionProps {
  photos: Photo[]
  onAddPhoto: (photo: Photo) => void
}

export function PhotoSection({ photos, onAddPhoto }: PhotoSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [annotations, setAnnotations] = useState<string[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<{ x: number; y: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setIsAdding(true)
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
      ctx.strokeStyle = '#ec4899'
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
          canvasRef.current.width = 400
          canvasRef.current.height = 300
          ctx.drawImage(img, 0, 0, 400, 300)
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
              className="w-full rounded-lg cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />

            {annotations.length > 0 && (
              <div className="absolute top-2 right-2 flex gap-1">
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={handleUndo}>
                  <Undo className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isAnnotating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsAnnotating(!isAnnotating)}
            >
              {isAnnotating ? 'Done Drawing' : 'Draw on Photo'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {isAnnotating ? 'Draw with your finger/mouse' : 'Add route lines or notes'}
            </span>
          </div>

          <textarea
            placeholder="Add a note about this photo..."
            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={handleCancel}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              Save Photo
            </Button>
          </div>
        </div>
      )}

      {photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-4 snap-x">
          {photos.map((photo) => (
            <button
              key={photo.id}
              className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all snap-center relative"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.thumbnailUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
              {photo.note && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                  <p className="text-[10px] text-white truncate">{photo.note}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : !isAdding && (
        <p className="text-sm text-muted-foreground">No photos added yet</p>
      )}

      {/* Photo viewer modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={selectedPhoto.url || "/placeholder.svg"}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {selectedPhoto.note && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white text-sm">{selectedPhoto.note}</p>
              <p className="text-white/60 text-xs mt-1">by {selectedPhoto.userName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
