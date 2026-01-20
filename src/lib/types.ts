export type FeatureType = 'boulder' | 'cliff'
export type ClimbStatus = 'send' | 'project' | 'possible'
export type NotARockType = 'tree' | 'building' | 'other' | null

export interface Climb {
  id: string
  name?: string
  rating: string
  ratingSystem: 'v-scale' | 'yds' | 'french'
  stars: number
  status: ClimbStatus
  type?: 'boulder' | 'sport' | 'trad' | 'top-rope'
  isPrivate?: boolean
  photoId?: string
  userId: string
  createdAt: string
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  text: string
  createdAt: string
  likes: number
  likedByUser: boolean
  replies: Comment[]
}

export interface Photo {
  id: string
  url: string
  thumbnailUrl: string
  userId: string
  userName: string
  note?: string
  annotations?: string
  createdAt: string
  isPrivate?: boolean
}

export interface Feature {
  id: string
  type: FeatureType
  name: string
  latitude: number
  longitude: number
  elevation: number
  height: number
  length: number
  width: number
  distanceToRoad: number
  bushwhackDistance: number
  hardness?: number
  isFavorite: boolean
  isSeen: boolean
  seenByAnyone: boolean
  notARock: NotARockType
  modelUrl?: string
  viewerUrl?: string
  climbs: Climb[]
  photos: Photo[]
  comments: Comment[]
  links: { type: 'mountainProject' | 'beta' | 'video' | 'other'; url: string; label?: string }[]
  isPublished: boolean
  hasLocalEdits: boolean
  needsRefinement?: 'missing' | 'extra' | 'both' | null
  description?: string
  access?: string
  quickNotes?: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  links: { type: string; url: string }[]
  createdAt: string
}

export interface MapFilter {
  types: FeatureType[]
  seenByAnyone: boolean | null
  seenByUser: boolean | null
  minHeight: number | null
  maxHeight: number | null
  minWidth: number | null
  maxWidth: number | null
  maxDistanceToRoad: number | null
  maxBushwhack: number | null
  minBoulderDifficulty: number | null
  maxBoulderDifficulty: number | null
  minRouteDifficulty: number | null
  maxRouteDifficulty: number | null
  favorites: boolean
  hasClimbs: boolean
  hasProjects: boolean
  hasPossibleLines: boolean
  notARock: boolean
}

export interface OfflineRegion {
  id: string
  name: string
  bounds: [[number, number], [number, number]]
  downloadedAt: string
  size: number
}
