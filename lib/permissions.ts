import type { Role, User } from "./types";

export function canSeeCosts(user: User | null): boolean {
  return user?.role === "admin";
}

export function canAuthorizeParts(user: User | null): boolean {
  return user?.role === "admin" || user?.role === "supervisor";
}

export function canCreateOrder(user: User | null): boolean {
  return user?.role === "admin" || user?.role === "supervisor";
}

export function canManageUsers(user: User | null): boolean {
  return user?.role === "admin";
}

export function canManageStock(user: User | null): boolean {
  return user?.role === "admin";
}

export function canSignSupervisor(user: User | null): boolean {
  return user?.role === "supervisor" || user?.role === "admin";
}

export function canSignAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function isMobileRole(role: Role | undefined): boolean {
  return role === "mecanico";
}

export function homePath(role: Role): string {
  if (role === "mecanico") return "/mis-ordenes";
  return "/dashboard";
}
