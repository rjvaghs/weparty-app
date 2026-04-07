export type PartyEventType =
  | "PLAY"
  | "PAUSE"
  | "SEEK"
  | "RATE_CHANGE"
  | "HEARTBEAT"
  | "CHAT_MESSAGE"
  | "VOICE_SIGNAL";

export interface PartyPlaybackState {
  roomId: string;
  titleId: string;
  positionMs: number;
  isPlaying: boolean;
  playbackRate: number;
  revision: number;
  updatedBy: string;
  updatedAt: string;
}

export interface PartyEventEnvelope<TPayload> {
  roomId: string;
  type: PartyEventType;
  revision: number;
  actorId: string;
  sentAt: string;
  payload: TPayload;
}

export interface JoinRoomRequest {
  roomCode: string;
  displayName: string;
}

export interface CreateRoomRequest {
  titleId: string;
  hostDisplayName: string;
  hostOnlyControls?: boolean;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  hostId: string;
  members: Array<{ userId: string; displayName: string; muted: boolean }>;
  playback: PartyPlaybackState;
}

export interface VoiceSignalPayload {
  targetUserId?: string;
  signalType: "offer" | "answer" | "ice";
  data: unknown;
}
