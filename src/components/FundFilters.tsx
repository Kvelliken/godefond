import React from 'react';
import { RefreshCcw } from 'lucide-react';

interface FundFiltersProps {
  typeFilter: string;
  groupFilter: string;
  companyFilter: string;
  onTypeChange: (v: string) => void;
  onGroupChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onReset: () => void;
  availableTypes: string[];
  availableGroups: string[];
  availableCompanies: string[];
}

export default function FundFilters({
  typeFilter, groupFilter, companyFilter,
  onTypeChange, onGroupChange, onCompanyChange, onReset,
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </section>
  );
}
