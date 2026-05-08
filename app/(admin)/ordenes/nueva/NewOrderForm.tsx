"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import type {
  Priority,
  ServiceCatalogItem,
  Unit,
} from "@/lib/types";
import { createOrderAction } from "../actions";

interface Props {
  units: Unit[];
  assignees: { id: string; name: string; role: "mecanico" | "supervisor" }[];
  catalog: ServiceCatalogItem[];
}

export function NewOrderForm({ units, assignees, catalog }: Props) {
  const activeUnits = units.filter((u) => u.status !== "inactive");
  const [unitId, setUnitId] = useState(activeUnits[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(assignees[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("normal");
  const [reason, setReason] = useState("");
  const [scheduledFor, setScheduledFor] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [selectedSvcs, setSelectedSvcs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(id: string) {
    const next = new Set(selectedSvcs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSvcs(next);
  }

  function submit() {
    setError(null);
    if (!unitId || !assigneeId || !reason.trim()) {
      setError("Completa los campos obligatorios.");
      return;
    }
    start(async () => {
      try {
        await createOrderAction({
          unitId,
          assigneeId,
          reason: reason.trim(),
          priority,
          scheduledFor: new Date(scheduledFor).toISOString(),
          serviceCatalogIds: Array.from(selectedSvcs),
        });
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const selectedUnit = activeUnits.find((u) => u.id === unitId);
  const selectedAssignee = assignees.find((a) => a.id === assigneeId);

  return (
    <>
      <Card className="mb-3">
        <CardTitle className="mb-3">Información de la Unidad</CardTitle>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label>Unidad ★</Label>
            <Select
              value={unitId}
              onChange={(e) => setUnitId(e.currentTarget.value)}
            >
              {activeUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitNumber} — {u.brand} {u.model}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Prioridad</Label>
            <Select
              value={priority}
              onChange={(e) =>
                setPriority(e.currentTarget.value as Priority)
              }
            >
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>
          </div>
        </div>
        {selectedUnit && (
          <div className="bg-bg-secondary rounded-md p-2.5 text-[11px] text-text-secondary">
            <strong className="text-text-primary">{selectedUnit.unitNumber}</strong>
            {" · "}
            {selectedUnit.brand} {selectedUnit.model} · Placas:{" "}
            {selectedUnit.plates} · Año: {selectedUnit.year}
          </div>
        )}
        <div className="mt-3">
          <Label>Motivo de entrada ★</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            placeholder="Ej: Cambio programado de llantas + revisión de frenos"
          />
        </div>
      </Card>

      <Card className="mb-3">
        <CardTitle className="mb-3">Asignación</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Asignar a (mecánico o supervisor) ★</Label>
            <Select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.currentTarget.value)}
            >
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role === "mecanico" ? "Mecánico" : "Supervisor"})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Fecha estimada de llegada</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.currentTarget.value)}
            />
          </div>
        </div>
        {selectedAssignee?.role === "supervisor" && (
          <Banner tone="info" className="mt-3 mb-0">
            Vas a asignar la orden a un <strong>supervisor</strong>. También
            puede recorrer el flujo móvil.
          </Banner>
        )}
      </Card>

      <Card className="mb-3">
        <CardTitle className="mb-2">Servicios prellenados (opcional)</CardTitle>
        <div className="text-[11px] text-text-secondary mb-3">
          Selecciona del catálogo. Sus refacciones se crearán como{" "}
          <strong>plantillas abstractas</strong>; el mecánico las edita.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {catalog
            .filter((c) => c.active)
            .map((sc) => {
              const selected = selectedSvcs.has(sc.id);
              return (
                <button
                  type="button"
                  key={sc.id}
                  onClick={() => toggle(sc.id)}
                  className={
                    "text-left rounded-md p-2.5 border transition-colors " +
                    (selected
                      ? "border-brand bg-brand-light"
                      : "border-border-tertiary bg-bg-primary hover:bg-bg-secondary")
                  }
                >
                  <div className="text-xs font-medium flex justify-between">
                    <span>{sc.name}</span>
                    {selected && <span className="text-brand">✓</span>}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {sc.category}
                    {sc.defaultParts.length > 0 &&
                      ` · ${sc.defaultParts.length} refac. sugeridas`}
                  </div>
                </button>
              );
            })}
        </div>
      </Card>

      {error && (
        <Banner tone="danger">{error}</Banner>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={submit} variant="primary" disabled={pending}>
          {pending ? "Creando…" : "Crear Orden →"}
        </Button>
      </div>
    </>
  );
}
