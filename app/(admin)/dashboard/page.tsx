import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { MetricCard, MetricsGrid } from "@/components/ui/Metric";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import {
  workOrderStatusLabel,
  workOrderStatusVariant,
} from "@/lib/order-helpers";
import { formatMoney, shortDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireRole(["admin", "supervisor"]);
  const [orders, units, parts, items, users] = await Promise.all([
    readAll("workOrders"),
    readAll("units"),
    readAll("workOrderParts"),
    readAll("inventoryItems"),
    readAll("users"),
  ]);

  const open = orders.filter(
    (o) => o.status === "scheduled" || o.status === "in_progress",
  );
  const inWorkshop = orders.filter((o) => o.status === "in_progress").length;
  const pendingSign = orders.filter(
    (o) =>
      o.status === "pending_approval" || o.status === "pending_admin_approval",
  ).length;
  const closedThisMonth = orders.filter((o) => {
    if (o.status !== "closed" || !o.closedAt) return false;
    const d = new Date(o.closedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const pendingParts = parts.filter((p) => p.status === "requested").length;
  const lowStock = items.filter(
    (i) => i.active && i.stockCurrent <= i.stockMinimum,
  ).length;

  const monthSpend = canSeeCosts(user)
    ? parts
        .filter(
          (p) =>
            (p.status === "authorized" || p.status === "waiting_purchase") &&
            p.totalCost,
        )
        .reduce((acc, p) => acc + (p.totalCost ?? 0), 0)
    : null;

  const recent = [...orders]
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub={new Date().toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        actions={
          <Link href="/ordenes/nueva">
            <Button variant="primary">＋ Nueva orden</Button>
          </Link>
        }
      />

      {pendingParts > 0 && (
        <Banner tone="danger">
          <strong>{pendingParts} refacciones</strong> esperando vinculación.{" "}
          <Link href="/refacciones-pendientes" className="underline">
            Revisar
          </Link>
        </Banner>
      )}
      {lowStock > 0 && (
        <Banner tone="warning">
          <strong>{lowStock} ítems</strong> en o bajo el mínimo de stock.{" "}
          <Link href="/almacen" className="underline">
            Ver almacén
          </Link>
        </Banner>
      )}

      <MetricsGrid>
        <MetricCard
          label="Órdenes abiertas"
          value={open.length}
          sub={`${pendingSign} esperando firma`}
        />
        <MetricCard
          label="Unidades en taller"
          value={inWorkshop}
          sub={`${units.length} unidades activas`}
        />
        {monthSpend != null ? (
          <MetricCard
            label="Gasto del mes"
            value={formatMoney(monthSpend)}
            sub="Refacciones autorizadas + en compra"
          />
        ) : (
          <MetricCard
            label="Cerradas este mes"
            value={closedThisMonth}
            sub="Aprobadas con firma"
          />
        )}
        <MetricCard
          label="Items bajo mínimo"
          value={lowStock}
          sub="Requieren reposición"
        />
      </MetricsGrid>

      <Card className="p-3">
        <CardTitle className="mb-2">Órdenes recientes</CardTitle>
        <Table>
          <THead>
            <TH>Folio</TH>
            <TH>Unidad</TH>
            <TH>Asignado</TH>
            <TH>Estado</TH>
            <TH>Apertura</TH>
          </THead>
          <tbody>
            {recent.map((o) => {
              const unit = units.find((u) => u.id === o.unitId);
              const assignee = users.find((u) => u.id === o.assigneeId);
              return (
                <TR key={o.id}>
                  <TD>
                    <Link
                      href={`/ordenes/${o.id}`}
                      className="font-medium hover:underline"
                    >
                      {o.folio}
                    </Link>
                  </TD>
                  <TD>{unit?.unitNumber ?? "—"}</TD>
                  <TD>{assignee?.name ?? "—"}</TD>
                  <TD>
                    <Badge variant={workOrderStatusVariant(o.status)}>
                      {workOrderStatusLabel(o.status)}
                    </Badge>
                  </TD>
                  <TD className="text-text-secondary">
                    {shortDate(o.openedAt)}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
