import { Card, CardTitle } from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";

const MONTHS = ["Dic '25", "Ene '26", "Feb '26", "Mar '26", "Abr '26", "May '26"];

const ROWS = [
  { id: "tr-007", number: "TRK-007", model: "Kenworth T680",    spend: [ 8400,  3200, 15600,  4800,  2100, 11200] },
  { id: "tr-008", number: "TRK-008", model: "Freightliner C15",  spend: [12800,  5600,  6200, 18400,  9600,  3800] },
  { id: "tr-014", number: "TRK-014", model: "Peterbilt 389",    spend: [ 4200,  8800,  2400,  5600, 14800,  6400] },
  { id: "tr-022", number: "TRK-022", model: "Volvo VNL 760",    spend: [ 2800,  1600,  3200,  2400,  1200,  7800] },
  { id: "tr-031", number: "TRK-031", model: "International LT", spend: [16200,  9400,  7800, 12600,  4200,  8600] },
];

export function TruckSpendReport() {
  const allValues = ROWS.flatMap((r) => r.spend);
  const maxVal = Math.max(...allValues);

  const colTotals = MONTHS.map((_, i) =>
    ROWS.reduce((sum, r) => sum + r.spend[i], 0),
  );
  const grandTotal = colTotals.reduce((a, b) => a + b, 0);
  const currentMonthIdx = MONTHS.length - 1;

  return (
    <Card className="p-3">
      <div className="flex justify-between items-start mb-4">
        <div>
          <CardTitle>Gasto mensual por unidad</CardTitle>
          <div className="text-[11px] text-text-secondary mt-0.5">
            Refacciones autorizadas · Dic 2025 – May 2026
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-secondary">Total acumulado</div>
          <div className="text-sm font-semibold text-text-primary">
            {formatMoney(grandTotal)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] text-text-tertiary font-medium pb-2.5 pr-4 min-w-[100px]">
                Unidad
              </th>
              {MONTHS.map((m, i) => (
                <th
                  key={i}
                  className={`text-right text-[11px] font-medium pb-2.5 px-3 whitespace-nowrap ${
                    i === currentMonthIdx
                      ? "text-[var(--color-brand)]"
                      : "text-text-tertiary"
                  }`}
                >
                  {m}
                  {i === currentMonthIdx && (
                    <span className="ml-1 text-[9px] bg-[var(--color-brand)] text-white rounded px-1 py-px align-middle">
                      actual
                    </span>
                  )}
                </th>
              ))}
              <th className="text-right text-[11px] font-medium pb-2.5 pl-4 text-text-tertiary border-l border-border-tertiary">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row) => {
              const rowTotal = row.spend.reduce((a, b) => a + b, 0);
              const rowMax = Math.max(...row.spend);
              return (
                <tr key={row.id} className="border-t border-border-tertiary group">
                  <td className="py-2.5 pr-4">
                    <div className="text-xs font-semibold text-text-primary leading-none">
                      {row.number}
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">
                      {row.model}
                    </div>
                  </td>

                  {row.spend.map((val, i) => {
                    const pct = rowMax > 0 ? val / rowMax : 0;
                    const isCurrent = i === currentMonthIdx;
                    const isTop = val === rowMax;
                    return (
                      <td key={i} className={`py-2 px-3 ${isCurrent ? "bg-[#f0f4f8]" : ""}`}>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-xs tabular-nums leading-none ${
                              isTop
                                ? "font-semibold text-[#b91c1c]"
                                : "font-medium text-text-primary"
                            }`}
                          >
                            {formatMoney(val)}
                          </span>
                          <div className="w-14 h-1 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(pct * 100)}%`,
                                background: "var(--color-brand)",
                                opacity: 0.3 + pct * 0.7,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  <td className="py-2.5 pl-4 border-l border-border-tertiary text-right">
                    <span className="text-xs font-semibold text-text-primary tabular-nums">
                      {formatMoney(rowTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-border-secondary">
              <td className="py-2.5 pr-4 text-[11px] font-semibold text-text-secondary">
                Flota total
              </td>
              {colTotals.map((total, i) => (
                <td
                  key={i}
                  className={`py-2.5 px-3 text-right text-[11px] font-semibold tabular-nums text-text-secondary ${
                    i === currentMonthIdx ? "bg-[#f0f4f8]" : ""
                  }`}
                >
                  {formatMoney(total)}
                </td>
              ))}
              <td className="py-2.5 pl-4 border-l border-border-secondary text-right text-[11px] font-bold text-text-primary tabular-nums">
                {formatMoney(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
