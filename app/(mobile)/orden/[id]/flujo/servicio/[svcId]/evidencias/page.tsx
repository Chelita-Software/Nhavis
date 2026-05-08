import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { PhotoUploader } from "@/components/photos/PhotoUploader";

export default async function EvidenciasPage({
  params,
}: {
  params: Promise<{ id: string; svcId: string }>;
}) {
  const { id, svcId } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  const svc = await findById("workOrderServices", svcId);
  if (!order || !svc || svc.workOrderId !== id) notFound();
  const photos = (await readAll("workOrderPhotos")).filter(
    (p) => p.workOrderServiceId === svcId && p.stage === "service_done",
  );

  return (
    <>
      <MobileHeader
        title={svc.name}
        subtitle="Evidencias del servicio"
        backHref={`/orden/${id}/flujo/servicio/${svcId}`}
        user={{ name: user.name, role: user.role }}
      />
      <main className="flex-1 p-3">
        <PhotoUploader
          workOrderId={id}
          workOrderServiceId={svcId}
          stage="service_done"
          photos={photos}
          emptyHint="Sube fotos del trabajo terminado para poder cerrar el servicio."
        />
      </main>
    </>
  );
}
