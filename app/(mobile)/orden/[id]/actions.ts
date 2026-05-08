"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { findById, insert, patchById, transact } from "@/lib/db";
import { nowIso, uuid } from "@/lib/ids";
import type {
  PartCategory,
  PhotoStage,
  WorkOrderPart,
  WorkOrderPhoto,
} from "@/lib/types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

interface UploadPhotoInput {
  workOrderId: string;
  workOrderServiceId: string | null;
  stage: PhotoStage;
  caption: string;
  dataUrl: string; // data:image/...;base64,XXX
}

export async function uploadPhotoAction(input: UploadPhotoInput) {
  const user = await requireUser();
  const m = input.dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!m) throw new Error("Formato de imagen inválido.");
  const ext = m[1].split("/")[1].replace("+xml", "");
  const buf = Buffer.from(m[2], "base64");
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${input.workOrderId}-${Date.now()}-${uuid().slice(0, 6)}.${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buf);
  const photo: WorkOrderPhoto = {
    id: uuid(),
    workOrderId: input.workOrderId,
    workOrderServiceId: input.workOrderServiceId,
    stage: input.stage,
    uploadedBy: user.id,
    photoUrl: `/uploads/${filename}`,
    caption: input.caption,
    createdAt: nowIso(),
  };
  await insert("workOrderPhotos", photo);
  revalidatePath(`/orden/${input.workOrderId}`);
  revalidatePath(`/orden/${input.workOrderId}/flujo/inicio`);
  if (input.workOrderServiceId) {
    revalidatePath(
      `/orden/${input.workOrderId}/flujo/servicio/${input.workOrderServiceId}/evidencias`,
    );
  }
  return photo;
}

export async function deletePhotoAction(photoId: string) {
  await requireUser();
  const photo = await findById("workOrderPhotos", photoId);
  if (!photo) return;
  await transact("workOrderPhotos", async (recs) => ({
    records: recs.filter((r) => r.id !== photoId),
    result: undefined,
  }));
  // Best-effort file removal
  try {
    if (photo.photoUrl.startsWith("/uploads/")) {
      await fs.unlink(path.join(process.cwd(), "public", photo.photoUrl));
    }
  } catch {
    // ignore
  }
  revalidatePath(`/orden/${photo.workOrderId}`);
}

interface AddPartInput {
  workOrderServiceId: string;
  description: string;
  partCategory: PartCategory;
  quantity: number;
  mechanicNote?: string;
}

export async function addPartAction(input: AddPartInput) {
  const user = await requireUser();
  if (!input.description.trim()) throw new Error("Descripción requerida.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0)
    throw new Error("Cantidad inválida.");
  const part: WorkOrderPart = {
    id: uuid(),
    workOrderServiceId: input.workOrderServiceId,
    description: input.description.trim(),
    partCategory: input.partCategory,
    quantity: input.quantity,
    mechanicNote: input.mechanicNote ?? "",
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
    createdAt: nowIso(),
    createdBy: user.id,
  };
  await insert("workOrderParts", part);
  const svc = await findById("workOrderServices", input.workOrderServiceId);
  if (svc && svc.status !== "done") {
    await patchById("workOrderServices", svc.id, { status: "waiting_parts" });
    revalidatePath(`/orden/${svc.workOrderId}/flujo/servicio/${svc.id}`);
    revalidatePath(`/orden/${svc.workOrderId}/flujo/servicio/${svc.id}/refacciones`);
    revalidatePath(`/orden/${svc.workOrderId}`);
  }
  return part;
}

export async function updatePartAction(
  partId: string,
  patch: Partial<Pick<WorkOrderPart, "description" | "quantity" | "mechanicNote" | "partCategory">>,
) {
  await requireUser();
  const part = await findById("workOrderParts", partId);
  if (!part) throw new Error("Refacción no encontrada.");
  if (part.status !== "requested")
    throw new Error("Sólo se pueden editar refacciones aún no resueltas.");
  await patchById("workOrderParts", partId, patch);
  const svc = await findById("workOrderServices", part.workOrderServiceId);
  if (svc) revalidatePath(`/orden/${svc.workOrderId}/flujo/servicio/${svc.id}/refacciones`);
}

export async function deletePartAction(partId: string) {
  await requireUser();
  const part = await findById("workOrderParts", partId);
  if (!part) return;
  if (part.status !== "requested")
    throw new Error("Solo refacciones pendientes pueden borrarse.");
  await transact("workOrderParts", async (recs) => ({
    records: recs.filter((r) => r.id !== partId),
    result: undefined,
  }));
  const svc = await findById("workOrderServices", part.workOrderServiceId);
  if (svc) revalidatePath(`/orden/${svc.workOrderId}/flujo/servicio/${svc.id}/refacciones`);
}

export async function closeServiceAction(serviceId: string) {
  await requireUser();
  const svc = await findById("workOrderServices", serviceId);
  if (!svc) throw new Error("Servicio no encontrado.");
  // Validar: al menos 1 foto del servicio + ninguna refacción pendiente/esperando compra
  const [photos, parts] = await Promise.all([
    (await import("@/lib/db")).readAll("workOrderPhotos"),
    (await import("@/lib/db")).readAll("workOrderParts"),
  ]);
  const ownPhotos = photos.filter(
    (p) => p.workOrderServiceId === serviceId && p.stage === "service_done",
  );
  if (ownPhotos.length === 0)
    throw new Error("Sube al menos 1 foto de evidencia para cerrar.");
  const ownParts = parts.filter((p) => p.workOrderServiceId === serviceId);
  if (
    ownParts.some(
      (p) => p.status === "requested" || p.status === "waiting_purchase",
    )
  )
    throw new Error(
      "Hay refacciones pendientes o esperando compra. No se puede cerrar.",
    );
  await patchById("workOrderServices", serviceId, {
    status: "done",
    endTime: nowIso(),
  });
  revalidatePath(`/orden/${svc.workOrderId}`);
}
