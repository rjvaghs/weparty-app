const sockets = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_ENDPOINTS") {
    chrome.storage.local.set(
      {
        apiBaseUrl: message.apiBaseUrl,
        wsUrl: message.wsUrl
      },
      () => sendResponse({ ok: true })
    );
    return true;
  }

  if (message.type === "GET_ENDPOINTS") {
    chrome.storage.local.get(["apiBaseUrl", "wsUrl"], (result) => {
      sendResponse({
        apiBaseUrl: result.apiBaseUrl || "http://localhost:4000",
        wsUrl: result.wsUrl || "ws://localhost:4000/realtime"
      });
    });
    return true;
  }

  if (message.type === "CONNECT_ROOM") {
    chrome.storage.local.get(["apiBaseUrl", "wsUrl"], async (stored) => {
      const resolvedApiBase = stored.apiBaseUrl || "http://localhost:4000";
      const resolvedWsUrl = message.wsUrl || stored.wsUrl || "ws://localhost:4000/realtime";
      let resolvedUserId = message.userId;

      if (message.inviteToken) {
        try {
          const authResponse = await fetch(`${resolvedApiBase}/auth/guest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: message.userId || "Extension User" })
          });
          const authData = await authResponse.json();
          resolvedUserId = authData.userId || resolvedUserId;

          const joinResponse = await fetch(`${resolvedApiBase}/rooms/${message.roomId}/join`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authData.token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              inviteToken: message.inviteToken,
              displayName: message.userId || "Extension User"
            })
          });
          if (!joinResponse.ok) {
            const joinData = await joinResponse.json();
            sendResponse({ ok: false, error: joinData.error || "join failed" });
            return;
          }
        } catch (_err) {
          sendResponse({ ok: false, error: "join precheck failed" });
          return;
        }
      }

      const ws = new WebSocket(resolvedWsUrl);
      const key = sender.tab?.id || "popup";
      sockets.set(key, ws);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "JOIN_ROOM", roomId: message.roomId, userId: resolvedUserId }));
        sendResponse({ ok: true, userId: resolvedUserId });
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          chrome.runtime.sendMessage({ type: "WS_EVENT", payload });
        } catch (_e) {}
      };
    });
    return true;
  }

  if (message.type === "SEND_PARTY_EVENT") {
    const ws = sockets.get("popup") || Array.from(sockets.values())[0];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "PARTY_EVENT", payload: message.payload }));
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: "not connected" });
    }
    return true;
  }

  if (message.type === "SEND_VOICE_SIGNAL") {
    const ws = sockets.get("popup") || Array.from(sockets.values())[0];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "VOICE_SIGNAL", payload: message.payload }));
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: "not connected" });
    }
    return true;
  }
});
