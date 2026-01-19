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
  IonAccordion,
  IonAccordionGroup,
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
      favorites: false,
      hasClimbs: false,
      hasProjects: false,
      hasPossibleLines: false,
      notARock: false,
    })
  }

  // When used as a standalone button (closed state)
  if (!isOpen) {
    return null
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
        <IonAccordionGroup value={['type', 'status']}>
          {/* Feature Type */}
          <IonAccordion value="type">
            <IonItem slot="header">
              <IonLabel>Feature Type</IonLabel>
            </IonItem>
            <div slot="content" className="px-4 pb-4">
              <IonItem lines="none" className="--padding-start: 0">
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
              <IonItem lines="none" className="--padding-start: 0">
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
          </IonAccordion>

          {/* Status */}
          <IonAccordion value="status">
            <IonItem slot="header">
              <IonLabel>Status</IonLabel>
            </IonItem>
            <div slot="content" className="px-4 pb-4">
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
          </IonAccordion>

          {/* Climbs */}
          <IonAccordion value="climbs">
            <IonItem slot="header">
              <IonLabel>Climbs</IonLabel>
            </IonItem>
            <div slot="content" className="px-4 pb-4">
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
          </IonAccordion>

          {/* Dimensions */}
          <IonAccordion value="dimensions">
            <IonItem slot="header">
              <IonLabel>Dimensions</IonLabel>
            </IonItem>
            <div slot="content" className="px-4 pb-4">
              <IonItem lines="none">
                <IonLabel>
                  <p className="text-sm text-muted-foreground">Min Height</p>
                  <p className="font-medium">{filter.minHeight ?? 0}m</p>
                </IonLabel>
              </IonItem>
              <IonRange
                min={0}
                max={50}
                step={1}
                value={filter.minHeight ?? 0}
                onIonInput={(e) => updateFilter({ minHeight: e.detail.value === 0 ? null : e.detail.value as number })}
                className="px-4"
              />

              <IonItem lines="none">
                <IonLabel>
                  <p className="text-sm text-muted-foreground">Max Height</p>
                  <p className="font-medium">{filter.maxHeight ?? 50}m</p>
                </IonLabel>
              </IonItem>
              <IonRange
                min={0}
                max={50}
                step={1}
                value={filter.maxHeight ?? 50}
                onIonInput={(e) => updateFilter({ maxHeight: e.detail.value === 50 ? null : e.detail.value as number })}
                className="px-4"
              />
            </div>
          </IonAccordion>

          {/* Distance */}
          <IonAccordion value="distance">
            <IonItem slot="header">
              <IonLabel>Distance</IonLabel>
            </IonItem>
            <div slot="content" className="px-4 pb-4">
              <IonItem lines="none">
                <IonLabel>
                  <p className="text-sm text-muted-foreground">Max from road</p>
                  <p className="font-medium">{filter.maxDistanceToRoad ?? 1000}m</p>
                </IonLabel>
              </IonItem>
              <IonRange
                min={0}
                max={1000}
                step={50}
                value={filter.maxDistanceToRoad ?? 1000}
                onIonInput={(e) => updateFilter({ maxDistanceToRoad: e.detail.value === 1000 ? null : e.detail.value as number })}
                className="px-4"
              />

              <IonItem lines="none">
                <IonLabel>
                  <p className="text-sm text-muted-foreground">Max bushwhack</p>
                  <p className="font-medium">{filter.maxBushwhack ?? 500}m</p>
                </IonLabel>
              </IonItem>
              <IonRange
                min={0}
                max={500}
                step={25}
                value={filter.maxBushwhack ?? 500}
                onIonInput={(e) => updateFilter({ maxBushwhack: e.detail.value === 500 ? null : e.detail.value as number })}
                className="px-4"
              />
            </div>
          </IonAccordion>
        </IonAccordionGroup>

        {/* Bottom safe area padding */}
        <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
      </IonContent>
    </>
  )
}
