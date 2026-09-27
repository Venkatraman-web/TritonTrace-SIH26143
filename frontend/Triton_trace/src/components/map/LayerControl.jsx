import { useState } from "react";
import { Layers, Eye, EyeOff, ChevronDown } from "lucide-react";

export const LayerControl = ({ layers, toggleLayer }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-64 bg-navy-950/85 backdrop-blur-md border border-navy-800 rounded-lg shadow-xl shadow-navy-950/50 flex flex-col overflow-hidden shrink-0 font-sans">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-2 px-4 py-3 border-b border-navy-800 bg-navy-900/60"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          <h3 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
            Telemetry Layers
          </h3>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      {isExpanded && (
        <div className="flex flex-col p-2 space-y-1">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={`flex items-center justify-between px-3 py-2 rounded transition-colors ${
                layer.active
                  ? "bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20"
                  : "hover:bg-navy-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${layer.active ? layer.color : "bg-navy-700"}`}
                />
                <span
                  className={`text-xs font-semibold ${layer.active ? "text-white" : "text-slate-500"}`}
                >
                  {layer.label}
                </span>
              </div>
              {layer.active ? (
                <Eye className="w-3.5 h-3.5 text-brand-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
