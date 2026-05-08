"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }
      router.replace(next || data.redirectTo || "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="usuario@nhavis.demo"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
      </div>

      {error && (
        <div className="text-[11px] text-text-danger bg-bg-danger border border-[#FECACA] rounded-md px-2 py-1.5">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full justify-center"
        disabled={pending}
      >
        {pending ? "Entrando…" : "Entrar al sistema"}
      </Button>
    </form>
  );
}
