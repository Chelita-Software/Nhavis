import type {
  PartStatus,
  ServiceStatus,
  WorkOrderPart,
  WorkOrderService,
  WorkOrderStatus,
} from "./types";
import type { BadgeVariant } from "@/components/ui/Badge";

export function workOrderStatusLabel(s: WorkOrderStatus): string {
  switch (s) {
    case "scheduled":
      return "Agendada";
    case "in_progress":
      return "En proceso";
    case "pending_approval":
      return "Por revisar";
    case "pending_admin_approval":
      return "Por aprobar";
    case "closed":
      return "Cerrada";
    case "cancelled":
      return "Cancelada";
  }
}

export function workOrderStatusVariant(s: WorkOrderStatus): BadgeVariant {
  switch (s) {
    case "scheduled":
      return "scheduled";
    case "in_progress":
      return "progress";
    case "pending_approval":
    case "pending_admin_approval":
      return "pending";
    case "closed":
      return "closed";
    case "cancelled":
      return "neutral";
  }
}

export function serviceStatusLabel(s: ServiceStatus): string {
  switch (s) {
    case "pending":
      return "Pendiente";
    case "working":
      return "En proceso";
    case "waiting_parts":
      return "Esperando refacciones";
    case "done":
      return "Completado";
  }
}

export function serviceStatusVariant(s: ServiceStatus): BadgeVariant {
  switch (s) {
    case "pending":
      return "open";
    case "working":
      return "progress";
    case "waiting_parts":
      return "waiting";
    case "done":
      return "closed";
  }
}

export function partStatusLabel(s: PartStatus): string {
  switch (s) {
    case "requested":
      return "Solicitada";
    case "authorized":
      return "Aprobada";
    case "waiting_purchase":
      return "Esperando compra";
    case "rejected":
      return "Rechazada";
  }
}

export function partStatusVariant(s: PartStatus): BadgeVariant {
  switch (s) {
    case "requested":
      return "neutral";
    case "authorized":
      return "authorized";
    case "waiting_purchase":
      return "waiting";
    case "rejected":
      return "rejected";
  }
}

export function isPartResolved(p: WorkOrderPart): boolean {
  return p.status === "authorized" || p.status === "rejected";
}

export function deriveServiceStatus(
  service: WorkOrderService,
  parts: WorkOrderPart[],
): ServiceStatus {
  if (service.status === "done") return "done";
  const own = parts.filter((p) => p.workOrderServiceId === service.id);
  if (own.some((p) => p.status === "waiting_purchase")) return "waiting_parts";
  return service.status;
}

export function canSubmitOrder(
  services: WorkOrderService[],
): boolean {
  if (services.length === 0) return false;
  return services.every((s) => s.status === "done");
}
