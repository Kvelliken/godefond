import React, { useMemo, useState, useRef, useCallback } from 'react';
import { FundData, parseNum, getSharpeColor, ChartPeriod } from '@/lib/fund-types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ScatterPlotProps {
  data: FundData[];
  period: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  avgSharpe: number;
}

const PERIODS: ChartPeriod[] = ['1år', '3år', '5år', '10år'];

interface ViewBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export default function ScatterPlot({ data, period, onPeriodChange, avgSharpe }: ScatterPlotProps) {
  const xKey = `Volatilitet_${period}`;
  const yKey = `Avkastning_snitt_${period}_%`;
  const sharpeKey = `Sharpe_${period}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [zoomView, setZoomView] = useState<ViewBox | null>(null);

  const plotData = useMemo(() =>
    data.map(f => ({
      name: f.Fondsnavn,
      x: parseNum(f[xKey]),
      y: parseNum(f[yKey]),
      sharpe: parseNum(f[sharpeKey])
    })).filter(d => !isNaN(d.x) && !isNaN(d.y)),
    [data, xKey, yKey, sharpeKey]
  );

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

  const fullBounds = useMemo(() => {
    if (!plotData.length) return { minX: 0, maxX: 10, minY: -1, maxY: 10 };
    const rawMinY = Math.min(0, ...plotData.map(d => d.y));
    const rawMaxY = Math.max(...plotData.map(d => d.y));
    return {
      minX: 0,
      maxX: Math.max(...plotData.map(d => d.x)) * 1.15 || 10,
      minY: Math.floor(rawMinY * 1.1) - 0.5,
      maxY: Math.ceil(rawMaxY * 1.15) + 0.5,
    };
  }, [plotData]);

  const { minX, maxX, minY, maxY } = zoomView ?? fullBounds;
  const isZoomed = zoomView !== null;

  const sx = (x: number) => pad.left + ((x - minX) / (maxX - minX)) * iW;
  const sy = (y: number) => height - pad.bottom - ((y - minY) / (maxY - minY)) * iH;

  // Inverse: SVG pixel -> data coordinate
  const invX = (px: number) => minX + ((px - pad.left) / iW) * (maxX - minX);
  const invY = (py: number) => minY + ((height - pad.bottom - py) / iH) * (maxY - minY);

  const generateNiceTicks = (min: number, max: number, maxTicks: number) => {
    const range = max - min;
    const steps = [0.5, 1, 2, 5, 10, 20, 50];
    let step = steps.find(s => Math.ceil(range / s) <= maxTicks) ?? 100;

    const ticks: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + step * 0.01; v += step) {
      ticks.push(Math.round(v * 10) / 10);
    }
    if (!ticks.includes(0) && min <= 0 && max >= 0) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  };

  const yTicks = useMemo(() => generateNiceTicks(minY, maxY, 10), [minY, maxY]);
  const xTicks = useMemo(() => generateNiceTicks(minX, maxX, 10), [minX, maxX]);

  // Convert mouse event to SVG coordinates
  const toSvgCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [width, height]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pt = toSvgCoords(e);
    if (pt.x < pad.left || pt.x > width - pad.right || pt.y < pad.top || pt.y > height - pad.bottom) return;
    setIsDragging(true);
    setDragStart(pt);
    setSelectionRect({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
  }, [toSvgCoords, pad, width, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const pt = toSvgCoords(e);
    const clampedX = Math.max(pad.left, Math.min(width - pad.right, pt.x));
    const clampedY = Math.max(pad.top, Math.min(height - pad.bottom, pt.y));
    setSelectionRect(prev => prev ? { ...prev, x2: clampedX, y2: clampedY } : null);
  }, [isDragging, dragStart, toSvgCoords, pad, width, height]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !selectionRect) {
      setIsDragging(false);
      setSelectionRect(null);
      return;
    }

    const { x1, y1, x2, y2 } = selectionRect;
    const pixelWidth = Math.abs(x2 - x1);
    const pixelHeight = Math.abs(y2 - y1);

    // Minimum drag distance to count as zoom (avoid accidental clicks)
    if (pixelWidth > 10 && pixelHeight > 10) {
      const dataX1 = invX(Math.min(x1, x2));
      const dataX2 = invX(Math.max(x1, x2));
      const dataY1 = invY(Math.max(y1, y2)); // inverted Y
      const dataY2 = invY(Math.min(y1, y2));

      setZoomView({
        xMin: dataX1,
        xMax: dataX2,
        yMin: dataY1,
        yMax: dataY2,
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setSelectionRect(null);
  }, [isDragging, selectionRect, invX, invY]);

  const handleZoomIn = useCallback(() => {
    const cur = zoomView ?? fullBounds;
    const cx = (cur.xMin + cur.xMax) / 2;
    const cy = (cur.yMin + cur.yMax) / 2;
    const hw = (cur.xMax - cur.xMin) / 4;
    const hh = (cur.yMax - cur.yMin) / 4;
    setZoomView({ xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh });
  }, [zoomView, fullBounds]);

  const handleZoomOut = useCallback(() => {
    if (!zoomView) return;
    const cx = (zoomView.xMin + zoomView.xMax) / 2;
    const cy = (zoomView.yMin + zoomView.yMax) / 2;
    const hw = (zoomView.xMax - zoomView.xMin);
    const hh = (zoomView.yMax - zoomView.yMin);
    const newView = { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh };
    // If zoomed out past full bounds, reset
    if (newView.xMin <= fullBounds.minX && newView.xMax >= fullBounds.maxX &&
        newView.yMin <= fullBounds.minY && newView.yMax >= fullBounds.maxY) {
      setZoomView(null);
    } else {
      setZoomView(newView);
    }
  }, [zoomView, fullBounds]);

  const handleReset = useCallback(() => setZoomView(null), []);

  // Scroll wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const pt = toSvgCoords(e);
    if (pt.x < pad.left || pt.x > width - pad.right || pt.y < pad.top || pt.y > height - pad.bottom) return;

    const cur = zoomView ?? fullBounds;
    const factor = e.deltaY > 0 ? 1.3 : 0.7;
    const dataX = invX(pt.x);
    const dataY = invY(pt.y);

    const newXMin = dataX - (dataX - cur.xMin) * factor;
    const newXMax = dataX + (cur.xMax - dataX) * factor;
    const newYMin = dataY - (dataY - cur.yMin) * factor;
    const newYMax = dataY + (cur.yMax - dataY) * factor;

    // If zoomed out past full, reset
    if (newXMin <= fullBounds.minX && newXMax >= fullBounds.maxX &&
        newYMin <= fullBounds.minY && newYMax >= fullBounds.maxY) {
      setZoomView(null);
    } else {
      setZoomView({ xMin: newXMin, xMax: newXMax, yMin: newYMin, yMax: newYMax });
    }
  }, [toSvgCoords, zoomView, fullBounds, invX, invY, pad, width, height]);

  if (!plotData.length) {
    return (
      <div className="surface-elevated rounded-2xl p-8 flex items-center justify-center h-64 text-muted-foreground text-sm">
        Ikke nok data for å vise graf ({period}).
      </div>
    );
  }

  // Selection rect in SVG coords
  const selRect = selectionRect ? {
    x: Math.min(selectionRect.x1, selectionRect.x2),
    y: Math.min(selectionRect.y1, selectionRect.y2),
    w: Math.abs(selectionRect.x2 - selectionRect.x1),
    h: Math.abs(selectionRect.y2 - selectionRect.y1),
  } : null;

  return (
    <section className="surface-elevated rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Historisk risikojustert avkastning
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1 ml-4 max-w-[600px]">
            Sharpe måler hvor mye avkastning du sitter igjen med per enhet risiko, der 1 regnes som et solid resultat, 2 er svært bra, og 3 er i absolutt verdensklasse
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Zoom inn"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={!isZoomed}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom ut"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleReset}
              disabled={!isZoomed}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Tilbakestill zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
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
      </div>

      <div className="p-6">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-4">
          <span className="font-medium">Sharpe:</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(-0.5) }} /> &lt; 0</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(0.5) }} /> 0–1.0</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(1.5) }} /> 1.0–2.0</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getSharpeColor(3) }} /> &ge; 2.0</span>
          <span className="ml-2 border-l border-border pl-2">Stiplet linje = snitt Sharpe</span>
          {isZoomed && (
            <span className="ml-2 border-l border-border pl-2 text-primary font-medium">
              Zoomet inn · dra for å velge nytt område · scroll for å zoome
            </span>
          )}
          {!isZoomed && (
            <span className="ml-2 border-l border-border pl-2">
              Dra for å zoome inn · scroll for å zoome
            </span>
          )}
        </div>

        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: `${width}/${height}`, cursor: isDragging ? 'crosshair' : 'crosshair' }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Clip path for plot area */}
            <defs>
              <clipPath id="plot-area">
                <rect x={pad.left} y={pad.top} width={iW} height={iH} />
              </clipPath>
            </defs>

            {/* Y grid */}
            {yTicks.map((t, i) => {
              const isZeroLine = t === 0;
              const yPos = sy(t);
              if (yPos < pad.top || yPos > height - pad.bottom) return null;
              return (
                <g key={`y-${i}`}>
                  <line
                    x1={pad.left} y1={yPos} x2={width - pad.right} y2={yPos}
                    stroke={isZeroLine ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                    strokeWidth={isZeroLine ? 1.5 : 1}
                    opacity={isZeroLine ? 0.5 : 1}
                  />
                  <text x={pad.left - 8} y={yPos} textAnchor="end" dominantBaseline="middle"
                    className={isZeroLine ? "fill-foreground" : "fill-muted-foreground"}
                    style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: isZeroLine ? 600 : 400 }}>
                    {t.toFixed(t % 1 === 0 ? 0 : 1)}%
                  </text>
                </g>
              );
            })}

            {/* X grid */}
            {xTicks.map((t, i) => {
              const xPos = sx(t);
              if (xPos < pad.left || xPos > width - pad.right) return null;
              return (
                <g key={`x-${i}`}>
                  <line x1={xPos} y1={pad.top} x2={xPos} y2={height - pad.bottom} stroke="hsl(var(--border))" strokeWidth="1" />
                  <text x={xPos} y={height - pad.bottom + 16} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                    {t.toFixed(t % 1 === 0 ? 0 : 1)}%
                  </text>
                </g>
              );
            })}

            {/* Axis labels */}
            <text x={width / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              Årlig gjennomsnittlig risiko/volatilitet (%)
            </text>
            <text x={12} y={height / 2} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }} transform={`rotate(-90, 12, ${height / 2})`}>
              Årlig gjennomsnittlig avkastning (%)
            </text>

            {/* Clipped content (Sharpe line + data points) */}
            <g clipPath="url(#plot-area)">
              {/* Gjennomsnittlig Sharpe stiplet linje */}
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
              {plotData.map((d, i) => {
                const cx = sx(d.x);
                const cy = sy(d.y);
                return (
                  <g key={i}>
                    <circle
                      cx={cx} cy={cy} r="5"
                      fill={getSharpeColor(d.sharpe)}
                      stroke="hsl(var(--card))"
                      strokeWidth="1.5"
                      opacity="0.9"
                      className="hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <title>{`${d.name}\nAvkastning: ${d.y.toFixed(1)}%\nVolatilitet: ${d.x.toFixed(1)}%\nSharpe: ${isNaN(d.sharpe) ? '-' : d.sharpe.toFixed(2)}`}</title>
                    </circle>
                  </g>
                );
              })}
            </g>

            {/* Selection rectangle */}
            {selRect && selRect.w > 2 && selRect.h > 2 && (
              <rect
                x={selRect.x} y={selRect.y} width={selRect.w} height={selRect.h}
                fill="hsl(var(--primary))"
                fillOpacity="0.1"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                rx="2"
              />
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}
