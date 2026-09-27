import React, { useState, useEffect } from "react";
import { useIncident } from "../../../context/IncidentContext";
import { seedIncidents } from "../../../data/seedIncidents";
import { densityGridByIncident } from "../../../data/densityGrid";
import { topVesselsByIncident } from "../../../data/aisTopVessels";
import { formatUTCDateTime } from "../../../lib/dateFormat";
import { DossierModal } from "./DossierModal";
import {
  ShieldCheck,
  FastForward,
  Download,
  Target,
  FileText,
} from "lucide-react";

// Import our standalone tool panels
import { SourceAttributionPanel } from "./SourceAttributionPanel";
import { AisCorrelationMatrix } from "./AisCorrelationMatrix";
import { ClusterOriginMatrix } from "./ClusterOriginMatrix";
import { ForwardTrackPanel } from "./ForwardTrackPanel";

export const TriageQueue = () => {
  const [reports, setReports] = useState([]);
  const {
    activeIncident,
    setActiveIncident,
    setPanToCoordinate,
    setActiveAnalysisMode,
    activeAnalysisMode,
    attributionView,
    setAttributionView,
  } = useIncident();
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  useEffect(() => {
    const formattedReports = seedIncidents.map((inc) => ({
      id: inc.incident_id,
      createdAt: inc.detection_timestamp,
      status:
        inc.status === "under_investigation"
          ? "UNDER_REVIEW"
          : inc.status.toUpperCase(),
      lat: inc.coordinates.lat,
      lon: inc.coordinates.lon,
      spillType:
        inc.source_type === "satellite_detected"
          ? "SAR Detection"
          : "Field Report",
    }));
    setReports(
      formattedReports.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
    );
  }, []);

  // Zooms/pans the map to fit the density cluster plus where the top-15
  // vessels were actually encountered near it — not their entire AIS
  // history, which can stretch far across the map and zoom out much more
  // than the attribution picture actually needs.
  const handleToggleAttribution = (report) => {
    const next = activeAnalysisMode === "attribution" ? "none" : "attribution";
    setActiveAnalysisMode(next);
    if (next !== "attribution") return;

    const coords = (densityGridByIncident[report.id]?.features || []).map(
      (f) => f.geometry.coordinates,
    );
    (topVesselsByIncident[report.id] || []).forEach((tv) => {
      if (tv.matchedCandidateLon != null && tv.matchedCandidateLat != null) {
        coords.push([tv.matchedCandidateLon, tv.matchedCandidateLat]);
      }
      if (tv.bestEncounterLon != null && tv.bestEncounterLat != null) {
        coords.push([tv.bestEncounterLon, tv.bestEncounterLat]);
      }
    });

    if (coords.length >= 2) {
      setPanToCoordinate({ trajectory: coords });
    }
  };

  const handleCardClick = (report) => {
    if (activeIncident === report.id) {
      setActiveIncident(null);
      setActiveAnalysisMode("none");
    } else {
      setActiveIncident(report.id);
      setActiveAnalysisMode("none");
      if (report.lat && report.lon) {
        setPanToCoordinate({
          lat: parseFloat(report.lat),
          lon: parseFloat(report.lon),
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-4 font-sans">
      <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
        Incident Triage Queue
      </h2>

      <div className="flex flex-col gap-3">
        {reports.map((report) => {
          const isExpanded = activeIncident === report.id;

          return (
            <div
              key={report.id}
              className={`flex flex-col bg-navy-900 transition-all overflow-hidden ${
                isExpanded
                  ? "border border-brand-500/50 shadow-md rounded-lg"
                  : "border border-navy-800 rounded-md hover:border-navy-700"
              }`}
            >
              {/* Clickable Header */}
              <div
                className={`flex justify-between items-start p-3 cursor-pointer ${isExpanded ? "bg-brand-500/10" : "bg-navy-900"}`}
                onClick={() => handleCardClick(report)}
              >
                <div className="flex flex-col">
                  <span
                    className={`${isExpanded ? "text-brand-300" : "text-white"} font-mono font-bold text-xs`}
                  >
                    {report.id}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatUTCDateTime(report.createdAt)}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                  {report.status}
                </span>
              </div>

              {/* The "Accordion" Expanded Area */}
              {isExpanded && (
                <div className="flex flex-col px-3 pb-3 border-t border-navy-800 mt-1 pt-3 animate-in fade-in duration-200">
                  {/* Mission Command Buttons */}
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider mb-2">
                    INTELLIGENCE SUITE
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => handleToggleAttribution(report)}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                        activeAnalysisMode === "attribution"
                          ? "border-brand-500/50 bg-brand-500/10 text-brand-300 shadow-inner"
                          : "border-navy-800 bg-navy-950 text-slate-300 hover:bg-navy-800"
                      }`}
                    >
                      <Target className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wider">
                        ATTRIBUTION
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setActiveAnalysisMode(
                          activeAnalysisMode === "forward_track"
                            ? "none"
                            : "forward_track",
                        )
                      }
                      className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                        activeAnalysisMode === "forward_track"
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-inner"
                          : "border-navy-800 bg-navy-950 text-slate-300 hover:bg-navy-800"
                      }`}
                    >
                      <FastForward className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wider">
                        FORWARD TRACK
                      </span>
                    </button>
                  </div>

                  {/* Export Options — kept above the ATTRIBUTION/FORWARD
                      TRACK content below so it stays reachable without
                      scrolling past whichever panel is open. */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setIsDossierOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-brand-600 hover:bg-brand-500 border border-brand-500/50 text-white text-[10px] font-bold tracking-wider transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" /> REVIEW DOSSIER
                    </button>
                  </div>

                  {/* 🚨 DYNAMIC INLINE PANELS RENDERING HERE 🚨 */}

                  {/* Render Hindcast & AIS Matrix if Attribution is active */}
                  {activeAnalysisMode === "attribution" && (
                    <div className="flex flex-col gap-4 p-3 bg-navy-950 border border-navy-800 rounded-md mb-4 shadow-inner">
                      <div className="flex items-center gap-2 px-3 py-2 bg-brand-500/15 border border-brand-500/30 rounded-md">
                        <ShieldCheck className="w-4 h-4 text-brand-400" />
                        <span className="text-[10px] font-bold text-brand-300 tracking-wider">
                          ATTRIBUTION SUITE ACTIVE
                        </span>
                      </div>
                      <SourceAttributionPanel incidentId={report.id} />

                      <div className="grid grid-cols-2 gap-1 p-1 bg-navy-900 rounded-md">
                        <button
                          onClick={() => setAttributionView("ais")}
                          className={`py-1.5 rounded text-[10px] font-bold tracking-wide transition-colors ${
                            attributionView === "ais"
                              ? "bg-navy-700 text-brand-300 shadow-sm"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          AIS Attribution
                        </button>
                        <button
                          onClick={() => setAttributionView("origin_matrix")}
                          className={`py-1.5 rounded text-[10px] font-bold tracking-wide transition-colors ${
                            attributionView === "origin_matrix"
                              ? "bg-navy-700 text-brand-300 shadow-sm"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Cluster Origin
                        </button>
                      </div>

                      <div className="w-full h-px bg-navy-800"></div>
                      {attributionView === "origin_matrix" ? (
                        <ClusterOriginMatrix incidentId={report.id} />
                      ) : (
                        <AisCorrelationMatrix incidentId={report.id} />
                      )}
                    </div>
                  )}

                  {/* Render Forward Track panel if active */}
                  {activeAnalysisMode === "forward_track" && (
                    <div className="flex flex-col p-3 bg-navy-950 border border-navy-800 rounded-md shadow-inner">
                      <ForwardTrackPanel />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        incidentId={activeIncident}
      />
    </div>
  );
};
