import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Badge } from "@/components/ui/Badge";
import {
  workOrderStatusLabel,
  workOrderStatusVariant,
} from "@/lib/order-helpers";
import { formatDate, shortDate } from "@/lib/format";

export default async function MisOrdenesPage() {
  const user = await requireUser();
  const [orders, units, services] = await Promise.all([
    readAll("workOrders"),
    readAll("units"),
    readAll("workOrderServices"),
  ]);

  const mine = orders
    .filter(
      (o) =>
        o.assigneeId === user.id &&
        o.status !== "closed" &&
        o.status !== "cancelled",
    )
    .sort((a, b) =>
      a.scheduledFor < b.scheduledFor ? -1 : 1,
    );

  return (
    <>
      <MobileHeader
        title="Mis órdenes"
        subtitle={`${mine.length} activas · ${user.name}`}
        user={{ name: user.name, role: user.role }}
      />
      <main className="p-3 flex-1">
        {mine.length === 0 ? (
          <div className="bg-bg-primary border border-border-tertiary rounded-lg p-6 text-center text-text-secondary text-xs">
            No tienes órdenes asignadas activas.
          </div>
        ) : (
          mine.map((o) => {
            const unit = units.find((u) => u.id === o.unitId);
            const svcs = services.filter((s) => s.workOrderId === o.id);
            return (
              <Link
                key={o.id}
                href={`/orden/${o.id}`}
                className="block bg-bg-primary border border-border-tertiary rounded-lg p-3.5 mb-3 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div>
                    <div className="text-base font-medium">
                      {unit?.unitNumber ?? "—"}
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      {o.folio} · {unit?.brand} {unit?.model}
                    </div>
                  </div>
                  <Badge variant={workOrderStatusVariant(o.status)}>
                    {workOrderStatusLabel(o.status)}
                  </Badge>
                </div>
                <div className="text-[12px] text-text-secondary mt-1">
                  {svcs.length} {svcs.length === 1 ? "servicio" : "servicios"} ·{" "}
                  {o.status === "scheduled"
                    ? `Llega ${formatDate(o.scheduledFor)}`
                    : `Apertura ${shortDate(o.openedAt)}`}
                </div>
                <div className="text-[12px] mt-1 text-text-primary line-clamp-2">
                  {o.reason}
                </div>
              </Link>
            );
          })
        )}
      </main>
    </>
  );
}
