import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { formatMoney, shortDate } from "@/lib/format";

const statusVariant = {
  draft: "neutral",
  ordered: "progress",
  received: "closed",
  cancelled: "rejected",
} as const;

export default async function PurchasesPage() {
  const user = await requireRole(["admin", "supervisor"]);
  const [pos, items] = await Promise.all([
    readAll("purchaseOrders"),
    readAll("inventoryItems"),
  ]);
  const showCosts = canSeeCosts(user);
  const sorted = [...pos].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );

  return (
    <>
      <PageHeader
        title="Órdenes de compra"
        sub={`${pos.length} OCs (${pos.filter((p) => p.status === "ordered").length} pendientes de recibir)`}
        actions={
          <Link href="/almacen/compras/nueva">
            <Button variant="primary">＋ Nueva OC manual</Button>
          </Link>
        }
      />

      <Card className="p-3">
        <Table>
          <THead>
            <TH>Folio</TH>
            <TH>Proveedor</TH>
            <TH>Ítems</TH>
            {showCosts && <TH>Total</TH>}
            <TH>Estado</TH>
            <TH>Fecha</TH>
            <TH></TH>
          </THead>
          <tbody>
            {sorted.map((po) => {
              const total = po.items.reduce(
                (acc, l) => acc + l.qty * l.unitCost,
                0,
              );
              return (
                <TR key={po.id}>
                  <TD className="font-medium">{po.folio}</TD>
                  <TD>{po.supplier}</TD>
                  <TD className="text-text-secondary text-[11px]">
                    {po.items
                      .map(
                        (l) =>
                          `${items.find((i) => i.id === l.itemId)?.description ?? "—"} × ${l.qty}`,
                      )
                      .join(", ")}
                  </TD>
                  {showCosts && <TD>{formatMoney(total)}</TD>}
                  <TD>
                    <Badge variant={statusVariant[po.status]}>
                      {po.status === "draft"
                        ? "Borrador"
                        : po.status === "ordered"
                          ? "Pedida"
                          : po.status === "received"
                            ? "Recibida"
                            : "Cancelada"}
                    </Badge>
                  </TD>
                  <TD className="text-text-secondary text-[11px]">
                    {po.status === "received"
                      ? `Recibida ${shortDate(po.receivedAt)}`
                      : `Pedida ${shortDate(po.orderedAt)}`}
                  </TD>
                  <TD>
                    <Link
                      href={`/almacen/compras/${po.id}`}
                      className="text-[11px] text-text-info hover:underline"
                    >
                      Detalle →
                    </Link>
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
