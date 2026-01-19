'use client'

import { useState } from 'react'
import { X, Mountain, Youtube, Instagram, MapPin, Calendar, Star, Camera, Check, Target, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockUser, mockFeatures } from '@/lib/mock-data'

interface ProfilePanelProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
}

export function ProfilePanel({ isOpen, onClose, userId }: ProfilePanelProps) {
  const isOwnProfile = !userId || userId === mockUser.id
  const user = mockUser // In real app, fetch user by ID

  // Aggregate stats
  const totalSends = mockFeatures.reduce((acc, f) => 
    acc + f.climbs.filter(c => c.userId === user.id && c.status === 'send').length, 0
  )
  const totalProjects = mockFeatures.reduce((acc, f) => 
    acc + f.climbs.filter(c => c.userId === user.id && c.status === 'project').length, 0
  )
  const totalPhotos = mockFeatures.reduce((acc, f) => 
    acc + f.photos.filter(p => p.userId === user.id).length, 0
  )
  const visitedFeatures = mockFeatures.filter(f => f.isSeen).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg h-[85vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-1">
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
              {user.bio && (
                <p className="text-sm text-muted-foreground mt-1">{user.bio}</p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalSends}</p>
              <p className="text-xs text-muted-foreground">Sends</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalProjects}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalPhotos}</p>
              <p className="text-xs text-muted-foreground">Photos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{visitedFeatures}</p>
              <p className="text-xs text-muted-foreground">Visited</p>
            </div>
          </div>

          {/* External links */}
          {user.links.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              {user.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {link.type === 'mountainProject' && <Mountain className="h-4 w-4 text-orange-500" />}
                  {link.type === 'youtube' && <Youtube className="h-4 w-4 text-red-500" />}
                  {link.type === 'instagram' && <Instagram className="h-4 w-4 text-pink-500" />}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="climbs" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 grid grid-cols-3">
            <TabsTrigger value="climbs">Climbs</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="climbs" className="flex-1 overflow-y-auto p-4 mt-0">
            <div className="space-y-3">
              {mockFeatures.flatMap(f => 
                f.climbs
                  .filter(c => c.userId === user.id)
                  .map(climb => (
                    <div
                      key={climb.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {climb.status === 'send' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Target className="h-4 w-4 text-yellow-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{climb.rating}</span>
                            {climb.name && <span className="text-sm text-muted-foreground">{climb.name}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{f.name || f.id}</span>
                          </div>
                        </div>
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
                  ))
              )}
              {totalSends + totalProjects === 0 && (
                <p className="text-center text-muted-foreground py-8">No climbs logged yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="photos" className="flex-1 overflow-y-auto p-4 mt-0">
            <div className="grid grid-cols-3 gap-2">
              {mockFeatures.flatMap(f =>
                f.photos
                  .filter(p => p.userId === user.id)
                  .map(photo => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                    >
                      <img src={photo.thumbnailUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))
              )}
            </div>
            {totalPhotos === 0 && (
              <p className="text-center text-muted-foreground py-8">No photos added yet</p>
            )}
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 mt-0">
            <div className="space-y-4">
              {/* Mock activity feed */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-foreground">
                    Sent <span className="font-medium">V5 North Face Direct</span> at Sunset Boulder
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">2 weeks ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Camera className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-foreground">
                    Added a photo to <span className="font-medium">Eagle Wall</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">3 weeks ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-foreground">
                    Visited <span className="font-medium">Hidden Gem</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">1 month ago</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
