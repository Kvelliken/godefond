import React, { useState, useMemo, useCallback } from 'react';
import { Upload, RefreshCcw, Loader2 } from 'lucide-react';
import { FundData, SortConfig, ChartPeriod, parseNum, MOCK_DATA, NUMERIC_SORT_KEYS } from '@/lib/fund-types';
import FundFilters from '@/components/FundFilters';
import ScatterPlot from '@/components/ScatterPlot';
import FundTable from '@/components/FundTable';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const [data, setData] = useState<FundData[]>(MOCK_DATA);
  const [fileName, setFileName] = useState("Testdata");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState(100000);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "Fondsnavn", direction: "asc" });
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("3år");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchLiveData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('fetch-vff-data');
      if (error) throw error;
      if (result?.funds) {
        setData(result.funds as FundData[]);
        setFileName(`VFF Live – ${result.metadata?.count ?? '?'} fond`);
        setLastUpdated(result.metadata?.updated ?? null);
        setTypeFilter(""); setGroupFilter(""); setCompanyFilter(""); setMinAmountFilter(100000);
      }
    } catch (err) {
      console.error('Feil ved henting av VFF-data:', err);
      alert('Kunne ikke hente data fra VFF. Prøv igjen senere.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasActiveFilter = typeFilter !== "" || groupFilter !== "" || companyFilter !== "" || minAmountFilter !== Infinity;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const uploaded = JSON.parse(e.target?.result as string);
        setData(uploaded);
        setFileName(file.name);
        setTypeFilter(""); setGroupFilter(""); setCompanyFilter(""); setMinAmountFilter(100000);
      } catch {
        alert("Ugyldig JSON-fil.");
      }
    };
    reader.readAsText(file);
  };

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
    let result = data.filter(item =>
      (typeFilter === "" || item.Fondstype === typeFilter) &&
      (groupFilter === "" || item.Fondsgruppe === groupFilter) &&
      (companyFilter === "" || item.Forvaltningsselskap === companyFilter)
    );

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
  }, [data, typeFilter, groupFilter, companyFilter, sortConfig]);

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
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const avgSharpe = parseNum(averages[`Sharpe_${chartPeriod}`]);

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
          <div className="flex items-center gap-3 flex-wrap">
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground font-data">
                Oppdatert: {new Date(lastUpdated).toLocaleString('nb-NO')}
              </span>
            )}
            <span className="text-[11px] font-medium text-muted-foreground font-data">{fileName}</span>
            <button
              onClick={fetchLiveData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-positive hover:bg-positive/90 text-positive-foreground text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
              Hent live data
            </button>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Last opp JSON
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </header>

        {/* Filters */}
        <FundFilters
          typeFilter={typeFilter} groupFilter={groupFilter} companyFilter={companyFilter}
          onTypeChange={setTypeFilter} onGroupChange={setGroupFilter} onCompanyChange={setCompanyFilter}
          onReset={() => { setTypeFilter(""); setGroupFilter(""); setCompanyFilter(""); }}
          availableTypes={availableTypes} availableGroups={availableGroups} availableCompanies={availableCompanies}
        />

        {/* Scatter Plot – visible when filters are active */}
        {hasActiveFilter && (
          <ScatterPlot
            data={filteredAndSorted}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            avgSharpe={avgSharpe}
          />
        )}

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
