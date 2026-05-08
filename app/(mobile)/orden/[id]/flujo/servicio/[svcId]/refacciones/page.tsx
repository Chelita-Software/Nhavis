import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Banner } from "@/components/ui/Banner";
import { PartsEditor } from "./PartsEditor";

export default async function RefaccionesPage({
  params,
}: {
  params: Promise<{ id: string; svcId: string }>;
}) {
  const { id, svcId } = await params;
  const user = await requireUser();
  const svc = await findById("workOrderServices", svcId);
  const order = await findById("workOrders", id);
  if (!svc || !order || svc.workOrderId !== id) notFound();

  const parts = (await readAll("workOrderParts")).filter(
    (p) => p.workOrderServiceId === svcId,
  );

  return (
    <>
      <MobileHeader
        title={svc.name}
        subtitle="Refacciones (abstractas)"
        backHref={`/orden/${id}/flujo/servicio/${svcId}`}
        user={{ name: user.name, role: user.role }}
      />
      <main className="flex-1 p-3 space-y-3">
        <Banner tone="info">
          Pide en lenguaje libre lo que necesites. El aprobador vinculará cada
          refacción a un ítem del catálogo.
        </Banner>
        <PartsEditor serviceId={svc.id} parts={parts} />
      </main>
    </>
  );
}
