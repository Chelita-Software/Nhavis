"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { closeServiceAction } from "@/app/(mobile)/orden/[id]/actions";

export function CloseServiceButton({
  serviceId,
  disabled,
}: {
  serviceId: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error && (
        <div className="text-[11px] text-text-danger mb-2 text-center">
          {error}
        </div>
      )}
      <Button
        variant="success"
        className="w-full justify-center text-sm py-3"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            try {
              await closeServiceAction(serviceId);
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        {pending ? "Cerrando…" : "✓ Cerrar servicio"}
      </Button>
      {disabled && (
        <div className="text-[10px] text-text-tertiary text-center mt-2">
          Sube al menos 1 foto.
        </div>
      )}
    </>
  );
}
