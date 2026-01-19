'use client'

import { useEffect, useState } from 'react'
import { setupIonicReact, IonApp } from '@ionic/react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

// Initialize Ionic React
setupIonicReact({
  mode: 'ios', // Use iOS styling on all platforms for consistency
  swipeBackEnabled: true,
})

interface IonicProviderProps {
  children: React.ReactNode
}

export function IonicProvider({ children }: IonicProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      // Configure status bar for native platforms
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark })
          await StatusBar.setBackgroundColor({ color: '#0a0a0a' })
        } catch (e) {
          // Status bar plugin may not be available
          console.log('StatusBar not available')
        }
      }

      setIsReady(true)
    }

    initializeApp()
  }, [])

  // Show nothing until Ionic is ready (prevents flash)
  if (!isReady) {
    return (
      <div
        style={{
          backgroundColor: '#0a0a0a',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #22c55e',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <IonApp>
      {children}
    </IonApp>
  )
}
