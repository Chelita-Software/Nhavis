import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  role?: "admin" | "supervisor" | "mecanico";
  size?: "sm" | "md";
  className?: string;
}

const roleColor: Record<NonNullable<AvatarProps["role"]>, string> = {
  admin: "#4C1D95",
  supervisor: "#1E3A8A",
  mecanico: "#065F46",
};

export function Avatar({ name, role, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = role ? roleColor[role] : "#1B3A5C";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium flex-shrink-0",
        size === "sm" ? "w-[22px] h-[22px] text-[9px]" : "w-7 h-7 text-[10px]",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}
