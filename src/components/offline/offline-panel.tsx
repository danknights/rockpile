'use client'

import { useState } from 'react'
import { X, Download, Trash2, MapPin, HardDrive, Wifi, WifiOff, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { OfflineRegion } from '@/lib/types'

interface OfflinePanelProps {
  isOpen: boolean
  onClose: () => void
}

const mockRegions: OfflineRegion[] = [
  {
    id: 'region-1',
    name: 'Superior National Forest - East',
    bounds: [[-91.8, 47.7], [-91.5, 48.0]],
    downloadedAt: '2025-01-15T10:00:00Z',
    size: 128,
  },
  {
    id: 'region-2',
    name: 'Boulder Canyon',
    bounds: [[-105.5, 39.9], [-105.3, 40.1]],
    downloadedAt: '2025-01-10T14:30:00Z',
    size: 256,
  },
]

export function OfflinePanel({ isOpen, onClose }: OfflinePanelProps) {
  const [regions, setRegions] = useState<OfflineRegion[]>(mockRegions)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [pendingSync, setPendingSync] = useState(3)

  const totalSize = regions.reduce((acc, r) => acc + r.size, 0)

  const handleDownloadCurrent = () => {
    setIsDownloading(true)
    setDownloadProgress(0)
    
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsDownloading(false)
          setRegions([...regions, {
            id: `region-${Date.now()}`,
            name: 'Current View Area',
            bounds: [[-91.7, 47.75], [-91.6, 47.85]],
            downloadedAt: new Date().toISOString(),
            size: 64,
          }])
          return 0
        }
        return prev + 5
      })
    }, 100)
  }

  const handleDeleteRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg h-[80vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Offline Regions</h2>
            <p className="text-xs text-muted-foreground">
              {regions.length} regions, {totalSize} MB total
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sync status */}
        {pendingSync > 0 && (
          <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-500">
                {pendingSync} items waiting to sync
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-yellow-500 hover:text-yellow-400">
              Sync Now
            </Button>
          </div>
        )}

        {/* Download current view */}
        <div className="p-4 border-b border-border">
          <Button 
            className="w-full" 
            onClick={handleDownloadCurrent}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Current View
              </>
            )}
          </Button>
          {isDownloading && (
            <div className="mt-3">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {downloadProgress}% - Downloading map tiles, 3D models...
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Downloads satellite imagery and 3D models for the visible area
          </p>
        </div>

        {/* Regions list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {regions.map((region) => (
              <div
                key={region.id}
                className="p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{region.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Downloaded {formatDate(region.downloadedAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteRegion(region.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>{region.size} MB</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3.5 w-3.5" />
                    <span>Ready for offline use</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {regions.length === 0 && (
            <div className="text-center py-12">
              <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">No offline regions</h3>
              <p className="text-sm text-muted-foreground">
                Download regions to use the app without internet
              </p>
            </div>
          )}
        </div>

        {/* Storage info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">Storage Used</span>
            <span className="text-sm text-muted-foreground">{totalSize} MB / 2 GB</span>
          </div>
          <Progress value={(totalSize / 2048) * 100} className="h-2" />
        </div>
      </div>
    </div>
  )
}
