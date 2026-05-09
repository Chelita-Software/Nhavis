import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { PartsEditor } from "../servicio/[svcId]/refacciones/PartsEditor";

export default async function OrdenRefaccionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  if (!order) notFound();

  const [services, parts] = await Promise.all([
    readAll("workOrderServices"),
    readAll("workOrderParts"),
  ]);

  const ownServices = services.filter((s) => s.workOrderId === id);

  return (
    <>
      <MobileHeader
        title={order.folio}
        subtitle="Refacciones"
        backHref={`/orden/${id}/flujo/inspeccion`}
        user={{ name: user.name, role: user.role }}
      />

      <main className="flex-1 p-3 space-y-4 pb-6">
        <Banner tone="info">
          Pide en lenguaje libre lo que necesites. El aprobador vinculará cada
          refacción al catálogo.
        </Banner>

        {ownServices.length === 0 ? (
          <div className="bg-bg-primary border border-border-tertiary rounded-lg p-4 text-center text-text-secondary text-xs">
            Agrega servicios primero para poder solicitar refacciones.
          </div>
        ) : (
          ownServices.map((svc) => {
            const svcParts = parts.filter(
              (p) => p.workOrderServiceId === svc.id,
            );
            return (
              <div key={svc.id}>
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-2 px-0.5">
                  {svc.name}
                </div>
                <PartsEditor serviceId={svc.id} parts={svcParts} />
              </div>
            );
          })
        )}
      </main>

      <div className="sticky bottom-0 p-3 bg-bg-primary border-t border-border-tertiary">
        <Button
          href={`/orden/${id}/flujo/inspeccion`}
          variant="primary"
          className="w-full justify-center text-sm py-3"
        >
          Volver a inspección
        </Button>
      </div>
    </>
  );
}
