# ADR-002: Voice Topology

## Status
Accepted

## Context
Voice is required for party rooms, while movie stream rebroadcast is explicitly disallowed.

## Decision
- V1 signaling via backend WebSocket channel.
- V1 media transport via WebRTC with TURN fallback.
- Topology policy:
  - <= 4 members: peer mesh is acceptable.
  - >= 5 members: deploy SFU path (Janus/mediasoup-compatible signaling envelope).
- Audio-only in V1.

## Consequences
- Fast initial rollout with mesh.
- Clear migration path to SFU for larger rooms and network efficiency.
