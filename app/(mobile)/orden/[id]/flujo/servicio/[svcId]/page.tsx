import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StepHeader } from "@/components/wizard/StepHeader";
import {
  partStatusLabel,
  partStatusVariant,
} from "@/lib/order-helpers";
import { CloseServiceButton } from "./CloseServiceButton";

export default async function ServiceWorkPage({
  params,
}: {
  params: Promise<{ id: string; svcId: string }>;
}) {
  const { id, svcId } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  const svc = await findById("workOrderServices", svcId);
  if (!order || !svc || svc.workOrderId !== id) notFound();

  const [parts, photos] = await Promise.all([
    readAll("workOrderParts"),
    readAll("workOrderPhotos"),
  ]);
  const initialPhotos = photos.filter(
    (p) => p.workOrderId === id && p.stage === "initial",
  );
  if (initialPhotos.length === 0) redirect(`/orden/${id}`);
  const own = parts.filter((p) => p.workOrderServiceId === svcId);
  const closingPhotos = photos.filter(
    (p) => p.workOrderServiceId === svcId && p.stage === "service_done",
  );

  const hasUnresolvedParts = own.some(
    (p) => p.status === "requested" || p.status === "waiting_purchase",
  );
  const locked = svc.status === "waiting_parts" || hasUnresolvedParts;
  const canClose = closingPhotos.length > 0 && !locked && svc.status !== "done";

  return (
    <>
      <MobileHeader
        title={`${order.folio} · ${svc.name}`}
        subtitle="Servicio"
        backHref={`/orden/${id}`}
        user={{ name: user.name, role: user.role }}
      />
      <StepHeader
        current={3}
        total={3}
        title={svc.name}
        subtitle={svc.description || "Refacciones, estado y evidencias"}
      />

      <main className="flex-1 p-3 space-y-3 pb-20">
        {locked && (
          <div className="flex items-start gap-2.5 bg-bg-warning border border-[#FDE68A] rounded-lg px-3 py-2.5 text-sm text-text-warning">
            <span className="shrink-0 mt-0.5">🔒</span>
            <span>
              Servicio bloqueado — esperando que el aprobador resuelva las
              refacciones. El estado se actualizará automáticamente.
            </span>
          </div>
        )}

        <Link
          href={`/orden/${id}/flujo/servicio/${svc.id}/refacciones`}
          className="block bg-bg-primary border border-border-tertiary rounded-lg p-3"
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium">🔩 Refacciones</div>
              <div className="text-[11px] text-text-secondary">
                {own.length} {own.length === 1 ? "solicitada" : "solicitadas"}
              </div>
            </div>
            <span className="text-text-tertiary">›</span>
          </div>
          {own.length > 0 && (
            <div className="mt-2 space-y-1">
              {own.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-text-primary">
                    {p.description} × {p.quantity}
                  </span>
                  <Badge variant={partStatusVariant(p.status)}>
                    {partStatusLabel(p.status)}
                  </Badge>
                </div>
              ))}
              {own.length > 3 && (
                <div className="text-[11px] text-text-tertiary">
                  + {own.length - 3} más
                </div>
              )}
            </div>
          )}
        </Link>

        <Link
          href={`/orden/${id}/flujo/servicio/${svc.id}/evidencias`}
          className="block bg-bg-primary border border-border-tertiary rounded-lg p-3"
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium">📷 Evidencias del servicio</div>
              <div className="text-[11px] text-text-secondary">
                {closingPhotos.length}{" "}
                {closingPhotos.length === 1 ? "foto" : "fotos"}
              </div>
            </div>
            <span className="text-text-tertiary">›</span>
          </div>
        </Link>
      </main>

      <div className="sticky bottom-0 p-3 bg-bg-primary border-t border-border-tertiary">
        {svc.status === "done" ? (
          <Button href={`/orden/${id}`} className="w-full justify-center text-sm py-3" variant="primary">
            Volver al hub
          </Button>
        ) : locked ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-bg-secondary border border-border-secondary py-3 px-4 text-sm text-text-tertiary">
            <span>🔒</span>
            <span>No disponible — refacciones pendientes</span>
          </div>
        ) : (
          <CloseServiceButton serviceId={svc.id} disabled={!canClose} />
        )}
      </div>
    </>
  );
}
