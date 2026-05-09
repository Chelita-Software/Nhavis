"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  deleteOrderAction,
  signAdminAction,
  signSupervisorAction,
  submitOrderAction,
} from "../actions";
import type { WorkOrderStatus } from "@/lib/types";

interface Props {
  orderId: string;
  orderStatus: WorkOrderStatus;
  canSupervisorSign: boolean;
  canAdminSign: boolean;
  canSubmit: boolean;
  canDelete: boolean;
}

export function OrderActions({
  orderId,
  orderStatus,
  canSupervisorSign,
  canAdminSign,
  canSubmit,
  canDelete,
}: Props) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Button href={`/ordenes/${orderId}/refacciones`}>Vincular refacciones</Button>
      {canSubmit && (
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => start(() => submitOrderAction(orderId))}
        >
          Solicitar cierre
        </Button>
      )}
      {canSupervisorSign && (
        <Button
          variant="success"
          disabled={pending}
          onClick={() => start(() => signSupervisorAction(orderId))}
        >
          ✓ Firmar revisión (Supervisor)
        </Button>
      )}
      {canAdminSign && (
        <Button
          variant="success"
          disabled={pending}
          onClick={() => start(() => signAdminAction(orderId))}
        >
          ✓ Firmar aprobación (Admin)
        </Button>
      )}
      {orderStatus === "closed" && (
        <span className="text-[11px] text-text-success self-center">
          Orden cerrada
        </span>
      )}
      {canDelete && (
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Eliminar esta orden y todos sus datos? Esta acción no se puede deshacer.")) return;
            start(() => deleteOrderAction(orderId));
          }}
        >
          Eliminar orden
        </Button>
      )}
    </div>
  );
}
