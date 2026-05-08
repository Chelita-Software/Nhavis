import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { StepHeader } from "@/components/wizard/StepHeader";
import {
  partStatusLabel,
  partStatusVariant,
  serviceStatusLabel,
  serviceStatusVariant,
} from "@/lib/order-helpers";
import { ServiceStatusSwitcher } from "./ServiceStatusSwitcher";
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
  const own = parts.filter((p) => p.workOrderServiceId === svcId);
  const closingPhotos = photos.filter(
    (p) => p.workOrderServiceId === svcId && p.stage === "service_done",
  );

  const hasUnresolvedParts = own.some(
    (p) => p.status === "requested" || p.status === "waiting_purchase",
  );
  const canClose = closingPhotos.length > 0 && !hasUnresolvedParts && svc.status !== "done";

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
        <Card>
          <div className="flex justify-between items-center mb-3">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
              Estado del servicio
            </div>
            <Badge variant={serviceStatusVariant(svc.status)}>
              {serviceStatusLabel(svc.status)}
            </Badge>
          </div>
          <ServiceStatusSwitcher
            serviceId={svc.id}
            current={svc.status}
            disabled={svc.status === "done" || hasUnresolvedParts && svc.status !== "waiting_parts"}
          />
        </Card>

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

        {hasUnresolvedParts && (
          <Banner tone="warning">
            Hay refacciones esperando vinculación o compra. No podrás cerrar
            hasta que el aprobador las resuelva.
          </Banner>
        )}
      </main>

      <div className="sticky bottom-0 p-3 bg-bg-primary border-t border-border-tertiary">
        {svc.status === "done" ? (
          <Link href={`/orden/${id}`}>
            <Button className="w-full justify-center text-sm py-3" variant="primary">
              Volver al hub
            </Button>
          </Link>
        ) : (
          <CloseServiceButton serviceId={svc.id} disabled={!canClose} />
        )}
      </div>
    </>
  );
}
