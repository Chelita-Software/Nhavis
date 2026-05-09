import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: boolean;
  valueClass?: string;
  href?: string;
}

export function MetricCard({ label, value, sub, highlight, valueClass, href }: MetricCardProps) {
  const inner = (
    <>
      <div className="flex justify-between items-start">
        <div className="text-xs text-text-secondary mb-1">{label}</div>
        {href && (
          <span className="text-[11px] text-text-secondary bg-bg-primary border border-border-secondary rounded px-1.5 py-0.5 leading-none">
            Ver →
          </span>
        )}
      </div>
      <div className={cn("text-[22px] font-medium", valueClass)}>{value}</div>
      {sub && <div className="text-[11px] text-text-tertiary mt-0.5">{sub}</div>}
    </>
  );
  const base = cn(
    "rounded-md px-4 py-3.5",
    highlight ? "bg-[#EDE9FE]" : "bg-bg-secondary",
    href && "ring-1 ring-[var(--color-border-secondary)] hover:ring-[var(--color-brand)] hover:brightness-95 transition-all cursor-pointer",
  );
  if (href) {
    return <Link href={href} className={base}>{inner}</Link>;
  }
  return <div className={base}>{inner}</div>;
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
