import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { formatMoney } from "@/lib/format";

export default async function WarehousePage() {
  const user = await requireRole(["admin", "supervisor"]);
  const items = await readAll("inventoryItems");
  const showCosts = canSeeCosts(user);
  const lowStock = items.filter(
    (i) => i.active && i.stockCurrent <= i.stockMinimum,
  );

  return (
    <>
      <PageHeader
        title="Almacén"
        sub={`${items.length} ítems registrados`}
        actions={
          <>
            <Link href="/almacen/movimientos">
              <Button>Movimientos</Button>
            </Link>
            <Link href="/almacen/compras">
              <Button variant="primary">Compras</Button>
            </Link>
          </>
        }
      />

      {lowStock.length > 0 && (
        <Banner tone="warning">
          <strong>{lowStock.length}</strong> ítems en o bajo el mínimo:{" "}
          {lowStock.map((i) => i.description).join(", ")}.
        </Banner>
      )}

      <Card className="p-3">
        <Table>
          <THead>
            <TH>SKU</TH>
            <TH>Descripción</TH>
            <TH>Unidad</TH>
            <TH>Stock</TH>
            <TH>Mínimo</TH>
            {showCosts && <TH>Precio actual</TH>}
            <TH>Estado</TH>
            <TH></TH>
          </THead>
          <tbody>
            {items.map((it) => {
              const low = it.stockCurrent <= it.stockMinimum;
              return (
                <TR key={it.id}>
                  <TD className="font-mono text-[11px]">{it.sku}</TD>
                  <TD className="font-medium">{it.description}</TD>
                  <TD className="text-text-secondary">{it.unitOfMeasure}</TD>
                  <TD>
                    <span
                      className={
                        low
                          ? it.stockCurrent === 0
                            ? "text-text-danger font-medium"
                            : "text-text-warning font-medium"
                          : "text-text-success font-medium"
                      }
                    >
                      {it.stockCurrent}
                    </span>
                  </TD>
                  <TD className="text-text-tertiary">{it.stockMinimum}</TD>
                  {showCosts && <TD>{formatMoney(it.unitCost)}</TD>}
                  <TD>
                    {low ? (
                      <Badge variant="rejected">Bajo mínimo</Badge>
                    ) : (
                      <Badge variant="closed">OK</Badge>
                    )}
                  </TD>
                  <TD>
                    <Link
                      href={`/almacen/${it.id}`}
                      className="text-[11px] text-text-info hover:underline"
                    >
                      Ver detalle →
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
