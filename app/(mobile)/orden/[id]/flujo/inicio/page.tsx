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
  const photos = (await readAll("workOrderPhotos")).filter(
    (p) => p.workOrderId === id && p.stage === "initial",
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
        <PhotoUploader
          workOrderId={id}
          workOrderServiceId={null}
          stage="initial"
          photos={photos}
          emptyHint="Toma fotos de los lados, la cabina y cualquier daño visible."
        />
      </main>
      <div className="p-3 bg-bg-primary border-t border-border-tertiary">
        <Link href={`/orden/${id}/flujo/inspeccion`}>
          <Button
            variant="primary"
            className="w-full justify-center text-sm py-3"
            disabled={photos.length === 0}
          >
            Continuar a Inspección →
          </Button>
        </Link>
      </div>
    </>
  );
}
