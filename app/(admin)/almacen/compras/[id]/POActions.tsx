"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  cancelPOAction,
  receivePOAction,
} from "@/app/(admin)/almacen/compras/actions";
import type { PurchaseOrderStatus } from "@/lib/types";

export function POActions({
  poId,
  status,
  canReceive,
}: {
  poId: string;
  status: PurchaseOrderStatus;
  canReceive: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (status === "received") return null;
  if (status === "cancelled") return null;
  return (
    <div className="flex gap-2 justify-end">
      {error && (
        <div className="text-[11px] text-text-danger self-center mr-auto">
          {error}
        </div>
      )}
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("¿Cancelar esta orden de compra?")) return;
          start(async () => {
            try {
              await cancelPOAction(poId);
            } catch (e) {
              setError((e as Error).message);
            }
          });
        }}
      >
        Cancelar OC
      </Button>
      {canReceive && (
        <Button
          variant="success"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await receivePOAction(poId);
              } catch (e) {
                setError((e as Error).message);
              }
            })
          }
        >
          ✓ Marcar como recibida
        </Button>
      )}
    </div>
  );
}
