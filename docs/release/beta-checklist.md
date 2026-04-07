# Beta Release Checklist

## Functional Verification
- [ ] Create room from backend API and validate snapshot response.
- [ ] Join room from extension popup and receive `ROOM_SNAPSHOT`.
- [ ] Verify JioHotstar video events emit `PLAY/PAUSE/SEEK/RATE_CHANGE`.
- [ ] Join same room from mobile and verify event fanout.
- [ ] Validate voice signaling messages are relayed peer-to-peer.

## Reliability Verification
- [ ] Run backend unit tests: `npm run test -w @weparty/backend`
- [ ] Run load smoke: `npm run load:smoke -w @weparty/backend`
- [ ] Simulate reconnect: close and reopen websocket, confirm fresh snapshot.
- [ ] Confirm stale revisions are ignored by clients.

## Security and Ops
- [ ] Enable TLS termination in deployment.
- [ ] Configure TURN credentials and region routing.
- [ ] Enforce API rate limits on auth and room joins.
- [ ] Review logs for PII leakage.

## Rollback
- [ ] Keep previous backend image and config snapshot.
- [ ] Add feature flag to disable room creation quickly.
- [ ] Document incident owner and rollback command.
