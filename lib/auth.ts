import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readAll } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";
import type { Role, User } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const users = await readAll("users");
  const user = users.find((u) => u.id === payload.userId);
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(allowed: Role[]): Promise<User> {
  const u = await requireUser();
  if (!allowed.includes(u.role)) redirect("/login");
  return u;
}
