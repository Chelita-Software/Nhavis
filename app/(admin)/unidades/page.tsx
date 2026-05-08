import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { CreateUnitForm } from "./CreateUnitForm";

export default async function UnitsPage() {
  await requireRole(["admin", "supervisor"]);
  const units = await readAll("units");
  return (
    <>
      <PageHeader title="Unidades" sub={`${units.length} unidades`} />
      <Card className="mb-3 p-3">
        <Table>
          <THead>
            <TH>Económico</TH>
            <TH>Marca / Modelo</TH>
            <TH>Año</TH>
            <TH>Placas</TH>
            <TH>Estado</TH>
          </THead>
          <tbody>
            {units.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">{u.unitNumber}</TD>
                <TD>
                  {u.brand} {u.model}
                </TD>
                <TD>{u.year}</TD>
                <TD className="text-text-secondary">{u.plates}</TD>
                <TD>
                  <Badge
                    variant={
                      u.status === "active"
                        ? "closed"
                        : u.status === "in_workshop"
                          ? "progress"
                          : "neutral"
                    }
                  >
                    {u.status === "active"
                      ? "Activa"
                      : u.status === "in_workshop"
                        ? "En taller"
                        : "Inactiva"}
                  </Badge>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <CreateUnitForm />
    </>
  );
}
