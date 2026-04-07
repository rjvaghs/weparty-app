import crypto from "node:crypto";

const INVITE_SECRET = process.env.INVITE_SECRET || "dev-invite-secret";

function sign(data) {
  return crypto.createHmac("sha256", INVITE_SECRET).update(data).digest("base64url");
}

export function createInviteToken(roomId, expiresInMs = 1000 * 60 * 60 * 4) {
  const payload = {
    roomId,
    exp: Date.now() + expiresInMs
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyInviteToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (sign(encoded) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}
