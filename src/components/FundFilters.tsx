import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { MIN_AMOUNT_OPTIONS } from '@/lib/fund-types';

interface FundFiltersProps {
  typeFilter: string;
  groupFilter: string;
  companyFilter: string;
  minAmountFilter: number;
  onTypeChange: (v: string) => void;
  onGroupChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onMinAmountChange: (v: number) => void;
  onReset: () => void;
  availableTypes: string[];
  availableGroups: string[];
  availableCompanies: string[];
}

export default function FundFilters({
  typeFilter, groupFilter, companyFilter, minAmountFilter,
  onTypeChange, onGroupChange, onCompanyChange, onMinAmountChange, onReset,
  availableTypes, availableGroups, availableCompanies,
}: FundFiltersProps) {
  return (
    <section className="surface-elevated rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold">Filtrer</h2>
        <button
          onClick={onReset}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <RefreshCcw className="w-3 h-3" /> Nullstill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fondstype</label>
          <select value={typeFilter} onChange={(e) => onTypeChange(e.target.value)} className="filter-select">
            <option value="">Alle typer</option>
            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fondsgruppe</label>
          <select value={groupFilter} onChange={(e) => onGroupChange(e.target.value)} className="filter-select">
            <option value="">Alle grupper</option>
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Forvaltningsselskap</label>
          <select value={companyFilter} onChange={(e) => onCompanyChange(e.target.value)} className="filter-select">
            <option value="">Alle selskaper</option>
            {availableCompanies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Min. tegningsbeløp</label>
          <select
            value={minAmountFilter}
            onChange={(e) => onMinAmountChange(Number(e.target.value))}
            className="filter-select"
          >
            {MIN_AMOUNT_OPTIONS.map(opt => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
