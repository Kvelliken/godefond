import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FundData, SortConfig, ChartPeriod, parseNum, MOCK_DATA, NUMERIC_SORT_KEYS } from '@/lib/fund-types';
import FundFilters from '@/components/FundFilters';
import ScatterPlot from '@/components/ScatterPlot';
import FundTable from '@/components/FundTable';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const [data, setData] = useState<FundData[]>(MOCK_DATA);
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState(100000);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "Fondsnavn", direction: "asc" });
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("3år");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fundCount, setFundCount] = useState<number | null>(null);

  // Load cached data from database on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const { data: cache, error } = await supabase
          .from('fund_cache')
          .select('data, fund_count, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && cache?.data) {
          setData(cache.data as unknown as FundData[]);
          setLastUpdated(cache.updated_at);
          setFundCount(cache.fund_count);
        }
      } catch (err) {
        console.error('Feil ved lasting av data:', err);
      }
    };
    loadCachedData();
  }, []);

  const getOptions = (field: string) => {
    const filtered = data.filter(item => {
      let keep = true;
      if (field !== 'Fondstype' && typeFilter) keep = keep && item.Fondstype === typeFilter;
      if (field !== 'Fondsgruppe' && groupFilter) keep = keep && item.Fondsgruppe === groupFilter;
      if (field !== 'Forvaltningsselskap' && companyFilter) keep = keep && item.Forvaltningsselskap === companyFilter;
      return keep;
    });
    return [...new Set(filtered.map(i => i[field]))].filter(v => v && v !== '-').sort();
  };

  const availableTypes = useMemo(() => getOptions('Fondstype'), [data, typeFilter, groupFilter, companyFilter]);
  const availableGroups = useMemo(() => getOptions('Fondsgruppe'), [data, typeFilter, groupFilter, companyFilter]);
  const availableCompanies = useMemo(() => getOptions('Forvaltningsselskap'), [data, typeFilter, groupFilter, companyFilter]);

  const filteredAndSorted = useMemo(() => {
    let result = data.filter(item => {
      if (typeFilter !== "" && item.Fondstype !== typeFilter) return false;
      if (groupFilter !== "" && item.Fondsgruppe !== groupFilter) return false;
      if (companyFilter !== "" && item.Forvaltningsselskap !== companyFilter) return false;
      // Min tegningsbeløp filter
      if (minAmountFilter !== Infinity) {
        const amt = parseNum(item["Min_tegningsbeløp"]);
        const amount = isNaN(amt) ? 0 : amt;
        if (amount >= minAmountFilter) return false;
      }
      return true;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const va = a[sortConfig.key], vb = b[sortConfig.key];
        const ma = !va || va === '-', mb = !vb || vb === '-';
        if (ma && mb) return 0;
        if (ma) return 1;
        if (mb) return -1;
        const na = parseNum(va), nb = parseNum(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortConfig.direction === 'asc' ? na - nb : nb - na;
        return sortConfig.direction === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [data, typeFilter, groupFilter, companyFilter, minAmountFilter, sortConfig]);

  const averages = useMemo(() => {
    const cols = [
      'Avkastning_YTD_%', 'Avkastning_snitt_1år_%', 'Avkastning_snitt_3år_%', 'Avkastning_snitt_5år_%', 'Avkastning_snitt_10år_%',
      'Sharpe_1år', 'Sharpe_3år', 'Sharpe_5år', 'Sharpe_10år'
    ];
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    cols.forEach(c => { sums[c] = 0; counts[c] = 0; });

    filteredAndSorted.forEach(row => {
      cols.forEach(c => {
        const val = parseNum(row[c]);
        if (!isNaN(val)) { sums[c] += val; counts[c]++; }
      });
    });

    const avgs: Record<string, string> = {};
    cols.forEach(c => { avgs[c] = counts[c] > 0 ? (sums[c] / counts[c]).toFixed(2) : '-'; });
    return avgs;
  }, [filteredAndSorted]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // First click: desc for numeric columns, asc for text
      const defaultDir = NUMERIC_SORT_KEYS.includes(key) ? 'desc' : 'asc';
      return { key, direction: defaultDir };
    });
  };

  const avgSharpe = useMemo(() => {
    const key = `Sharpe_${chartPeriod}`;
    let sum = 0, count = 0;
    filteredAndSorted.forEach(row => {
      const val = parseNum(row[key]);
      if (!isNaN(val)) { sum += val; count++; }
    });
    return count > 0 ? sum / count : NaN;
  }, [filteredAndSorted, chartPeriod]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Header */}
        <header className="surface-elevated rounded-2xl px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
              Financial Intelligence Matrix
            </h1>
            <p className="text-[12px] text-muted-foreground mt-1">
              Avkastning, risiko og Sharpe-ratio for norske fond
            </p>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-positive" />
              <span className="text-[11px] text-muted-foreground font-data">
                Sist oppdatert: {new Date(lastUpdated).toLocaleString('nb-NO')}
                {fundCount !== null && ` · ${fundCount} fond`}
              </span>
            </div>
          )}
        </header>

        {/* Filters */}
        <FundFilters
          typeFilter={typeFilter} groupFilter={groupFilter} companyFilter={companyFilter}
          minAmountFilter={minAmountFilter}
          onTypeChange={setTypeFilter} onGroupChange={setGroupFilter} onCompanyChange={setCompanyFilter}
          onMinAmountChange={setMinAmountFilter}
          onReset={() => { setTypeFilter(""); setGroupFilter(""); setCompanyFilter(""); setMinAmountFilter(100000); }}
          availableTypes={availableTypes} availableGroups={availableGroups} availableCompanies={availableCompanies}
        />

        {/* Scatter Plot */}
        <ScatterPlot
          data={filteredAndSorted}
          period={chartPeriod}
          onPeriodChange={setChartPeriod}
          avgSharpe={avgSharpe}
        />

        {/* Data Grid */}
        <FundTable
          data={filteredAndSorted}
          total={data.length}
          sortConfig={sortConfig}
          onSort={handleSort}
          averages={averages}
        />
      </div>
    </div>
  );
}
