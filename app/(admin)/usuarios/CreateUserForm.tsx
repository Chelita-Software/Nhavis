"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createUserAction } from "./actions";
import type { Role } from "@/lib/types";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "admin", label: "Admin", desc: "Acceso total. Costos y aprobaciones." },
  { value: "supervisor", label: "Supervisor", desc: "Crea órdenes, vincula refacciones, firma revisión. No ve costos." },
  { value: "mecanico", label: "Mecánico", desc: "Recibe órdenes asignadas. Mobile-first. No ve stock ni costos." },
];

export function CreateUserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("mecanico");
  const [dailyRate, setDailyRate] = useState("550");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit() {
    setError(null);
    setOk(false);
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    start(async () => {
      try {
        await createUserAction({
          name,
          email,
          role,
          dailyRate: Number(dailyRate) || 0,
        });
        setName("");
        setEmail("");
        setOk(true);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardTitle className="mb-3">＋ Nuevo usuario</CardTitle>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label>Nombre completo ★</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </div>
        <div>
          <Label>Correo ★ (será su login)</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="usuario@nhavis.demo"
          />
        </div>
        <div>
          <Label>Sueldo diario</Label>
          <Input
            type="number"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.currentTarget.value)}
          />
        </div>
        <div>
          <Label>Rol</Label>
          <Select
            value={role}
            onChange={(e) => setRole(e.currentTarget.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-md p-2.5 mb-3 text-[11px]">
        <div className="font-medium text-text-primary mb-1 flex items-center gap-2">
          <span>Permisos del rol</span>
          <Badge variant={role}>
            {ROLES.find((r) => r.value === role)?.label}
          </Badge>
        </div>
        <div className="text-text-secondary">
          {ROLES.find((r) => r.value === role)?.desc}
        </div>
      </div>

      {error && <div className="text-[11px] text-text-danger mb-2">{error}</div>}
      {ok && (
        <div className="text-[11px] text-text-success mb-2">
          Usuario creado. Ya puede iniciar sesión con su correo.
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" onClick={submit} disabled={pending}>
          {pending ? "Creando…" : "Crear usuario"}
        </Button>
      </div>
    </Card>
  );
}
