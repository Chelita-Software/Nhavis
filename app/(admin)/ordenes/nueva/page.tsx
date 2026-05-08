import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { NewOrderForm } from "./NewOrderForm";

export default async function NewOrderPage() {
  await requireRole(["admin", "supervisor"]);
  const [units, users, catalog] = await Promise.all([
    readAll("units"),
    readAll("users"),
    readAll("serviceCatalog"),
  ]);

  const assignees = users.filter(
    (u) => (u.role === "mecanico" || u.role === "supervisor") && u.active,
  );

  return (
    <>
      <PageHeader
        title="Nueva Orden de Reparación"
        sub="La orden nace agendada — la unidad llegará al taller después."
        actions={
          <Link href="/ordenes">
            <Button>← Cancelar</Button>
          </Link>
        }
      />
      <NewOrderForm
        units={units}
        assignees={assignees.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role as "mecanico" | "supervisor",
        }))}
        catalog={catalog}
      />
    </>
  );
}
