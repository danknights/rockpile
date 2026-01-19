# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RockScout is a LiDAR-based climbing explorer web app that displays 3D scans of boulders and cliffs on an interactive map. Users can view features in 3D, add climbs/ratings, photos, comments, and mark favorites. The app supports offline mode and public/private publishing of edits.

## Development Commands

All commands run from the `lib/` directory:

```bash
cd lib
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

Uses pnpm as package manager (pnpm-lock.yaml present).

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **3D Rendering**: React Three Fiber + Three.js + Drei
- **Maps**: Mapbox GL JS (requires `NEXT_PUBLIC_MAPBOX_TOKEN` env var)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Forms**: React Hook Form + Zod validation

## Architecture

### Directory Structure (`lib/`)
- `app/` - Next.js App Router pages (single-page app, main entry is `page.tsx`)
- `components/` - React components organized by feature domain
- `lib/` - Shared utilities and types
- `hooks/` - Custom React hooks
- `public/` - Static assets

### Key Component Domains
- `components/map/` - Mapbox map view, controls, filters, legend
- `components/viewer/` - 3D LiDAR point cloud viewer (React Three Fiber)
- `components/feature/` - Feature popup with climbs, photos, comments
- `components/ui/` - shadcn/ui base components

### Data Flow
The main page (`app/page.tsx`) manages all app state. MapView is dynamically imported (SSR disabled) due to Mapbox. Feature data flows through:
1. `MapView` displays markers from `mockFeatures`
2. Clicking a marker calls `onFeatureSelect` → opens `FeaturePopup`
3. `FeaturePopup` contains `LidarViewer` (3D) and editable sections (climbs, photos, comments)

### Types (`lib/types.ts`)
Core types: `Feature`, `Climb`, `Comment`, `Photo`, `MapFilter`, `User`, `OfflineRegion`

## Environment Variables

- `NEXT_PUBLIC_MAPBOX_TOKEN` - Required for map functionality

## Configuration Notes

- TypeScript build errors are currently ignored (`next.config.mjs`: `ignoreBuildErrors: true`)
- Images are unoptimized for simplicity
