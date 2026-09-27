import { useMemo, useRef, useState } from "react";

// Fixed hue order from the validated categorical palette (blue, orange, aqua,
// yellow — slots 1–4). Order is meaningful: Oil Remaining first as the
// baseline state, then the three loss pathways in the order OpenOil computes
// them. Never reordered or reused for a different series.
const SERIES = [
  { key: "oilRemainingPct", label: "Oil Remaining", light: "#2a78d6", dark: "#3987e5" },
  { key: "evaporatedPct", label: "Evaporated", light: "#eb6834", dark: "#d95926" },
  { key: "dispersedPct", label: "Dispersed", light: "#1baf7a", dark: "#199e70" },
  { key: "biodegradedPct", label: "Biodegraded", light: "#eda100", dark: "#c98500" },
];

const WIDTH = 300;
const HEIGHT = 160;
const PAD = { top: 8, right: 8, bottom: 20, left: 30 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

const clampHour = (hour, maxHour) => Math.min(Math.max(hour, 0), maxHour);
const xForHour = (hour, maxHour) => PAD.left + (hour / maxHour) * PLOT_W;
const yForPct = (pct) => PAD.top + PLOT_H - (Math.min(Math.max(pct, 0), 100) / 100) * PLOT_H;

// Stacked-band cumulative tops, bottom to top in SERIES order.
const buildBands = (data) => {
  return SERIES.map((series, seriesIndex) => {
    const points = data.map((row) => {
      const cumBefore = SERIES.slice(0, seriesIndex).reduce(
        (sum, s) => sum + (row[s.key] ?? 0),
        0,
      );
      const cumAfter = cumBefore + (row[series.key] ?? 0);
      return { hour: row.hour, bottom: cumBefore, top: cumAfter };
    });
    return { series, points };
  });
};

const pathForBand = (points, maxHour) => {
  const top = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xForHour(p.hour, maxHour)} ${yForPct(p.top)}`)
    .join(" ");
  const bottom = [...points]
    .reverse()
    .map((p) => `L ${xForHour(p.hour, maxHour)} ${yForPct(p.bottom)}`)
    .join(" ");
  return `${top} ${bottom} Z`;
};

const lineForEdge = (points, edge, maxHour) =>
  points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xForHour(p.hour, maxHour)} ${yForPct(p[edge])}`,
    )
    .join(" ");

export const WeatheringChart = ({ data, currentHour }) => {
  const [hoverHour, setHoverHour] = useState(null);
  const svgRef = useRef(null);

  const maxHour = data.length > 0 ? data[data.length - 1].hour : 72;
  const bands = useMemo(() => buildBands(data), [data]);

  const displayHour =
    hoverHour ?? (currentHour != null ? clampHour(currentHour, maxHour) : maxHour);
  const displayRow =
    data.find((row) => row.hour === Math.round(displayHour)) ?? data[data.length - 1];

  const handleMouseMove = (e) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    const hour = ((svgX - PAD.left) / PLOT_W) * maxHour;
    setHoverHour(clampHour(Math.round(hour), maxHour));
  };

  if (data.length === 0) {
    return (
      <div className="p-3 border border-dashed border-slate-300 rounded-md bg-slate-50 text-center">
        <span className="text-[10px] text-slate-500">
          No weathering data for this incident.
        </span>
      </div>
    );
  }

  const gridPct = [0, 25, 50, 75, 100];
  const gridHours = [0, 24, 48, 72].filter((h) => h <= maxHour);

  return (
    <div className="flex flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto touch-none select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverHour(null)}
        role="img"
        aria-label="Oil mass balance over the 72-hour forward forecast: percentage remaining, evaporated, dispersed, and biodegraded by hour."
      >
        {/* Recessive gridlines */}
        {gridPct.map((pct) => (
          <line
            key={pct}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={yForPct(pct)}
            y2={yForPct(pct)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {gridPct.map((pct) => (
          <text
            key={`label-${pct}`}
            x={PAD.left - 4}
            y={yForPct(pct) + 3}
            textAnchor="end"
            className="fill-slate-400"
            fontSize={7}
            fontFamily="monospace"
          >
            {pct}
          </text>
        ))}
        {gridHours.map((h) => (
          <text
            key={`hour-${h}`}
            x={xForHour(h, maxHour)}
            y={HEIGHT - 4}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize={7}
            fontFamily="monospace"
          >
            +{h}h
          </text>
        ))}

        {/* Stacked bands, bottom to top */}
        {bands.map(({ series, points }) => (
          <path
            key={series.key}
            d={pathForBand(points, maxHour)}
            fill={series.light}
            fillOpacity={0.82}
          />
        ))}
        {/* 2px surface-color separators between bands (skip the outer edges) */}
        {bands.slice(0, -1).map(({ series, points }) => (
          <path
            key={`sep-${series.key}`}
            d={lineForEdge(points, "top", maxHour)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        ))}

        {/* Current forward-track hour marker */}
        {currentHour != null && (
          <line
            x1={xForHour(clampHour(currentHour, maxHour), maxHour)}
            x2={xForHour(clampHour(currentHour, maxHour), maxHour)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="#0f172a"
            strokeWidth={1.5}
            strokeDasharray="3,2"
          />
        )}

        {/* Hover crosshair */}
        {hoverHour != null && (
          <line
            x1={xForHour(hoverHour, maxHour)}
            x2={xForHour(hoverHour, maxHour)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="#0f172a"
            strokeWidth={1}
            strokeOpacity={0.4}
          />
        )}
      </svg>

      {/* Legend with direct, always-visible values — required relief since
          two of the four fills sit below 3:1 contrast on a light surface. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-1">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: series.light }}
            />
            <span className="text-[9px] text-slate-600 flex-1 truncate">
              {series.label}
            </span>
            <span className="text-[9px] font-mono font-bold text-slate-800">
              {(displayRow?.[series.key] ?? 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <span className="text-[9px] text-slate-400 px-1 font-mono">
        {hoverHour != null ? `T+${displayHour}h (hover)` : `T+${Math.round(displayHour)}h`}
        {currentHour != null && hoverHour == null ? " · synced to forecast scrubber" : ""}
      </span>
    </div>
  );
};
