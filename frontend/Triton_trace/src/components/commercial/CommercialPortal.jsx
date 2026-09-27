import { useState, useEffect } from "react";
import { TopHUD } from "../layout/TopHUD";
import { MapCanvas } from "../map/MapCanvas";
import { mockIncident } from "../../utils/mockData";
import { EnterpriseDashboard } from "./EnterpriseDashboard";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, PanelLeftOpen } from "lucide-react";
import { MapLegend } from "../map/MapLegend";

import { useIncident } from "../../context/IncidentContext";

// No layer-toggle UI on this portal — SAR slick polygons stay "on" at the
// Mapbox layer level, but MapCanvas's isolateToActiveIncident narrows the
// underlying data to just whichever spill is selected in the P&I picker (or
// both, if none is selected yet). The geofences layer is similarly always
// "on" but empty by default — onlyFocusedCandidate only fills it with the
// one zone a clicked vessel's route actually hits (see highlightedGeofenceName
// below), so no zone circles clutter the map unless one's being called out.
const STATIC_LAYERS = [
  { id: "sar_slick", label: "SAR Slick Polygons", active: true, color: "bg-cyan-500" },
  { id: "geofences", label: "Regional Alert Geofences", active: true, color: "bg-emerald-500" },
];

export function CommercialPortal() {
  const { logout } = useAuth();
  const { commercialFleet } = useIncident();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [engine, setEngine] = useState("leaflet");
  const [highlightedVessel, setHighlightedVessel] = useState(null);
  const [highlightedGeofenceName, setHighlightedGeofenceName] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 300);
    return () => clearTimeout(timeout);
  }, [isSidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // The Fleet Radar list is gone — the vessel an operator looks up by MMSI
  // in the Alibi Generator is now the single selection that drives P&I Risk
  // Assessor too, instead of a separate picker.
  const selectedVesselId = highlightedVessel?.id ?? null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      <TopHUD
        activeIncidentId={mockIncident.incident_id}
        demoMode={false}
        engine={engine}
      />

      <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* Collapsible Sidebar — same docked pattern as admin/normal */}
        <div
          className={`transition-all duration-300 ease-in-out flex flex-shrink-0 relative z-20 ${
            isSidebarOpen ? "w-80 lg:w-96" : "w-0"
          }`}
        >
          <div className="w-80 lg:w-96 h-full overflow-hidden bg-white shadow-xl flex flex-col relative">
            <EnterpriseDashboard
              onHighlightVessel={setHighlightedVessel}
              onHighlightGeofence={setHighlightedGeofenceName}
              onCollapse={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>

        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 p-2.5 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 text-slate-600 rounded-md shadow-md transition-all"
            title="Expand Panel"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 relative h-full w-full bg-slate-100 isolate">
          <MapCanvas
            interactive={true}
            onEngineResolved={(eng) => setEngine(eng)}
            // Appended so the "fly to selected vessel" lookup (keyed by
            // selectedVesselId against this array) can find the Alibi-looked-up
            // vessel too — showFleetTracks={false} still keeps the rest of the
            // top-10 fleet from rendering tracks by default.
            commercialFleet={highlightedVessel ? [...commercialFleet, highlightedVessel] : commercialFleet}
            selectedVesselId={selectedVesselId}
            layers={STATIC_LAYERS}
            showFleetTracks={false}
            showClusterCandidates={true}
            onlyFocusedCandidate={true}
            isolateToActiveIncident={true}
            highlightedVessel={highlightedVessel}
            highlightedGeofenceName={highlightedGeofenceName}
          />

          <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
            <MapLegend excludeIds={["hindcast_trajectory", "correlation_point", "watch_zone", "critical_zone"]} />
          </div>

          {/* Quick logout positioned bottom right for demo completeness */}
          <div className="absolute bottom-6 right-6 z-30">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center space-x-1 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition shadow-md"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-semibold">Switch Role</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
