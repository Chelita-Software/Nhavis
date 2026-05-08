"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
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
}

export function OrderActions({
  orderId,
  orderStatus,
  canSupervisorSign,
  canAdminSign,
  canSubmit,
}: Props) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Link href={`/ordenes/${orderId}/refacciones`}>
        <Button>Vincular refacciones</Button>
      </Link>
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
    </div>
  );
}
