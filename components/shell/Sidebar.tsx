"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { Role } from "@/lib/types";
import {
  LayoutGrid,
  ClipboardList,
  Package,
  Truck,
  Wrench,
  BarChart3,
  Users,
  ShoppingCart,
  LogOut,
  Boxes,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const PRINCIPAL: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, roles: ["admin", "supervisor"] },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList, roles: ["admin", "supervisor"] },
  { href: "/refacciones-pendientes", label: "Refacciones", icon: Boxes, roles: ["admin", "supervisor"] },
  { href: "/almacen", label: "Almacén", icon: Package, roles: ["admin", "supervisor"] },
  { href: "/almacen/compras", label: "Compras", icon: ShoppingCart, roles: ["admin", "supervisor"] },
];

const GESTION: NavItem[] = [
  { href: "/unidades", label: "Unidades", icon: Truck, roles: ["admin", "supervisor"] },
  { href: "/catalogo-servicios", label: "Catálogo", icon: Wrench, roles: ["admin"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["admin"] },
];

interface SidebarProps {
  user: { name: string; role: Role };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const visibleP = PRINCIPAL.filter((it) => it.roles.includes(user.role));
  const visibleG = GESTION.filter((it) => it.roles.includes(user.role));

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[210px] flex-shrink-0 flex flex-col bg-bg-primary border-r border-border-tertiary">
      <div className="px-4 py-3.5 border-b border-border-tertiary flex items-center gap-2">
        <div className="w-[26px] h-[26px] rounded-md bg-brand flex items-center justify-center">
          <span className="text-white text-[11px] font-medium">NH</span>
        </div>
        <div>
          <div className="text-xs font-medium">NHAVIS</div>
          <div className="text-[10px] text-text-tertiary">Logística</div>
        </div>
      </div>

      <div className="flex-1 py-2 overflow-y-auto">
        <NavSection label="PRINCIPAL" items={visibleP} isActive={isActive} />
        {visibleG.length > 0 && (
          <NavSection label="GESTIÓN" items={visibleG} isActive={isActive} />
        )}
      </div>

      <div className="border-t border-border-tertiary p-2.5">
        <div className="flex items-center gap-2 px-1.5">
          <Avatar name={user.name} role={user.role} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium truncate">{user.name}</div>
            <Badge variant={user.role}>{roleLabel(user.role)}</Badge>
          </div>
          <Link
            href="/logout"
            prefetch={false}
            className="p-1.5 rounded hover:bg-bg-secondary text-text-tertiary hover:text-text-primary"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  items,
  isActive,
}: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <>
      <div className="px-2 pt-2.5 pb-1 text-[10px] font-medium text-text-tertiary tracking-wider">
        {label}
      </div>
      {items.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "mx-1.5 my-0.5 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs transition-colors",
              active
                ? "bg-brand-light text-[#3730A3]"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary",
            )}
          >
            <Icon size={14} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function roleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";
  return "Mecánico";
}
