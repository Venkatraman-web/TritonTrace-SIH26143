import { useIncident } from "../../../context/IncidentContext";
import { originCandidatesByIncident } from "../../../data/originCandidates";
import { formatUTCDateTime } from "../../../lib/dateFormat";
import { MapPin, Navigation } from "lucide-react";

export const ClusterOriginMatrix = ({ incidentId }) => {
  const {
    setPanToCoordinate,
    setCorrelationMarker,
    focusedCandidateId,
    focusCandidate,
  } = useIncident();
  const candidates = originCandidatesByIncident[incidentId] || [];

  const handleFocus = (candidate) => {
    focusCandidate(candidate.candidateId);
    // A vessel's "TARGET LOCKED" state in the AIS Attribution view is
    // independent of vessel/candidate focus — clear it so switching to a
    // candidate here doesn't leave a stale lock behind.
    setCorrelationMarker(null);
    setPanToCoordinate({ lat: candidate.lat, lon: candidate.lon });
  };

  return (
    <div className="flex flex-col gap-4 pb-4 font-sans">
      <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
        Cluster Origin Matrix
      </h2>
      <p className="text-[10px] text-slate-500 leading-relaxed -mt-2">
        Backtracked candidate origins the top-15 vessels were matched
        against, ordered by hours before detection (T0).
      </p>

      <div className="flex flex-col gap-3">
        {candidates.map((candidate) => {
          const isActive = focusedCandidateId === candidate.candidateId;

          return (
            <div
              key={candidate.candidateId}
              className={`flex flex-col bg-navy-900 border rounded-md p-4 transition-colors shadow-sm ${
                isActive
                  ? "border-brand-400/50 ring-1 ring-brand-400/20 bg-brand-500/5"
                  : "border-navy-800"
              }`}
            >
              <div className="flex justify-between items-start mb-3 border-b border-navy-800 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {candidate.vessels.length > 0 ? (
                      candidate.vessels.map((v) => (
                        <span
                          key={v.mmsi}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-navy-950 border border-navy-800"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: v.color }}
                          />
                          <span className="text-[9px] font-mono font-bold text-slate-300">
                            #{v.rank} {v.name}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500">
                        No vessel matched
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono font-semibold">
                    {formatUTCDateTime(candidate.candidateTimestamp)}
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-sm font-mono font-bold text-white">
                    T-{candidate.backtrackHours}h
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    BEFORE DETECTION
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex flex-col p-2 bg-navy-950 rounded border border-navy-800">
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    SOURCE SCORE
                  </span>
                  <span className="text-[10px] text-white font-mono font-semibold">
                    {candidate.sourceScore.toFixed(3)}
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-navy-950 rounded border border-navy-800">
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    SUPPORT SCORE
                  </span>
                  <span className="text-[10px] text-white font-mono font-semibold">
                    {candidate.supportScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-navy-950 rounded border border-navy-800">
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    CLUSTER STABILITY
                  </span>
                  <span className="text-[10px] text-white font-mono font-semibold">
                    {candidate.clusterCandidateStabilityPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-navy-950 rounded border border-navy-800">
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    UNCERTAINTY RADIUS
                  </span>
                  <span className="text-[10px] text-white font-mono font-semibold">
                    {candidate.clusterUncertaintyRadiusKm.toFixed(1)} km
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-navy-950 rounded border border-navy-800 col-span-2">
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    COORDINATES
                  </span>
                  <span className="text-[10px] text-white font-mono font-semibold">
                    {candidate.lat.toFixed(4)}°N, {candidate.lon.toFixed(4)}°E
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleFocus(candidate)}
                className={`w-full py-2 flex justify-center items-center gap-2 rounded-md text-[10px] font-bold tracking-wider transition-colors shadow-sm border ${
                  isActive
                    ? "bg-brand-500/10 border-brand-500/30 text-brand-300"
                    : "bg-navy-800 border-navy-700 text-slate-300 hover:bg-navy-700 hover:text-white"
                }`}
              >
                {isActive ? (
                  <>
                    <MapPin className="w-3.5 h-3.5" /> VIEWING ON MAP
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" /> VIEW CANDIDATE
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
