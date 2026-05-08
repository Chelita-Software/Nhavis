"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addServiceAction } from "@/app/(admin)/ordenes/actions";
import type { ServiceCategory } from "@/lib/types";

interface CatalogOpt {
  id: string;
  name: string;
  category: ServiceCategory;
}

export function AddServiceForm({
  workOrderId,
  catalog,
}: {
  workOrderId: string;
  catalog: CatalogOpt[];
}) {
  const [mode, setMode] = useState<"catalog" | "free">("catalog");
  const [scId, setScId] = useState(catalog[0]?.id ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("reparacion");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      try {
        if (mode === "catalog") {
          if (!scId) {
            setError("Selecciona un servicio.");
            return;
          }
          await addServiceAction({
            workOrderId,
            serviceCatalogId: scId,
            name: catalog.find((c) => c.id === scId)?.name ?? "",
            category: catalog.find((c) => c.id === scId)?.category ?? "otro",
            description,
          });
        } else {
          if (!name.trim()) {
            setError("Nombre del servicio requerido.");
            return;
          }
          await addServiceAction({
            workOrderId,
            serviceCatalogId: null,
            name: name.trim(),
            category,
            description,
          });
        }
        setName("");
        setDescription("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardTitle className="mb-2">＋ Agregar servicio</CardTitle>
      <div className="flex gap-2 mb-3">
        <Button
          size="sm"
          variant={mode === "catalog" ? "primary" : "secondary"}
          onClick={() => setMode("catalog")}
        >
          Del catálogo
        </Button>
        <Button
          size="sm"
          variant={mode === "free" ? "primary" : "secondary"}
          onClick={() => setMode("free")}
        >
          Libre
        </Button>
      </div>

      {mode === "catalog" ? (
        <>
          <Label>Servicio</Label>
          <Select value={scId} onChange={(e) => setScId(e.currentTarget.value)}>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <div>
            <Label>Nombre del servicio</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Ej: Ajuste de claxon"
            />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select
              value={category}
              onChange={(e) =>
                setCategory(e.currentTarget.value as ServiceCategory)
              }
            >
              <option value="reparacion">Reparación</option>
              <option value="rutina">Rutina</option>
              <option value="limpieza">Limpieza</option>
              <option value="fumigacion">Fumigación</option>
              <option value="otro">Otro</option>
            </Select>
          </div>
        </div>
      )}

      <div className="mt-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          placeholder="Detalles, observaciones…"
        />
      </div>

      {error && (
        <div className="text-[11px] text-text-danger mb-2">{error}</div>
      )}

      <Button
        variant="primary"
        className="w-full justify-center mt-2"
        disabled={pending}
        onClick={submit}
      >
        {pending ? "Agregando…" : "Agregar servicio"}
      </Button>
    </Card>
  );
}
