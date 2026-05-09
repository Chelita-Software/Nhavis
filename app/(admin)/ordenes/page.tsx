import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { MetricCard, MetricsGrid } from "@/components/ui/Metric";
import { OrderCard } from "@/components/orders/OrderCard";
import {
  orderEstimatedCost,
  pendingPartsForOrder,
} from "@/lib/order-summary";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function OrdersListPage({ searchParams }: PageProps) {
  const user = await requireRole(["admin", "supervisor"]);
  const { status: rawStatus } = await searchParams;
  const filter = rawStatus ?? "all";

  const [orders, units, users, services, parts] = await Promise.all([
    readAll("workOrders"),
    readAll("units"),
    readAll("users"),
    readAll("workOrderServices"),
    readAll("workOrderParts"),
  ]);

  const counts = {
    scheduled: orders.filter((o) => o.status === "scheduled").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    pending: orders.filter(
      (o) =>
        o.status === "pending_approval" ||
        o.status === "pending_admin_approval",
    ).length,
    closed: orders.filter((o) => o.status === "closed").length,
  };

  const filtered = orders.filter((o) => {
    if (filter === "scheduled") return o.status === "scheduled";
    if (filter === "in_progress") return o.status === "in_progress";
    if (filter === "pending")
      return (
        o.status === "pending_approval" ||
        o.status === "pending_admin_approval"
      );
    if (filter === "closed") return o.status === "closed";
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    a.openedAt < b.openedAt ? 1 : -1,
  );

  const pendingParts = parts.filter((p) => p.status === "requested").length;

  const filters = [
    { id: "all", label: "Todas", count: orders.length },
    { id: "scheduled", label: "Agendadas", count: counts.scheduled },
    { id: "in_progress", label: "En proceso", count: counts.in_progress },
    { id: "pending", label: "Por aprobar", count: counts.pending },
    { id: "closed", label: "Cerradas", count: counts.closed },
  ];

  return (
    <>
      <PageHeader
        title="Órdenes de Reparación"
        sub={`${orders.length} órdenes en total`}
        actions={
          <Button href="/ordenes/nueva" variant="primary">＋ Nueva Orden</Button>
        }
      />

      <MetricsGrid>
        <MetricCard label="Agendadas" value={counts.scheduled} sub="Esperando llegada" />
        <MetricCard label="En proceso" value={counts.in_progress} sub="En el taller" />
        <MetricCard
          label="Por aprobar"
          value={counts.pending}
          sub="Esperando firma"
          valueClass={counts.pending > 0 ? "text-text-warning" : ""}
        />
        <MetricCard label="Cerradas" value={counts.closed} sub="Histórico" />
      </MetricsGrid>

      {pendingParts > 0 && (
        <Banner tone="danger">
          <strong>{pendingParts} solicitudes de refacciones</strong> pendientes
          de vinculación —{" "}
          <Link href="/refacciones-pendientes" className="underline">
            Revisar
          </Link>
        </Banner>
      )}

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/ordenes" : `/ordenes?status=${f.id}`}
            className={
              "text-[11px] px-2.5 py-1 rounded-full border " +
              (filter === f.id
                ? "bg-brand text-white border-brand"
                : "bg-bg-primary text-text-secondary border-border-secondary hover:bg-bg-secondary")
            }
          >
            {f.label} ({f.count})
          </Link>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="card-base p-6 text-center text-text-secondary text-xs">
          Sin órdenes en este filtro.
        </div>
      ) : (
        sorted.map((o) => {
          const unit = units.find((u) => u.id === o.unitId);
          const assignee = users.find((u) => u.id === o.assigneeId);
          const own = services.filter((s) => s.workOrderId === o.id);
          const ownPartsIds = new Set(own.map((s) => s.id));
          const ownParts = parts.filter((p) =>
            ownPartsIds.has(p.workOrderServiceId),
          );
          return (
            <OrderCard
              key={o.id}
              order={o}
              unit={unit}
              assignee={assignee}
              serviceCount={own.length}
              pendingPartsCount={pendingPartsForOrder(own, ownParts)}
              cost={canSeeCosts(user) ? orderEstimatedCost(ownParts) : null}
              href={`/ordenes/${o.id}`}
            />
          );
        })
      )}
    </>
  );
}
