"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  addPartAction,
  deletePartAction,
  updatePartAction,
} from "@/app/(mobile)/orden/[id]/actions";
import { partStatusLabel, partStatusVariant } from "@/lib/order-helpers";
import type { PartCategory, WorkOrderPart } from "@/lib/types";

const CATEGORIES: { value: PartCategory; label: string }[] = [
  { value: "llantas", label: "Llantas" },
  { value: "frenos", label: "Frenos" },
  { value: "aceites", label: "Aceites" },
  { value: "filtros", label: "Filtros" },
  { value: "luces", label: "Luces" },
  { value: "suspension", label: "Suspensión" },
  { value: "otros", label: "Otros" },
];

export function PartsEditor({
  serviceId,
  parts,
}: {
  serviceId: string;
  parts: WorkOrderPart[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newCat, setNewCat] = useState<PartCategory>("otros");
  const [newNote, setNewNote] = useState("");

  function addPart() {
    setError(null);
    if (!newDesc.trim()) {
      setError("Escribe la descripción.");
      return;
    }
    start(async () => {
      try {
        await addPartAction({
          workOrderServiceId: serviceId,
          description: newDesc.trim(),
          partCategory: newCat,
          quantity: Number(newQty) || 1,
          mechanicNote: newNote.trim() || undefined,
        });
        setNewDesc("");
        setNewQty("1");
        setNewNote("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      {parts.length === 0 ? (
        <div className="bg-bg-primary border border-border-tertiary rounded-lg p-4 text-center text-text-secondary text-xs">
          Aún no has solicitado refacciones para este servicio.
        </div>
      ) : (
        parts.map((p) => (
          <PartRow key={p.id} part={p} pending={pending} start={start} />
        ))
      )}

      <Card>
        <CardTitle className="mb-2">＋ Agregar refacción</CardTitle>

        <Label>Descripción</Label>
        <Input
          value={newDesc}
          onChange={(e) => setNewDesc(e.currentTarget.value)}
          placeholder="Ej: Llanta 295/75R22.5"
        />

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label>Categoría</Label>
            <Select
              value={newCat}
              onChange={(e) => setNewCat(e.currentTarget.value as PartCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={newQty}
              onChange={(e) => setNewQty(e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="mt-2">
          <Label>Nota para el aprobador (opcional)</Label>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.currentTarget.value)}
            placeholder="Ej: Desgaste mayor al normal en eje trasero."
          />
        </div>

        {error && (
          <div className="text-[11px] text-text-danger mt-2">{error}</div>
        )}

        <Button
          variant="primary"
          className="w-full justify-center mt-3"
          disabled={pending}
          onClick={addPart}
        >
          {pending ? "Agregando…" : "Agregar"}
        </Button>
      </Card>
    </>
  );
}

function PartRow({
  part,
  pending,
  start,
}: {
  part: WorkOrderPart;
  pending: boolean;
  start: (cb: () => void) => void;
}) {
  const editable = part.status === "requested";
  return (
    <Card className="mb-2 p-3">
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="text-sm font-medium flex-1 min-w-0 break-words">
          {part.description}
        </div>
        <Badge variant={partStatusVariant(part.status)}>
          {partStatusLabel(part.status)}
        </Badge>
      </div>
      {part.mechanicNote && (
        <div className="text-[11px] text-text-secondary mb-2">
          {part.mechanicNote}
        </div>
      )}

      {editable ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending || part.quantity <= 1}
            onClick={() =>
              start(() =>
                updatePartAction(part.id, { quantity: part.quantity - 1 }),
              )
            }
            className="w-10 h-10 rounded-md border border-border-secondary bg-bg-primary disabled:opacity-50 flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
          <div className="flex-1 text-center text-sm font-medium">
            {part.quantity}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(() =>
                updatePartAction(part.id, { quantity: part.quantity + 1 }),
              )
            }
            className="w-10 h-10 rounded-md border border-border-secondary bg-bg-primary flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("¿Eliminar refacción?")) return;
              start(() => deletePartAction(part.id));
            }}
            className="w-10 h-10 rounded-md text-text-danger border border-[#FECACA] bg-bg-danger flex items-center justify-center"
            aria-label="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="text-[11px] text-text-secondary">
          Cantidad: {part.quantity}
          {part.rejectionReason && (
            <div className="text-text-danger mt-1">
              Rechazada: {part.rejectionReason}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
