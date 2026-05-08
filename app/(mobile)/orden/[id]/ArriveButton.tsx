"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { arriveOrderAction } from "@/app/(admin)/ordenes/actions";

export function ArriveButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      className="w-full justify-center text-sm py-3"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await arriveOrderAction(orderId);
          router.replace(`/orden/${orderId}/flujo/inicio`);
        })
      }
    >
      {pending ? "Marcando…" : "Marcar unidad como llegada"}
    </Button>
  );
}
