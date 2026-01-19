'use client'

import { Layers, Download, Navigation, Satellite } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MapControlsProps {
  showSatellite: boolean
  onToggleSatellite: () => void
  onDownloadRegion: () => void
  onCenterOnUser: () => void
  isDownloading: boolean
}

export function MapControls({
  showSatellite,
  onToggleSatellite,
  onDownloadRegion,
  onCenterOnUser,
  isDownloading,
}: MapControlsProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-24 right-4 flex flex-col gap-2 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={`bg-card/95 backdrop-blur-sm border border-border shadow-lg ${showSatellite ? 'ring-2 ring-primary' : ''}`}
              onClick={onToggleSatellite}
            >
              <Satellite className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{showSatellite ? 'Switch to Terrain' : 'Switch to Satellite'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-card/95 backdrop-blur-sm border border-border shadow-lg"
              onClick={onDownloadRegion}
              disabled={isDownloading}
            >
              <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Download for offline</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-card/95 backdrop-blur-sm border border-border shadow-lg"
              onClick={onCenterOnUser}
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Center on my location</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-card/95 backdrop-blur-sm border border-border shadow-lg"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Map layers</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
