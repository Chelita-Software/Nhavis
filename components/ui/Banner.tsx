import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  info: "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]",
  success: "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]",
  warning: "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
  danger: "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
};

const dotColor: Record<Tone, string> = {
  info: "#3B82F6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export function Banner({
  tone = "info",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border rounded-md px-3 py-2 mb-3 flex items-center gap-2 text-xs",
        toneClass[tone],
        className,
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: dotColor[tone] }}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
