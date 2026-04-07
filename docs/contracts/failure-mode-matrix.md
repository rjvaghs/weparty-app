# Failure Mode Matrix (V1)

| Scenario | Detection | Client Behavior | Server Behavior |
|---|---|---|---|
| Host disconnects | WS closed + heartbeat timeout | Show "host reconnecting" for grace window | Keep room open for 60s host grace period |
| Participant disconnects | Missing heartbeats | Mark as reconnecting in member list | Keep member soft-present for 30s |
| Title mismatch | Client reports different `titleId` | Block playback sync; show "wrong title" prompt | Reject playback events from mismatched client |
| Revision gap | Received revision > local+1 | Request room snapshot | Send snapshot with latest revision |
| Stale event | Received revision <= local | Drop event | N/A |
| Buffering drift | Heartbeat drift > threshold | Soft-correct playback; hard seek if persistent | Emit sync advisory event |
| TURN unavailable | ICE failure | Retry ICE, fallback route prompt | Return TURN health status in diagnostics |
| Invite expired | API validation fail | Show "invite expired" UI | Return 410 invite status |
