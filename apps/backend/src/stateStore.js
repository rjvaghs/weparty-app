import { getRoomFromPostgres, hasRedis, redisGet, redisSet, upsertRoom } from "./persistence.js";

const roomState = new Map();

export async function getRoomState(roomId) {
  const local = roomState.get(roomId);
  if (local) return local;

  if (hasRedis()) {
    const cached = await redisGet(`room:${roomId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      roomState.set(roomId, parsed);
      return parsed;
    }
  }

  const fromPg = await getRoomFromPostgres(roomId);
  if (fromPg) {
    roomState.set(roomId, fromPg);
    if (hasRedis()) await redisSet(`room:${roomId}`, JSON.stringify(fromPg));
    return fromPg;
  }
  return undefined;
}

export async function setRoomState(roomId, state) {
  roomState.set(roomId, state);
  if (hasRedis()) await redisSet(`room:${roomId}`, JSON.stringify(state));
  await upsertRoom(state);
}

export function listRooms() {
  return Array.from(roomState.values());
}
