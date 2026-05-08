"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteServiceAction } from "@/app/(admin)/ordenes/actions";

export function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("¿Eliminar este servicio?")) return;
        start(() => deleteServiceAction(serviceId));
      }}
      disabled={pending}
      className="w-7 h-7 rounded-md text-text-tertiary hover:text-text-danger hover:bg-bg-secondary flex items-center justify-center"
      aria-label="Eliminar"
    >
      <X size={14} />
    </button>
  );
}
