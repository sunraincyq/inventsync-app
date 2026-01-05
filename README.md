# InventSync App

Multi-Channel Inventory Management Platform - Main Application

## Structure

```
inventsync-app/
├── apps/
│   ├── api/      # Backend API (Express + SQLite)
│   ├── web/      # Frontend Web (Next.js)
│   └── mobile/   # Mobile App (Expo/React Native)
├── packages/
│   └── shared/   # Shared types and utilities
└── package.json  # Root workspace config
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers (API + Web)
npm run dev

# Or run individually
npm run dev:api      # Backend on http://localhost:5001
npm run dev:web      # Frontend on http://localhost:3000
npm run dev:mobile   # Mobile (scan QR with Expo Go)
```

## Mobile Development

```bash
# Start mobile app
cd apps/mobile
npx expo start

# For Android emulator
npx expo start --android

# Scan QR code with Expo Go app on your phone
```

### Testing on Physical Device
Update the API URL in `apps/mobile/services/api.ts` to your machine's local IP.

## Features (MVP)

- ✅ Product management (CRUD)
- ✅ eBay integration
- ✅ List products to eBay
- ✅ View listing status
- ✅ Mobile app (Android/iOS via Expo)

## Environment Variables

Copy `.env.example` to `.env` in `apps/api/` and configure:

```
EBAY_ACCESS_TOKEN=your_ebay_oauth_token
EBAY_SANDBOX=true
```
