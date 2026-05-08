"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { insert, transact } from "@/lib/db";
import { nowIso, uuid } from "@/lib/ids";
import type { InventoryItem, InventoryMovement } from "@/lib/types";

export async function createItemAction(input: {
  sku: string;
  description: string;
  unitOfMeasure: string;
  unitCost: number;
  stockMinimum: number;
}) {
  await requireRole(["admin"]);
  const item: InventoryItem = {
    id: uuid(),
    sku: input.sku.trim(),
    description: input.description.trim(),
    unitOfMeasure: input.unitOfMeasure.trim() || "pieza",
    unitCost: input.unitCost,
    stockCurrent: 0,
    stockMinimum: input.stockMinimum,
    active: true,
  };
  await insert("inventoryItems", item);
  revalidatePath("/almacen");
}

export async function manualMovementAction(input: {
  itemId: string;
  type: "ingreso" | "egreso";
  quantity: number;
  notes: string;
}) {
  const user = await requireRole(["admin"]);
  if (input.quantity <= 0) throw new Error("Cantidad debe ser mayor a 0.");

  // Update stock atomically
  const item = await transact("inventoryItems", async (recs) => {
    const idx = recs.findIndex((r) => r.id === input.itemId);
    if (idx === -1) throw new Error("Ítem no encontrado.");
    const next = { ...recs[idx] };
    if (input.type === "ingreso") next.stockCurrent += input.quantity;
    else {
      if (next.stockCurrent < input.quantity)
        throw new Error("Stock insuficiente para el egreso.");
      next.stockCurrent -= input.quantity;
    }
    recs[idx] = next;
    return { records: recs, result: next };
  });

  const mov: InventoryMovement = {
    id: uuid(),
    itemId: input.itemId,
    type: input.type,
    quantity: input.quantity,
    unitCostSnapshot: item.unitCost,
    purchaseOrderId: null,
    workOrderPartId: null,
    authorizedBy: user.id,
    notes: input.notes.trim() || "Movimiento manual",
    createdAt: nowIso(),
  };
  await insert("inventoryMovements", mov);

  revalidatePath("/almacen");
  revalidatePath("/almacen/movimientos");
  revalidatePath(`/almacen/${input.itemId}`);
}
