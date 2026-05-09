import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { NewPOForm } from "./NewPOForm";

export default async function NewPOPage() {
  await requireRole(["admin", "supervisor"]);
  const items = await readAll("inventoryItems");
  return (
    <>
      <PageHeader
        title="Nueva Orden de Compra"
        sub="Compra manual — sin orden de trabajo asociada (reabastecimiento, etc.)."
        actions={
          <Button href="/almacen/compras">← Cancelar</Button>
        }
      />
      <NewPOForm items={items.filter((i) => i.active)} />
    </>
  );
}
