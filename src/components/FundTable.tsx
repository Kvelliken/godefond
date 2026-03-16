import React from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { FundData, SortConfig, parseNum, formatReturn, getSharpeColor } from '@/lib/fund-types';

interface FundTableProps {
  data: FundData[];
  total: number;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  averages: Record<string, string>;
}

const RETURN_KEYS = [
  'Avkastning_YTD_%',
  'Avkastning_snitt_1år_%',
  'Avkastning_snitt_3år_%',
  'Avkastning_snitt_5år_%',
  'Avkastning_snitt_10år_%',
];

const SHARPE_KEYS = ['Sharpe_1år', 'Sharpe_3år', 'Sharpe_5år', 'Sharpe_10år'];

function Th({ label, sortKey, align = 'left', sortConfig, onSort }: {
  label: string; sortKey: string; align?: 'left' | 'right';
  sortConfig: SortConfig; onSort: (k: string) => void;
}) {
  const active = sortConfig.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`matrix-cell matrix-header cursor-pointer hover:bg-muted/50 transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {active ? (
          sortConfig.direction === 'asc'
            ? <ChevronUp className="w-3 h-3 text-primary" />
            : <ChevronDown className="w-3 h-3 text-primary" />
        ) : <div className="w-3 h-3" />}
      </div>
    </th>
  );
}

export default function FundTable({ data, total, sortConfig, onSort, averages }: FundTableProps) {
  return (
    <section className="surface-elevated rounded-2xl overflow-hidden">
      <div className="px-6 py-3 border-b border-border">
        <span className="text-[12px] font-medium text-muted-foreground">
          Viser {data.length} av {total} fond
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-data text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th colSpan={4} className="matrix-cell bg-muted/30 border-r border-border" />
              <th colSpan={5} className="matrix-cell bg-primary/5 text-center text-[11px] font-bold uppercase tracking-wider text-primary border-r border-border">
                Avkastning (%)
              </th>
              <th colSpan={4} className="matrix-cell bg-positive/5 text-center text-[11px] font-bold uppercase tracking-wider text-positive">
                Sharpe Ratio
              </th>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <Th label="Fondsnavn" sortKey="Fondsnavn" sortConfig={sortConfig} onSort={onSort} />
              <Th label="Type" sortKey="Fondstype" sortConfig={sortConfig} onSort={onSort} />
              <Th label="Gruppe" sortKey="Fondsgruppe" sortConfig={sortConfig} onSort={onSort} />
              <Th label="Selskap" sortKey="Forvaltningsselskap" sortConfig={sortConfig} onSort={onSort} />
              <Th label="YTD" sortKey="Avkastning_YTD_%" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="1 år" sortKey="Avkastning_snitt_1år_%" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="3 år" sortKey="Avkastning_snitt_3år_%" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="5 år" sortKey="Avkastning_snitt_5år_%" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="10 år" sortKey="Avkastning_snitt_10år_%" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="1 år" sortKey="Sharpe_1år" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="3 år" sortKey="Sharpe_3år" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="5 år" sortKey="Sharpe_5år" align="right" sortConfig={sortConfig} onSort={onSort} />
              <Th label="10 år" sortKey="Sharpe_10år" align="right" sortConfig={sortConfig} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {data.map((fond, i) => (
              <motion.tr
                key={fond.Fondsnavn + i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.008, duration: 0.2 }}
                className="border-b border-border/50 hover:bg-primary/[0.03] transition-colors"
              >
                <td className="matrix-cell font-medium text-foreground" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {fond.Fondsnavn}
                </td>
                <td className="matrix-cell text-muted-foreground" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{fond.Fondstype}</td>
                <td className="matrix-cell text-muted-foreground" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{fond.Fondsgruppe}</td>
                <td className="matrix-cell text-muted-foreground border-r border-border/30" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{fond.Forvaltningsselskap}</td>

                {RETURN_KEYS.map(key => {
                  const val = parseNum(fond[key]);
                  const isNeg = !isNaN(val) && val < 0;
                  return (
                    <td key={key} className={`matrix-cell text-right font-medium ${isNeg ? 'text-destructive' : 'text-foreground'}`}>
                      {formatReturn(fond[key])}
                    </td>
                  );
                })}

                {SHARPE_KEYS.map((key, si) => {
                  const val = parseNum(fond[key]);
                  return (
                    <td
                      key={key}
                      className={`matrix-cell text-right font-semibold ${si === 0 ? 'border-l border-border/30' : ''}`}
                      style={{ color: getSharpeColor(val) }}
                    >
                      {isNaN(val) ? '-' : val.toFixed(2)}
                    </td>
                  );
                })}
              </motion.tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td colSpan={13} className="matrix-cell text-center py-12 text-muted-foreground">
                  Ingen fond matcher valgte filtre.
                </td>
              </tr>
            )}
          </tbody>

          {data.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t-2 border-border font-semibold">
                <td colSpan={4} className="matrix-cell text-right text-muted-foreground border-r border-border" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Gjennomsnitt
                </td>
                {RETURN_KEYS.map(key => {
                  const v = averages[key];
                  const neg = v !== '-' && parseFloat(v) < 0;
                  return (
                    <td key={`avg-${key}`} className={`matrix-cell text-right ${neg ? 'text-destructive' : 'text-primary'}`}>
                      {v}
                    </td>
                  );
                })}
                {SHARPE_KEYS.map((key, i) => (
                  <td key={`avg-${key}`} className={`matrix-cell text-right text-positive ${i === 0 ? 'border-l border-border' : ''}`}>
                    {averages[key]}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
