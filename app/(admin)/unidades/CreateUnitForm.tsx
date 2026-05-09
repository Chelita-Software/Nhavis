"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createUnitAction } from "./actions";

export function CreateUnitForm() {
  const [unitNumber, setUnitNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  useEffect(() => { setYear(new Date().getFullYear().toString()); }, []);
  const [plates, setPlates] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!unitNumber.trim() || !brand.trim() || !model.trim()) {
      setError("Completa los campos obligatorios.");
      return;
    }
    start(async () => {
      try {
        await createUnitAction({
          unitNumber,
          brand,
          model,
          year: Number(year) || new Date().getFullYear(),
          plates,
        });
        setUnitNumber("");
        setBrand("");
        setModel("");
        setPlates("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardTitle className="mb-3">＋ Nueva unidad</CardTitle>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label>Número económico ★</Label>
          <Input
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.currentTarget.value)}
            placeholder="TRK-040"
          />
        </div>
        <div>
          <Label>Año</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.currentTarget.value)}
          />
        </div>
        <div>
          <Label>Marca ★</Label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.currentTarget.value)}
            placeholder="Peterbilt"
          />
        </div>
        <div>
          <Label>Modelo ★</Label>
          <Input
            value={model}
            onChange={(e) => setModel(e.currentTarget.value)}
            placeholder="389"
          />
        </div>
        <div className="col-span-2">
          <Label>Placas</Label>
          <Input
            value={plates}
            onChange={(e) => setPlates(e.currentTarget.value)}
            placeholder="ABC-123-D"
          />
        </div>
      </div>
      {error && (
        <div className="text-[11px] text-text-danger mb-2">{error}</div>
      )}
      <div className="flex justify-end">
        <Button variant="primary" onClick={submit} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Card>
  );
}
