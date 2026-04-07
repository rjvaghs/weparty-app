import { WebSocket } from "ws";

const ROOM_ID = process.env.ROOM_ID || "smoke-room";
const USERS = Number(process.env.USERS || 10);
const WS_URL = process.env.WS_URL || "ws://localhost:4000/realtime";

let opened = 0;
const sockets = [];

for (let i = 0; i < USERS; i += 1) {
  const ws = new WebSocket(WS_URL);
  sockets.push(ws);
  ws.on("open", () => {
    opened += 1;
    ws.send(JSON.stringify({ type: "JOIN_ROOM", roomId: ROOM_ID, userId: `load-${i}` }));
    if (opened === USERS) {
      sockets[0].send(
        JSON.stringify({
          type: "PARTY_EVENT",
          payload: { type: "PLAY", payload: { positionMs: 5000 } }
        })
      );
      setTimeout(() => {
        console.log(`load smoke complete: clients=${USERS}`);
        for (const client of sockets) client.close();
      }, 1500);
    }
  });
}
