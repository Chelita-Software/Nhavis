import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/permissions";
import { LoginForm } from "./LoginForm";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(next || homePath(user.role));
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-tertiary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-[10px] bg-brand flex items-center justify-center">
            <span className="text-white text-base font-medium">N</span>
          </div>
          <div className="text-base font-medium">NHAVIS Logistics</div>
          <div className="text-xs text-text-secondary mt-0.5">
            Sistema de Mantenimiento
          </div>
        </div>

        <div className="card-base p-5">
          <LoginForm next={next} />
        </div>

        <div className="text-center mt-3 text-[11px] text-text-tertiary">
          Ingresa con el correo asignado por el administrador.
        </div>

        <div className="mt-6 card-base p-3 text-[11px] text-text-secondary">
          <div className="font-medium text-text-primary mb-1.5">
            Cuentas demo
          </div>
          <ul className="space-y-1">
            <li>
              <code className="text-text-primary">fgarcia@nhavis.demo</code> · Admin
            </li>
            <li>
              <code className="text-text-primary">dalva@nhavis.demo</code> · Supervisor
            </li>
            <li>
              <code className="text-text-primary">lmartinez@nhavis.demo</code> · Mecánico
            </li>
            <li>
              <code className="text-text-primary">psanchez@nhavis.demo</code> · Mecánico
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
