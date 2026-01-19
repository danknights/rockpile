'use client'

import { useState } from 'react'
import { 
  Menu, X, Settings, User, Download, WifiOff, LogOut, 
  Moon, Sun, HelpCircle, MessageSquare, Shield, Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { mockUser } from '@/lib/mock-data'

interface HamburgerMenuProps {
  isOpen: boolean
  onToggle: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenOffline: () => void
}

export function HamburgerMenu({ 
  isOpen, 
  onToggle, 
  onOpenSettings, 
  onOpenProfile,
  onOpenOffline 
}: HamburgerMenuProps) {
  const [darkMode, setDarkMode] = useState(true)

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-4 left-4 z-10 bg-card/95 backdrop-blur-sm border border-border shadow-lg"
        onClick={onToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onToggle}
      />

      {/* Menu panel */}
      <div className="relative w-80 max-w-[85vw] h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">RockScout</h2>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User profile preview */}
          <button 
            className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            onClick={() => { onOpenProfile(); onToggle() }}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={mockUser.avatar || "/placeholder.svg"} />
              <AvatarFallback>{mockUser.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium text-foreground">{mockUser.name}</p>
              <p className="text-xs text-muted-foreground">{mockUser.email}</p>
            </div>
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            <button
              className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors"
              onClick={() => { onOpenProfile(); onToggle() }}
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <span>My Profile</span>
            </button>

            <button
              className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors"
              onClick={() => { onOpenSettings(); onToggle() }}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span>Settings</span>
            </button>

            <button
              className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors"
              onClick={() => { onOpenOffline(); onToggle() }}
            >
              <Download className="h-5 w-5 text-muted-foreground" />
              <span>Offline Regions</span>
            </button>

            <div className="flex items-center justify-between w-full p-3 rounded-lg text-foreground">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <span>Dark Mode</span>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>

          <div className="my-4 border-t border-border" />

          <div className="space-y-1">
            <button className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors">
              <Database className="h-5 w-5 text-muted-foreground" />
              <span>Data & Storage</span>
            </button>

            <button className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span>Privacy & Security</span>
            </button>

            <button className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span>Help & Support</span>
            </button>

            <button className="flex items-center gap-3 w-full p-3 rounded-lg text-foreground hover:bg-muted transition-colors">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span>Send Feedback</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-3 w-full p-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            RockScout v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
