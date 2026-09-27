import { useState } from "react";
import { ShieldCheck, AlertTriangle, PanelLeftClose, MapPin } from "lucide-react";
import { AlibiGenerator } from "./AlibiGenerator";
import { StatCard } from "../ui/StatCard";
import { useIncident } from "../../context/IncidentContext";
import { seedIncidents } from "../../data/seedIncidents";
import { formatUTCDateTime } from "../../lib/dateFormat";
import { displayScore } from "../../data/aisTopVessels";
import { PI_CLUBS, findVesselsByPiClub } from "../../data/piClubData";
import { computeVesselLiability, formatUsdCompact } from "../../lib/itopfLiability";

const MODES = [
  { id: "alibi", label: "Alibi Generator", icon: ShieldCheck, color: "text-blue-600" },
  { id: "pni", label: "P&I Risk Assessor", icon: AlertTriangle, color: "text-rose-600" },
];

export function EnterpriseDashboard({
  onHighlightVessel,
  onHighlightGeofence,
  onCollapse,
}) {
  const [mode, setMode] = useState("alibi");
  const {
    activeIncident,
    setActiveIncident,
    setActiveAnalysisMode,
    setPanToCoordinate,
    allVesselTracks,
  } = useIncident();
  const [selectedPiClub, setSelectedPiClub] = useState("");
  const [selectedLiabilityMmsi, setSelectedLiabilityMmsi] = useState(null);

  const handleSelectSpillForPi = (incident) => {
    setActiveIncident(incident.incident_id);
    setActiveAnalysisMode("attribution");
    setPanToCoordinate({ lat: incident.coordinates.lat, lon: incident.coordinates.lon });
    onHighlightVessel(null);
    onHighlightGeofence(null);
    setSelectedLiabilityMmsi(null);
  };

  const handleSelectPiClub = (club) => {
    setSelectedPiClub(club);
    onHighlightVessel(null);
    onHighlightGeofence(null);
    setSelectedLiabilityMmsi(null);
  };

  const activeSpill = seedIncidents.find((inc) => inc.incident_id === activeIncident);
  const flaggedVessels = selectedPiClub && activeIncident ? findVesselsByPiClub(activeIncident, selectedPiClub) : [];
  // Liability is per vessel (its own route decides the hotspot multiplier)
  // even though the underlying slick mass is the same for every vessel
  // implicated in the same incident.
  const flaggedVesselsWithLiability = flaggedVessels.map((v) => {
    const track = allVesselTracks.find((t) => t.id === v.mmsi);
    const liability =
      track?.trajectory?.length >= 2 && activeSpill
        ? computeVesselLiability(track.trajectory, activeSpill.slick_area_sqkm)
        : null;
    return { ...v, track, liability };
  });

  // Shows this vessel's real track on the map and, if its route actually
  // hits a geofence, calls out that specific zone — the "which hotspot
  // does it hit" the liability figure is based on.
  const handleSelectVesselForLiability = (v) => {
    if (v.track) {
      onHighlightVessel(v.track);
      setPanToCoordinate({ trajectory: v.track.trajectory });
    }
    const asset = v.liability?.threatenedAsset;
    onHighlightGeofence(asset && !asset.startsWith("Open Sea") ? asset : null);
    setSelectedLiabilityMmsi(v.mmsi);
  };

  return (
    <aside className="w-full h-full bg-white flex flex-col shrink-0 border-r border-slate-200 text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs font-bold tracking-wider text-slate-900 uppercase">
          Commercial Operations
        </span>
        <button
          onClick={onCollapse}
          className="shrink-0 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
          title="Collapse Panel"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50 shrink-0">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold tracking-wide transition-colors ${
                isActive
                  ? `bg-white shadow-sm border border-slate-200 ${m.color}`
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {mode === "alibi" && <AlibiGenerator onHighlightVessel={onHighlightVessel} />}

        {mode === "pni" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
              <AlertTriangle className="h-4 w-4" />
              <span>P&amp;I RISK ASSESSOR</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                1. Select your P&amp;I club
              </span>
              <select
                value={selectedPiClub}
                onChange={(e) => handleSelectPiClub(e.target.value)}
                className="px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md bg-white text-slate-800"
              >
                <option value="">Choose a club…</option>
                {PI_CLUBS.map((club) => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {selectedPiClub && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  2. Select an oil spill
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {seedIncidents.map((inc) => {
                    const isActive = activeIncident === inc.incident_id;
                    return (
                      <button
                        key={inc.incident_id}
                        onClick={() => handleSelectSpillForPi(inc)}
                        className={`flex flex-col items-start p-2.5 rounded-md border text-left transition-all ${
                          isActive
                            ? "border-rose-500 bg-rose-50 shadow-inner"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`font-mono text-xs font-bold ${isActive ? "text-rose-700" : "text-slate-800"}`}
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
              </div>
            )}

            {selectedPiClub &&
              activeIncident &&
              (flaggedVessels.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5 font-semibold">
                    {flaggedVessels.length} {selectedPiClub}-insured vessel
                    {flaggedVessels.length > 1 ? "s" : ""} flagged as a probable
                    source for {activeIncident}.
                  </div>
                  {flaggedVesselsWithLiability.map((v) => (
                    <button
                      key={v.mmsi}
                      type="button"
                      onClick={() => handleSelectVesselForLiability(v)}
                      className={`flex flex-col gap-2 p-3 rounded-md border text-left transition-colors ${
                        selectedLiabilityMmsi === v.mmsi
                          ? "border-rose-400 bg-rose-50 shadow-inner"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {v.vesselName}
                        </span>
                        {selectedLiabilityMmsi === v.mmsi ? (
                          <span className="flex items-center gap-1 text-[10px] text-violet-700">
                            <MapPin className="w-3 h-3" /> Shown on map
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">MMSI {v.mmsi}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard
                          label="AIS5 SCORE"
                          value={`${displayScore(v.attributionScore)}%`}
                        />
                        <StatCard label="RANK" value={`#${v.rank} of 15`} />
                        <StatCard
                          label="CLOSEST ENCOUNTER"
                          value={`${v.minSyncDistanceKm.toFixed(2)} km`}
                        />
                        <StatCard
                          label="CLOSE ENCOUNTERS"
                          value={v.exactCloseEncounterCount}
                        />
                      </div>

                      {v.liability && (
                        <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                              Estimated liability
                            </span>
                            <span className="text-[9px] font-bold text-slate-500">
                              {v.liability.itopfTier.tier} · {v.liability.itopfTier.label}
                            </span>
                          </div>
                          <div className="text-xl font-bold text-rose-700">
                            {formatUsdCompact(v.liability.totalLiabilityUsd)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {v.liability.hotspotMultiplier.toFixed(1)}x hotspot multiplier ·{" "}
                            {v.liability.threatenedAsset}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
                  No {selectedPiClub} vessels appear in this incident's
                  top-15 probable sources.
                </div>
              ))}
          </div>
        )}

      </div>
    </aside>
  );
}
