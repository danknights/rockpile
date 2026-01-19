'use client'

interface MapLegendProps {
  showScannedAreas: boolean
}

export function MapLegend({ showScannedAreas }: MapLegendProps) {
  return (
    <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 border border-white" />
          <span className="text-foreground">Boulder</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
          <span className="text-foreground">Cliff</span>
        </div>
        {showScannedAreas && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400/30 border border-blue-400" />
            <span className="text-foreground">Scanned Area</span>
          </div>
        )}
      </div>
    </div>
  )
}
