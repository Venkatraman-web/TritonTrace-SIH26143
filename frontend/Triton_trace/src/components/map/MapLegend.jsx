import { useState } from "react";
import { ShieldAlert, ChevronDown } from "lucide-react";

const LEGEND_ITEMS = [
  {
    id: "sar_slick",
    label: "Detected Oil Spill (SAR)",
    swatch: (
      <div className="w-4 h-4 bg-blue-500/20 border border-blue-400 rounded-sm" />
    ),
  },
  {
    id: "hindcast_trajectory",
    label: "Hindcast Trajectory",
    swatch: (
      <div className="flex gap-0.5">
        <div className="w-1.5 h-1.5 bg-rose-300 rounded-full" />
        <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
      </div>
    ),
  },
  {
    id: "ais_route",
    label: "AIS Vessel Route",
    swatch: <div className="w-4 border-t-2 border-dashed border-amber-500" />,
  },
  {
    id: "correlation_point",
    label: "Correlation Point",
    swatch: (
      <div className="w-3 h-3 rounded-full border-[2px] border-rose-600 flex items-center justify-center">
        <div className="w-1 h-1 bg-rose-600 rounded-full" />
      </div>
    ),
  },
  {
    id: "watch_zone",
    label: "Watch Zone (100km)",
    swatch: (
      <div className="w-4 h-4 border-2 border-dashed border-amber-400 bg-amber-500/15" />
    ),
  },
  {
    id: "critical_zone",
    label: "Critical Strike Zone (40km)",
    swatch: <div className="w-4 h-4 border-2 border-rose-400 bg-rose-500/15" />,
  },
];

export const MapLegend = ({ excludeIds = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = LEGEND_ITEMS.filter((item) => !excludeIds.includes(item.id));

  return (
    <div className="w-64 bg-navy-950/85 backdrop-blur-md border border-navy-800 rounded-lg shadow-xl shadow-navy-950/50 flex flex-col overflow-hidden shrink-0 font-sans">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-2 px-4 py-3 border-b border-navy-800 bg-navy-900/60"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-brand-400" />
          <h3 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
            Visual Legend
          </h3>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.swatch}
              <span className="text-xs font-semibold text-slate-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
