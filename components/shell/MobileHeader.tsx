import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Role } from "@/lib/types";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  user?: { name: string; role: Role };
  showLogout?: boolean;
}

export function MobileHeader({
  title,
  subtitle,
  backHref,
  user,
  showLogout = true,
}: MobileHeaderProps) {
  return (
    <header className="bg-brand text-white px-3.5 py-3 flex items-center gap-3 sticky top-0 z-10">
      {backHref ? (
        <Link
          href={backHref}
          className="p-1 -ml-1 rounded hover:bg-white/10"
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </Link>
      ) : (
        user && <Avatar name={user.name} role={user.role} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        {subtitle && (
          <div className="text-[11px] opacity-70 truncate">{subtitle}</div>
        )}
      </div>
      {showLogout && (
        <Link
          href="/logout"
          prefetch={false}
          aria-label="Cerrar sesión"
          className="p-1 rounded hover:bg-white/10"
        >
          <LogOut size={18} />
        </Link>
      )}
    </header>
  );
}
