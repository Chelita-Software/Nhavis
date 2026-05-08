interface Props {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
}

export function StepHeader({ current, total, title, subtitle }: Props) {
  const pct = (current / total) * 100;
  return (
    <div className="bg-bg-primary border-b border-border-tertiary px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] font-medium text-text-secondary whitespace-nowrap">
          Paso {current} de {total}
        </div>
      </div>
      <div className="text-base font-medium">{title}</div>
      {subtitle && (
        <div className="text-[11px] text-text-secondary mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
