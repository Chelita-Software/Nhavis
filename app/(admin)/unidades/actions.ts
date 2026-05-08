"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { insert } from "@/lib/db";
import { uuid } from "@/lib/ids";
import type { Unit } from "@/lib/types";

export async function createUnitAction(input: {
  unitNumber: string;
  brand: string;
  model: string;
  year: number;
  plates: string;
}) {
  await requireRole(["admin", "supervisor"]);
  const unit: Unit = {
    id: uuid(),
    unitNumber: input.unitNumber.trim(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    plates: input.plates.trim(),
    status: "active",
    notes: "",
  };
  await insert("units", unit);
  revalidatePath("/unidades");
}
