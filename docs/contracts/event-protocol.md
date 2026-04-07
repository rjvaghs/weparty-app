# Event Protocol (V1)

All realtime events are sent as `PartyEventEnvelope<TPayload>`.

## Envelope

```ts
{
  roomId: string;
  type: "PLAY" | "PAUSE" | "SEEK" | "RATE_CHANGE" | "HEARTBEAT" | "CHAT_MESSAGE" | "VOICE_SIGNAL";
  revision: number; // monotonic per room
  actorId: string;
  sentAt: string; // ISO timestamp
  payload: object;
}
```

## Playback Events

- `PLAY`: `{ positionMs: number }`
- `PAUSE`: `{ positionMs: number }`
- `SEEK`: `{ fromMs: number, toMs: number }`
- `RATE_CHANGE`: `{ playbackRate: number }`
- `HEARTBEAT`: `{ positionMs: number, driftMs: number }`

Rules:
- Server is source-of-truth for revision ordering.
- Clients ignore stale revisions.
- Host actions are canonical when host-only controls are enabled.

## Chat Event

- `CHAT_MESSAGE`: `{ messageId: string, text: string }`

## Voice Signaling Event

- `VOICE_SIGNAL`: `{ targetUserId?: string, signalType: "offer" | "answer" | "ice", data: unknown }`

No audio media is proxied via this event; this is signaling only.
