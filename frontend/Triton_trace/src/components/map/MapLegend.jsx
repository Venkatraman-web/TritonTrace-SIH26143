import { useState } from "react";
import { ShieldAlert, ChevronDown } from "lucide-react";

const LEGEND_ITEMS = [
  {
    id: "sar_slick",
    label: "Detected Oil Spill (SAR)",
    swatch: (
      <div className="w-4 h-4 bg-blue-50 border border-blue-500 rounded-sm" />
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
    label: "Watch Zone (50km)",
    swatch: (
      <div className="w-4 h-4 border-2 border-dashed border-amber-500 bg-amber-50" />
    ),
  },
  {
    id: "critical_zone",
    label: "Critical Strike Zone (15km)",
    swatch: <div className="w-4 h-4 border-2 border-rose-500 bg-rose-50" />,
  },
];

export const MapLegend = ({ excludeIds = [] }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const items = LEGEND_ITEMS.filter((item) => !excludeIds.includes(item.id));

  return (
    <div className="w-64 bg-white border border-slate-200 rounded-md shadow-md flex flex-col overflow-hidden shrink-0 font-sans">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-brand-600" />
          <h3 className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
            Visual Legend
          </h3>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.swatch}
              <span className="text-xs font-semibold text-slate-700">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
