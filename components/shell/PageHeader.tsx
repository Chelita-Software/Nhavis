import * as React from "react";

interface PageHeaderProps {
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, sub, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {sub && <div className="text-[11px] text-text-secondary">{sub}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
