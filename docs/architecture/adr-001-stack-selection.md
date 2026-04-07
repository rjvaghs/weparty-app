# ADR-001: Stack Selection

## Status
Accepted

## Context
The platform needs:
- Browser extension integration with JioHotstar pages
- Mobile companion with shared room/chat/voice flows
- Self-hosted backend with low-latency realtime state sync

## Decision
- Extension: Manifest V3 + React + TypeScript (custom, lightweight structure)
- Mobile: React Native (Expo) + TypeScript
- Backend: Node.js + TypeScript + Express + WebSocket (`ws`)
- Data layer: PostgreSQL (persistent) and Redis (ephemeral room/sync state)
- Shared contracts: TypeScript package consumed by backend, extension, and mobile

## Consequences
- Single language across stack improves velocity.
- MV3 service worker constraints require resilient reconnect logic.
- Expo enables quick mobile iteration but native RTC tuning may later require prebuild/eject.
