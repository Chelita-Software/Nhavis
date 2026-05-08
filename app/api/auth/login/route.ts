import { NextResponse } from "next/server";
import { readAll } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { homePath } from "@/lib/permissions";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "Falta el correo." },
      { status: 400 },
    );
  }

  const users = await readAll("users");
  const user = users.find((u) => u.email.toLowerCase() === email);

  if (!user || !user.active) {
    return NextResponse.json(
      { error: "Correo no registrado o inactivo." },
      { status: 401 },
    );
  }

  const token = await signSession({ userId: user.id, role: user.role });
  const res = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
    redirectTo: homePath(user.role),
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
