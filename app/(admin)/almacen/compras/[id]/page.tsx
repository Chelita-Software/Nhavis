import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatDate } from "@/lib/format";
import { POActions } from "./POActions";

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["admin", "supervisor"]);
  const po = await findById("purchaseOrders", id);
  if (!po) notFound();

  const [items, parts, services, orders] = await Promise.all([
    readAll("inventoryItems"),
    readAll("workOrderParts"),
    readAll("workOrderServices"),
    readAll("workOrders"),
  ]);

  const linkedPart = po.linkedWorkOrderPartId
    ? parts.find((p) => p.id === po.linkedWorkOrderPartId) ?? null
    : null;
  const linkedSvc = linkedPart
    ? services.find((s) => s.id === linkedPart.workOrderServiceId)
    : null;
  const linkedOrder = linkedSvc
    ? orders.find((o) => o.id === linkedSvc.workOrderId)
    : null;

  const total = po.items.reduce((acc, l) => acc + l.qty * l.unitCost, 0);
  const showCosts = canSeeCosts(user);

  return (
    <>
      <PageHeader
        title={`OC ${po.folio}`}
        sub={po.supplier}
        actions={
          <Button href="/almacen/compras">← Lista</Button>
        }
      />

      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant={
            po.status === "received"
              ? "closed"
              : po.status === "ordered"
                ? "progress"
                : po.status === "cancelled"
                  ? "rejected"
                  : "neutral"
          }
        >
          {po.status}
        </Badge>
        <span className="text-[11px] text-text-secondary">
          Creada {formatDate(po.createdAt, true)}
          {po.receivedAt && ` · Recibida ${formatDate(po.receivedAt, true)}`}
        </span>
      </div>

      {linkedOrder && linkedPart && (
        <Banner tone="info">
          Generada desde refacción <strong>{linkedPart.description}</strong> de{" "}
          <Link
            href={`/ordenes/${linkedOrder.id}`}
            className="underline"
          >
            {linkedOrder.folio}
          </Link>
          . Al recibir la OC, la refacción se autorizará automáticamente.
        </Banner>
      )}

      <Card className="mb-3">
        <CardTitle className="mb-3">Líneas de la OC</CardTitle>
        <Table>
          <THead>
            <TH>Ítem</TH>
            <TH>SKU</TH>
            <TH>Cantidad</TH>
            {showCosts && <TH>Precio unitario</TH>}
            {showCosts && <TH>Subtotal</TH>}
          </THead>
          <tbody>
            {po.items.map((line) => {
              const it = items.find((i) => i.id === line.itemId);
              return (
                <TR key={line.itemId}>
                  <TD className="font-medium">{it?.description ?? "—"}</TD>
                  <TD className="font-mono text-[11px]">{it?.sku ?? "—"}</TD>
                  <TD>{line.qty}</TD>
                  {showCosts && <TD>{formatMoney(line.unitCost)}</TD>}
                  {showCosts && (
                    <TD className="font-medium">
                      {formatMoney(line.qty * line.unitCost)}
                    </TD>
                  )}
                </TR>
              );
            })}
          </tbody>
        </Table>
        {showCosts && (
          <div className="text-right text-sm font-medium mt-2">
            Total: {formatMoney(total)}
          </div>
        )}
      </Card>

      {po.notes && (
        <Card className="mb-3">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">
            Notas
          </div>
          <div className="text-xs">{po.notes}</div>
        </Card>
      )}

      <POActions
        poId={po.id}
        status={po.status}
        canReceive={po.status === "ordered" || po.status === "draft"}
      />
    </>
  );
}
