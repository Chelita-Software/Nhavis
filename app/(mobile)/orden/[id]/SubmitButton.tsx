"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/Button";
import { submitOrderAction } from "@/app/(admin)/ordenes/actions";

export function SubmitButton({
  orderId,
  disabled,
}: {
  orderId: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="sticky bottom-0 -mx-3 px-3 py-3 bg-bg-tertiary border-t border-border-tertiary">
      {disabled && (
        <div className="text-[11px] text-text-tertiary text-center mb-2">
          Cierra todos los servicios para solicitar el cierre de la orden.
        </div>
      )}
      {error && (
        <div className="text-[11px] text-text-danger text-center mb-2">
          {error}
        </div>
      )}
      <Button
        variant="primary"
        className="w-full justify-center text-sm py-3"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            try {
              await submitOrderAction(orderId);
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        {pending ? "Enviando…" : "Solicitar cierre de la orden"}
      </Button>
    </div>
  );
}
