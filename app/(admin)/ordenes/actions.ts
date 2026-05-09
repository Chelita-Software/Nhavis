"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { insert, readAll, patchById, transact, findById } from "@/lib/db";
import { nextWorkOrderFolio, nowIso, uuid } from "@/lib/ids";
import type {
  Priority,
  ServiceCatalogItem,
  WorkOrder,
  WorkOrderPart,
  WorkOrderService,
} from "@/lib/types";

interface CreateOrderInput {
  unitId: string;
  assigneeId: string;
  reason: string;
  priority: Priority;
  scheduledFor: string;
  serviceCatalogIds: string[];
}

export async function createOrderAction(input: CreateOrderInput) {
  const user = await requireRole(["admin", "supervisor"]);

  const [users, units, catalog] = await Promise.all([
    readAll("users"),
    readAll("units"),
    readAll("serviceCatalog"),
  ]);

  const unit = units.find((u) => u.id === input.unitId);
  if (!unit) throw new Error("Unidad no encontrada.");
  const assignee = users.find((u) => u.id === input.assigneeId);
  if (!assignee) throw new Error("Asignado no encontrado.");
  if (assignee.role !== "mecanico" && assignee.role !== "supervisor") {
    throw new Error("Solo mecánicos o supervisores pueden ser asignados.");
  }

  const allOrders = await readAll("workOrders");
  const folio = nextWorkOrderFolio(allOrders.map((o) => o.folio));
  const now = nowIso();

  const order: WorkOrder = {
    id: uuid(),
    folio,
    unitId: input.unitId,
    assigneeId: input.assigneeId,
    assigneeRole: assignee.role,
    createdBy: user.id,
    status: "scheduled",
    priority: input.priority,
    reason: input.reason,
    scheduledFor: input.scheduledFor || now,
    arrivedAt: null,
    openedAt: now,
    submittedAt: null,
    supervisorSignedAt: null,
    supervisorSignedBy: null,
    adminSignedAt: null,
    adminSignedBy: null,
    closedAt: null,
    generalNotes: "",
  };
  await insert("workOrders", order);

  // Copy selected services from catalog with their abstract default parts.
  for (const scId of input.serviceCatalogIds) {
    const sc = catalog.find((c) => c.id === scId) as
      | ServiceCatalogItem
      | undefined;
    if (!sc) continue;
    const svc: WorkOrderService = {
      id: uuid(),
      workOrderId: order.id,
      serviceCatalogId: sc.id,
      name: sc.name,
      category: sc.category,
      description: "",
      status: "pending",
      startTime: null,
      endTime: null,
      notes: "",
      createdAt: now,
    };
    await insert("workOrderServices", svc);
    for (const dp of sc.defaultParts) {
      const part: WorkOrderPart = {
        id: uuid(),
        workOrderServiceId: svc.id,
        description: dp.description,
        partCategory: dp.partCategory,
        quantity: dp.qty,
        mechanicNote: "",
        status: "requested",
        linkedItemId: null,
        linkedAt: null,
        linkedBy: null,
        unitCostSnapshot: null,
        totalCost: null,
        purchaseOrderId: null,
        authorizedBy: null,
        authorizedAt: null,
        rejectionReason: null,
        createdAt: now,
        createdBy: user.id,
      };
      await insert("workOrderParts", part);
    }
  }

  revalidatePath("/ordenes");
  revalidatePath("/dashboard");
  redirect(`/ordenes/${order.id}`);
}

export async function arriveOrderAction(orderId: string) {
  await requireRole(["admin", "supervisor", "mecanico"]);
  const order = await findById("workOrders", orderId);
  if (!order) throw new Error("Orden no encontrada.");
  if (order.status !== "scheduled") return;
  await patchById("workOrders", orderId, {
    status: "in_progress",
    arrivedAt: nowIso(),
  });
  revalidatePath(`/ordenes/${orderId}`);
  revalidatePath(`/orden/${orderId}`);
  revalidatePath("/mis-ordenes");
  revalidatePath("/ordenes");
}

export async function submitOrderAction(orderId: string) {
  await requireRole(["admin", "supervisor", "mecanico"]);
  const services = (await readAll("workOrderServices")).filter(
    (s) => s.workOrderId === orderId,
  );
  if (services.length === 0)
    throw new Error("La orden no tiene servicios.");
  if (!services.every((s) => s.status === "done"))
    throw new Error("Faltan servicios por completar.");
  await patchById("workOrders", orderId, {
    status: "pending_approval",
    submittedAt: nowIso(),
  });
  revalidatePath(`/ordenes/${orderId}`);
  revalidatePath(`/orden/${orderId}`);
  revalidatePath("/ordenes");
}

export async function signSupervisorAction(orderId: string) {
  const user = await requireRole(["supervisor", "admin"]);
  const order = await findById("workOrders", orderId);
  if (!order) throw new Error("Orden no encontrada.");
  if (order.status !== "pending_approval")
    throw new Error("La orden no está esperando firma de supervisor.");
  await patchById("workOrders", orderId, {
    status: "pending_admin_approval",
    supervisorSignedAt: nowIso(),
    supervisorSignedBy: user.id,
  });
  revalidatePath(`/ordenes/${orderId}`);
}

export async function signAdminAction(orderId: string) {
  const user = await requireRole(["admin"]);
  const order = await findById("workOrders", orderId);
  if (!order) throw new Error("Orden no encontrada.");
  if (
    order.status !== "pending_admin_approval" &&
    order.status !== "pending_approval"
  ) {
    throw new Error("La orden no está esperando firma del admin.");
  }
  const now = nowIso();
  await patchById("workOrders", orderId, {
    status: "closed",
    adminSignedAt: now,
    adminSignedBy: user.id,
    closedAt: now,
    // si admin firma sin pasar por supervisor, registramos también la firma de revisión
    supervisorSignedAt: order.supervisorSignedAt ?? now,
    supervisorSignedBy: order.supervisorSignedBy ?? user.id,
  });
  revalidatePath(`/ordenes/${orderId}`);
  revalidatePath("/dashboard");
}

interface AddServiceInput {
  workOrderId: string;
  serviceCatalogId: string | null;
  name: string;
  category: WorkOrderService["category"];
  description?: string;
}

export async function addServiceAction(input: AddServiceInput) {
  const user = await requireRole(["admin", "supervisor", "mecanico"]);
  const catalog = await readAll("serviceCatalog");
  const sc = input.serviceCatalogId
    ? catalog.find((c) => c.id === input.serviceCatalogId) ?? null
    : null;
  const now = nowIso();
  const svc: WorkOrderService = {
    id: uuid(),
    workOrderId: input.workOrderId,
    serviceCatalogId: sc?.id ?? null,
    name: sc?.name ?? input.name,
    category: sc?.category ?? input.category,
    description: input.description ?? "",
    status: "pending",
    startTime: null,
    endTime: null,
    notes: "",
    createdAt: now,
  };
  await insert("workOrderServices", svc);
  if (sc) {
    for (const dp of sc.defaultParts) {
      const part: WorkOrderPart = {
        id: uuid(),
        workOrderServiceId: svc.id,
        description: dp.description,
        partCategory: dp.partCategory,
        quantity: dp.qty,
        mechanicNote: "",
        status: "requested",
        linkedItemId: null,
        linkedAt: null,
        linkedBy: null,
        unitCostSnapshot: null,
        totalCost: null,
        purchaseOrderId: null,
        authorizedBy: null,
        authorizedAt: null,
        rejectionReason: null,
        createdAt: now,
        createdBy: user.id,
      };
      await insert("workOrderParts", part);
    }
  }
  revalidatePath(`/ordenes/${input.workOrderId}`);
  revalidatePath(`/orden/${input.workOrderId}`);
  return svc;
}

export async function setServiceStatusAction(
  serviceId: string,
  status: WorkOrderService["status"],
) {
  const user = await requireRole(["admin", "supervisor", "mecanico"]);
  const svc = await findById("workOrderServices", serviceId);
  if (!svc) throw new Error("Servicio no encontrado.");
  if (user.role === "mecanico") {
    const parts = (await readAll("workOrderParts")).filter(
      (p) => p.workOrderServiceId === serviceId,
    );
    if (parts.some((p) => p.status === "requested" || p.status === "waiting_purchase")) {
      throw new Error("El servicio tiene refacciones pendientes. El estado se actualizará automáticamente cuando sean resueltas.");
    }
  }
  const patch: Partial<WorkOrderService> = { status };
  if (status === "working" && !svc.startTime) patch.startTime = nowIso();
  if (status === "done" && !svc.endTime) patch.endTime = nowIso();
  await patchById("workOrderServices", serviceId, patch);
  revalidatePath(`/ordenes/${svc.workOrderId}`);
  revalidatePath(`/orden/${svc.workOrderId}`);
}

export async function deleteOrderAction(orderId: string) {
  await requireRole(["admin"]);
  const order = await findById("workOrders", orderId);
  if (!order) throw new Error("Orden no encontrada.");

  const [allServices, allParts, allPhotos] = await Promise.all([
    readAll("workOrderServices"),
    readAll("workOrderParts"),
    readAll("workOrderPhotos"),
  ]);

  const svcIds = new Set(
    allServices.filter((s) => s.workOrderId === orderId).map((s) => s.id),
  );
  const photos = allPhotos.filter((p) => p.workOrderId === orderId);

  await Promise.all([
    transact("workOrders", async (recs) => ({
      records: recs.filter((r) => r.id !== orderId),
      result: undefined,
    })),
    transact("workOrderServices", async (recs) => ({
      records: recs.filter((r) => !svcIds.has(r.id)),
      result: undefined,
    })),
    transact("workOrderParts", async (recs) => ({
      records: recs.filter((r) => !svcIds.has(r.workOrderServiceId)),
      result: undefined,
    })),
    transact("workOrderPhotos", async (recs) => ({
      records: recs.filter((r) => r.workOrderId !== orderId),
      result: undefined,
    })),
  ]);

  // Best-effort file cleanup
  await Promise.allSettled(
    photos
      .filter((p) => p.photoUrl.startsWith("/uploads/"))
      .map((p) =>
        fs.unlink(path.join(process.cwd(), "public", p.photoUrl)),
      ),
  );

  revalidatePath("/ordenes");
  revalidatePath("/dashboard");
  redirect("/ordenes");
}

export async function deleteServiceAction(serviceId: string) {
  await requireRole(["admin", "supervisor", "mecanico"]);
  const svc = await findById("workOrderServices", serviceId);
  if (!svc) return;
  // Borra el servicio y sus partes
  await transact("workOrderServices", async (recs) => ({
    records: recs.filter((r) => r.id !== serviceId),
    result: undefined,
  }));
  await transact("workOrderParts", async (recs) => ({
    records: recs.filter((p) => p.workOrderServiceId !== serviceId),
    result: undefined,
  }));
  revalidatePath(`/ordenes/${svc.workOrderId}`);
  revalidatePath(`/orden/${svc.workOrderId}`);
}
