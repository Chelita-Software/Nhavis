import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MetricCard, MetricsGrid } from "@/components/ui/Metric";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { formatMoney, shortDate } from "@/lib/format";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const user = await requireRole(["admin", "supervisor"]);
  const item = await findById("inventoryItems", itemId);
  if (!item) notFound();

  const [pos, movements] = await Promise.all([
    readAll("purchaseOrders"),
    readAll("inventoryMovements"),
  ]);

  // Build price history from received POs containing this item
  const history = pos
    .filter(
      (po) =>
        po.status === "received" &&
        po.items.some((it) => it.itemId === itemId),
    )
    .map((po) => {
      const line = po.items.find((it) => it.itemId === itemId)!;
      return {
        po,
        line,
      };
    })
    .sort((a, b) => (a.po.receivedAt! < b.po.receivedAt! ? -1 : 1));

  const ownMovements = movements
    .filter((m) => m.itemId === itemId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const showCosts = canSeeCosts(user);

  // Min-max for sparkline scale
  const prices = history.map((h) => h.line.unitCost);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;

  return (
    <>
      <PageHeader
        title={item.description}
        sub={`SKU ${item.sku} · ${item.unitOfMeasure}`}
        actions={
          <Button href="/almacen">← Almacén</Button>
        }
      />

      <MetricsGrid cols={3}>
        <MetricCard label="Stock actual" value={item.stockCurrent} sub={`mínimo ${item.stockMinimum}`} />
        {showCosts && (
          <MetricCard label="Precio actual" value={formatMoney(item.unitCost)} sub="último conocido" />
        )}
        <MetricCard
          label="Compras recibidas"
          value={history.length}
          sub="puntos de precio"
        />
      </MetricsGrid>

      {showCosts && history.length > 0 && (
        <Card className="mb-3">
          <CardTitle className="mb-3">Historial de precios</CardTitle>
          <div className="bg-bg-secondary rounded-md p-3">
            <PriceSpark history={history.map((h) => ({ ts: h.po.receivedAt!, price: h.line.unitCost }))} min={minP} max={maxP} />
          </div>
          <Table className="mt-3">
            <THead>
              <TH>OC</TH>
              <TH>Recibida</TH>
              <TH>Proveedor</TH>
              <TH>Cantidad</TH>
              <TH>Precio unitario</TH>
              <TH>Total</TH>
            </THead>
            <tbody>
              {history.map(({ po, line }) => (
                <TR key={po.id}>
                  <TD className="font-medium">{po.folio}</TD>
                  <TD>{shortDate(po.receivedAt)}</TD>
                  <TD>{po.supplier}</TD>
                  <TD>{line.qty}</TD>
                  <TD className="font-medium">{formatMoney(line.unitCost)}</TD>
                  <TD>{formatMoney(line.qty * line.unitCost)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Movimientos</CardTitle>
        <Table>
          <THead>
            <TH>Fecha</TH>
            <TH>Tipo</TH>
            <TH>Cantidad</TH>
            {showCosts && <TH>Precio snapshot</TH>}
            <TH>Origen</TH>
            <TH>Notas</TH>
          </THead>
          <tbody>
            {ownMovements.map((m) => (
              <TR key={m.id}>
                <TD className="text-text-secondary">{shortDate(m.createdAt)}</TD>
                <TD>
                  <Badge variant={m.type === "ingreso" ? "closed" : "rejected"}>
                    {m.type}
                  </Badge>
                </TD>
                <TD className="font-medium">{m.quantity}</TD>
                {showCosts && <TD>{formatMoney(m.unitCostSnapshot)}</TD>}
                <TD className="text-text-secondary text-[11px]">
                  {m.purchaseOrderId
                    ? "OC"
                    : m.workOrderPartId
                      ? "Salida a OT"
                      : "Manual"}
                </TD>
                <TD className="text-text-secondary text-[11px]">{m.notes}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

function PriceSpark({
  history,
  min,
  max,
}: {
  history: { ts: string; price: number }[];
  min: number;
  max: number;
}) {
  if (history.length === 0) return null;
  const width = 600;
  const height = 80;
  const range = max - min || 1;
  const stepX = history.length === 1 ? width / 2 : width / (history.length - 1);
  const points = history.map((h, i) => {
    const x = history.length === 1 ? width / 2 : i * stepX;
    const y = height - ((h.price - min) / range) * (height - 12) - 6;
    return { x, y, ...h };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        <path d={path} stroke="#1B3A5C" strokeWidth={2} fill="none" />
        {points.map((p) => (
          <g key={`${p.ts}-${p.price}`}>
            <circle cx={p.x} cy={p.y} r={4} fill="#1B3A5C" />
            <text
              x={p.x}
              y={p.y - 8}
              fontSize={10}
              textAnchor="middle"
              fill="#111827"
            >
              ${p.price.toLocaleString("es-MX")}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-text-tertiary mt-1">
        {points.map((p, i) => (
          <span key={i}>{shortDate(p.ts)}</span>
        ))}
      </div>
    </div>
  );
}
