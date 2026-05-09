"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { serviceStatusLabel, serviceStatusVariant } from "@/lib/order-helpers";
import { PartsEditor } from "../servicio/[svcId]/refacciones/PartsEditor";
import { DeleteServiceButton } from "./DeleteServiceButton";
import type { WorkOrderPart, WorkOrderService } from "@/lib/types";

interface Props {
  service: WorkOrderService;
  parts: WorkOrderPart[];
}

export function ServiceAccordion({ service, parts }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-bg-primary border border-border-tertiary rounded-lg mb-2 overflow-hidden">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex justify-between items-start p-3 text-left min-w-0"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{service.name}</div>
            <div className="text-[11px] text-text-secondary capitalize">
              {service.category}
              {service.description && ` · ${service.description}`}
              {parts.length > 0 &&
                ` · ${parts.length} refacción${parts.length !== 1 ? "es" : ""}`}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <Badge variant={serviceStatusVariant(service.status)}>
              {serviceStatusLabel(service.status)}
            </Badge>
            {open ? (
              <ChevronDown size={16} className="text-text-tertiary" />
            ) : (
              <ChevronRight size={16} className="text-text-tertiary" />
            )}
          </div>
        </button>
        {service.status === "pending" && (
          <div className="flex items-center pr-2">
            <DeleteServiceButton serviceId={service.id} />
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-border-tertiary p-3 space-y-3">
          <PartsEditor serviceId={service.id} parts={parts} />
        </div>
      )}
    </div>
  );
}
