import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function CatalogPage() {
  await requireRole(["admin"]);
  const catalog = await readAll("serviceCatalog");
  return (
    <>
      <PageHeader
        title="Catálogo de servicios"
        sub={`${catalog.length} servicios definidos`}
      />

      <div className="text-[11px] text-text-secondary mb-3">
        Cada servicio puede tener refacciones <strong>abstractas</strong>{" "}
        precargadas (descripción + cantidad). Al asignar el servicio a una
        orden, se copian editables al mecánico.
      </div>

      {catalog.map((sc) => (
        <Card key={sc.id} className="mb-2 p-3">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-sm font-medium">{sc.name}</div>
              <div className="text-[11px] text-text-secondary capitalize">
                {sc.category}
              </div>
            </div>
            <Badge variant={sc.active ? "closed" : "neutral"}>
              {sc.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          {sc.defaultParts.length > 0 && (
            <div className="bg-bg-secondary rounded-md p-2.5 mt-2">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                Refacciones sugeridas (abstractas)
              </div>
              <ul className="text-[11px] space-y-0.5">
                {sc.defaultParts.map((dp, i) => (
                  <li key={i}>
                    • {dp.description}{" "}
                    <span className="text-text-tertiary">
                      × {dp.qty} ({dp.partCategory})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
