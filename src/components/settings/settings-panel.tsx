'use client'

import { useState } from 'react'
import { X, Wifi, Eye, Shield, Trash2, AlertTriangle, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  section?: 'appearance' | 'data' | 'privacy'
}

export function SettingsPanel({ isOpen, onClose, section = 'appearance' }: SettingsPanelProps) {
  const [showUnpublishWarning, setShowUnpublishWarning] = useState(false)
  const [showDeleteAccountWarning, setShowDeleteAccountWarning] = useState(false)
  const [showClearCacheWarning, setShowClearCacheWarning] = useState(false)
  // const [isDarkMode, setIsDarkMode] = useState(true) // Dark mode removed per request

  // Settings state
  // const [notifications, setNotifications] = useState(true) // Removed per request
  const [downloadOverWifi, setDownloadOverWifi] = useState(true)
  const [downloadOverCellular, setDownloadOverCellular] = useState(false)
  const [autoDownload, setAutoDownload] = useState(false)
  const [mapQuality, setMapQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [showDistance, setShowDistance] = useState<'metric' | 'imperial'>('metric')
  const [twoFactor, setTwoFactor] = useState(false)

  if (!isOpen) return null

  // Custom green toggle style
  const greenToggleClass = "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-200"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {section === 'data' ? 'Data & Storage' : section}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {section === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">Display</h3>
                <div className="space-y-4">
                  {/* Dark Mode removed */}
                  <div>
                    <Label className="mb-2 block">Distance Units</Label>
                    <RadioGroup value={showDistance} onValueChange={(v) => setShowDistance(v as 'metric' | 'imperial')}>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="metric" id="metric" className="text-green-600 border-gray-300" />
                          <Label htmlFor="metric">Metric (m)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="imperial" id="imperial" className="text-green-600 border-gray-300" />
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
                          <RadioGroupItem value="low" id="low" className="text-green-600 border-gray-300" />
                          <Label htmlFor="low">Low (faster loading)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" className="text-green-600 border-gray-300" />
                          <Label htmlFor="medium">Medium (balanced)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="high" className="text-green-600 border-gray-300" />
                          <Label htmlFor="high">High (best quality)</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">Download Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Download over WiFi</Label>
                      <p className="text-xs text-muted-foreground">Allow downloads when connected to WiFi</p>
                    </div>
                    <Switch checked={downloadOverWifi} onCheckedChange={setDownloadOverWifi} className={greenToggleClass} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Download over Cellular</Label>
                      <p className="text-xs text-muted-foreground">Allow downloads using mobile data</p>
                    </div>
                    <Switch checked={downloadOverCellular} onCheckedChange={setDownloadOverCellular} className={greenToggleClass} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-download visited areas</Label>
                      <p className="text-xs text-muted-foreground">Automatically save areas you visit</p>
                    </div>
                    <Switch checked={autoDownload} onCheckedChange={setAutoDownload} className={greenToggleClass} />
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
                  <Button
                    variant="outline"
                    className="w-full mt-2 bg-transparent hover:bg-red-50 text-red-600 border-red-200"
                    onClick={() => setShowClearCacheWarning(true)}
                  >
                    Clear Cache
                  </Button>
                </div>
              </div>
            </div>
          )}

          {section === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication (2FA)</Label>
                      <p className="text-xs text-muted-foreground">Enhance your account security</p>
                    </div>
                    <Switch checked={twoFactor} onCheckedChange={setTwoFactor} className={greenToggleClass} />
                  </div>
                  <Button variant="outline" className="w-full justify-start">
                    Change Password
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-4">Published Content</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Unpublish all your content and make everything private. This includes
                  comments, ratings, photos, and climb logs. You will have to re-publish content for each feature separately.
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
                <Button
                  variant="outline"
                  className="w-full text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={() => setShowDeleteAccountWarning(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          )}
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
              Other users will no longer see your contributions. You will have to re-publish
              content for each feature separately.
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

      {/* Delete Account warning modal */}
      {showDeleteAccountWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card rounded-xl p-6 max-w-md shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">Delete Account?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete your account? This action cannot be undone and you will lose all your data.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowDeleteAccountWarning(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteAccountWarning(false)}>
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache warning modal */}
      {showClearCacheWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card rounded-xl p-6 max-w-md shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Trash2 className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-foreground">Delete all offline data?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will remove all downloaded maps, 3D models, and cached images. You will need to re-download them if needed.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowClearCacheWarning(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setShowClearCacheWarning(false)}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
