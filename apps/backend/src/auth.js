import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function issueAuthToken(user) {
  const payload = {
    userId: user.userId,
    displayName: user.displayName,
    exp: Date.now() + 1000 * 60 * 60 * 24
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAuthToken(token) {
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

export function getBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length);
}
