'use client'

import { MAP_CONFIG } from '@/lib/map-config'

interface MapLegendProps {
  showScannedAreas: boolean
}

export function MapLegend({ showScannedAreas }: MapLegendProps) {
  return (
    <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-border mt-safe">
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white" />
          <span className="text-foreground font-medium">Boulder</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: MAP_CONFIG.colors.cliff }} />
          <span className="text-foreground font-medium">Cliff</span>
        </div>
        {showScannedAreas && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 border" style={{ backgroundColor: MAP_CONFIG.colors.scanned.fill, borderColor: MAP_CONFIG.colors.scanned.outline }} />
            <span className="text-foreground font-medium">Scanned</span>
          </div>
        )}
      </div>
    </div>
  )
}
