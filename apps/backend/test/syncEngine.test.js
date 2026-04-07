import test from "node:test";
import assert from "node:assert/strict";
import { ensureRoomPlayback, applyPlaybackEvent } from "../src/syncEngine.js";

test("creates room with initial revision 0", async () => {
  const room = await ensureRoomPlayback("room-a", "title-a", "host-a");
  assert.equal(room.playback.revision, 0);
  assert.equal(room.playback.isPlaying, false);
});

test("increments revision on play and seek", async () => {
  await ensureRoomPlayback("room-b", "title-b", "host-b");
  const played = await applyPlaybackEvent("room-b", "host-b", "PLAY", { positionMs: 1000 });
  assert.equal(played.playback.revision, 1);
  assert.equal(played.playback.positionMs, 1000);
  const seeked = await applyPlaybackEvent("room-b", "host-b", "SEEK", { toMs: 15000 });
  assert.equal(seeked.playback.revision, 2);
  assert.equal(seeked.playback.positionMs, 15000);
});

test("rejects non-host playback when host-only controls enabled", async () => {
  await ensureRoomPlayback("room-c", "title-c", "host-c");
  await assert.rejects(
    applyPlaybackEvent("room-c", "viewer-c", "PLAY", { positionMs: 900 }),
    /host_only_controls/
  );
});
