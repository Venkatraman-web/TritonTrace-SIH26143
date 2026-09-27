import { useIncident } from "../../../context/IncidentContext";
import { computeHotspotStatuses } from "../../../data/hotspotTimeline";
import { formatUTCDateTime } from "../../../lib/dateFormat";
import { FastForward, Play, Pause, AlertTriangle, ShieldAlert } from "lucide-react";

const STATUS_STYLES = {
  CRITICAL: "bg-rose-50 border-rose-200 text-rose-700",
  WATCH: "bg-amber-50 border-amber-200 text-amber-700",
  CLEAR: "bg-slate-50 border-slate-200 text-slate-400",
};

export const ForwardTrackPanel = () => {
  const {
    forwardTrackStep,
    setForwardTrackStep,
    isForwardTrackPlaying,
    setIsForwardTrackPlaying,
    forwardTrajectory,
  } = useIncident();

  const maxStep = Math.max(0, forwardTrajectory.particlesByStep.length - 1);
  const currentTimestamp = forwardTrajectory.timestamps[forwardTrackStep];
  const currentParticles =
    forwardTrajectory.particlesByStep[Math.min(forwardTrackStep, maxStep)] || [];
  const statuses = computeHotspotStatuses(currentParticles);
  const hotspots = Object.entries(statuses)
    .map(([name, status]) => ({ name, status }))
    .filter((h) => h.status === "WATCH" || h.status === "CRITICAL");

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
        <FastForward className="w-4 h-4 text-amber-600" />
        <span className="text-[10px] font-bold text-amber-700 tracking-wider">
          FORWARD TRAJECTORY — 72H OPENOIL FORECAST
        </span>
      </div>

      <div className="flex flex-col p-3 bg-white border border-slate-200 rounded-md shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsForwardTrackPlaying((p) => !p)}
            disabled={maxStep === 0}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 transition-colors"
          >
            {isForwardTrackPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={maxStep}
            value={forwardTrackStep}
            onChange={(e) => {
              setIsForwardTrackPlaying(false);
              setForwardTrackStep(Number(e.target.value));
            }}
            className="flex-1 accent-amber-600"
          />
          <span className="text-[10px] font-mono font-bold text-slate-700 w-8 text-right">
            +{forwardTrackStep}h
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono text-center">
          {currentTimestamp
            ? formatUTCDateTime(currentTimestamp)
            : "Loading trajectory…"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-bold text-slate-400 tracking-wider px-1">
          REGIONAL HOTSPOT STATUS AT +{forwardTrackStep}H
        </span>
        {hotspots.length === 0 && (
          <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center">
            No hotspots in WATCH or CRITICAL status at this hour.
          </div>
        )}
        {hotspots.map((h) => (
          <div
            key={h.name}
            className={`flex items-center justify-between px-3 py-1.5 rounded-md border text-[10px] font-semibold ${STATUS_STYLES[h.status] || STATUS_STYLES.CLEAR}`}
          >
            <span className="flex items-center gap-1.5">
              {h.status === "CRITICAL" && (
                <AlertTriangle className="w-3 h-3 shrink-0" />
              )}
              {h.status === "WATCH" && (
                <ShieldAlert className="w-3 h-3 shrink-0" />
              )}
              {h.name}
            </span>
            <span className="tracking-wider">{h.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
