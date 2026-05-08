import type { WorkOrderPart, WorkOrderService } from "./types";

export function orderEstimatedCost(parts: WorkOrderPart[]): number | null {
  const lines = parts.filter(
    (p) =>
      (p.status === "authorized" || p.status === "waiting_purchase") &&
      p.totalCost != null,
  );
  if (lines.length === 0) return null;
  return lines.reduce((acc, p) => acc + (p.totalCost ?? 0), 0);
}

export function pendingPartsForOrder(
  services: WorkOrderService[],
  parts: WorkOrderPart[],
): number {
  const svcIds = new Set(services.map((s) => s.id));
  return parts.filter(
    (p) => svcIds.has(p.workOrderServiceId) && p.status === "requested",
  ).length;
}
