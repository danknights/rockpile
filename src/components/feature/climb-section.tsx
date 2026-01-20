'use client'

import { useState } from 'react'
import { Plus, Star, Check, Target, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import type { Climb, Photo } from '@/lib/types'

const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18']
const YDS_GRADES = ['5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a', '5.15b', '5.15c', '5.15d']

interface ClimbSectionProps {
  climbs: Climb[]
  photos: Photo[]
  onAddClimb: (climb: Climb) => void
}

export function ClimbSection({ climbs, photos, onAddClimb }: ClimbSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [ratingSystem, setRatingSystem] = useState<'v-scale' | 'yds'>('v-scale')
  const [selectedRating, setSelectedRating] = useState('V3')
  const [selectedStatus, setSelectedStatus] = useState<'send' | 'project' | 'possible'>('send')
  const [stars, setStars] = useState(3)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [name, setName] = useState('')

  const grades = ratingSystem === 'v-scale' ? V_GRADES : YDS_GRADES

  const handleAddClimb = () => {
    const newClimb: Climb = {
      id: `climb-${Date.now()}`,
      name: name || undefined,
      rating: selectedRating,
      ratingSystem,
      stars,
      status: selectedStatus,
      photoId: selectedPhoto || undefined,
      userId: 'user-1',
      createdAt: new Date().toISOString(),
    }
    onAddClimb(newClimb)
    setIsAdding(false)
    setName('')
    setSelectedPhoto(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'send': return <Check className="h-3.5 w-3.5 text-green-500" />
      case 'project': return <Target className="h-3.5 w-3.5 text-yellow-500" />
      case 'possible': return <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
      default: return null
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Climbs</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add Climb
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
          {/* Name input */}
          <div>
            <Label htmlFor="climb-name" className="text-sm text-muted-foreground">Name (optional)</Label>
            <input
              id="climb-name"
              type="text"
              placeholder="e.g., North Face Direct"
              className="w-full mt-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Rating system toggle */}
          <div className="flex gap-2">
            <Button
              variant={ratingSystem === 'v-scale' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRatingSystem('v-scale')}
            >
              V-Scale
            </Button>
            <Button
              variant={ratingSystem === 'yds' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRatingSystem('yds')}
            >
              YDS
            </Button>
          </div>

          {/* Rating grid */}
          <div>
            <Label className="text-sm text-muted-foreground">Difficulty</Label>
            <div className="grid grid-cols-5 gap-1.5 mt-2 max-h-32 overflow-y-auto">
              {grades.map((grade) => (
                <button
                  key={grade}
                  className={`px-2 py-2 text-xs rounded transition-colors ${selectedRating === grade
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  onClick={() => setSelectedRating(grade)}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <div className="flex gap-2 mt-2">
              {(['send', 'project', 'possible'] as const).map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                  className="flex items-center gap-1.5 capitalize"
                >
                  {getStatusIcon(status)}
                  {status === 'possible' ? 'Possible' : status === 'send' ? 'Sent' : status}
                </Button>
              ))}
            </div>
          </div>

          {/* Stars */}
          <div>
            <Label className="text-sm text-muted-foreground">Quality</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  className="p-1"
                >
                  <Star
                    className={`h-5 w-5 ${n <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Photo selection */}
          {photos.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground">Tag a photo</Label>
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedPhoto === photo.id ? 'border-primary' : 'border-transparent'
                      }`}
                    onClick={() => setSelectedPhoto(selectedPhoto === photo.id ? null : photo.id)}
                  >
                    <img src={photo.thumbnailUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleAddClimb}>
            Add Climb
          </Button>
        </div>
      )}

      {/* Existing climbs */}
      {climbs.length > 0 ? (
        <div className="space-y-2">
          {climbs.map((climb) => (
            <div
              key={climb.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(climb.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{climb.rating}</span>
                    {climb.name && <span className="text-sm text-muted-foreground">{climb.name}</span>}
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3 w-3 ${n <= climb.stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${climb.status === 'send' ? 'bg-green-500/20 text-green-400' :
                climb.status === 'project' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                {climb.status === 'possible' ? 'Possible' : climb.status === 'send' ? 'Sent' : climb.status}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
            </div>
          ))}
        </div>
      ) : !isAdding && (
        <p className="text-sm text-muted-foreground">No climbs logged yet</p>
      )}
    </div>
  )
}
