import { randomUUID } from "node:crypto";

export function uuid(): string {
  return randomUUID();
}

const YEAR = new Date().getFullYear();

export function nextWorkOrderFolio(existing: string[]): string {
  return nextFolio("OT", existing);
}

export function nextPurchaseOrderFolio(existing: string[]): string {
  return nextFolio("OC", existing);
}

function nextFolio(prefix: "OT" | "OC", existing: string[]): string {
  const re = new RegExp(`^${prefix}-${YEAR}-(\\d+)$`);
  const max = existing.reduce((acc, f) => {
    const m = f.match(re);
    if (!m) return acc;
    const n = Number(m[1]);
    return n > acc ? n : acc;
  }, 0);
  return `${prefix}-${YEAR}-${String(max + 1).padStart(4, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
