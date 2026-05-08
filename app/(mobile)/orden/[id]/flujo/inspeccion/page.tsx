import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StepHeader } from "@/components/wizard/StepHeader";
import {
  serviceStatusLabel,
  serviceStatusVariant,
} from "@/lib/order-helpers";
import { AddServiceForm } from "./AddServiceForm";
import { DeleteServiceButton } from "./DeleteServiceButton";

export default async function InspeccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await findById("workOrders", id);
  if (!order) notFound();

  const [services, catalog] = await Promise.all([
    readAll("workOrderServices"),
    readAll("serviceCatalog"),
  ]);
  const own = services.filter((s) => s.workOrderId === id);

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
              <div
                key={s.id}
                className="bg-bg-primary border border-border-tertiary rounded-lg p-3 mb-2 flex justify-between items-start"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[11px] text-text-secondary capitalize">
                    {s.category}
                    {s.description && ` · ${s.description}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={serviceStatusVariant(s.status)}>
                    {serviceStatusLabel(s.status)}
                  </Badge>
                  {s.status === "pending" && (
                    <DeleteServiceButton serviceId={s.id} />
                  )}
                </div>
              </div>
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
        <Link href={`/orden/${id}`}>
          <Button
            variant="primary"
            className="w-full justify-center text-sm py-3"
            disabled={own.length === 0}
          >
            Volver al hub →
          </Button>
        </Link>
      </div>
    </>
  );
}
