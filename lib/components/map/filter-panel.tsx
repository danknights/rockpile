'use client'

import { useState } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { MapFilter } from '@/lib/types'

interface FilterPanelProps {
  filter: MapFilter
  onFilterChange: (filter: MapFilter) => void
  isOpen: boolean
  onToggle: () => void
}

export function FilterPanel({ filter, onFilterChange, isOpen, onToggle }: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['type', 'status'])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const updateFilter = (updates: Partial<MapFilter>) => {
    onFilterChange({ ...filter, ...updates })
  }

  const resetFilters = () => {
    onFilterChange({
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
    })
  }

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-4 right-16 z-10 bg-card/95 backdrop-blur-sm border border-border shadow-lg"
        onClick={onToggle}
      >
        <Filter className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="absolute top-4 right-4 w-72 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border z-10 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground">
            Reset
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Feature Type */}
        <div className="space-y-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            onClick={() => toggleSection('type')}
          >
            <span>Feature Type</span>
            {expandedSections.includes('type') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.includes('type') && (
            <div className="space-y-2 pl-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="boulder"
                  checked={filter.types.includes('boulder')}
                  onCheckedChange={(checked) => {
                    const types = checked
                      ? [...filter.types, 'boulder']
                      : filter.types.filter((t) => t !== 'boulder')
                    updateFilter({ types: types as ('boulder' | 'cliff')[] })
                  }}
                />
                <Label htmlFor="boulder" className="text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Boulders
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cliff"
                  checked={filter.types.includes('cliff')}
                  onCheckedChange={(checked) => {
                    const types = checked
                      ? [...filter.types, 'cliff']
                      : filter.types.filter((t) => t !== 'cliff')
                    updateFilter({ types: types as ('boulder' | 'cliff')[] })
                  }}
                />
                <Label htmlFor="cliff" className="text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Cliffs
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            onClick={() => toggleSection('status')}
          >
            <span>Status</span>
            {expandedSections.includes('status') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.includes('status') && (
            <div className="space-y-3 pl-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="favorites" className="text-sm">Favorites only</Label>
                <Switch
                  id="favorites"
                  checked={filter.favorites}
                  onCheckedChange={(checked) => updateFilter({ favorites: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="seen-user" className="text-sm">Seen by me</Label>
                <Switch
                  id="seen-user"
                  checked={filter.seenByUser === true}
                  onCheckedChange={(checked) => updateFilter({ seenByUser: checked ? true : null })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="seen-anyone" className="text-sm">Seen by anyone</Label>
                <Switch
                  id="seen-anyone"
                  checked={filter.seenByAnyone === true}
                  onCheckedChange={(checked) => updateFilter({ seenByAnyone: checked ? true : null })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="not-rock" className="text-sm">Show non-rocks</Label>
                <Switch
                  id="not-rock"
                  checked={filter.notARock}
                  onCheckedChange={(checked) => updateFilter({ notARock: checked })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Climbs */}
        <div className="space-y-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            onClick={() => toggleSection('climbs')}
          >
            <span>Climbs</span>
            {expandedSections.includes('climbs') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.includes('climbs') && (
            <div className="space-y-3 pl-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="has-sends" className="text-sm">Has sends</Label>
                <Switch
                  id="has-sends"
                  checked={filter.hasClimbs}
                  onCheckedChange={(checked) => updateFilter({ hasClimbs: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="has-projects" className="text-sm">Has projects</Label>
                <Switch
                  id="has-projects"
                  checked={filter.hasProjects}
                  onCheckedChange={(checked) => updateFilter({ hasProjects: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="has-possible" className="text-sm">Has possible lines</Label>
                <Switch
                  id="has-possible"
                  checked={filter.hasPossibleLines}
                  onCheckedChange={(checked) => updateFilter({ hasPossibleLines: checked })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dimensions */}
        <div className="space-y-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            onClick={() => toggleSection('dimensions')}
          >
            <span>Dimensions</span>
            {expandedSections.includes('dimensions') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.includes('dimensions') && (
            <div className="space-y-4 pl-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Min Height</span>
                  <span className="text-foreground">{filter.minHeight ?? 0}m</span>
                </div>
                <Slider
                  value={[filter.minHeight ?? 0]}
                  min={0}
                  max={50}
                  step={1}
                  onValueChange={([v]) => updateFilter({ minHeight: v === 0 ? null : v })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Height</span>
                  <span className="text-foreground">{filter.maxHeight ?? 50}m</span>
                </div>
                <Slider
                  value={[filter.maxHeight ?? 50]}
                  min={0}
                  max={50}
                  step={1}
                  onValueChange={([v]) => updateFilter({ maxHeight: v === 50 ? null : v })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Distance */}
        <div className="space-y-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            onClick={() => toggleSection('distance')}
          >
            <span>Distance</span>
            {expandedSections.includes('distance') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.includes('distance') && (
            <div className="space-y-4 pl-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max from road</span>
                  <span className="text-foreground">{filter.maxDistanceToRoad ?? 1000}m</span>
                </div>
                <Slider
                  value={[filter.maxDistanceToRoad ?? 1000]}
                  min={0}
                  max={1000}
                  step={50}
                  onValueChange={([v]) => updateFilter({ maxDistanceToRoad: v === 1000 ? null : v })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max bushwhack</span>
                  <span className="text-foreground">{filter.maxBushwhack ?? 500}m</span>
                </div>
                <Slider
                  value={[filter.maxBushwhack ?? 500]}
                  min={0}
                  max={500}
                  step={25}
                  onValueChange={([v]) => updateFilter({ maxBushwhack: v === 500 ? null : v })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
