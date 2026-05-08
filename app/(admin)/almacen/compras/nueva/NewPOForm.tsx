"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createManualPOAction } from "../actions";
import { formatMoney } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";

interface Line {
  itemId: string;
  qty: number;
  unitCost: number;
}

export function NewPOForm({ items }: { items: InventoryItem[] }) {
  const router = useRouter();
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [draftItem, setDraftItem] = useState(items[0]?.id ?? "");
  const [draftQty, setDraftQty] = useState("1");
  const [draftCost, setDraftCost] = useState(
    items[0]?.unitCost ? String(items[0].unitCost) : "0",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function addLine() {
    if (!draftItem) return;
    setLines([
      ...lines,
      { itemId: draftItem, qty: Number(draftQty) || 1, unitCost: Number(draftCost) || 0 },
    ]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function submit() {
    setError(null);
    if (lines.length === 0) {
      setError("Agrega al menos un ítem.");
      return;
    }
    start(async () => {
      try {
        const po = await createManualPOAction({
          supplier,
          items: lines,
          notes,
        });
        router.replace(`/almacen/compras/${po.id}`);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function syncSelection(id: string) {
    setDraftItem(id);
    const found = items.find((i) => i.id === id);
    if (found) setDraftCost(String(found.unitCost));
  }

  const total = lines.reduce((acc, l) => acc + l.qty * l.unitCost, 0);

  return (
    <>
      <Card className="mb-3">
        <CardTitle className="mb-3">Datos de la OC</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Proveedor</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.currentTarget.value)}
              placeholder="Ej: Llantas del Norte"
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder="Reabastecimiento, contacto, etc."
            />
          </div>
        </div>
      </Card>

      <Card className="mb-3">
        <CardTitle className="mb-3">Líneas</CardTitle>

        {lines.length > 0 && (
          <div className="mb-3">
            {lines.map((l, i) => {
              const it = items.find((x) => x.id === l.itemId);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-bg-secondary rounded-md px-2.5 py-2 mb-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {it?.description ?? "—"}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      {l.qty} × {formatMoney(l.unitCost)} ={" "}
                      <strong>{formatMoney(l.qty * l.unitCost)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="p-1.5 rounded text-text-tertiary hover:text-text-danger hover:bg-bg-primary"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <div className="text-right text-sm font-medium mt-2">
              Total: {formatMoney(total)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3 sm:col-span-1">
            <Label>Ítem</Label>
            <Select
              value={draftItem}
              onChange={(e) => syncSelection(e.currentTarget.value)}
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.description}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={draftQty}
              onChange={(e) => setDraftQty(e.currentTarget.value)}
            />
          </div>
          <div>
            <Label>Precio unitario</Label>
            <Input
              type="number"
              step="0.01"
              value={draftCost}
              onChange={(e) => setDraftCost(e.currentTarget.value)}
            />
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <Button onClick={addLine}>＋ Agregar línea</Button>
        </div>
      </Card>

      {error && (
        <div className="text-[11px] text-text-danger mb-2">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={submit} variant="primary" disabled={pending}>
          {pending ? "Creando…" : "Crear OC (estado: pedida)"}
        </Button>
      </div>
    </>
  );
}
