import { useIncident } from "../../../context/IncidentContext";
import {
  topOriginCandidatesByIncident,
  topOriginCandidatesFileUrlByIncident,
  topOriginCandidatesFileRowCountByIncident,
} from "../../../data/topOriginCandidates";
import { downloadFromUrl } from "../../../lib/csvExport";
import { formatUTCDateTime } from "../../../lib/dateFormat";
import { Waypoints, Archive, Download } from "lucide-react";

// Compact view of the top 15 backtracked cluster candidates for one incident
// (ranked by source_score, independent of any AIS vessel match) — a table
// rather than the investigator portal's one-card-per-candidate layout, so
// the full set stays scannable instead of turning into a long scroll of
// repeated cards.
export const ClusterSummary = ({ incidentId }) => {
  const { focusedCandidateId, focusCandidate, setPanToCoordinate, setCorrelationMarker } =
    useIncident();
  const candidates = topOriginCandidatesByIncident[incidentId] || [];
  const clusterCount = new Set(candidates.map((c) => c.clusterId)).size;

  const handleRowClick = (candidate) => {
    focusCandidate(candidate.candidateId);
    setCorrelationMarker(null);
    setPanToCoordinate({ lat: candidate.lat, lon: candidate.lon });
  };

  if (candidates.length === 0) {
    return (
      <div className="p-3 border border-dashed border-navy-700 rounded-md bg-navy-900 text-center">
        <span className="text-[10px] text-slate-500">
          No backtracked cluster data for this incident.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] font-bold text-slate-500 tracking-wider">
          TOP {candidates.length} CANDIDATE POINTS · {clusterCount} CLUSTER
          {clusterCount === 1 ? "" : "S"}
        </span>
        <Waypoints className="w-3.5 h-3.5 text-cyan-400" />
      </div>

      <div className="border border-navy-800 rounded-md overflow-hidden shadow-sm">
        <div className="max-h-56 overflow-auto custom-scrollbar">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="sticky top-0 bg-navy-800 z-10">
              <tr>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                  T-HOURS
                </th>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                  TIMESTAMP
                </th>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                  CANDIDATE ID
                </th>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                  LAT
                </th>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                  LON
                </th>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                  CONFIDENCE
                </th>
                <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider text-right whitespace-nowrap">
                  RADIUS
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const isActive = focusedCandidateId === candidate.candidateId;
                return (
                  <tr
                    key={candidate.candidateId}
                    onClick={() => handleRowClick(candidate)}
                    className={`cursor-pointer border-t border-navy-800 transition-colors ${
                      isActive
                        ? "bg-cyan-500/10"
                        : "bg-navy-900 hover:bg-navy-700"
                    }`}
                  >
                    <td className="px-2 py-1.5 text-[10px] font-mono font-bold text-slate-200 whitespace-nowrap">
                      T-{candidate.backtrackHours}h
                    </td>
                    <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {formatUTCDateTime(candidate.candidateTimestamp)}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {candidate.candidateId}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {candidate.lat?.toFixed(4) ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {candidate.lon?.toFixed(4) ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {candidate.confidencePercent?.toFixed(1) ?? "—"}%
                    </td>
                    <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 text-right whitespace-nowrap">
                      {candidate.clusterUncertaintyRadiusKm?.toFixed(1) ?? "—"} km
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[9px] text-slate-500 px-1">
        Tap a row to highlight that candidate point on the map. Scroll
        sideways to see every column.
      </p>

      {topOriginCandidatesFileUrlByIncident[incidentId] && (
        <button
          onClick={() =>
            downloadFromUrl(
              topOriginCandidatesFileUrlByIncident[incidentId],
              `${incidentId}_possible_source_origins_top.csv`,
            )
          }
          className="flex items-center gap-3 p-3 rounded-md bg-navy-900 border border-navy-800 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all text-left group"
        >
          <Archive className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[10px] text-slate-500 leading-relaxed flex-1">
            Ranked source-origin candidates (CSV,{" "}
            {topOriginCandidatesFileRowCountByIncident[incidentId] ?? "all"}{" "}
            rows — the full ranked list this table's top {candidates.length}{" "}
            are drawn from)
          </span>
          <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};
