import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(req: Request) {
  // Use the Host header so the redirect points to the browser-visible origin
  // (e.g. http://localhost:3000) instead of the internal bind address
  // (e.g. http://0.0.0.0:3000) when running behind Docker.
  const reqUrl = new URL(req.url);
  const host = req.headers.get("host") ?? reqUrl.host;
  const origin = `${reqUrl.protocol}//${host}`;
  const url = new URL("/login", origin);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
