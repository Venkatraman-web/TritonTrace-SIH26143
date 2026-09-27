import { useState } from "react";
import { jsPDF } from "jspdf";
import { ShieldCheck, Search, MapPin, Radar, Download } from "lucide-react";
import { useIncident } from "../../context/IncidentContext";
import { seedIncidents } from "../../data/seedIncidents";
import { findVesselRanking, aisVesselRankingByIncident } from "../../data/aisVesselRanking";
import { displayScore } from "../../data/aisTopVessels";
import { formatUTCDateTime } from "../../lib/dateFormat";
import { StatCard } from "../ui/StatCard";

// Rank-based responsibility read: top 5 is the strongest signal, 6-20 is a
// weaker but still notable one, and outside the top 20 the AIS evidence
// alone doesn't meaningfully implicate the vessel.
const probabilityForRank = (rank) => {
  if (rank == null) return null;
  if (rank <= 5) return { label: "High Probable", className: "text-rose-700 bg-rose-50 border-rose-200" };
  if (rank <= 20) return { label: "Mid Probable", className: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "Very Unlikely", className: "text-slate-600 bg-slate-100 border-slate-200" };
};

// Finds the vessel's own ping closest in time to the encounter timestamp —
// its real recorded position nearest the backtracked cluster, rather than
// its current/latest position (which can be long after this 2019 incident
// and nowhere near it). Returns null if there's no timestamp to match
// against or no pings at all, so the caller can fall back to the vessel's
// current position.
const findClosestPing = (pings, targetTimestamp) => {
  if (!pings?.length || !targetTimestamp) return null;
  const targetMs = new Date(targetTimestamp).getTime();
  return pings.reduce((closest, ping) => {
    const diff = Math.abs(new Date(ping.timestamp).getTime() - targetMs);
    const closestDiff = closest ? Math.abs(new Date(closest.timestamp).getTime() - targetMs) : Infinity;
    return diff < closestDiff ? ping : closest;
  }, null);
};

// Real evidence for one vessel against one incident's backtracked cluster —
// score, encounter details, and the vessel's actual track plotted near the
// density cluster on the map. Deliberately shows evidence only, no
// pass/fail verdict — the app never asserts "responsible"/"cleared" itself.
export const AlibiGenerator = ({ onHighlightVessel }) => {
  const {
    activeIncident,
    setActiveIncident,
    setActiveAnalysisMode,
    setPanToCoordinate,
    allVesselTracks,
    focusVessel,
    focusCandidate,
  } = useIncident();
  const [mmsiInput, setMmsiInput] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");

  const activeSpill = seedIncidents.find((inc) => inc.incident_id === activeIncident);

  const handleSelectSpill = (incident) => {
    setActiveIncident(incident.incident_id);
    setActiveAnalysisMode("attribution");
    setPanToCoordinate({ lat: incident.coordinates.lat, lon: incident.coordinates.lon });
    setMmsiInput("");
    setLookupResult(null);
    setLookupError("");
    onHighlightVessel(null);
    focusCandidate(null);
  };

  const handleSearch = () => {
    const mmsi = mmsiInput.trim();
    if (!activeIncident || !mmsi) return;

    const track = allVesselTracks.find((v) => v.id === mmsi);
    if (!track) {
      setLookupError(`MMSI ${mmsi} was not found in the AIS pool for this period.`);
      setLookupResult(null);
      onHighlightVessel(null);
      focusCandidate(null);
      return;
    }

    setLookupError("");
    const ranking = findVesselRanking(activeIncident, mmsi);
    setLookupResult({ mmsi, ranking, track });
    onHighlightVessel(track);

    // Outside the top 20 (or never scored at all), there's no meaningful
    // encounter to zoom tight on — show the vessel's overall route instead,
    // so the map doesn't imply a close encounter that isn't there. No
    // specific cluster is responsible either, so clear any highlighted one.
    if (!ranking || ranking.rank > 20) {
      focusCandidate(null);
      setPanToCoordinate({ trajectory: track.trajectory });
      return;
    }

    // Highlight the specific origin-candidate cluster this vessel was
    // actually matched against, so zooming in also shows (and rings) the
    // cluster responsible rather than just the vessel's track near a
    // heatmap. Falls back to isolating by vessel if this ranking has no
    // matched candidate on record.
    if (ranking.strongestMatchingCandidateId) {
      focusCandidate(ranking.strongestMatchingCandidateId);
    } else {
      focusVessel(mmsi);
    }

    // Pan to the vessel's actual position at its closest encounter with the
    // cluster (not wherever it happens to be right now, which can be long
    // after/unrelated to the incident) — the real track point nearest the
    // cluster, found from its own pings. A moderate zoom (not a tight
    // close-up) keeps the vessel's route and the cluster both in view.
    const zoomPoint = findClosestPing(track.pings, ranking?.strongestEncounterTimestamp) || track;
    setPanToCoordinate({ lat: zoomPoint.lat, lon: zoomPoint.lon, zoom: 9 });
  };

  // Every field here is either the real lookup result or explicitly marked
  // as not computed — no fabricated "cleared"/"guilty" verdict, matching
  // the on-screen evidence panel.
  const handleExportPdf = () => {
    if (!lookupResult) return;
    const doc = new jsPDF();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("VESSEL EVIDENCE REPORT", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toISOString()}`, 20, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Incident: ${activeIncident}`, 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Vessel: ${lookupResult.track.name} (MMSI ${lookupResult.mmsi})`, 20, y);
    y += 10;
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Attribution evidence", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (lookupResult.ranking) {
      const r = lookupResult.ranking;
      const total = (aisVesselRankingByIncident[activeIncident] || []).length;
      [
        `AIS attribution score: ${(r.attributionScore * 100).toFixed(1)}%`,
        `Rank: #${r.rank} of ${total} vessels scored for this incident`,
        `Closest encounter distance: ${
          r.strongestEncounterDistanceKm != null ? `${r.strongestEncounterDistanceKm.toFixed(2)} km` : "not recorded"
        }`,
        `Closest encounter time: ${
          r.strongestEncounterTimestamp ? formatUTCDateTime(r.strongestEncounterTimestamp) : "not recorded"
        }`,
        `AIS coverage during backtrack window: ${(r.coverageFraction * 100).toFixed(0)}%`,
        `Matched AIS pings: ${r.nMatches ?? "not recorded"}`,
      ].forEach((line) => {
        doc.text(line, 20, y);
        y += 7;
      });
    } else {
      doc.text("This vessel was not scored by the attribution model for this", 20, y);
      y += 7;
      doc.text("incident — no evidence linking it to the backtracked cluster", 20, y);
      y += 7;
      doc.text("was computed.", 20, y);
      y += 7;
    }
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("This report presents evidence only. It is not an automated", 20, y);
    y += 6;
    doc.text("determination of responsibility.", 20, y);

    doc.save(`vessel_evidence_${lookupResult.mmsi}_${activeIncident}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
        <ShieldCheck className="h-4 w-4" />
        <span>ALIBI GENERATOR</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
          1. Select an oil spill
        </span>
        <div className="grid grid-cols-2 gap-2">
          {seedIncidents.map((inc) => {
            const isActive = activeIncident === inc.incident_id;
            return (
              <button
                key={inc.incident_id}
                onClick={() => handleSelectSpill(inc)}
                className={`flex flex-col items-start p-2.5 rounded-md border text-left transition-all ${
                  isActive
                    ? "border-cyan-500 bg-cyan-50 shadow-inner"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span
                  className={`font-mono text-xs font-bold ${isActive ? "text-cyan-700" : "text-slate-800"}`}
                >
                  {inc.incident_id}
                </span>
                <span className="text-[10px] text-slate-500">
                  {inc.slick_area_sqkm} km² · {formatUTCDateTime(inc.detection_timestamp)}
                </span>
              </button>
            );
          })}
        </div>
        {activeSpill && (
          <div className="flex items-center gap-1.5 text-[10px] text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-2 py-1">
            <Radar className="w-3 h-3 shrink-0" />
            Backtracked density cluster now shown on the map for{" "}
            {activeSpill.incident_id}.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
          2. Enter a vessel MMSI
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={mmsiInput}
            onChange={(e) => setMmsiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={!activeIncident}
            placeholder={activeIncident ? "e.g. 211317341" : "Select a spill first"}
            className="flex-1 px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            onClick={handleSearch}
            disabled={!activeIncident || !mmsiInput.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold rounded-md transition-colors"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
        </div>
        {lookupError && (
          <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
            {lookupError}
          </div>
        )}
      </div>

      {lookupResult && (
        <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-800">
              {lookupResult.track.name}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-violet-700">
              <MapPin className="w-3 h-3" /> Track shown on map
            </span>
          </div>
          {(() => {
            const probability = probabilityForRank(lookupResult.ranking?.rank);
            return probability ? (
              <span
                className={`w-max text-[10px] font-bold uppercase tracking-wide border rounded px-2 py-1 ${probability.className}`}
              >
                {probability.label}
              </span>
            ) : null;
          })()}
          {lookupResult.ranking ? (
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="AIS ATTRIBUTION SCORE" value={`${displayScore(lookupResult.ranking.attributionScore)}%`} />
              <StatCard
                label="RANK"
                value={`#${lookupResult.ranking.rank} of ${
                  (aisVesselRankingByIncident[activeIncident] || []).length
                }`}
              />
              <StatCard
                label="CLOSEST ENCOUNTER"
                value={
                  lookupResult.ranking.strongestEncounterDistanceKm != null
                    ? `${lookupResult.ranking.strongestEncounterDistanceKm.toFixed(2)} km`
                    : "—"
                }
              />
              <StatCard
                label="ENCOUNTER TIME"
                value={
                  lookupResult.ranking.strongestEncounterTimestamp
                    ? formatUTCDateTime(lookupResult.ranking.strongestEncounterTimestamp)
                    : "—"
                }
              />
              <StatCard
                label="AIS COVERAGE"
                value={`${(lookupResult.ranking.coverageFraction * 100).toFixed(0)}%`}
              />
              <StatCard label="MATCHED PINGS" value={lookupResult.ranking.nMatches ?? "—"} />
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 leading-relaxed">
              This vessel wasn't scored for this incident's attribution model —
              no evidence linking it to the backtracked cluster was computed.
              Its real track is still shown on the map for reference.
            </div>
          )}
          <p className="text-[9px] text-slate-400 leading-relaxed">
            Evidence only — this is not an automated verdict. Compare the
            plotted track against the density cluster/hotspot markers on the
            map to judge proximity yourself.
          </p>
          <button
            onClick={handleExportPdf}
            className="flex items-center justify-center gap-2 w-max px-3 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-md text-[10px] font-bold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> EXPORT EVIDENCE (PDF)
          </button>
        </div>
      )}
    </div>
  );
};
