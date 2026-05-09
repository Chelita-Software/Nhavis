import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { partStatusLabel, partStatusVariant } from "@/lib/order-helpers";
import { formatMoney } from "@/lib/format";
import { PartLinker } from "@/app/(admin)/refacciones-pendientes/PartLinker";

export default async function OrderRefactionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["admin", "supervisor"]);
  const order = await findById("workOrders", id);
  if (!order) notFound();

  const [services, parts, items, users] = await Promise.all([
    readAll("workOrderServices"),
    readAll("workOrderParts"),
    readAll("inventoryItems"),
    readAll("users"),
  ]);

  const ownServices = services.filter((s) => s.workOrderId === id);
  const svcIds = new Set(ownServices.map((s) => s.id));
  const ownParts = parts.filter((p) => svcIds.has(p.workOrderServiceId));
  const pending = ownParts.filter((p) => p.status === "requested");
  const resolved = ownParts.filter((p) => p.status !== "requested");
  const showCosts = canSeeCosts(user);

  return (
    <>
      <PageHeader
        title={`Refacciones · ${order.folio}`}
        sub={`${pending.length} pendientes · ${resolved.length} resueltas`}
        actions={
          <Button href={`/ordenes/${id}`}>← Volver a la orden</Button>
        }
      />

      {pending.length === 0 ? (
        <Banner tone="success">
          Todas las refacciones de esta orden ya fueron vinculadas o resueltas.
        </Banner>
      ) : (
        pending.map((part) => {
          const svc = ownServices.find((s) => s.id === part.workOrderServiceId);
          const mech = users.find((u) => u.id === part.createdBy);
          return (
            <PartLinker
              key={part.id}
              part={part}
              meta={{
                folio: order.folio,
                service: svc?.name ?? "—",
                mechanic: mech?.name ?? "—",
              }}
              items={items}
              showCosts={showCosts}
            />
          );
        })
      )}

      {resolved.length > 0 && (
        <>
          <div className="mt-4 mb-2 text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
            Resueltas
          </div>
          {resolved.map((p) => {
            const svc = ownServices.find((s) => s.id === p.workOrderServiceId);
            const item = items.find((i) => i.id === p.linkedItemId);
            return (
              <Card key={p.id} className="mb-2 p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="text-xs font-medium">
                      {p.description} × {p.quantity}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      {svc?.name ?? "—"}
                      {item && ` · vinculado: ${item.description}`}
                    </div>
                    {p.rejectionReason && (
                      <div className="text-[11px] text-text-danger mt-0.5">
                        Motivo: {p.rejectionReason}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={partStatusVariant(p.status)}>
                      {partStatusLabel(p.status)}
                    </Badge>
                    {showCosts && p.totalCost != null && (
                      <div className="text-xs font-medium mt-1">
                        {formatMoney(p.totalCost)}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </>
  );
}
