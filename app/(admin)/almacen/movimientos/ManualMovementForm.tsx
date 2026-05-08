"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { manualMovementAction } from "../actions";
import type { InventoryItem } from "@/lib/types";

export function ManualMovementForm({
  items,
}: {
  items: InventoryItem[];
  showCosts: boolean;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit() {
    setError(null);
    setOk(false);
    if (!itemId || !qty) {
      setError("Completa los campos.");
      return;
    }
    start(async () => {
      try {
        await manualMovementAction({
          itemId,
          type,
          quantity: Number(qty),
          notes,
        });
        setQty("1");
        setNotes("");
        setOk(true);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card className="mb-3">
      <CardTitle className="mb-3">＋ Movimiento manual</CardTitle>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <Label>Ítem</Label>
          <Select
            value={itemId}
            onChange={(e) => setItemId(e.currentTarget.value)}
          >
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.description} (stock {it.stockCurrent})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select
            value={type}
            onChange={(e) =>
              setType(e.currentTarget.value as "ingreso" | "egreso")
            }
          >
            <option value="ingreso">Ingreso (sumar stock)</option>
            <option value="egreso">Egreso (restar stock)</option>
          </Select>
        </div>
        <div>
          <Label>Cantidad</Label>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.currentTarget.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Motivo / notas</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            placeholder="Ej: ajuste de inventario, daño, devolución…"
          />
        </div>
      </div>
      {error && (
        <div className="text-[11px] text-text-danger mb-2">{error}</div>
      )}
      {ok && (
        <div className="text-[11px] text-text-success mb-2">
          Movimiento registrado.
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="primary" onClick={submit} disabled={pending}>
          {pending ? "Guardando…" : "Registrar movimiento"}
        </Button>
      </div>
    </Card>
  );
}
