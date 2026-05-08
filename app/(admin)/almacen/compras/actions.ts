"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { findById, insert, patchById, readAll, transact } from "@/lib/db";
import { nextPurchaseOrderFolio, nowIso, uuid } from "@/lib/ids";
import type {
  InventoryMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  WorkOrderService,
} from "@/lib/types";

export async function createManualPOAction(input: {
  supplier: string;
  items: PurchaseOrderItem[];
  notes: string;
}) {
  const user = await requireRole(["admin", "supervisor"]);
  if (input.items.length === 0)
    throw new Error("Agrega al menos un ítem.");
  const allPOs = await readAll("purchaseOrders");
  const folio = nextPurchaseOrderFolio(allPOs.map((p) => p.folio));
  const now = nowIso();
  const po: PurchaseOrder = {
    id: uuid(),
    folio,
    supplier: input.supplier.trim() || "Proveedor sin nombre",
    status: "ordered",
    items: input.items,
    linkedWorkOrderPartId: null,
    createdBy: user.id,
    createdAt: now,
    orderedAt: now,
    receivedAt: null,
    notes: input.notes.trim(),
  };
  await insert("purchaseOrders", po);
  revalidatePath("/almacen/compras");
  revalidatePath("/almacen");
  return po;
}

export async function receivePOAction(poId: string) {
  const user = await requireRole(["admin", "supervisor"]);
  const po = await findById("purchaseOrders", poId);
  if (!po) throw new Error("OC no encontrada.");
  if (po.status !== "ordered" && po.status !== "draft")
    throw new Error("La OC ya fue recibida o cancelada.");

  const now = nowIso();

  // Update stocks atomically + create movement records
  await transact("inventoryItems", async (recs) => {
    for (const line of po.items) {
      const idx = recs.findIndex((r) => r.id === line.itemId);
      if (idx === -1) throw new Error("Ítem desaparecido durante recepción.");
      recs[idx] = {
        ...recs[idx],
        stockCurrent: recs[idx].stockCurrent + line.qty,
        // Update unitCost to last received price (latest known cost)
        unitCost: line.unitCost,
      };
    }
    return { records: recs, result: undefined };
  });

  for (const line of po.items) {
    const mov: InventoryMovement = {
      id: uuid(),
      itemId: line.itemId,
      type: "ingreso",
      quantity: line.qty,
      unitCostSnapshot: line.unitCost,
      purchaseOrderId: po.id,
      workOrderPartId: null,
      authorizedBy: user.id,
      notes: `Recepción OC ${po.folio}`,
      createdAt: now,
    };
    await insert("inventoryMovements", mov);
  }

  await patchById("purchaseOrders", po.id, {
    status: "received",
    receivedAt: now,
  });

  // If this PO was linked to a work-order-part, auto-authorize it
  if (po.linkedWorkOrderPartId) {
    const part = await findById("workOrderParts", po.linkedWorkOrderPartId);
    if (part && part.status === "waiting_purchase") {
      await patchById("workOrderParts", part.id, {
        status: "authorized",
        authorizedBy: user.id,
        authorizedAt: now,
        unitCostSnapshot: po.items.find((it) => it.itemId === part.linkedItemId)
          ?.unitCost ?? part.unitCostSnapshot,
        totalCost:
          (po.items.find((it) => it.itemId === part.linkedItemId)?.unitCost ??
            part.unitCostSnapshot ??
            0) * part.quantity,
      });
      // Re-evaluate service status
      const svc = await findById("workOrderServices", part.workOrderServiceId);
      if (svc && svc.status === "waiting_parts") {
        const remaining = (await readAll("workOrderParts")).filter(
          (p) =>
            p.workOrderServiceId === svc.id &&
            p.status === "waiting_purchase",
        );
        if (remaining.length === 0) {
          const next: WorkOrderService["status"] = "working";
          await patchById("workOrderServices", svc.id, { status: next });
        }
      }
    }
  }

  revalidatePath("/almacen");
  revalidatePath("/almacen/compras");
  revalidatePath(`/almacen/compras/${po.id}`);
  revalidatePath("/refacciones-pendientes");
}

export async function cancelPOAction(poId: string) {
  await requireRole(["admin", "supervisor"]);
  const po = await findById("purchaseOrders", poId);
  if (!po) throw new Error("OC no encontrada.");
  if (po.status === "received")
    throw new Error("No se puede cancelar una OC ya recibida.");
  await patchById("purchaseOrders", poId, { status: "cancelled" });
  revalidatePath("/almacen/compras");
}
