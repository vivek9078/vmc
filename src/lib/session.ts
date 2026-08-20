// =============================================================================
// Signed session cookie.
//
// Deliberately carries only { uid, iat, exp } — never role or permissions.
// Role/permission data is always re-read from the Users/Roles repositories
// on every request (see ./auth.ts), so revoking a user or changing their
// role takes effect immediately instead of waiting for the cookie to expire.
//
// Uses the Web Crypto API (globalThis.crypto.subtle) rather than Node's
// `crypto` module so the same code verifies a session in both the Node
// server-action/runtime AND the Edge middleware runtime without any
// conditional imports.
// =============================================================================

const COOKIE_NAME = "vdmc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface SessionPayload {
  uid: string;
  iat: number; // issued-at, unix seconds
  exp: number; // expiry, unix seconds
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is not set (or is too short). Generate one with `openssl rand -base64 48` " +
      "and set it in .env.local — sessions cannot be signed without it."
    );
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// TS 5.9 + @types/node 20 type `Uint8Array` as `Uint8Array<ArrayBufferLike>`, which the DOM
// `BufferSource` parameter type used by `crypto.subtle.*` rejects (TS2345). Copying into a
// plain `ArrayBuffer` first satisfies the type without changing the bytes passed to Web Crypto.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function getHmacKey(): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(getSecret());
  return globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Produces `base64url(payload).base64url(signature)`. */
export async function signSession(uid: string): Promise<{ token: string; expiresAt: Date }> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { uid, iat: nowSeconds, exp: nowSeconds + SESSION_TTL_SECONDS };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await getHmacKey();
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, toArrayBuffer(payloadBytes));
  const token = `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(new Uint8Array(signature))}`;
  return { token, expiresAt: new Date(payload.exp * 1000) };
}

/** Verifies signature and expiry. Returns null (never throws) on anything invalid — callers treat that as "not logged in". */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadPart, signaturePart] = parts;
  try {
    const payloadBytes = base64UrlDecode(payloadPart);
    const signatureBytes = base64UrlDecode(signaturePart);
    const key = await getHmacKey();
    const valid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      toArrayBuffer(signatureBytes),
      toArrayBuffer(payloadBytes)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_TTL_SECONDS_EXPORT = SESSION_TTL_SECONDS;

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
