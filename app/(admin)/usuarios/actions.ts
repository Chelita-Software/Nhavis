"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { insert, readAll } from "@/lib/db";
import { nowIso, uuid } from "@/lib/ids";
import type { Role, User } from "@/lib/types";

export async function createUserAction(input: {
  name: string;
  email: string;
  role: Role;
  dailyRate: number;
}) {
  await requireRole(["admin"]);
  const all = await readAll("users");
  if (
    all.some(
      (u) => u.email.toLowerCase() === input.email.trim().toLowerCase(),
    )
  ) {
    throw new Error("Ya existe un usuario con ese correo.");
  }
  const user: User = {
    id: uuid(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    dailyRate: input.dailyRate,
    active: true,
    createdAt: nowIso(),
  };
  await insert("users", user);
  revalidatePath("/usuarios");
  return user;
}
