import * as React from "react";
import { cn } from "@/lib/cn";

export function SectionLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2",
        className,
      )}
      {...props}
    />
  );
}
