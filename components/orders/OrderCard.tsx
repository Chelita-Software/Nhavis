import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatMoney, shortDate } from "@/lib/format";
import {
  workOrderStatusLabel,
  workOrderStatusVariant,
} from "@/lib/order-helpers";
import type { Unit, User, WorkOrder } from "@/lib/types";

interface Props {
  order: WorkOrder;
  unit?: Unit;
  assignee?: User;
  serviceCount: number;
  pendingPartsCount: number;
  cost: number | null;
  href: string;
}

export function OrderCard({
  order,
  unit,
  assignee,
  serviceCount,
  pendingPartsCount,
  cost,
  href,
}: Props) {
  const stepIdx =
    order.status === "scheduled"
      ? 0
      : order.status === "in_progress"
        ? 1
        : order.status === "pending_approval" ||
            order.status === "pending_admin_approval"
          ? 2
          : 3;

  return (
    <Link
      href={href}
      className="block bg-bg-primary border border-border-tertiary rounded-md p-3 mb-2 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {unit?.unitNumber ?? "—"}{" "}
            <span className="text-text-secondary font-normal">
              · {unit ? `${unit.brand} ${unit.model}` : ""}
            </span>
          </div>
          <div className="text-[11px] text-text-secondary mb-1">
            {order.folio} · {shortDate(order.openedAt)} ·{" "}
            {assignee ? `Asignado: ${assignee.name}` : "Sin asignar"}
            {assignee?.role === "supervisor" && (
              <span className="ml-1 text-text-info">(supervisor)</span>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant={workOrderStatusVariant(order.status)}>
              {workOrderStatusLabel(order.status)}
            </Badge>
            <Badge variant="neutral">
              {serviceCount} {serviceCount === 1 ? "servicio" : "servicios"}
            </Badge>
            {pendingPartsCount > 0 && (
              <Badge variant="waiting">
                {pendingPartsCount} ref. por vincular
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {cost == null ? "—" : formatMoney(cost)}
          </div>
          <div className="text-[10px] text-text-tertiary">
            {order.status === "closed" ? "costo final" : "costo estimado"}
          </div>
        </div>
      </div>

      <ProgressTrack idx={stepIdx} />
    </Link>
  );
}

function ProgressTrack({ idx }: { idx: number }) {
  const steps = ["Agendada", "En proceso", "Por aprobar", "Cerrada"];
  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((_, i) => (
        <span key={i} className="flex items-center flex-1 first:flex-none last:flex-none">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              i < idx
                ? "bg-[#22C55E]"
                : i === idx
                  ? "bg-[#3B82F6]"
                  : "bg-[#E5E7EB]",
            )}
          />
          {i < steps.length - 1 && (
            <span className="flex-1 h-px bg-border-tertiary mx-1" />
          )}
        </span>
      ))}
    </div>
  );
}
