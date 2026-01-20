'use client'




const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'Unrated']
const YDS_GRADES = ['5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10-', '5.10a', '5.10b', '5.10c', '5.10d', '5.10+', '5.11-', '5.11a', '5.11b', '5.11c', '5.11d', '5.11+', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a', '5.15b', '5.15c', '5.15d', 'Unrated']
const FRENCH_GRADES = ['2', '3', '4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a', '9a+', '9b', '9b+', '9c', '9c+', 'Unrated']

import { useState, useMemo } from 'react'
import { Plus, Star, Check, Target, HelpCircle, ChevronDown, ChevronUp, ArrowUpDown, Eye, EyeOff, Camera, Trash2, MessageSquare, Edit2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Climb, Photo } from '@/lib/types'

interface ClimbSectionProps {
  climbs: Climb[]
  photos: Photo[]
  onAddClimb: (climb: Climb) => void
  publishControl?: React.ReactNode
}

type SortOption = 'new' | 'rating' | 'stars'

export function ClimbSection({ climbs, photos, onAddClimb, publishControl }: ClimbSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [climbType, setClimbType] = useState<'boulder' | 'sport' | 'trad' | 'top-rope'>('boulder')
  const [ratingSystem, setRatingSystem] = useState<'v-scale' | 'yds' | 'french'>('v-scale')
  const [selectedRating, setSelectedRating] = useState('V3')
  const [selectedStatus, setSelectedStatus] = useState<'send' | 'project' | 'possible'>('send')
  const [stars, setStars] = useState(0)
  const [isRated, setIsRated] = useState(false) // Toggle for 0 stars vs "not rated"
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('new')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [description, setDescription] = useState('')
  const [expandedClimbId, setExpandedClimbId] = useState<string | null>(null)

  // Auto-switch rating system based on type
  useMemo(() => {
    if (climbType === 'boulder') {
      setRatingSystem('v-scale')
      if (!selectedRating.startsWith('V') && selectedRating !== 'Unrated') setSelectedRating('V0')
    } else {
      if (ratingSystem === 'v-scale') setRatingSystem('yds') // Default to YDS for routes
      if (selectedRating.startsWith('V') && selectedRating !== 'Unrated') setSelectedRating('5.9')
    }
  }, [climbType])

  const grades = ratingSystem === 'v-scale' ? V_GRADES : ratingSystem === 'french' ? FRENCH_GRADES : YDS_GRADES

  const handleAddClimb = () => {
    const newClimb: Climb = {
      id: `climb-${Date.now()}`,
      name: name || undefined,
      description: description || undefined,
      rating: selectedRating,
      ratingSystem,
      stars: isRated ? stars : 0, // 0 can mean unrated or 0 stars, usually 0 means unrated in this UI context key
      status: selectedStatus,
      type: climbType,
      isPrivate,
      photoId: selectedPhoto || undefined,
      userId: 'user-1',
      createdAt: new Date().toISOString(),
    }
    onAddClimb(newClimb)
    setIsAdding(false)
    setIsAdding(false)
    setName('')
    setDescription('')
    setSelectedPhoto(null)
    setSelectedPhoto(null)
    setStars(0)
    setIsRated(false)
    setIsPrivate(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'send': return <Check className="h-3.5 w-3.5 text-green-500" />
      case 'project': return <Target className="h-3.5 w-3.5 text-yellow-500" />
      case 'possible': return <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
      default: return null
    }
  }

  const toggleSort = (option: SortOption) => {
    if (sortOption === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortOption(option)
      setSortDirection('desc') // Default to desc (newest/highest first)
    }
  }

  const sortedClimbs = useMemo(() => {
    return [...climbs].sort((a, b) => {
      let res = 0
      if (sortOption === 'new') {
        res = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortOption === 'rating') {
        // Primitive string sort for now, ideally strictly mapped
        res = a.rating.localeCompare(b.rating, undefined, { numeric: true, sensitivity: 'base' })
      } else if (sortOption === 'stars') {
        res = b.stars - a.stars
      }
      return sortDirection === 'asc' ? -res : res
    })
  }, [climbs, sortOption, sortDirection])

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
            <>Cancel</>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add Climb
            </>
          )}
        </Button>
      </div>

      {/* Publish Toggle */}
      {climbs.length > 0 && publishControl && (
        <div className="mb-2">
          {publishControl}
        </div>
      )}

      {/* Sort Buttons */}
      {climbs.length > 1 && !isAdding && (
        <div className="flex gap-2 mb-2">
          {/* Sort buttons implementation */}
          {(['new', 'rating', 'stars'] as const).map(opt => (
            <Button
              key={opt}
              variant="ghost"
              size="sm"
              className={`h-7 text-xs ${sortOption === opt ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
              onClick={() => toggleSort(opt)}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
              <ArrowUpDown className="h-3 w-3 ml-1" />
            </Button>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
          {/* Type Selector */}
          <div>
            <Label className="text-sm text-muted-foreground">Type</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['boulder', 'sport', 'trad', 'top-rope'] as const).map(t => (
                <Button
                  key={t}
                  variant={climbType === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setClimbType(t)}
                  className="capitalize"
                >
                  {t.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Grading System Tabs - Visible if not boulder */}
          {climbType !== 'boulder' && (
            <div className="flex gap-4 border-b border-border">
              <button
                className={`py-2 text-sm font-medium border-b-2 transition-colors ${ratingSystem === 'v-scale' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRatingSystem('v-scale')}
              >
                V-Scale
              </button>
              <button
                className={`py-2 text-sm font-medium border-b-2 transition-colors ${ratingSystem === 'yds' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRatingSystem('yds')}
              >
                YDS
              </button>
              <button
                className={`py-2 text-sm font-medium border-b-2 transition-colors ${ratingSystem === 'french' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRatingSystem('french')}
              >
                French
              </button>
            </div>
          )}

          {/* Rating Grid */}
          {/* Hide V-scale grid for non-boulder types if not v-scale system */}
          {(climbType === 'boulder' || ratingSystem === 'v-scale') && (
            <div className="mt-2">
              <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1">
                {grades.map(grade => (
                  <button
                    key={grade}
                    className={`px-1 py-3 text-xs font-semibold rounded-md border transition-all ${selectedRating === grade
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-card-foreground border-border hover:bg-accent'}`}
                    onClick={() => setSelectedRating(grade)}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <div className="flex gap-2 mt-2">
              {(['send', 'project', 'possible'] as const).map((status) => (
                <div
                  key={status}
                  className={`
                        relative px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-1.5
                        ${selectedStatus === status
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-transparent bg-background text-muted-foreground hover:bg-muted'
                    }
                    `}
                  onClick={() => setSelectedStatus(status)}
                >
                  {getStatusIcon(status)}
                  <span className="capitalize text-sm font-medium">{status === 'possible' ? 'Possible' : status === 'send' ? 'Sent' : 'Project'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stars */}
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Quality</Label>
              {!isRated && <span className="text-xs text-muted-foreground italic">(Not Rated)</span>}
            </div>
            <div className="flex gap-1 mt-2 items-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    if (!isRated) {
                      setIsRated(true)
                      setStars(n)
                    } else {
                      if (stars === n) {
                        setStars(n) // Keep it or toggle? User said "toggle back to zero stars". Logic: click star -> set stars. Click "not rated" -> toggle.
                        // Actually user said: "start with zero stars... "not rated"... If person clicks on one of the stars, they can then click on "not rated"..."
                        // I'll add a "Not Rated" chip/button to toggle off.
                        setStars(n)
                      } else {
                        setStars(n)
                      }
                    }
                  }}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${isRated && n <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
              {isRated && (
                <Button variant="ghost" size="sm" className="ml-2 h-6 text-xs" onClick={() => { setIsRated(false); setStars(0) }}>
                  Clear
                </Button>
              )}
            </div>
          </div>

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

          {/* Description input */}
          <div>
            <Label htmlFor="climb-desc" className="text-sm text-muted-foreground">Description (optional)</Label>
            <textarea
              id="climb-desc"
              placeholder="Add details..."
              className="w-full mt-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Photo selection */}
          <div>
            <Label className="text-sm text-muted-foreground">Tag a photo</Label>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 items-center">
              {/* Show photos thumbnail row */}
              {photos.length > 0 ? photos.map((photo) => (
                <button
                  key={photo.id}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors relative ${selectedPhoto === photo.id ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent'}`}
                  onClick={() => setSelectedPhoto(selectedPhoto === photo.id ? null : photo.id)}
                >
                  <img src={photo.thumbnailUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  {selectedPhoto === photo.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-6 w-6 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              )) : <span className="text-xs text-muted-foreground">No photos available</span>}

              <div
                className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                onClick={() => alert("Tagging a new photo is not implemented yet. Please add a photo in the Photos section below first.")}
              >
                <Plus className="h-5 w-5 mb-1" />
                <span className="text-[9px] leading-none text-center">Tag Photo</span>
              </div>
            </div>
          </div>

          {/* Private Toggle and Submit */}
          <div className="flex items-center justify-between pt-2">
            <div
              className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100"
              onClick={() => setIsPrivate(!isPrivate)}
            >
              {isPrivate ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
              <span className="text-sm">{isPrivate ? 'Keep Private' : 'Public'}</span>
            </div>

            <Button onClick={handleAddClimb} className="px-8">
              Add Climb
            </Button>
          </div>
        </div>
      )}

      {/* Existing climbs */}
      {!isAdding && sortedClimbs.length > 0 ? (
        <div className="space-y-2">
          {sortedClimbs.map((climb) => {
            const photo = climb.photoId ? photos.find(p => p.id === climb.photoId) : null
            const isExpanded = expandedClimbId === climb.id

            return (
              <div
                key={climb.id}
                className={`bg-muted/50 rounded-lg overflow-hidden group transition-all ${isExpanded ? 'ring-1 ring-primary' : ''}`}
                onClick={() => setExpandedClimbId(isExpanded ? null : climb.id)}
              >
                <div className="flex items-center gap-3 p-3 cursor-pointer">
                  {/* Thumbnail */}
                  {photo ? (
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary">
                      <img src={photo.thumbnailUrl} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded flex items-center justify-center bg-muted-foreground/20 text-muted-foreground/50 flex-shrink-0">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground text-sm">{climb.name || 'Unnamed'}</span>
                      <span className="text-sm font-medium text-muted-foreground">({climb.rating})</span>
                      <span className="text-xs text-muted-foreground capitalize">{climb.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-0.5" />
                        {/* Vote count static */}
                        <span>0</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {climb.isPrivate ? (
                      <div className="flex flex-col items-center">
                        <EyeOff className="h-3 w-3 text-muted-foreground mb-1" />
                      </div>
                    ) : (
                      <div className="h-4" /> // spacer
                    )}

                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm 
                                ${climb.status === 'send' ? 'bg-green-500/10 text-green-600' :
                        climb.status === 'project' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {climb.status === 'send' ? 'SENT' : climb.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-1 cursor-default" onClick={e => e.stopPropagation()}>
                    {/* Description */}
                    {climb.description && (
                      <p className="text-sm text-foreground my-2">{climb.description}</p>
                    )}

                    {/* Photo Horizontal Scroll would go here if we had multiple photos per climb, but defined as single photoId for now */}

                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <div className="flex gap-4">
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Comment
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <Camera className="h-3.5 w-3.5" />
                          Tag Photo
                        </button>
                      </div>
                      <button className="flex items-center gap-1 hover:text-destructive text-muted-foreground/70">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    {/* Inline Edit/Visibility Logic would be more complex here, 
                              User asked for: "publish/unpublish 'eye' if the climb belongs to the user" 
                              and "pop up a confirmation window".
                              I will add the Eye button here properly.
                          */}
                    <div className="flex justify-end mt-2 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2" onClick={() => {
                        // Mock logic for visibility toggle with confirmation
                        if (confirm(climb.isPrivate ? "Make public?" : "Make private?")) {
                          // Toggle logic would happen here via onUpdateClimb prop if it existed
                          console.log("Toggle visibility")
                        }
                      }}>
                        {climb.isPrivate ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-green-500" />}
                        <span className="text-xs">{climb.isPrivate ? "Private" : "Public"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : !isAdding && (
        <p className="text-sm text-muted-foreground text-center py-4">No climbs logged yet</p>
      )}
    </div>
  )
}
