const roomId = document.getElementById("roomId");
const userId = document.getElementById("userId");
const inviteToken = document.getElementById("inviteToken");
const inviteUrl = document.getElementById("inviteUrl");
const apiBaseUrl = document.getElementById("apiBaseUrl");
const wsUrl = document.getElementById("wsUrl");
const saveConfigButton = document.getElementById("saveConfig");
const preflightButton = document.getElementById("preflight");
const autoJoinButton = document.getElementById("autoJoin");
const connectButton = document.getElementById("connect");
const muteButton = document.getElementById("mute");
const events = document.getElementById("events");

let muted = false;
let runtimeWsUrl = "ws://localhost:4000/realtime";
let runtimeApiBaseUrl = "http://localhost:4000";

function parseInvite(url) {
  try {
    const parsed = new URL(url);
    return {
      roomId: parsed.searchParams.get("roomId") || "",
      inviteToken: parsed.searchParams.get("inviteToken") || ""
    };
  } catch (_e) {
    return { roomId: "", inviteToken: "" };
  }
}

function log(value) {
  events.textContent = `${value}\n${events.textContent}`.slice(0, 4000);
}

chrome.runtime.sendMessage({ type: "GET_ENDPOINTS" }, (response) => {
  runtimeWsUrl = response.wsUrl;
  runtimeApiBaseUrl = response.apiBaseUrl || "http://localhost:4000";
  wsUrl.value = runtimeWsUrl;
  apiBaseUrl.value = runtimeApiBaseUrl;
});

saveConfigButton.addEventListener("click", () => {
  runtimeWsUrl = wsUrl.value || runtimeWsUrl;
  runtimeApiBaseUrl = apiBaseUrl.value || runtimeApiBaseUrl;
  chrome.runtime.sendMessage(
    {
      type: "SAVE_ENDPOINTS",
      apiBaseUrl: runtimeApiBaseUrl,
      wsUrl: runtimeWsUrl
    },
    (response) => log(`save config: ${JSON.stringify(response)}`)
  );
});

preflightButton.addEventListener("click", async () => {
  try {
    const response = await fetch(`${runtimeApiBaseUrl}/preflight`);
    const data = await response.json();
    log(
      `preflight: ok=${data.ok} redis=${data.persistence?.redis?.enabled ? (data.persistence.redis.ok ? "ok" : "down") : "off"} postgres=${data.persistence?.postgres?.enabled ? (data.persistence.postgres.ok ? "ok" : "down") : "off"}`
    );
  } catch (_e) {
    log("preflight: failed");
  }
});

inviteUrl.addEventListener("change", () => {
  const parsed = parseInvite(inviteUrl.value);
  if (parsed.roomId) roomId.value = parsed.roomId;
  if (parsed.inviteToken) inviteToken.value = parsed.inviteToken;
});

autoJoinButton.addEventListener("click", () => {
  const parsed = parseInvite(inviteUrl.value);
  if (!parsed.roomId || !parsed.inviteToken) {
    log("auto-join: invalid invite URL");
    return;
  }
  roomId.value = parsed.roomId;
  inviteToken.value = parsed.inviteToken;
  connectButton.click();
});

connectButton.addEventListener("click", () => {
  chrome.runtime.sendMessage(
    {
      type: "CONNECT_ROOM",
      roomId: roomId.value,
      userId: userId.value,
      inviteToken: inviteToken.value,
      wsUrl: runtimeWsUrl
    },
    (response) => {
      log(`connect: ${JSON.stringify(response)}`);
    }
  );
});

muteButton.addEventListener("click", () => {
  muted = !muted;
  chrome.runtime.sendMessage(
    {
      type: "SEND_VOICE_SIGNAL",
      payload: { signalType: "mute-state", data: { muted } }
    },
    (response) => log(`voice: ${JSON.stringify(response)}`)
  );
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "WS_EVENT") {
    log(JSON.stringify(message.payload));
  }
});
