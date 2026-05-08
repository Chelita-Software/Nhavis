import * as React from "react";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: boolean;
  valueClass?: string;
}

export function MetricCard({ label, value, sub, highlight, valueClass }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-md px-4 py-3.5",
        highlight ? "bg-[#EDE9FE]" : "bg-bg-secondary",
      )}
    >
      <div className="text-xs text-text-secondary mb-1">{label}</div>
      <div className={cn("text-[22px] font-medium", valueClass)}>{value}</div>
      {sub && <div className="text-[11px] text-text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}

export function MetricsGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <div
      className="grid gap-2.5 mb-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(110px, 1fr))` }}
    >
      {children}
    </div>
  );
}
