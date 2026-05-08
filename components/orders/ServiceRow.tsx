import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import {
  partStatusLabel,
  partStatusVariant,
  serviceStatusLabel,
  serviceStatusVariant,
} from "@/lib/order-helpers";
import type { WorkOrderPart, WorkOrderService } from "@/lib/types";

interface Props {
  service: WorkOrderService;
  parts: WorkOrderPart[];
  showCosts: boolean;
}

export function ServiceRow({ service, parts, showCosts }: Props) {
  const subtotal = parts.reduce(
    (acc, p) => acc + (p.totalCost ?? 0),
    0,
  );

  return (
    <div className="bg-bg-primary border border-border-tertiary rounded-md p-3 mb-2">
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="min-w-0">
          <div className="text-xs font-medium">{service.name}</div>
          <div className="text-[11px] text-text-secondary">
            {service.category}
            {service.description && ` · ${service.description}`}
          </div>
        </div>
        <Badge variant={serviceStatusVariant(service.status)}>
          {serviceStatusLabel(service.status)}
        </Badge>
      </div>

      {parts.length > 0 && (
        <div className="mt-2 space-y-1">
          {parts.map((p) => (
            <div
              key={p.id}
              className="bg-bg-secondary rounded-md px-2.5 py-1.5 flex items-center gap-2 text-[11px]"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary truncate">
                  {p.description}{" "}
                  <span className="text-text-tertiary font-normal">
                    × {p.quantity}
                  </span>
                </div>
                {p.linkedItemId ? (
                  <div className="text-text-tertiary truncate">
                    Vinculado{showCosts && p.unitCostSnapshot != null
                      ? ` · ${formatMoney(p.unitCostSnapshot)} c/u`
                      : ""}
                  </div>
                ) : p.mechanicNote ? (
                  <div className="text-text-tertiary truncate">
                    {p.mechanicNote}
                  </div>
                ) : null}
              </div>
              <Badge variant={partStatusVariant(p.status)}>
                {partStatusLabel(p.status)}
              </Badge>
              {showCosts && p.totalCost != null && (
                <div className="font-medium text-text-primary tabular-nums">
                  {formatMoney(p.totalCost)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCosts && parts.some((p) => p.totalCost != null) && (
        <div className="text-[11px] text-text-secondary mt-2 text-right">
          Subtotal:{" "}
          <span className="font-medium text-text-primary">
            {formatMoney(subtotal)}
          </span>
        </div>
      )}
    </div>
  );
}
