'use client'

import { useState } from 'react'
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonAvatar,
  IonNote,
  IonMenuToggle,
} from '@ionic/react'
import {
  personOutline,
  settingsOutline,
  downloadOutline,
  moonOutline,
  sunnyOutline,
  serverOutline,
  shieldOutline,
  helpCircleOutline,
  chatbubbleOutline,
  logOutOutline,
} from 'ionicons/icons'
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

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RockScout</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* User Profile Preview */}
        <IonMenuToggle autoHide={false}>
          <IonItem
            button
            detail={false}
            onClick={onOpenProfile}
            className="native-button my-2 mx-2 rounded-xl"
            lines="none"
            style={{ '--background': 'var(--ion-color-step-100)' }}
          >
            <IonAvatar slot="start">
              <img src={mockUser.avatar || "/placeholder.svg"} alt={mockUser.name} />
            </IonAvatar>
            <IonLabel>
              <h2 className="font-medium">{mockUser.name}</h2>
              <p className="text-xs">{mockUser.email}</p>
            </IonLabel>
          </IonItem>
        </IonMenuToggle>

        {/* Main Menu Items */}
        <IonList lines="none" className="px-2">
          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={onOpenProfile} className="native-button rounded-lg my-1">
              <IonIcon icon={personOutline} slot="start" />
              <IonLabel>My Profile</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={onOpenSettings} className="native-button rounded-lg my-1">
              <IonIcon icon={settingsOutline} slot="start" />
              <IonLabel>Settings</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={onOpenOffline} className="native-button rounded-lg my-1">
              <IonIcon icon={downloadOutline} slot="start" />
              <IonLabel>Offline Regions</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonItem lines="none" className="rounded-lg my-1">
            <IonIcon icon={darkMode ? moonOutline : sunnyOutline} slot="start" />
            <IonLabel>Dark Mode</IonLabel>
            <IonToggle
              slot="end"
              checked={darkMode}
              onIonChange={(e) => setDarkMode(e.detail.checked)}
            />
          </IonItem>
        </IonList>

        {/* Divider */}
        <div className="h-px bg-border mx-4 my-4" />

        {/* Secondary Menu Items */}
        <IonList lines="none" className="px-2">
          <IonItem button detail={false} className="native-button rounded-lg my-1">
            <IonIcon icon={serverOutline} slot="start" />
            <IonLabel>Data & Storage</IonLabel>
          </IonItem>

          <IonItem button detail={false} className="native-button rounded-lg my-1">
            <IonIcon icon={shieldOutline} slot="start" />
            <IonLabel>Privacy & Security</IonLabel>
          </IonItem>

          <IonItem button detail={false} className="native-button rounded-lg my-1">
            <IonIcon icon={helpCircleOutline} slot="start" />
            <IonLabel>Help & Support</IonLabel>
          </IonItem>

          <IonItem button detail={false} className="native-button rounded-lg my-1">
            <IonIcon icon={chatbubbleOutline} slot="start" />
            <IonLabel>Send Feedback</IonLabel>
          </IonItem>
        </IonList>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <IonItem
            button
            detail={false}
            className="native-button rounded-lg"
            lines="none"
            style={{ '--color': 'var(--ion-color-danger)' }}
          >
            <IonIcon icon={logOutOutline} slot="start" color="danger" />
            <IonLabel color="danger">Sign Out</IonLabel>
          </IonItem>
          <IonNote className="block text-center text-xs mt-3">
            RockScout v1.0.0
          </IonNote>
          {/* Safe area padding */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </IonContent>
    </>
  )
}
