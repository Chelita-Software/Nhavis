import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { canSubmitOrder } from "@/lib/order-helpers";
import {
  workOrderStatusLabel,
  workOrderStatusVariant,
  serviceStatusLabel,
  serviceStatusVariant,
} from "@/lib/order-helpers";
import { ArriveButton } from "./ArriveButton";
import { SubmitButton } from "./SubmitButton";

export default async function OrderHubMobilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  if (!order) notFound();

  const [unit, services, parts, photos] = await Promise.all([
    findById("units", order.unitId),
    readAll("workOrderServices"),
    readAll("workOrderParts"),
    readAll("workOrderPhotos"),
  ]);

  const ownServices = services.filter((s) => s.workOrderId === order.id);
  const initialPhotos = photos.filter(
    (p) => p.workOrderId === order.id && p.stage === "initial",
  );

  const isMine = order.assigneeId === user.id;
  const allDone = canSubmitOrder(ownServices);

  return (
    <>
      <MobileHeader
        title={`${order.folio} · ${unit?.unitNumber ?? "—"}`}
        subtitle={`${unit?.brand ?? ""} ${unit?.model ?? ""}`}
        backHref="/mis-ordenes"
        user={{ name: user.name, role: user.role }}
      />

      <main className="p-3 flex-1 space-y-3">
        <div className="bg-bg-primary border border-border-tertiary rounded-lg p-3.5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[11px] text-text-secondary uppercase tracking-wider">
                Motivo
              </div>
              <div className="text-sm">{order.reason}</div>
            </div>
            <Badge variant={workOrderStatusVariant(order.status)}>
              {workOrderStatusLabel(order.status)}
            </Badge>
          </div>
        </div>

        {!isMine && (
          <Banner tone="warning">
            Esta orden está asignada a otra persona. Solo lectura.
          </Banner>
        )}

        {order.status === "scheduled" && isMine && (
          <div className="bg-brand-light border border-[#C7D2FE] rounded-lg p-4 text-center">
            <div className="text-sm font-medium text-[#3730A3] mb-1">
              📍 ¿Llegó la unidad al taller?
            </div>
            <div className="text-[11px] text-[#4338CA] mb-3">
              Marca la llegada para empezar la inspección.
            </div>
            <ArriveButton orderId={order.id} />
          </div>
        )}

        {order.status === "in_progress" && initialPhotos.length === 0 && (
          <Banner tone="warning">
            Aún no has subido fotos de evidencia inicial.{" "}
            <Link
              href={`/orden/${order.id}/flujo/inicio`}
              className="underline"
            >
              Subir ahora
            </Link>
          </Banner>
        )}

        {order.status === "in_progress" && (
          <Link
            href={`/orden/${order.id}/flujo/inicio`}
            className="flex items-center justify-between bg-bg-primary border border-border-tertiary rounded-lg p-3"
          >
            <div>
              <div className="text-xs font-medium">📷 Evidencia inicial</div>
              <div className="text-[11px] text-text-secondary">
                {initialPhotos.length} {initialPhotos.length === 1 ? "foto" : "fotos"}
              </div>
            </div>
            <span className="text-text-tertiary">›</span>
          </Link>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
              Servicios
            </div>
            {order.status === "in_progress" && isMine && (
              <Link
                href={`/orden/${order.id}/flujo/inspeccion`}
                className="text-[11px] text-text-info"
              >
                ＋ Agregar
              </Link>
            )}
          </div>

          {ownServices.length === 0 ? (
            <div className="bg-bg-primary border border-border-tertiary rounded-lg p-4 text-center text-text-secondary text-xs">
              Sin servicios. Agrega desde el botón de arriba.
            </div>
          ) : (
            ownServices.map((svc) => {
              const own = parts.filter((p) => p.workOrderServiceId === svc.id);
              return (
                <Link
                  key={svc.id}
                  href={
                    order.status === "in_progress"
                      ? `/orden/${order.id}/flujo/servicio/${svc.id}`
                      : `/orden/${order.id}`
                  }
                  className="block bg-bg-primary border border-border-tertiary rounded-lg p-3 mb-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-sm font-medium">{svc.name}</div>
                      <div className="text-[11px] text-text-secondary">
                        {own.length} refacciones
                        {svc.description && ` · ${svc.description}`}
                      </div>
                    </div>
                    <Badge variant={serviceStatusVariant(svc.status)}>
                      {serviceStatusLabel(svc.status)}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {order.status === "in_progress" && isMine && (
          <SubmitButton orderId={order.id} disabled={!allDone} />
        )}

        {order.status === "pending_approval" && (
          <Banner tone="info">
            La orden fue enviada a revisión. Espera la firma del supervisor.
          </Banner>
        )}
        {order.status === "pending_admin_approval" && (
          <Banner tone="info">
            Esperando firma final del Admin.
          </Banner>
        )}
        {order.status === "closed" && (
          <Banner tone="success">¡Orden cerrada!</Banner>
        )}
      </main>
    </>
  );
}
