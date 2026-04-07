function getVideoElement() {
  return document.querySelector("video");
}

function sendPlayback(type, payload) {
  chrome.runtime.sendMessage({
    type: "SEND_PARTY_EVENT",
    payload: { type, payload }
  });
}

function attachVideoSync() {
  const video = getVideoElement();
  if (!video) return;

  video.addEventListener("play", () => {
    sendPlayback("PLAY", { positionMs: Math.floor(video.currentTime * 1000) });
  });

  video.addEventListener("pause", () => {
    sendPlayback("PAUSE", { positionMs: Math.floor(video.currentTime * 1000) });
  });

  video.addEventListener("seeked", () => {
    sendPlayback("SEEK", { toMs: Math.floor(video.currentTime * 1000) });
  });

  video.addEventListener("ratechange", () => {
    sendPlayback("RATE_CHANGE", { playbackRate: video.playbackRate });
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "WS_EVENT") return;
  if (message.payload?.type !== "ROOM_EVENT") return;

  const video = getVideoElement();
  if (!video) return;
  const playback = message.payload.payload?.playback;
  if (!playback) return;

  const targetTime = playback.positionMs / 1000;
  if (Math.abs(video.currentTime - targetTime) > 1.2) {
    video.currentTime = targetTime;
  }
  video.playbackRate = playback.playbackRate || 1;
  if (playback.isPlaying && video.paused) {
    video.play().catch(() => {});
  } else if (!playback.isPlaying && !video.paused) {
    video.pause();
  }
});

attachVideoSync();
