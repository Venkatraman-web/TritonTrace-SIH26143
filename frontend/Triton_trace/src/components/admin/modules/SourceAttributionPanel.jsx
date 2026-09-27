import { seedIncidents } from "../../../data/seedIncidents";
import { formatUTCDateTime } from "../../../lib/dateFormat";
import { Radar } from "lucide-react";

const HINDCAST_WINDOW_HOURS = 72;
// Hourly checkpoints from T0 back to T-72h, inclusive of both endpoints.
const HINDCAST_CHECKPOINT_COUNT = HINDCAST_WINDOW_HOURS + 1;

export const SourceAttributionPanel = ({ incidentId }) => {
  const incident = seedIncidents.find((i) => i.incident_id === incidentId);
  if (!incident) return null;

  const windowEnd = new Date(incident.detection_timestamp);
  const windowStart = new Date(
    windowEnd.getTime() - HINDCAST_WINDOW_HOURS * 60 * 60 * 1000,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-brand-500/20 to-brand-700/10 border border-brand-500/20 rounded-md">
        <Radar className="w-4 h-4 text-brand-400" />
        <span className="text-[10px] font-bold text-white tracking-wider">
          SOURCE DENSITY CLUSTER — ON MAP
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col p-2 bg-navy-900 rounded border border-navy-800">
          <span className="text-[9px] font-bold text-slate-500 tracking-wider">
            CLUSTER CENTROID
          </span>
          <span className="text-[10px] text-white font-mono font-semibold">
            {incident.hindcast_origin.centroid.lat.toFixed(3)}°N,{" "}
            {incident.hindcast_origin.centroid.lon.toFixed(3)}°E
          </span>
        </div>
        <div className="flex flex-col p-2 bg-navy-900 rounded border border-navy-800">
          <span className="text-[9px] font-bold text-slate-500 tracking-wider">
            UNCERTAINTY RADIUS
          </span>
          <span className="text-[10px] text-white font-mono font-semibold">
            {incident.hindcast_origin.uncertainty_radius_km.toFixed(1)} km
          </span>
        </div>
      </div>

      <div className="flex flex-col p-2 bg-navy-900 rounded border border-navy-800">
        <span className="text-[9px] font-bold text-slate-500 tracking-wider">
          72H BACKTRACKING WINDOW
        </span>
        <span className="text-[10px] text-white font-mono font-semibold">
          {formatUTCDateTime(windowStart)} → {formatUTCDateTime(windowEnd)}
        </span>
        <span className="text-[9px] text-slate-500 font-mono mt-1">
          {HINDCAST_CHECKPOINT_COUNT} hourly checkpoints
        </span>
      </div>
    </div>
  );
};
