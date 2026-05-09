import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/wizard/StepHeader";
import { PhotoUploader } from "@/components/photos/PhotoUploader";

export default async function InicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  if (!order) notFound();
  const [allPhotos, allServices] = await Promise.all([
    readAll("workOrderPhotos"),
    readAll("workOrderServices"),
  ]);
  const photos = allPhotos.filter(
    (p) => p.workOrderId === id && p.stage === "initial",
  );
  const locked = allServices.some(
    (s) => s.workOrderId === id && s.status !== "pending",
  );

  return (
    <>
      <MobileHeader
        title={`${order.folio}`}
        subtitle="Inicio · Evidencia inicial"
        backHref={`/orden/${id}`}
        user={{ name: user.name, role: user.role }}
      />
      <StepHeader
        current={1}
        total={3}
        title="Fotos al llegar la unidad"
        subtitle="Sube al menos una foto del estado al recibir el camión."
      />
      <main className="flex-1 p-3">
        {locked && (
          <div className="flex items-center gap-2 text-[11px] text-text-secondary bg-bg-secondary border border-border-tertiary rounded-lg px-3 py-2 mb-3">
            <span>🔒</span>
            <span>Evidencia bloqueada — los servicios ya fueron iniciados.</span>
          </div>
        )}
        <PhotoUploader
          workOrderId={id}
          workOrderServiceId={null}
          stage="initial"
          photos={photos}
          emptyHint="Toma fotos de los lados, la cabina y cualquier daño visible."
          readOnly={locked}
        />
      </main>
      <div className="p-3 bg-bg-primary border-t border-border-tertiary">
        <Button
          href={photos.length > 0 ? `/orden/${id}/flujo/inspeccion` : undefined}
          variant="primary"
          className="w-full justify-center text-sm py-3"
          disabled={photos.length === 0}
        >
          Continuar a Inspección →
        </Button>
      </div>
    </>
  );
}
