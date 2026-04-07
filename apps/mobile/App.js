import React, { useEffect, useMemo, useState } from "react";
import { Button, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Audio } from "expo-av";
import * as Clipboard from "expo-clipboard";

const API_BASE =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "http://10.0.2.2:4000";
const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  "ws://10.0.2.2:4000/realtime";

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

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState(`mobile-${Math.random().toString(36).slice(2, 8)}`);
  const [inviteUrl, setInviteUrl] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [shareInviteUrl, setShareInviteUrl] = useState("");
  const [status, setStatus] = useState("Idle");
  const [authToken, setAuthToken] = useState("");

  const ws = useMemo(() => ({ current: null }), []);

  useEffect(() => {
    const parsed = parseInvite(inviteUrl);
    if (parsed.roomId) setRoomId(parsed.roomId);
    if (parsed.inviteToken) setInviteToken(parsed.inviteToken);
  }, [inviteUrl]);

  async function bootstrapAuth() {
    if (authToken) return authToken;
    const response = await fetch(`${API_BASE}/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: userId })
    });
    const data = await response.json();
    setAuthToken(data.token);
    setUserId(data.userId || userId);
    return data.token;
  }

  async function createRoom() {
    try {
      const token = await bootstrapAuth();
      const response = await fetch(`${API_BASE}/rooms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ titleId: "jiohotstar-current", hostDisplayName: userId })
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Failed to create room");
        return;
      }
      setRoomId(data.roomId);
      setInviteToken(data.inviteToken || "");
      setShareInviteUrl(`weparty://join?roomId=${data.roomId}&inviteToken=${encodeURIComponent(data.inviteToken || "")}`);
      setStatus("Room created");
    } catch (_e) {
      setStatus("Room creation failed");
    }
  }

  async function connect() {
    if (!roomId) return;
    try {
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      if (micStatus !== "granted") {
        setStatus("Microphone permission denied");
        return;
      }
    } catch (_e) {
      setStatus("Unable to request microphone permission");
      return;
    }

    if (inviteToken) {
      try {
        const token = await bootstrapAuth();
        const joinResponse = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ inviteToken, displayName: userId })
        });
        if (!joinResponse.ok) {
          const data = await joinResponse.json();
          setStatus(data.error || "Room join failed");
          return;
        }
      } catch (_e) {
        setStatus("Room join request failed");
        return;
      }
    }

    const socket = new WebSocket(WS_URL);
    ws.current = socket;
    socket.onopen = () => {
      setConnected(true);
      setStatus("Connected");
      socket.send(JSON.stringify({ type: "JOIN_ROOM", roomId, userId }));
    };
    socket.onmessage = (event) => {
      setMessages((prev) => [event.data, ...prev].slice(0, 50));
    };
    socket.onclose = () => {
      setConnected(false);
      setStatus("Disconnected");
    };
  }

  async function runPreflight() {
    try {
      const response = await fetch(`${API_BASE}/preflight`);
      const data = await response.json();
      if (!response.ok) {
        setStatus("Preflight failed");
        return;
      }
      const redis = data.persistence?.redis;
      const postgres = data.persistence?.postgres;
      setStatus(
        `Preflight OK | Redis: ${redis?.enabled ? (redis.ok ? "ok" : "down") : "off"} | Postgres: ${postgres?.enabled ? (postgres.ok ? "ok" : "down") : "off"}`
      );
    } catch (_e) {
      setStatus("Preflight request failed");
    }
  }

  async function copyInviteLink() {
    if (!shareInviteUrl) {
      setStatus("No invite URL to copy yet");
      return;
    }
    try {
      await Clipboard.setStringAsync(shareInviteUrl);
      setStatus("Invite URL copied");
    } catch (_e) {
      setStatus("Copy failed");
    }
  }

  function sendChat() {
    if (!chatText || !ws.current) return;
    ws.current.send(
      JSON.stringify({
        type: "PARTY_EVENT",
        payload: {
          type: "CHAT_MESSAGE",
          payload: { text: chatText }
        }
      })
    );
    setChatText("");
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "VOICE_SIGNAL",
          payload: { signalType: "mute-state", data: { muted: next } }
        })
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>WeParty Mobile</Text>
      <Text style={{ marginTop: 8 }}>Backend: {API_BASE}</Text>
      <Text>Status: {status}</Text>
      <TextInput placeholder="Invite URL" value={inviteUrl} onChangeText={setInviteUrl} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <TextInput editable={false} placeholder="Share Invite URL" value={shareInviteUrl} style={{ borderWidth: 1, padding: 8, marginTop: 8, color: "#444" }} />
      <TextInput placeholder="Room ID" value={roomId} onChangeText={setRoomId} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <TextInput placeholder="Invite Token" value={inviteToken} onChangeText={setInviteToken} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <TextInput placeholder="User ID" value={userId} onChangeText={setUserId} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <Button title="Create Room" onPress={createRoom} />
      <Button title="Copy Invite URL" onPress={copyInviteLink} />
      <Button title="Run Preflight Check" onPress={runPreflight} />
      <Button title={connected ? "Connected" : "Connect"} onPress={connect} />
      <View style={{ marginTop: 8 }}>
        <Button title={muted ? "Unmute Voice" : "Mute Voice"} onPress={toggleMute} />
      </View>
      <TextInput placeholder="Chat message" value={chatText} onChangeText={setChatText} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <Button title="Send Chat" onPress={sendChat} />
      <Text style={{ marginTop: 12, fontWeight: "600" }}>Room Timeline</Text>
      <ScrollView style={{ marginTop: 8 }}>
        {messages.map((m, idx) => (
          <Text key={`${idx}-${m}`} style={{ fontSize: 12, marginBottom: 4 }}>
            {m}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
