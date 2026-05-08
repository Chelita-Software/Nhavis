import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { PartLinker } from "./PartLinker";

export default async function PendingPartsPage() {
  const user = await requireRole(["admin", "supervisor"]);
  const [parts, services, orders, users, items] = await Promise.all([
    readAll("workOrderParts"),
    readAll("workOrderServices"),
    readAll("workOrders"),
    readAll("users"),
    readAll("inventoryItems"),
  ]);

  const pending = parts
    .filter((p) => p.status === "requested")
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return (
    <>
      <PageHeader
        title="Refacciones por vincular"
        sub={`${pending.length} solicitudes esperando vinculación a un ítem del catálogo`}
      />

      {pending.length === 0 ? (
        <Banner tone="success">
          No hay refacciones pendientes. ¡Todo al día!
        </Banner>
      ) : (
        <div className="text-[11px] text-text-secondary mb-3">
          Cada solicitud fue capturada como descripción libre por el
          mecánico. Vincula con el ítem real del catálogo y elige autorizar
          desde stock o generar una orden de compra si falta.
        </div>
      )}

      {pending.map((part) => {
        const svc = services.find((s) => s.id === part.workOrderServiceId);
        const order = orders.find((o) => o.id === svc?.workOrderId);
        const mechanic = users.find((u) => u.id === part.createdBy);
        return (
          <PartLinker
            key={part.id}
            part={part}
            meta={{
              folio: order?.folio ?? "—",
              service: svc?.name ?? "—",
              mechanic: mechanic?.name ?? "—",
            }}
            items={items}
            showCosts={canSeeCosts(user)}
          />
        );
      })}
    </>
  );
}
