import React, { useMemo } from 'react';
import { FundData, parseNum, getSharpeColor, ChartPeriod } from '@/lib/fund-types';

interface ScatterPlotProps {
  data: FundData[];
  period: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  avgSharpe: number;
}

const PERIODS: ChartPeriod[] = ['1år', '3år', '5år', '10år'];

export default function ScatterPlot({ data, period, onPeriodChange, avgSharpe }: ScatterPlotProps) {
  const xKey = `Volatilitet_${period}`;
  const yKey = `Avkastning_snitt_${period}_%`;
  const sharpeKey = `Sharpe_${period}`;

  const plotData = useMemo(() =>
    data.map(f => ({
      name: f.Fondsnavn,
      x: parseNum(f[xKey]),
      y: parseNum(f[yKey]),
      sharpe: parseNum(f[sharpeKey])
    })).filter(d => !isNaN(d.x) && !isNaN(d.y)),
    [data, xKey, yKey, sharpeKey]
  );

  // Compute implied risk-free rate from centroid: Rf = avgY - avgSharpe * avgX
  const impliedRf = useMemo(() => {
    if (isNaN(avgSharpe) || !plotData.length) return NaN;
    const avgX = plotData.reduce((s, d) => s + d.x, 0) / plotData.length;
    const avgY = plotData.reduce((s, d) => s + d.y, 0) / plotData.length;
    return avgY - avgSharpe * avgX;
  }, [plotData, avgSharpe]);

  const width = 800;
  const height = 320;
  const pad = { top: 24, right: 32, bottom: 44, left: 56 };
  const iW = width - pad.left - pad.right;
  const iH = height - pad.top - pad.bottom;

  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (!plotData.length) return { minX: 0, maxX: 10, minY: -1, maxY: 10 };
    const rawMinY = Math.min(0, ...plotData.map(d => d.y));
    const rawMaxY = Math.max(...plotData.map(d => d.y));
    return {
      minX: 0,
      maxX: Math.max(...plotData.map(d => d.x)) * 1.15 || 10,
      // Extend to nearest whole percent beyond data
      minY: Math.floor(rawMinY * 1.1) - 0.5,
      maxY: Math.ceil(rawMaxY * 1.15) + 0.5,
    };
  }, [plotData]);

  const sx = (x: number) => pad.left + ((x - minX) / (maxX - minX)) * iW;
  const sy = (y: number) => height - pad.bottom - ((y - minY) / (maxY - minY)) * iH;

  const generateNiceTicks = (min: number, max: number, maxTicks: number) => {
    const range = max - min;
    const steps = [0.5, 1, 2, 5, 10, 20, 50];
    let step = steps.find(s => Math.ceil(range / s) <= maxTicks) ?? 100;

    const ticks: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + step * 0.01; v += step) {
      ticks.push(Math.round(v * 10) / 10);
    }
    if (!ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  };

  const yTicks = useMemo(() => generateNiceTicks(minY, maxY, 10), [minY, maxY]);

  const xTicks = useMemo(() => generateNiceTicks(minX, maxX, 10), [minX, maxX]);

  if (!plotData.length) {
    return (
      <div className="surface-elevated rounded-2xl p-8 flex items-center justify-center h-64 text-muted-foreground text-sm">
        Ikke nok data for å vise graf ({period}).
      </div>
    );
  }

  return (
    <section className="surface-elevated rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Historisk risikojustert avkastning
        </h2>
        <div className="flex bg-muted p-1 rounded-lg">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`period-button ${period === p ? 'period-button-active' : 'period-button-inactive'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-4">
          <span className="font-medium">Sharpe:</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(0.5) }} /> &lt; 1.0</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(1.5) }} /> 1.0–2.0</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(3) }} /> &ge; 2.0</span>
          <span className="ml-2 border-l border-border pl-2">Stiplet linje = snitt Sharpe</span>
        </div>

        <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Y grid */}
            {yTicks.map((t, i) => {
              const isZero = t === 0;
              return (
                <g key={`y-${i}`}>
                  <line
                    x1={pad.left} y1={sy(t)} x2={width - pad.right} y2={sy(t)}
                    stroke={isZero ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                    strokeWidth={isZero ? 1.5 : 1}
                    opacity={isZero ? 0.5 : 1}
                  />
                  <text x={pad.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle"
                    className={isZero ? "fill-foreground" : "fill-muted-foreground"}
                    style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: isZero ? 600 : 400 }}>
                    {t.toFixed(t % 1 === 0 ? 0 : 1)}%
                  </text>
                </g>
              );
            })}

            {/* X grid */}
            {xTicks.map((t, i) => (
              <g key={`x-${i}`}>
                <line x1={sx(t)} y1={pad.top} x2={sx(t)} y2={height - pad.bottom} stroke="hsl(var(--border))" strokeWidth="1" />
                <text x={sx(t)} y={height - pad.bottom + 16} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                  {t.toFixed(t % 1 === 0 ? 0 : 1)}%
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text x={width / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              Volatilitet (%)
            </text>
            <text x={12} y={height / 2} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }} transform={`rotate(-90, 12, ${height / 2})`}>
              Avkastning (%)
            </text>

            {/* Gjennomsnittlig Sharpe stiplet linje (forankret i tyngdepunktet og implisitt rente) */}
            {!isNaN(avgSharpe) && !isNaN(impliedRf) && (
              <line
                x1={sx(minX)} y1={sy(impliedRf + avgSharpe * minX)}
                x2={sx(maxX)} y2={sy(impliedRf + avgSharpe * maxX)}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.8"
              />
            )}

            {/* Data points */}
            {plotData.map((d, i) => (
              <g key={i}>
                <circle
                  cx={sx(d.x)} cy={sy(d.y)} r="5"
                  fill={getSharpeColor(d.sharpe)}
                  stroke="hsl(var(--card))"
                  strokeWidth="1.5"
                  opacity="0.9"
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <title>{d.name}&#10;Avkastning: {d.y.toFixed(1)}%&#10;Volatilitet: {d.x.toFixed(1)}&#10;Sharpe: {isNaN(d.sharpe) ? '-' : d.sharpe.toFixed(2)}</title>
                </circle>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
