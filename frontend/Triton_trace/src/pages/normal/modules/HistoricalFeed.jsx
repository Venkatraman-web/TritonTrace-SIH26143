import { useState } from "react";
import { useIncident } from "../../../context/IncidentContext";
import { seedIncidents } from "../../../data/seedIncidents";
import { formatUTCDate } from "../../../lib/dateFormat";
import { backpropTrajectoryUrlByIncident } from "../../../data/backpropTrajectories";
import { forwardTrajectoryParquetUrlByIncident } from "../../../data/forwardTrajectory";
import {
  sourceRegionTimelineImageUrlByIncident,
  multimemberStaticImageUrlByIncident,
} from "../../../data/regionalAttributionImages";
import { downloadFromUrl } from "../../../lib/csvExport";
import { SourceAttributionPanel } from "../../../components/admin/modules/SourceAttributionPanel";
import { ForwardTrackPanel } from "../../../components/admin/modules/ForwardTrackPanel";
import { ClusterSummary } from "./ClusterSummary";
import { WeatheringPanel } from "./WeatheringPanel";
import { Lightbox } from "./Lightbox";
import { Radar, FastForward, Archive, Download, MapPin, ZoomIn } from "lucide-react";

const STATUS_STYLES = {
  under_investigation: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  review: "bg-sky-50 text-sky-700 border-sky-200",
};
const DEFAULT_STATUS_STYLE = "bg-slate-50 text-slate-700 border-slate-200";
// Hourly checkpoints from T0 back to T-72h, inclusive of both endpoints —
// matches the backprop CSV's own per-particle row count.
const HINDCAST_CHECKPOINT_COUNT = 73;

const formatStatusLabel = (status) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const HistoricalFeed = () => {
  const {
    activeIncident,
    setActiveIncident,
    setPanToCoordinate,
    activeAnalysisMode,
    setActiveAnalysisMode,
  } = useIncident();
  const [lightbox, setLightbox] = useState(null);

  const handleIncidentClick = (incident) => {
    if (activeIncident === incident.incident_id) {
      setActiveIncident(null);
      setActiveAnalysisMode("none");
      return;
    }
    setActiveIncident(incident.incident_id);
    setActiveAnalysisMode("none");
    setPanToCoordinate({
      lat: incident.coordinates.lat,
      lon: incident.coordinates.lon,
    });
  };

  const toggleAnalysisMode = (mode) =>
    setActiveAnalysisMode(activeAnalysisMode === mode ? "none" : mode);

  return (
    <div className="flex flex-col gap-4 font-sans pb-4">
      <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
        Historical Incidents
      </h2>

      <div className="flex flex-col gap-3">
        {seedIncidents.map((inc) => {
          const isExpanded = activeIncident === inc.incident_id;

          return (
            <div
              key={inc.incident_id}
              className={`flex flex-col bg-white transition-all overflow-hidden ${
                isExpanded
                  ? "border border-brand-400 shadow-md rounded-lg"
                  : "border border-slate-200 rounded-md hover:border-slate-300"
              }`}
            >
              <button
                onClick={() => handleIncidentClick(inc)}
                className={`p-3 text-left flex flex-col gap-2 transition-colors ${
                  isExpanded ? "bg-brand-50/50" : "bg-white"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span
                    className={`font-mono text-xs font-bold ${isExpanded ? "text-brand-700" : "text-slate-800"}`}
                  >
                    {inc.incident_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      STATUS_STYLES[inc.status] || DEFAULT_STATUS_STYLE
                    }`}
                  >
                    {formatStatusLabel(inc.status)}
                  </span>
                </div>

                <div className="flex justify-between items-end w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      DETECTED
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {formatUTCDate(inc.detection_timestamp)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      EST AREA
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {inc.slick_area_sqkm} km²
                    </span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="flex flex-col px-3 pb-3 border-t border-slate-100 mt-1 pt-3 animate-in fade-in duration-200 gap-4">
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                    RESEARCH TOOLS
                  </span>
                  <div className="grid grid-cols-2 gap-2 -mt-2">
                    <button
                      onClick={() => toggleAnalysisMode("attribution")}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                        activeAnalysisMode === "attribution"
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700 shadow-inner"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Radar className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wider">
                        BACKWARD ATTRIBUTION
                      </span>
                    </button>

                    <button
                      onClick={() => toggleAnalysisMode("forward_track")}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                        activeAnalysisMode === "forward_track"
                          ? "border-amber-500 bg-amber-50 text-amber-700 shadow-inner"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <FastForward className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wider">
                        FORWARD FORECAST
                      </span>
                    </button>
                  </div>

                  {activeAnalysisMode === "attribution" && (
                    <div className="flex flex-col gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md shadow-inner">
                      <SourceAttributionPanel incidentId={inc.incident_id} />

                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-md">
                        <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-[9px] text-purple-700 leading-snug">
                          Named hotspot locations are now marked on the map
                          near the backtracked density cluster.
                        </span>
                      </div>

                      {sourceRegionTimelineImageUrlByIncident[inc.incident_id] && (
                        <button
                          onClick={() =>
                            setLightbox({
                              caption: `Potential source region over time — ${inc.incident_id}`,
                              node: (
                                <img
                                  src={sourceRegionTimelineImageUrlByIncident[inc.incident_id]}
                                  alt={`Backtracked potential source region over time — ${inc.incident_id}`}
                                  className="max-w-[92vw] max-h-[85vh] object-contain rounded-md shadow-2xl"
                                />
                              ),
                            })
                          }
                          className="relative rounded-md border border-slate-200 overflow-hidden shadow-sm bg-white group text-left"
                        >
                          <img
                            src={sourceRegionTimelineImageUrlByIncident[inc.incident_id]}
                            alt={`Backtracked potential source region over time — ${inc.incident_id}`}
                            className="w-full h-auto block"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
                      )}
                      {multimemberStaticImageUrlByIncident[inc.incident_id] && (
                        <button
                          onClick={() =>
                            setLightbox({
                              caption: `Backward trajectories across all forcing members — ${inc.incident_id}`,
                              node: (
                                <img
                                  src={multimemberStaticImageUrlByIncident[inc.incident_id]}
                                  alt={`Backward trajectories across all forcing members — ${inc.incident_id}`}
                                  className="max-w-[92vw] max-h-[85vh] object-contain rounded-md shadow-2xl"
                                />
                              ),
                            })
                          }
                          className="relative rounded-md border border-slate-200 overflow-hidden shadow-sm bg-white group text-left"
                        >
                          <img
                            src={multimemberStaticImageUrlByIncident[inc.incident_id]}
                            alt={`Backward trajectories across all forcing members — ${inc.incident_id}`}
                            className="w-full h-auto block"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
                      )}

                      <div className="w-full h-px bg-slate-200" />
                      <ClusterSummary incidentId={inc.incident_id} />

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider px-1">
                          BACKWARD TRAJECTORY ARCHIVE
                        </span>
                        <p className="text-[9px] text-slate-500 leading-relaxed px-1">
                          Every row is one drift particle's hourly position as
                          OpenOil traces it backward from the detection point
                          (T0) to T-72h — the raw per-particle paths behind
                          the density cluster and candidate table above.
                          Useful for verifying the hindcast yourself or
                          re-running your own clustering/statistics offline.
                        </p>

                        {backpropTrajectoryUrlByIncident[inc.incident_id] ? (
                          <button
                            onClick={() =>
                              downloadFromUrl(
                                backpropTrajectoryUrlByIncident[inc.incident_id],
                                `${inc.incident_id}_backprop_trajectories_10particle_demo.csv`,
                              )
                            }
                            className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all text-left group"
                          >
                            <Archive className="w-4 h-4 text-cyan-600 shrink-0" />
                            <span className="text-[10px] text-slate-600 leading-relaxed flex-1">
                              Backward-trajectory particle archive (10-particle
                              demo, 6 forcing members, {HINDCAST_CHECKPOINT_COUNT}{" "}
                              hourly checkpoints each)
                            </span>
                            <Download className="w-3.5 h-3.5 text-cyan-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-md bg-white">
                            <Archive className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-[10px] text-slate-500 leading-relaxed">
                              Full backward-trajectory particle archive has
                              not been provided for this incident yet.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeAnalysisMode === "forward_track" && (
                    <div className="flex flex-col gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md shadow-inner">
                      <ForwardTrackPanel />

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider px-1">
                          FORWARD TRAJECTORY ARCHIVE
                        </span>
                        <p className="text-[9px] text-slate-500 leading-relaxed px-1">
                          The original OpenOil run (trajectory.parquet) behind
                          the animation above — every simulated particle's
                          full hourly position for the 72h forecast, at
                          higher resolution than the lon/lat-per-step data the
                          app renders. Open it in pandas/DuckDB to inspect the
                          forward run in detail.
                        </p>

                        {forwardTrajectoryParquetUrlByIncident[inc.incident_id] ? (
                          <button
                            onClick={() =>
                              downloadFromUrl(
                                forwardTrajectoryParquetUrlByIncident[inc.incident_id],
                                `${inc.incident_id}_trajectory.parquet`,
                              )
                            }
                            className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-left group"
                          >
                            <Archive className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-[10px] text-slate-600 leading-relaxed flex-1">
                              Forward trajectory archive (Parquet, 72h OpenOil
                              run)
                            </span>
                            <Download className="w-3.5 h-3.5 text-amber-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-md bg-white">
                            <Archive className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-[10px] text-slate-500 leading-relaxed">
                              Full forward trajectory archive has not been
                              provided for this incident yet.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-full h-px bg-slate-200" />
                      <WeatheringPanel />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Lightbox isOpen={!!lightbox} onClose={() => setLightbox(null)} caption={lightbox?.caption}>
        {lightbox?.node}
      </Lightbox>
    </div>
  );
};
