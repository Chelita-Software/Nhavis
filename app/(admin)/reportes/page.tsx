import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { MetricCard, MetricsGrid } from "@/components/ui/Metric";
import { formatMoney } from "@/lib/format";

export default async function ReportsPage() {
  await requireRole(["admin"]);
  const [orders, parts, items] = await Promise.all([
    readAll("workOrders"),
    readAll("workOrderParts"),
    readAll("inventoryItems"),
  ]);

  const totalSpend = parts
    .filter((p) => p.status === "authorized" && p.totalCost != null)
    .reduce((acc, p) => acc + (p.totalCost ?? 0), 0);

  const ordersClosed = orders.filter((o) => o.status === "closed").length;
  const ordersOpen = orders.filter(
    (o) => o.status !== "closed" && o.status !== "cancelled",
  ).length;
  const inventoryValue = items
    .filter((i) => i.active)
    .reduce((acc, i) => acc + i.stockCurrent * i.unitCost, 0);

  return (
    <>
      <PageHeader
        title="Reportes"
        sub="Resumen ejecutivo (demo)"
      />
      <MetricsGrid cols={4}>
        <MetricCard label="Órdenes cerradas" value={ordersClosed} />
        <MetricCard label="Órdenes abiertas" value={ordersOpen} />
        <MetricCard
          label="Gasto en refacciones"
          value={formatMoney(totalSpend)}
          sub="autorizadas"
        />
        <MetricCard
          label="Valor de inventario"
          value={formatMoney(inventoryValue)}
          sub="stock × precio actual"
        />
      </MetricsGrid>
      <Card>
        <CardTitle>Próximamente</CardTitle>
        <p className="text-[11px] text-text-secondary mt-2">
          Reportes detallados por unidad, período, mecánico, exportación a
          Excel/PDF. Estos son los datos crudos disponibles para construir esos
          reportes.
        </p>
      </Card>
    </>
  );
}
