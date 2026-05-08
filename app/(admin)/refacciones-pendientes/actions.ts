"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { findById, insert, patchById, readAll, transact } from "@/lib/db";
import { nextPurchaseOrderFolio, nowIso, uuid } from "@/lib/ids";
import type {
  InventoryMovement,
  PurchaseOrder,
  WorkOrderPart,
  WorkOrderService,
} from "@/lib/types";

async function recomputeServiceStatus(serviceId: string) {
  const service = await findById("workOrderServices", serviceId);
  if (!service) return;
  if (service.status === "done") return;
  const parts = (await readAll("workOrderParts")).filter(
    (p) => p.workOrderServiceId === serviceId,
  );
  const next: WorkOrderService["status"] = parts.some(
    (p) => p.status === "waiting_purchase",
  )
    ? "waiting_parts"
    : service.status === "waiting_parts"
      ? "working"
      : service.status;
  if (next !== service.status) {
    await patchById("workOrderServices", serviceId, { status: next });
  }
}

export async function linkAndAuthorizeAction(
  partId: string,
  itemId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole(["admin", "supervisor"]);
  const part = await findById("workOrderParts", partId);
  if (!part) return { ok: false, error: "Refacción no encontrada." };
  if (part.status !== "requested" && part.status !== "waiting_purchase")
    return { ok: false, error: "La refacción ya fue resuelta." };

  const item = await findById("inventoryItems", itemId);
  if (!item) return { ok: false, error: "Ítem no encontrado." };
  if (item.stockCurrent < part.quantity)
    return {
      ok: false,
      error: `Stock insuficiente (${item.stockCurrent} disponible, se piden ${part.quantity}). Genera una OC.`,
    };

  const now = nowIso();
  const total = item.unitCost * part.quantity;

  // Atomically: descontar stock + autorizar refacción + registrar movimiento
  await transact("inventoryItems", async (recs) => {
    const idx = recs.findIndex((r) => r.id === itemId);
    if (idx === -1) throw new Error("Ítem desaparecido durante autorización.");
    recs[idx] = { ...recs[idx], stockCurrent: recs[idx].stockCurrent - part.quantity };
    return { records: recs, result: undefined };
  });

  const movement: InventoryMovement = {
    id: uuid(),
    itemId,
    type: "egreso",
    quantity: part.quantity,
    unitCostSnapshot: item.unitCost,
    purchaseOrderId: null,
    workOrderPartId: partId,
    authorizedBy: user.id,
    notes: `Salida por refacción ${part.description}`,
    createdAt: now,
  };
  await insert("inventoryMovements", movement);

  await patchById("workOrderParts", partId, {
    status: "authorized",
    linkedItemId: itemId,
    linkedAt: part.linkedAt ?? now,
    linkedBy: part.linkedBy ?? user.id,
    unitCostSnapshot: item.unitCost,
    totalCost: total,
    authorizedBy: user.id,
    authorizedAt: now,
  });

  await recomputeServiceStatus(part.workOrderServiceId);

  revalidatePath("/refacciones-pendientes");
  revalidatePath("/almacen");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function rejectPartAction(
  partId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole(["admin", "supervisor"]);
  const part = await findById("workOrderParts", partId);
  if (!part) return { ok: false, error: "Refacción no encontrada." };
  if (part.status === "authorized")
    return { ok: false, error: "Refacción ya autorizada." };
  await patchById("workOrderParts", partId, {
    status: "rejected",
    rejectionReason: reason || "Rechazada",
    authorizedAt: nowIso(),
  });
  await recomputeServiceStatus(part.workOrderServiceId);
  revalidatePath("/refacciones-pendientes");
  return { ok: true };
}

interface GeneratePOInput {
  partId: string;
  itemId: string;
  supplier: string;
  unitCost: number;
}

export async function generatePOAction(
  input: GeneratePOInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole(["admin", "supervisor"]);
  const part = await findById("workOrderParts", input.partId);
  if (!part) return { ok: false, error: "Refacción no encontrada." };
  if (part.status === "authorized" || part.status === "rejected")
    return { ok: false, error: "La refacción ya fue resuelta." };

  const item = await findById("inventoryItems", input.itemId);
  if (!item) return { ok: false, error: "Ítem no encontrado." };

  const allPOs = await readAll("purchaseOrders");
  const folio = nextPurchaseOrderFolio(allPOs.map((p) => p.folio));
  const now = nowIso();

  const po: PurchaseOrder = {
    id: uuid(),
    folio,
    supplier: input.supplier,
    status: "ordered",
    items: [
      { itemId: input.itemId, qty: part.quantity, unitCost: input.unitCost },
    ],
    linkedWorkOrderPartId: input.partId,
    createdBy: user.id,
    createdAt: now,
    orderedAt: now,
    receivedAt: null,
    notes: `Generada desde refacción ${part.description}`,
  };
  await insert("purchaseOrders", po);

  await patchById("workOrderParts", input.partId, {
    status: "waiting_purchase",
    linkedItemId: input.itemId,
    linkedAt: part.linkedAt ?? now,
    linkedBy: part.linkedBy ?? user.id,
    unitCostSnapshot: input.unitCost,
    totalCost: input.unitCost * part.quantity,
    purchaseOrderId: po.id,
  });

  await recomputeServiceStatus(part.workOrderServiceId);

  revalidatePath("/refacciones-pendientes");
  revalidatePath("/almacen/compras");
  return { ok: true };
}
