import { useState } from "react";
import { useIncident } from "../../../context/IncidentContext";
import {
  weatheringTimelineByIncident,
  weatheringFileUrlByIncident,
} from "../../../data/weathering";
import { downloadFromUrl } from "../../../lib/csvExport";
import { WeatheringChart } from "./WeatheringChart";
import { Lightbox } from "./Lightbox";
import { Beaker, Archive, Download, ZoomIn } from "lucide-react";

// Oil mass balance over the 72h forward forecast — where the seeded mass
// goes over time, split into remaining / evaporated / dispersed /
// biodegraded. Synced to the same forward-track hour as the animation and
// hotspot status above it (both read forwardTrackStep from IncidentContext).
export const WeatheringPanel = () => {
  const { forwardTrackIncidentId, forwardTrackStep } = useIncident();
  const data = weatheringTimelineByIncident[forwardTrackIncidentId] || [];
  const fileUrl = weatheringFileUrlByIncident[forwardTrackIncidentId];
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-bold text-slate-400 tracking-wider px-1">
          WEATHERING DATA
        </span>
        <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-md bg-slate-50">
          <Beaker className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-[10px] text-slate-500 leading-relaxed">
            Weathering dataset (evaporation, dispersion, biodegradation) has
            not been provided for this incident yet.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9px] font-bold text-slate-400 tracking-wider px-1">
        WEATHERING DATA — OIL MASS BALANCE
      </span>
      <p className="text-[9px] text-slate-500 leading-relaxed px-1">
        Share of the seeded oil mass remaining vs. weathered away (evaporated,
        mechanically dispersed, or biodegraded) at each forecast hour. The
        dashed marker tracks the forecast scrubber above; hover the chart to
        inspect any hour. Click the chart to enlarge it.
      </p>

      <button
        onClick={() => setIsLightboxOpen(true)}
        className="relative p-3 bg-white border border-slate-200 rounded-md shadow-sm group text-left"
      >
        <WeatheringChart data={data} currentHour={forwardTrackStep} />
        <span className="absolute top-2 right-2 p-1 rounded bg-slate-900/0 group-hover:bg-slate-900/70 transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-transparent group-hover:text-white transition-colors" />
        </span>
      </button>

      {fileUrl && (
        <button
          onClick={() =>
            downloadFromUrl(
              fileUrl,
              `${forwardTrackIncidentId}_weathering_timeline.csv`,
            )
          }
          className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-left group"
        >
          <Archive className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-[10px] text-slate-600 leading-relaxed flex-1">
            Weathering timeline (CSV, {data.length} hourly rows)
          </span>
          <Download className="w-3.5 h-3.5 text-amber-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      <Lightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        caption={`Oil mass balance — ${forwardTrackIncidentId}`}
      >
        <div className="bg-white rounded-lg p-6 shadow-2xl w-[min(92vw,48rem)]">
          <WeatheringChart data={data} currentHour={forwardTrackStep} />
        </div>
      </Lightbox>
    </div>
  );
};
