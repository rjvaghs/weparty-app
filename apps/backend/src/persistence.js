import { createClient } from "redis";
import pg from "pg";

const { Pool } = pg;

let redisClient;
let pgPool;

export async function initPersistence() {
  if (process.env.REDIS_URL) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", () => {});
    await redisClient.connect();
  }

  if (process.env.DATABASE_URL) {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        host_id TEXT NOT NULL,
        room_code TEXT NOT NULL,
        host_only_controls BOOLEAN NOT NULL DEFAULT TRUE,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
}

export function hasRedis() {
  return Boolean(redisClient);
}

export function hasPostgres() {
  return Boolean(pgPool);
}

export async function redisGet(key) {
  if (!redisClient) return null;
  return redisClient.get(key);
}

export async function redisSet(key, value) {
  if (!redisClient) return;
  await redisClient.set(key, value);
}

export async function upsertRoom(room) {
  if (!pgPool) return;
  await pgPool.query(
    `
      INSERT INTO rooms(room_id, host_id, room_code, host_only_controls, payload, updated_at)
      VALUES($1, $2, $3, $4, $5::jsonb, NOW())
      ON CONFLICT(room_id)
      DO UPDATE SET
        host_id = EXCLUDED.host_id,
        room_code = EXCLUDED.room_code,
        host_only_controls = EXCLUDED.host_only_controls,
        payload = EXCLUDED.payload,
        updated_at = NOW()
    `,
    [room.roomId, room.hostId, room.roomCode, room.hostOnlyControls, JSON.stringify(room)]
  );
}

export async function getRoomFromPostgres(roomId) {
  if (!pgPool) return null;
  const result = await pgPool.query("SELECT payload FROM rooms WHERE room_id = $1", [roomId]);
  if (result.rowCount === 0) return null;
  return result.rows[0].payload;
}

export async function upsertUser(userId, displayName) {
  if (!pgPool) return;
  await pgPool.query(
    `
      INSERT INTO users(user_id, display_name, updated_at)
      VALUES($1, $2, NOW())
      ON CONFLICT(user_id)
      DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
    `,
    [userId, displayName]
  );
}

export async function getPersistenceStatus() {
  const status = {
    redis: { enabled: hasRedis(), ok: false },
    postgres: { enabled: hasPostgres(), ok: false }
  };

  if (redisClient) {
    try {
      await redisClient.ping();
      status.redis.ok = true;
    } catch (_err) {
      status.redis.ok = false;
    }
  }

  if (pgPool) {
    try {
      await pgPool.query("SELECT 1");
      status.postgres.ok = true;
    } catch (_err) {
      status.postgres.ok = false;
    }
  }

  return status;
}
