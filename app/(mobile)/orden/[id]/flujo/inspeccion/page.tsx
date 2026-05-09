import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/wizard/StepHeader";
import { AddServiceForm } from "./AddServiceForm";
import { ServiceAccordion } from "./ServiceAccordion";

export default async function InspeccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  if (!order) notFound();

  const [services, catalog, photos, parts] = await Promise.all([
    readAll("workOrderServices"),
    readAll("serviceCatalog"),
    readAll("workOrderPhotos"),
    readAll("workOrderParts"),
  ]);
  const own = services.filter((s) => s.workOrderId === id);
  const ownServiceIds = new Set(own.map((s) => s.id));
  const initialPhotos = photos.filter(
    (p) => p.workOrderId === id && p.stage === "initial",
  );
  if (initialPhotos.length === 0) redirect(`/orden/${id}`);

  return (
    <>
      <MobileHeader
        title={`${order.folio}`}
        subtitle="Inspección · Servicios"
        backHref={`/orden/${id}`}
        user={{ name: user.name, role: user.role }}
      />
      <StepHeader
        current={2}
        total={3}
        title="Servicios a realizar"
        subtitle="Confirma o agrega servicios detectados durante la inspección."
      />
      <main className="flex-1 p-3 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-2">
            Servicios ({own.length})
          </div>
          {own.length === 0 ? (
            <div className="bg-bg-primary border border-border-tertiary rounded-lg p-4 text-center text-text-secondary text-xs">
              Aún no hay servicios. Agrega abajo.
            </div>
          ) : (
            own.map((s) => (
              <ServiceAccordion
                key={s.id}
                service={s}
                parts={parts.filter((p) => p.workOrderServiceId === s.id)}
              />
            ))
          )}
        </div>

        <AddServiceForm
          workOrderId={id}
          catalog={catalog
            .filter((c) => c.active)
            .map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category,
            }))}
        />

      </main>
      <div className="p-3 bg-bg-primary border-t border-border-tertiary">
        <Button
          href={own.length > 0 ? `/orden/${id}` : undefined}
          variant="primary"
          className="w-full justify-center text-sm py-3"
          disabled={own.length === 0}
        >
          Siguiente paso →
        </Button>
      </div>
    </>
  );
}
