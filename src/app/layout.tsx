'use client'

import React from "react"
import './globals.css'
import { IonicProvider } from '@/components/ionic-provider'

// Metadata must be defined in a separate file for static export
// since this is now a client component

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0a0a0a" />

        <title>RockScout - LiDAR Climbing Explorer</title>
        <meta name="description" content="Explore 3D LiDAR scans of cliffs and boulders across public lands" />

        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="font-sans antialiased">
        <IonicProvider>
          {children}
        </IonicProvider>
      </body>
    </html>
  )
}
