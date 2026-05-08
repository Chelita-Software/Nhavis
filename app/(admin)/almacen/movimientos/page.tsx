import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatDate } from "@/lib/format";
import { ManualMovementForm } from "./ManualMovementForm";

export default async function MovementsPage() {
  const user = await requireRole(["admin"]);
  const [movs, items, users] = await Promise.all([
    readAll("inventoryMovements"),
    readAll("inventoryItems"),
    readAll("users"),
  ]);
  const sorted = [...movs].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );

  return (
    <>
      <PageHeader
        title="Movimientos de inventario"
        sub="Ingresos y egresos manuales + autorizados desde órdenes."
        actions={
          <Link href="/almacen">
            <Button>← Almacén</Button>
          </Link>
        }
      />

      <ManualMovementForm
        items={items.filter((i) => i.active)}
        showCosts={canSeeCosts(user)}
      />

      <Card className="p-3">
        <CardTitle className="mb-3">Histórico</CardTitle>
        <Table>
          <THead>
            <TH>Fecha</TH>
            <TH>Ítem</TH>
            <TH>Tipo</TH>
            <TH>Cantidad</TH>
            {canSeeCosts(user) && <TH>Precio snapshot</TH>}
            <TH>Autorizado por</TH>
            <TH>Notas</TH>
          </THead>
          <tbody>
            {sorted.map((m) => {
              const item = items.find((i) => i.id === m.itemId);
              const auth = users.find((u) => u.id === m.authorizedBy);
              return (
                <TR key={m.id}>
                  <TD className="text-text-secondary">
                    {formatDate(m.createdAt, true)}
                  </TD>
                  <TD>{item?.description ?? "—"}</TD>
                  <TD>
                    <Badge variant={m.type === "ingreso" ? "closed" : "rejected"}>
                      {m.type}
                    </Badge>
                  </TD>
                  <TD className="font-medium">{m.quantity}</TD>
                  {canSeeCosts(user) && (
                    <TD>{formatMoney(m.unitCostSnapshot)}</TD>
                  )}
                  <TD>{auth?.name ?? "—"}</TD>
                  <TD className="text-text-secondary text-[11px]">{m.notes}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
