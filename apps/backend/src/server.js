import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  addMember,
  applyPlaybackEvent,
  ensureRoomPlayback,
  setHostOnlyControls
} from "./syncEngine.js";
import { getRoomState } from "./stateStore.js";
import { createInviteToken, verifyInviteToken } from "./invite.js";
import { getBearerToken, issueAuthToken, verifyAuthToken } from "./auth.js";
import { getPersistenceStatus, initPersistence, upsertUser } from "./persistence.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/preflight", async (_req, res) => {
  const persistence = await getPersistenceStatus();
  res.json({
    ok: true,
    realtime: { wsPath: "/realtime" },
    persistence
  });
});

app.post("/auth/guest", (req, res) => {
  const displayName = req.body?.displayName || "Guest";
  const userId = uuidv4();
  const token = issueAuthToken({ userId, displayName });
  upsertUser(userId, displayName).catch(() => {});
  res.json({ token, userId, displayName });
});

app.post("/rooms", async (req, res) => {
  const { titleId, hostDisplayName } = req.body ?? {};
  if (!titleId) return res.status(400).json({ error: "titleId required" });
  const auth = verifyAuthToken(getBearerToken(req.headers.authorization));
  const hostId = auth?.userId || uuidv4();
  const roomId = uuidv4();
  const room = await ensureRoomPlayback(roomId, titleId, hostId);
  await addMember(roomId, {
    userId: hostId,
    displayName: hostDisplayName || auth?.displayName || "Host",
    muted: false
  });
  await upsertUser(hostId, hostDisplayName || auth?.displayName || "Host");
  const inviteToken = createInviteToken(roomId);
  return res.status(201).json({ ...room, inviteToken });
});

app.post("/rooms/:roomId/join", async (req, res) => {
  const invite = verifyInviteToken(req.body?.inviteToken || "");
  if (!invite || invite.roomId !== req.params.roomId) {
    return res.status(410).json({ error: "invite expired or invalid" });
  }
  const room = await getRoomState(req.params.roomId);
  if (!room) return res.status(404).json({ error: "room not found" });
  const auth = verifyAuthToken(getBearerToken(req.headers.authorization));
  const userId = auth?.userId || uuidv4();
  await addMember(req.params.roomId, {
    userId,
    displayName: req.body?.displayName || auth?.displayName || "Viewer",
    muted: false
  });
  await upsertUser(userId, req.body?.displayName || auth?.displayName || "Viewer");
  return res.json({ userId, snapshot: await getRoomState(req.params.roomId) });
});

app.post("/rooms/:roomId/controls", async (req, res) => {
  const auth = verifyAuthToken(getBearerToken(req.headers.authorization));
  if (!auth) return res.status(401).json({ error: "unauthorized" });
  const room = await getRoomState(req.params.roomId);
  if (!room) return res.status(404).json({ error: "room not found" });
  if (room.hostId !== auth.userId) return res.status(403).json({ error: "host only" });
  const updated = await setHostOnlyControls(req.params.roomId, req.body?.hostOnlyControls);
  return res.json(updated);
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/realtime" });

const roomClients = new Map();

wss.on("connection", (socket) => {
  socket.on("message", async (raw) => {
    try {
      const message = JSON.parse(String(raw));
      if (message.type === "JOIN_ROOM") {
        socket.roomId = message.roomId;
        socket.userId = message.userId;
        const set = roomClients.get(message.roomId) || new Set();
        set.add(socket);
        roomClients.set(message.roomId, set);
        socket.send(JSON.stringify({ type: "ROOM_SNAPSHOT", payload: await getRoomState(message.roomId) }));
        return;
      }

      if (message.type === "PARTY_EVENT" && socket.roomId) {
        const updated = await applyPlaybackEvent(socket.roomId, socket.userId || "unknown", message.payload.type, message.payload.payload || {});
        const fanout = roomClients.get(socket.roomId) || new Set();
        const outbound = JSON.stringify({
          type: "ROOM_EVENT",
          payload: {
            roomId: socket.roomId,
            revision: updated.playback.revision,
            event: message.payload.type,
            playback: updated.playback
          }
        });
        for (const client of fanout) {
          if (client.readyState === 1) client.send(outbound);
        }
        return;
      }

      if (message.type === "VOICE_SIGNAL" && socket.roomId) {
        const fanout = roomClients.get(socket.roomId) || new Set();
        const outbound = JSON.stringify({
          type: "VOICE_SIGNAL",
          payload: {
            fromUserId: socket.userId,
            data: message.payload
          }
        });
        for (const client of fanout) {
          if (client !== socket && client.readyState === 1) client.send(outbound);
        }
      }
    } catch (_err) {
      socket.send(JSON.stringify({ type: "ERROR", payload: { message: "invalid message or unauthorized event" } }));
    }
  });

  socket.on("close", () => {
    if (!socket.roomId) return;
    const set = roomClients.get(socket.roomId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) roomClients.delete(socket.roomId);
  });
});

const port = Number(process.env.PORT || 4000);
initPersistence()
  .then(() => {
    server.listen(port, () => {
      console.log(`backend listening on ${port}`);
    });
  })
  .catch((err) => {
    console.error("failed to init persistence", err);
    process.exit(1);
  });
