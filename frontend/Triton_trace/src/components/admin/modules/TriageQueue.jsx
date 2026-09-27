import React, { useState, useEffect } from "react";
import { useIncident } from "../../../context/IncidentContext";
import { seedIncidents } from "../../../data/seedIncidents";
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
              className={`flex flex-col bg-white transition-all overflow-hidden ${
                isExpanded
                  ? "border border-brand-400 shadow-md rounded-lg"
                  : "border border-slate-200 rounded-md hover:border-slate-300"
              }`}
            >
              {/* Clickable Header */}
              <div
                className={`flex justify-between items-start p-3 cursor-pointer ${isExpanded ? "bg-brand-50/50" : "bg-white"}`}
                onClick={() => handleCardClick(report)}
              >
                <div className="flex flex-col">
                  <span
                    className={`${isExpanded ? "text-brand-700" : "text-slate-900"} font-mono font-bold text-xs`}
                  >
                    {report.id}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatUTCDateTime(report.createdAt)}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">
                  {report.status}
                </span>
              </div>

              {/* The "Accordion" Expanded Area */}
              {isExpanded && (
                <div className="flex flex-col px-3 pb-3 border-t border-slate-100 mt-1 pt-3 animate-in fade-in duration-200">
                  {/* Mission Command Buttons */}
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider mb-2">
                    INTELLIGENCE SUITE
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() =>
                        setActiveAnalysisMode(
                          activeAnalysisMode === "attribution"
                            ? "none"
                            : "attribution",
                        )
                      }
                      className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                        activeAnalysisMode === "attribution"
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-inner"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                          ? "border-amber-500 bg-amber-50 text-amber-700 shadow-inner"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-slate-800 hover:bg-slate-900 border border-slate-900 text-white text-[10px] font-bold tracking-wider transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" /> REVIEW DOSSIER
                    </button>
                  </div>

                  {/* 🚨 DYNAMIC INLINE PANELS RENDERING HERE 🚨 */}

                  {/* Render Hindcast & AIS Matrix if Attribution is active */}
                  {activeAnalysisMode === "attribution" && (
                    <div className="flex flex-col gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md mb-4 shadow-inner">
                      <div className="flex items-center gap-2 px-3 py-2 bg-brand-100 border border-brand-200 rounded-md">
                        <ShieldCheck className="w-4 h-4 text-brand-700" />
                        <span className="text-[10px] font-bold text-brand-800 tracking-wider">
                          ATTRIBUTION SUITE ACTIVE
                        </span>
                      </div>
                      <SourceAttributionPanel incidentId={report.id} />

                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
                        <button
                          onClick={() => setAttributionView("ais")}
                          className={`py-1.5 rounded text-[10px] font-bold tracking-wide transition-colors ${
                            attributionView === "ais"
                              ? "bg-white text-brand-700 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          AIS Attribution
                        </button>
                        <button
                          onClick={() => setAttributionView("origin_matrix")}
                          className={`py-1.5 rounded text-[10px] font-bold tracking-wide transition-colors ${
                            attributionView === "origin_matrix"
                              ? "bg-white text-brand-700 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Cluster Origin
                        </button>
                      </div>

                      <div className="w-full h-px bg-slate-200"></div>
                      {attributionView === "origin_matrix" ? (
                        <ClusterOriginMatrix incidentId={report.id} />
                      ) : (
                        <AisCorrelationMatrix incidentId={report.id} />
                      )}
                    </div>
                  )}

                  {/* Render Forward Track panel if active */}
                  {activeAnalysisMode === "forward_track" && (
                    <div className="flex flex-col p-3 bg-slate-50 border border-slate-200 rounded-md shadow-inner">
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
