'use client'

import { useState } from 'react'
import { X, User, Bell, Wifi, Eye, Shield, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'data' | 'privacy'>('profile')
  const [showUnpublishWarning, setShowUnpublishWarning] = useState(false)

  // Settings state
  const [notifications, setNotifications] = useState(true)
  const [downloadOverWifi, setDownloadOverWifi] = useState(true)
  const [downloadOverCellular, setDownloadOverCellular] = useState(false)
  const [autoDownload, setAutoDownload] = useState(false)
  const [mapQuality, setMapQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [showDistance, setShowDistance] = useState<'metric' | 'imperial'>('metric')

  if (!isOpen) return null

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Eye },
    { id: 'data', label: 'Data & Offline', icon: Wifi },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-48 border-r border-border p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-2 w-full p-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Display Name</Label>
                      <input
                        id="name"
                        type="text"
                        defaultValue="Alex Climber"
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        defaultValue="Passionate climber exploring new routes across the country."
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-4">External Links</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="mp">Mountain Project</Label>
                      <input
                        id="mp"
                        type="url"
                        placeholder="https://mountainproject.com/user/..."
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="youtube">YouTube Channel</Label>
                      <input
                        id="youtube"
                        type="url"
                        placeholder="https://youtube.com/@..."
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="instagram">Instagram</Label>
                      <input
                        id="instagram"
                        type="url"
                        placeholder="https://instagram.com/..."
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                <Button className="w-full">Save Changes</Button>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-4">Display</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Distance Units</Label>
                      <RadioGroup value={showDistance} onValueChange={(v) => setShowDistance(v as 'metric' | 'imperial')}>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="metric" id="metric" />
                            <Label htmlFor="metric">Metric (m)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="imperial" id="imperial" />
                            <Label htmlFor="imperial">Imperial (ft)</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-4">Map</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Default Map Quality</Label>
                      <RadioGroup value={mapQuality} onValueChange={(v) => setMapQuality(v as 'low' | 'medium' | 'high')}>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="low" id="low" />
                            <Label htmlFor="low">Low (faster loading)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <Label htmlFor="medium">Medium (balanced)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="high" />
                            <Label htmlFor="high">High (best quality)</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-4">Download Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Download over WiFi</Label>
                        <p className="text-xs text-muted-foreground">Allow downloads when connected to WiFi</p>
                      </div>
                      <Switch checked={downloadOverWifi} onCheckedChange={setDownloadOverWifi} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Download over Cellular</Label>
                        <p className="text-xs text-muted-foreground">Allow downloads using mobile data</p>
                      </div>
                      <Switch checked={downloadOverCellular} onCheckedChange={setDownloadOverCellular} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-download visited areas</Label>
                        <p className="text-xs text-muted-foreground">Automatically save areas you visit</p>
                      </div>
                      <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-4">Storage</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Offline maps</span>
                      <span className="text-sm text-muted-foreground">245 MB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">3D models</span>
                      <span className="text-sm text-muted-foreground">128 MB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Cached photos</span>
                      <span className="text-sm text-muted-foreground">52 MB</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary" style={{ width: '35%' }} />
                    </div>
                    <p className="text-xs text-muted-foreground">425 MB of 2 GB used</p>
                    <Button variant="outline" className="w-full mt-2 bg-transparent">
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-4">Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive updates about comments and likes</p>
                    </div>
                    <Switch checked={notifications} onCheckedChange={setNotifications} />
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-4">Published Content</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unpublish all your content and make everything private. This includes
                    comments, ratings, photos, and climb logs.
                  </p>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setShowUnpublishWarning(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Unpublish All My Content
                  </Button>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-4">Account</h3>
                  <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10 bg-transparent">
                    Delete Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unpublish warning modal */}
      {showUnpublishWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card rounded-xl p-6 max-w-md shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">Unpublish All Content?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will make all your comments, ratings, photos, and climb logs private. 
              Other users will no longer see your contributions. You can republish 
              individual items later.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowUnpublishWarning(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setShowUnpublishWarning(false)}>
                Unpublish All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
