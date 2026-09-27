import { useState } from "react";
import { useIncident } from "../../../context/IncidentContext";
import { seedIncidents } from "../../../data/seedIncidents";
import { formatUTCDate } from "../../../lib/dateFormat";
import { backpropTrajectoryUrlByIncident } from "../../../data/backpropTrajectories";
import { densityGridByIncident } from "../../../data/densityGrid";
import { topVesselsByIncident } from "../../../data/aisTopVessels";
import { forwardTrajectoryParquetUrlByIncident } from "../../../data/forwardTrajectory";
import {
  sourceRegionTimelineImageUrlByIncident,
  multimemberAnimationUrlByIncident,
} from "../../../data/regionalAttributionImages";
import { downloadFromUrl } from "../../../lib/csvExport";
import { SourceAttributionPanel } from "../../../components/admin/modules/SourceAttributionPanel";
import { ForwardTrackPanel } from "../../../components/admin/modules/ForwardTrackPanel";
import { ClusterSummary } from "./ClusterSummary";
import { WeatheringPanel } from "./WeatheringPanel";
import { Lightbox } from "./Lightbox";
import { Radar, FastForward, Archive, Download, MapPin, ZoomIn, Play } from "lucide-react";

// Hourly checkpoints from T0 back to T-72h, inclusive of both endpoints —
// matches the backprop CSV's own per-particle row count.
const HINDCAST_CHECKPOINT_COUNT = 73;

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

  // Same tight zoom-to-fit as the Authorities portal's ATTRIBUTION toggle —
  // frames the density cluster plus where the top-15 vessels were actually
  // encountered near it, not their entire AIS history.
  const handleToggleAttribution = (incident) => {
    const next = activeAnalysisMode === "attribution" ? "none" : "attribution";
    setActiveAnalysisMode(next);
    if (next !== "attribution") return;

    const coords = (
      densityGridByIncident[incident.incident_id]?.features || []
    ).map((f) => f.geometry.coordinates);
    (topVesselsByIncident[incident.incident_id] || []).forEach((tv) => {
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
              className={`flex flex-col bg-navy-900 transition-all overflow-hidden ${
                isExpanded
                  ? "border border-brand-400 shadow-md rounded-lg"
                  : "border border-navy-800 rounded-md hover:border-navy-700"
              }`}
            >
              <button
                onClick={() => handleIncidentClick(inc)}
                className={`p-3 text-left flex flex-col gap-2 transition-colors ${
                  isExpanded ? "bg-brand-500/10" : "bg-navy-900"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span
                    className={`font-mono text-xs font-bold ${isExpanded ? "text-brand-300" : "text-slate-200"}`}
                  >
                    {inc.incident_id}
                  </span>
                </div>

                <div className="flex justify-between items-end w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                      DETECTED
                    </span>
                    <span className="text-xs font-medium text-slate-300">
                      {formatUTCDate(inc.detection_timestamp)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                      EST AREA
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {inc.slick_area_sqkm} km²
                    </span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="flex flex-col px-3 pb-3 border-t border-navy-800 mt-1 pt-3 animate-in fade-in duration-200 gap-4">
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                    RESEARCH TOOLS
                  </span>
                  <div className="grid grid-cols-2 gap-2 -mt-2">
                    <button
                      onClick={() => handleToggleAttribution(inc)}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                        activeAnalysisMode === "attribution"
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-inner"
                          : "border-navy-800 bg-navy-900 text-slate-300 hover:bg-navy-800"
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
                          ? "border-amber-500 bg-amber-500/10 text-amber-300 shadow-inner"
                          : "border-navy-800 bg-navy-900 text-slate-300 hover:bg-navy-800"
                      }`}
                    >
                      <FastForward className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold tracking-wider">
                        FORWARD FORECAST
                      </span>
                    </button>
                  </div>

                  {activeAnalysisMode === "attribution" && (
                    <div className="flex flex-col gap-4 p-3 bg-navy-900 border border-navy-800 rounded-md shadow-inner">
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
                          className="relative rounded-md border border-navy-800 overflow-hidden shadow-sm bg-navy-900 group text-left"
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
                      {multimemberAnimationUrlByIncident[inc.incident_id] && (
                        <button
                          onClick={() =>
                            setLightbox({
                              caption: `Backward trajectories across all forcing members — ${inc.incident_id}`,
                              node: (
                                <video
                                  src={multimemberAnimationUrlByIncident[inc.incident_id]}
                                  className="max-w-[92vw] max-h-[85vh] object-contain rounded-md shadow-2xl"
                                  autoPlay
                                  loop
                                  muted
                                  controls
                                  playsInline
                                />
                              ),
                            })
                          }
                          className="relative rounded-md border border-navy-800 overflow-hidden shadow-sm bg-navy-900 group text-left"
                        >
                          <video
                            src={multimemberAnimationUrlByIncident[inc.incident_id]}
                            className="w-full h-auto block"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors">
                            <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
                      )}

                      <div className="w-full h-px bg-navy-800" />
                      <ClusterSummary incidentId={inc.incident_id} />

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-500 tracking-wider px-1">
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
                            className="flex items-center gap-3 p-3 rounded-md bg-navy-900 border border-navy-800 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all text-left group"
                          >
                            <Archive className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="text-[10px] text-slate-500 leading-relaxed flex-1">
                              Backward-trajectory particle archive (10-particle
                              demo, 6 forcing members, {HINDCAST_CHECKPOINT_COUNT}{" "}
                              hourly checkpoints each)
                            </span>
                            <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 p-3 border border-dashed border-navy-700 rounded-md bg-navy-900">
                            <Archive className="w-4 h-4 text-slate-500 shrink-0" />
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
                    <div className="flex flex-col gap-4 p-3 bg-navy-900 border border-navy-800 rounded-md shadow-inner">
                      <ForwardTrackPanel />

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-500 tracking-wider px-1">
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
                            className="flex items-center gap-3 p-3 rounded-md bg-navy-900 border border-navy-800 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all text-left group"
                          >
                            <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-[10px] text-slate-500 leading-relaxed flex-1">
                              Forward trajectory archive (Parquet, 72h OpenOil
                              run)
                            </span>
                            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 p-3 border border-dashed border-navy-700 rounded-md bg-navy-900">
                            <Archive className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="text-[10px] text-slate-500 leading-relaxed">
                              Full forward trajectory archive has not been
                              provided for this incident yet.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-full h-px bg-navy-800" />
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
