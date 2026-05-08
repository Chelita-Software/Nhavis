import type { Role } from "./types";

const SECRET = "demo-nhavis-not-for-production-change-me-32chars";
const COOKIE_NAME = "nhavis_session";
const TTL_DAYS = 7;

export interface SessionPayload {
  userId: string;
  role: Role;
  exp: number;
}

// We cast to BufferSource at the WebCrypto boundary because TS 5.6+ types
// `Uint8Array` as generic over ArrayBufferLike, which doesn't satisfy the
// strict ArrayBufferView<ArrayBuffer> the lib.dom shim expects.
function enc(s: string): BufferSource {
  return new TextEncoder().encode(s) as unknown as BufferSource;
}

function bytesToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): BufferSource {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out as unknown as BufferSource;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
): Promise<string> {
  const exp = Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000;
  const full: SessionPayload = { ...payload, exp };
  const dataStr = JSON.stringify(full);
  const dataBytes = new TextEncoder().encode(dataStr);
  const data = bytesToBase64Url(
    dataBytes.buffer.slice(
      dataBytes.byteOffset,
      dataBytes.byteOffset + dataBytes.byteLength,
    ) as ArrayBuffer,
  );
  const key = await getKey();
  const sig = bytesToBase64Url(
    await crypto.subtle.sign("HMAC", key, enc(data)),
  );
  return `${data}.${sig}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const key = await getKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(sig),
      enc(data),
    );
    if (!ok) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(data) as Uint8Array),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
