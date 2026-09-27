import { useIncident } from "../../../context/IncidentContext";
import { topVesselsByIncident, colorForRank, displayScore } from "../../../data/aisTopVessels";
import { formatUTCDateTime } from "../../../lib/dateFormat";
import { Crosshair, Navigation, AlertTriangle } from "lucide-react";

export const AisCorrelationMatrix = ({ incidentId }) => {
  const {
    setCorrelationMarker,
    correlationMarker,
    setPanToCoordinate,
    focusedVesselMmsi,
    focusVessel,
  } = useIncident();

  const suspects = (topVesselsByIncident[incidentId] || []).map((v) => ({
    id: v.mmsi,
    rank: v.rank,
    name: v.name,
    mmsi: v.mmsi,
    type: v.type,
    cpa: `${v.minDistanceKm.toFixed(1)} km`,
    score: displayScore(v.score),
    encounterTime: formatUTCDateTime(v.bestEncounterTimestamp),
    // Where this vessel's route intersects the source density cluster.
    intersectCoord: [v.matchedCandidateLon, v.matchedCandidateLat],
  }));

  const handleIntersect = (vessel) => {
    focusVessel(vessel.mmsi);
    if (correlationMarker && correlationMarker[0] === vessel.intersectCoord[0]) {
      setCorrelationMarker(null);
      return;
    }
    setCorrelationMarker(vessel.intersectCoord);
    setPanToCoordinate({
      lat: vessel.intersectCoord[1],
      lon: vessel.intersectCoord[0],
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-4 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
          AIS Correlation Matrix
        </h2>
        {correlationMarker && (
          <button
            onClick={() => setCorrelationMarker(null)}
            className="text-[10px] text-slate-500 hover:text-slate-800 font-mono tracking-wider underline font-bold"
          >
            CLEAR MARKER
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {suspects.map((vessel, index) => (
          <div
            key={vessel.id}
            className={`flex flex-col bg-white border rounded-md p-4 transition-colors shadow-sm ${
              focusedVesselMmsi === vessel.mmsi
                ? "border-rose-400 ring-1 ring-rose-400/20 bg-rose-50/30"
                : "border-slate-200"
            }`}
          >
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorForRank(vessel.rank) }}
                    title={`Route color (rank #${vessel.rank})`}
                  />
                  <span className="text-slate-900 font-bold text-xs">
                    {vessel.name}
                  </span>
                  {index === 0 && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                  MMSI: {vessel.mmsi}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span
                  className={`text-sm font-mono font-bold ${vessel.score > 90 ? "text-rose-600" : vessel.score > 50 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {vessel.score}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                  THREAT SCORE
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex flex-col p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                  VESSEL TYPE
                </span>
                <span className="text-[10px] text-slate-900 font-mono font-semibold truncate">
                  {vessel.type}
                </span>
              </div>
              <div className="flex flex-col p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                  MIN. DISTANCE TO ORIGIN
                </span>
                <span className="text-[10px] text-slate-900 font-mono font-semibold">
                  {vessel.cpa}
                </span>
              </div>
              <div className="flex flex-col p-2 bg-slate-50 rounded border border-slate-100 col-span-2">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                  ENCOUNTER TIME NEAR SPILL ORIGIN
                </span>
                <span className="text-[10px] text-slate-900 font-mono font-semibold">
                  {vessel.encounterTime}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleIntersect(vessel)}
              className={`w-full py-2 flex justify-center items-center gap-2 rounded-md text-[10px] font-bold tracking-wider transition-colors shadow-sm border ${
                correlationMarker &&
                correlationMarker[0] === vessel.intersectCoord[0]
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {correlationMarker &&
              correlationMarker[0] === vessel.intersectCoord[0] ? (
                <>
                  <Crosshair className="w-3.5 h-3.5" /> TARGET LOCKED
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" /> INTERSECT ROUTE
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
