WeParty (JioHotstar Watch Party)

Monorepo for a lightweight Teleparty-style platform:





apps/backend - self-hosted API + realtime gateway



apps/extension - browser extension for JioHotstar sync



apps/mobile - React Native companion app for room/chat/voice



packages/shared - shared event contracts and types

Quick Start





Install dependencies:





npm install



Run backend tests:





npm run test -w @weparty/backend



Run backend locally:





npm run dev -w @weparty/backend

This repository intentionally starts lightweight and focuses on sync-only playback + voice signaling.

Backend Security Additions





Guest auth now returns signed bearer tokens.



Room creation returns a signed inviteToken.



Room join requires a valid invite token.



Host-only playback control is enforced by backend sync engine.

Persistence Configuration

Backend supports persistence adapters:





DATABASE_URL (PostgreSQL): persists rooms and users tables.



REDIS_URL (Redis): caches room snapshots for low-latency reads.

If env vars are not set, backend falls back to in-memory state for local development.

Android Install (Preview)





Start backend:





npm run dev -w @weparty/backend



For Android emulator use default mobile backend URL:





http://10.0.2.2:4000



Run mobile app locally:





npm run start -w @weparty/mobile



Build installable APK (EAS preview):





npm run build:android:preview -w @weparty/mobile

Optional environment overrides for mobile:





EXPO_PUBLIC_BACKEND_URL=http://<your-host-ip>:4000



EXPO_PUBLIC_WS_URL=ws://<your-host-ip>:4000/realtime

Friends-Ready Beta Setup

1) Host deploy (you)





Copy env template:





copy .env.example .env



Edit .env and set strong secrets:





AUTH_SECRET, INVITE_SECRET, TURN_PASSWORD



Start full stack (backend + Postgres + Redis + TURN):





npm run infra:up



Verify backend:





Open http://<host-ip>:4000/health

2) Android setup (friends)





Install APK built from:





npm run build:android:preview -w @weparty/mobile



Set app env for your host IP before build:





EXPO_PUBLIC_BACKEND_URL=http://<host-ip>:4000



EXPO_PUBLIC_WS_URL=ws://<host-ip>:4000/realtime



On first join, allow microphone permission.

3) Chrome extension setup (friends)





Load unpacked extension from:





apps/extension



Open extension popup.



Set WS URL to:





ws://<host-ip>:4000/realtime



Click Run Preflight to verify backend availability.



Paste invite URL (or roomId + inviteToken manually), then connect.

4) Join flow





Host creates room from mobile app.



Share roomId + inviteToken (or invite URL with both params).



Friends join via mobile/extension using those details.

Invite URL format:





weparty://join?roomId=<roomId>&inviteToken=<inviteToken>

Known beta limits





Voice currently uses signaling + mute-state flow; full production audio routing still needs additional hardening.



Use this for private testing with friends (small groups), not large public rollout yet.

