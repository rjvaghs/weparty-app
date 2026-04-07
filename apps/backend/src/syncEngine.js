import { getRoomState, setRoomState } from "./stateStore.js";

function nowIso() {
  return new Date().toISOString();
}

export async function ensureRoomPlayback(roomId, titleId, hostId) {
  const existing = await getRoomState(roomId);
  if (existing) return existing;
  const created = {
    roomId,
    roomCode: roomId.slice(0, 6).toUpperCase(),
    hostId,
    hostOnlyControls: true,
    members: [],
    playback: {
      roomId,
      titleId,
      positionMs: 0,
      isPlaying: false,
      playbackRate: 1,
      revision: 0,
      updatedBy: hostId,
      updatedAt: nowIso()
    }
  };
  await setRoomState(roomId, created);
  return created;
}

export async function applyPlaybackEvent(roomId, actorId, type, payload) {
  const room = await getRoomState(roomId);
  if (!room) throw new Error("room_not_found");
  if (room.hostOnlyControls && actorId !== room.hostId) {
    throw new Error("host_only_controls");
  }

  const next = { ...room.playback };
  if (type === "PLAY") {
    next.isPlaying = true;
    next.positionMs = payload.positionMs ?? next.positionMs;
  } else if (type === "PAUSE") {
    next.isPlaying = false;
    next.positionMs = payload.positionMs ?? next.positionMs;
  } else if (type === "SEEK") {
    next.positionMs = payload.toMs;
  } else if (type === "RATE_CHANGE") {
    next.playbackRate = payload.playbackRate;
  } else {
    return room;
  }

  next.revision += 1;
  next.updatedBy = actorId;
  next.updatedAt = nowIso();
  const updated = { ...room, playback: next };
  await setRoomState(roomId, updated);
  return updated;
}

export async function setHostOnlyControls(roomId, enabled) {
  const room = await getRoomState(roomId);
  if (!room) throw new Error("room_not_found");
  const updated = { ...room, hostOnlyControls: Boolean(enabled) };
  await setRoomState(roomId, updated);
  return updated;
}

export async function addMember(roomId, member) {
  const room = await getRoomState(roomId);
  if (!room) throw new Error("room_not_found");
  const exists = room.members.some((m) => m.userId === member.userId);
  if (!exists) room.members.push(member);
  await setRoomState(roomId, room);
  return room;
}
