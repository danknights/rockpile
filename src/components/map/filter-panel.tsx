'use client'

import { useState } from 'react'
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonToggle,
  IonRange,
} from '@ionic/react'
import {
  closeOutline,
  refreshOutline,
  chevronDownOutline,
} from 'ionicons/icons'
import type { MapFilter } from '@/lib/types'

interface FilterPanelProps {
  filter: MapFilter
  onFilterChange: (filter: MapFilter) => void
  isOpen: boolean
  onToggle: () => void
}

export function FilterPanel({ filter, onFilterChange, isOpen, onToggle }: FilterPanelProps) {
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
      minBoulderDifficulty: null,
      maxBoulderDifficulty: null,
      minRouteDifficulty: null,
      maxRouteDifficulty: null,
      favorites: false,
      hasClimbs: false,
      hasProjects: false,
      hasPossibleLines: false,
      notARock: false,
    })
  }

  // Definitions
  const boulderGrades = ['vB', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15']
  const boulderMaxIndex = boulderGrades.length // Last step is "No limit"

  const ydsGrades = ['5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10', '5.11', '5.12', '5.13', '5.14', '5.15']
  const ydsMaxIndex = ydsGrades.length // Last step is "No limit"

  // When used as a standalone button (closed state)
  if (!isOpen) {
    return null
  }

  const formatBoulder = (val: number | null) => {
    if (val === null || val >= boulderMaxIndex) return 'No limit'
    return boulderGrades[val] || '?'
  }

  const formatYDS = (val: number | null) => {
    if (val === null || val >= ydsMaxIndex) return 'No limit'
    return ydsGrades[val] || '?'
  }

  const formatHeight = (val: number | null) => {
    if (val === null || val >= 45) return 'No limit'
    return `${val}m`
  }

  const formatDistance = (val: number | null, maxLimit: number) => {
    // Top 10% is no limit
    const threshold = maxLimit * 0.9
    if (val === null || val >= threshold) return 'No limit'
    return `${val}m`
  }

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Filters</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={resetFilters} className="native-button">
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={onToggle} className="native-button">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="pb-8">
          {/* Feature Type */}
          <div className="px-4 py-3 bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Feature Type</h3>
          </div>
          <div className="px-2 py-2">
            <IonItem lines="none">
              <IonCheckbox
                checked={filter.types.includes('boulder')}
                onIonChange={(e) => {
                  const types = e.detail.checked
                    ? [...filter.types, 'boulder']
                    : filter.types.filter((t) => t !== 'boulder')
                  updateFilter({ types: types as ('boulder' | 'cliff')[] })
                }}
                slot="start"
              />
              <div className="w-3 h-3 rounded-full bg-orange-500 ml-2 mr-2" />
              <IonLabel>Boulders</IonLabel>
            </IonItem>
            <IonItem lines="none">
              <IonCheckbox
                checked={filter.types.includes('cliff')}
                onIonChange={(e) => {
                  const types = e.detail.checked
                    ? [...filter.types, 'cliff']
                    : filter.types.filter((t) => t !== 'cliff')
                  updateFilter({ types: types as ('boulder' | 'cliff')[] })
                }}
                slot="start"
              />
              <div className="w-3 h-3 rounded-full bg-blue-500 ml-2 mr-2" />
              <IonLabel>Cliffs</IonLabel>
            </IonItem>
          </div>

          {/* Status */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>
          </div>
          <div className="py-2">
            <IonItem lines="none">
              <IonLabel>Favorites only</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.favorites}
                onIonChange={(e) => updateFilter({ favorites: e.detail.checked })}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>Seen by me</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.seenByUser === true}
                onIonChange={(e) => updateFilter({ seenByUser: e.detail.checked ? true : null })}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>Seen by anyone</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.seenByAnyone === true}
                onIonChange={(e) => updateFilter({ seenByAnyone: e.detail.checked ? true : null })}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>Show non-rocks</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.notARock}
                onIonChange={(e) => updateFilter({ notARock: e.detail.checked })}
              />
            </IonItem>
          </div>

          {/* Climbs */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Climbs</h3>
          </div>
          <div className="py-2">
            <IonItem lines="none">
              <IonLabel>Has sends</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.hasClimbs}
                onIonChange={(e) => updateFilter({ hasClimbs: e.detail.checked })}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>Has projects</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.hasProjects}
                onIonChange={(e) => updateFilter({ hasProjects: e.detail.checked })}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>Has possible lines</IonLabel>
              <IonToggle
                slot="end"
                checked={filter.hasPossibleLines}
                onIonChange={(e) => updateFilter({ hasPossibleLines: e.detail.checked })}
              />
            </IonItem>
          </div>

          {/* Dimensions (Height) */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</h3>
          </div>
          <div className="py-2">
            <IonItem lines="none">
              <IonLabel>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Height Range</span>
                  <span className="font-medium">
                    {formatHeight(filter.minHeight ?? 0)} - {formatHeight(filter.maxHeight)}
                  </span>
                </div>
              </IonLabel>
            </IonItem>
            <div className="px-4 pb-4">
              <IonRange
                dualKnobs={true}
                min={0}
                max={50}
                step={1}
                value={{
                  lower: filter.minHeight ?? 0,
                  upper: filter.maxHeight ?? 50
                }}
                onIonInput={(e) => {
                  const val = e.detail.value as { lower: number; upper: number }
                  updateFilter({
                    minHeight: val.lower === 0 ? null : val.lower,
                    maxHeight: val.upper >= 45 ? null : val.upper // Last 10% is no limit
                  })
                }}
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</h3>
          </div>
          <div className="py-2">
            {/* Boulder Difficulty */}
            <IonItem lines="none">
              <IonLabel>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Boulder (V-Scale)</span>
                  <span className="font-medium">
                    {formatBoulder(filter.minBoulderDifficulty ?? 0)} - {formatBoulder(filter.maxBoulderDifficulty)}
                  </span>
                </div>
              </IonLabel>
            </IonItem>
            <div className="px-4 pb-4">
              <IonRange
                dualKnobs={true}
                min={0}
                max={boulderMaxIndex}
                step={1}
                snaps={true}
                ticks={false}
                value={{
                  lower: filter.minBoulderDifficulty ?? 0,
                  upper: filter.maxBoulderDifficulty ?? boulderMaxIndex
                }}
                onIonInput={(e) => {
                  const val = e.detail.value as { lower: number; upper: number }
                  updateFilter({
                    minBoulderDifficulty: val.lower === 0 ? null : val.lower,
                    maxBoulderDifficulty: val.upper >= boulderMaxIndex ? null : val.upper
                  })
                }}
              />
            </div>

            {/* YDS Difficulty */}
            <IonItem lines="none">
              <IonLabel>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Route (YDS)</span>
                  <span className="font-medium">
                    {formatYDS(filter.minRouteDifficulty ?? 0)} - {formatYDS(filter.maxRouteDifficulty)}
                  </span>
                </div>
              </IonLabel>
            </IonItem>
            <div className="px-4 pb-4">
              <IonRange
                dualKnobs={true}
                min={0}
                max={ydsMaxIndex}
                step={1}
                snaps={true}
                ticks={false}
                value={{
                  lower: filter.minRouteDifficulty ?? 0,
                  upper: filter.maxRouteDifficulty ?? ydsMaxIndex
                }}
                onIonInput={(e) => {
                  const val = e.detail.value as { lower: number; upper: number }
                  updateFilter({
                    minRouteDifficulty: val.lower === 0 ? null : val.lower,
                    maxRouteDifficulty: val.upper >= ydsMaxIndex ? null : val.upper
                  })
                }}
              />
            </div>
          </div>

          {/* Distance */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Distance</h3>
          </div>
          <div className="py-2">
            {/* Max from road */}
            <IonItem lines="none">
              <IonLabel>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Max from road</span>
                  <span className="font-medium">{formatDistance(filter.maxDistanceToRoad, 500)}</span>
                </div>
              </IonLabel>
            </IonItem>
            <div className="px-4 pb-4">
              <IonRange
                min={0}
                max={500}
                step={25}
                value={filter.maxDistanceToRoad ?? 500}
                onIonInput={(e) => {
                  const val = e.detail.value as number
                  updateFilter({ maxDistanceToRoad: val >= 450 ? null : val })
                }}
              />
            </div>

            {/* Max Bushwhack */}
            <IonItem lines="none">
              <IonLabel>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Max bushwhack</span>
                  <span className="font-medium">{formatDistance(filter.maxBushwhack, 500)}</span>
                </div>
              </IonLabel>
            </IonItem>
            <div className="px-4 pb-4">
              <IonRange
                min={0}
                max={500}
                step={25}
                value={filter.maxBushwhack ?? 500}
                onIonInput={(e) => {
                  const val = e.detail.value as number
                  updateFilter({ maxBushwhack: val >= 450 ? null : val })
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom safe area padding */}
        <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
      </IonContent>
    </>
  )
}
