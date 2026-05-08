"use client";

import { useTransition } from "react";
import { setServiceStatusAction } from "@/app/(admin)/ordenes/actions";
import type { ServiceStatus } from "@/lib/types";

interface Props {
  serviceId: string;
  current: ServiceStatus;
  disabled?: boolean;
}

const options: { value: ServiceStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pendiente", color: "#F3F4F6" },
  { value: "working", label: "Trabajando", color: "#DBEAFE" },
  { value: "waiting_parts", label: "Espera refacciones", color: "#FEF9C3" },
];

export function ServiceStatusSwitcher({ serviceId, current, disabled }: Props) {
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={pending || disabled || active}
            onClick={() => start(() => setServiceStatusAction(serviceId, o.value))}
            className={
              "rounded-lg p-2.5 text-[11px] font-medium border transition-colors " +
              (active
                ? "border-brand bg-brand text-white"
                : "border-border-secondary bg-bg-primary text-text-primary hover:bg-bg-secondary")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
