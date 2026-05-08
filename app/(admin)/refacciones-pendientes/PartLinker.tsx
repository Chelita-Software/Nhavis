"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import {
  generatePOAction,
  linkAndAuthorizeAction,
  rejectPartAction,
} from "./actions";
import type { InventoryItem, PartCategory, WorkOrderPart } from "@/lib/types";

const CATEGORY_KEYWORDS: Record<PartCategory, string[]> = {
  llantas: ["llanta", "neumatico", "neumático", "tire"],
  frenos: ["freno", "balata", "pastilla", "disco", "zapata"],
  aceites: ["aceite", "lubricante", "oil"],
  filtros: ["filtro", "filter"],
  luces: ["luz", "luces", "foco", "bombilla", "led", "lampara", "lámpara"],
  suspension: ["suspension", "suspensión", "amortiguador", "resorte", "barra"],
  otros: [],
};

interface Props {
  part: WorkOrderPart;
  meta: { folio: string; service: string; mechanic: string };
  items: InventoryItem[];
  showCosts: boolean;
}

export function PartLinker({ part, meta, items, showCosts }: Props) {
  const keywords = CATEGORY_KEYWORDS[part.partCategory] ?? [];

  const filteredItems = useMemo(() => {
    const active = items.filter((i) => i.active);
    if (keywords.length === 0) return active;
    const kw = [part.partCategory.toLowerCase(), ...keywords];
    const matched = active.filter((i) =>
      kw.some((k) => i.description.toLowerCase().includes(k)),
    );
    return matched.length > 0 ? matched : active;
  }, [items, keywords, part.partCategory]);

  const suggestion = useMemo(() => {
    const text = part.description.toLowerCase();
    return (
      filteredItems.find((i) => i.description.toLowerCase().includes(text)) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, part.description]);

  const [showAll, setShowAll] = useState(false);
  const [itemId, setItemId] = useState<string>(suggestion?.id ?? items[0]?.id ?? "");

  const visibleItems = showAll ? items.filter((i) => i.active) : filteredItems;
  const isFiltered = !showAll && filteredItems.length < items.filter((i) => i.active).length;
  const [supplier, setSupplier] = useState("");
  const [poUnitCost, setPoUnitCost] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"none" | "po" | "reject">("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const item = items.find((i) => i.id === itemId);
  const stockOk = !!item && item.stockCurrent >= part.quantity;
  const previewTotal = item ? item.unitCost * part.quantity : null;

  function authorize() {
    setError(null);
    start(async () => {
      const r = await linkAndAuthorizeAction(part.id, itemId);
      if (!r.ok) setError(r.error ?? "No se pudo autorizar.");
    });
  }

  function generatePO() {
    setError(null);
    if (!supplier.trim() || !poUnitCost) {
      setError("Completa proveedor y precio.");
      return;
    }
    start(async () => {
      const r = await generatePOAction({
        partId: part.id,
        itemId,
        supplier: supplier.trim(),
        unitCost: Number(poUnitCost),
      });
      if (!r.ok) setError(r.error ?? "No se pudo generar la OC.");
    });
  }

  function reject() {
    setError(null);
    start(async () => {
      const r = await rejectPartAction(part.id, rejectReason.trim());
      if (!r.ok) setError(r.error ?? "No se pudo rechazar.");
    });
  }

  return (
    <Card className="mb-3">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold">{part.description}</div>
          <div className="text-xs text-text-secondary mt-0.5">
            Cantidad: <strong>{part.quantity}</strong> ·{" "}
            {meta.folio} · {meta.service} · pidió: {meta.mechanic}
          </div>
        </div>
        <Badge variant={part.partCategory === "llantas" ? "open" : "neutral"}>
          {part.partCategory}
        </Badge>
      </div>

      {part.mechanicNote && (
        <div className="text-[11px] bg-bg-secondary border-l-2 border-border-secondary pl-2 py-1 mb-2">
          {part.mechanicNote}
        </div>
      )}

      <div className="flex justify-between items-center mb-0.5">
        <Label className="mb-0">Vincular con ítem del catálogo</Label>
        {isFiltered && (
          <button
            type="button"
            className="text-[11px] text-text-link underline underline-offset-2"
            onClick={() => setShowAll(true)}
          >
            Ver todos ({items.filter((i) => i.active).length})
          </button>
        )}
        {showAll && (
          <button
            type="button"
            className="text-[11px] text-text-link underline underline-offset-2"
            onClick={() => setShowAll(false)}
          >
            Filtrar por categoría ({filteredItems.length})
          </button>
        )}
      </div>
      <div className="flex gap-2 items-end mb-2">
        <Select
          value={itemId}
          onChange={(e) => setItemId(e.currentTarget.value)}
          className="flex-1"
        >
          {visibleItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.description} — {i.sku}
            </option>
          ))}
        </Select>
      </div>

      {item && (
        <div className="bg-bg-secondary rounded-md p-2.5 text-[11px] mb-2 grid grid-cols-3 gap-2">
          <div>
            <div className="text-text-tertiary">Stock</div>
            <div
              className={
                "font-medium " +
                (stockOk ? "text-text-success" : "text-text-danger")
              }
            >
              {item.stockCurrent} {item.unitOfMeasure}
              {item.stockCurrent < part.quantity ? " (insuficiente)" : ""}
            </div>
          </div>
          {showCosts && (
            <>
              <div>
                <div className="text-text-tertiary">Precio actual</div>
                <div className="font-medium">{formatMoney(item.unitCost)}</div>
              </div>
              <div>
                <div className="text-text-tertiary">Total estimado</div>
                <div className="font-medium">{formatMoney(previewTotal)}</div>
              </div>
            </>
          )}
        </div>
      )}

      {mode === "po" && (
        <div className="bg-bg-info border border-[#BFDBFE] rounded-md p-2.5 mb-2">
          <Label>Proveedor</Label>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.currentTarget.value)}
            placeholder="Ej: Llantas del Norte"
            className="mb-2"
          />
          <Label>
            Precio unitario {showCosts ? "" : "(no verás el total)"}
          </Label>
          <Input
            type="number"
            step="0.01"
            value={poUnitCost}
            onChange={(e) => setPoUnitCost(e.currentTarget.value)}
            placeholder={item ? String(item.unitCost) : "0.00"}
          />
        </div>
      )}

      {mode === "reject" && (
        <div className="bg-bg-danger border border-[#FECACA] rounded-md p-2.5 mb-2">
          <Label>Motivo de rechazo</Label>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.currentTarget.value)}
            placeholder="Ej: No corresponde con el servicio"
          />
        </div>
      )}

      {error && (
        <div className="text-[11px] text-text-danger mb-2">{error}</div>
      )}

      <div className="flex justify-end gap-2 flex-wrap">
        {mode === "none" && (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setMode("reject")}
              disabled={pending}
            >
              ✗ Rechazar
            </Button>
            <Button
              size="sm"
              onClick={() => setMode("po")}
              disabled={pending}
            >
              Generar OC
            </Button>
            <Button
              variant="success"
              onClick={authorize}
              disabled={pending || !stockOk}
              title={!stockOk ? "Stock insuficiente — genera OC" : undefined}
            >
              ✓ Autorizar desde stock
            </Button>
          </>
        )}
        {mode === "po" && (
          <>
            <Button onClick={() => setMode("none")} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={generatePO} disabled={pending}>
              Crear OC
            </Button>
          </>
        )}
        {mode === "reject" && (
          <>
            <Button onClick={() => setMode("none")} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={reject} disabled={pending}>
              Confirmar rechazo
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
