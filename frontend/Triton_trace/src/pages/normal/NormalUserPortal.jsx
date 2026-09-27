import { useState, useEffect } from "react";
import { NormalUserLeft } from "./NormalUserLeft";
import { MapCanvas } from "../../components/map/MapCanvas"; // Assumes MapCanvas is your main unified map component
import { TopHUD } from "../../components/layout/TopHUD";
import { PanelLeftOpen } from "lucide-react";
import { mockIncident } from "../../utils/mockData";
import { LayerControl } from "../../components/map/LayerControl";
import { MapLegend } from "../../components/map/MapLegend";

const INITIAL_LAYERS = [
  { id: "sar_slick", label: "SAR Slick Polygons", active: true, color: "bg-cyan-500" },
  { id: "geofences", label: "Regional Alert Geofences", active: false, color: "bg-emerald-500" },
];

export const NormalUserPortal = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [engine, setEngine] = useState("leaflet");
  const [layers, setLayers] = useState(INITIAL_LAYERS);

  const toggleLayer = (id) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, active: !layer.active } : layer
      )
    );
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 300);
    return () => clearTimeout(timeout);
  }, [isSidebarOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-navy-900 text-white overflow-hidden font-sans">
      <TopHUD
        activeIncidentId={mockIncident.incident_id}
        demoMode={false}
        engine={engine}
      />

      <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* Collapsible Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out flex flex-shrink-0 relative z-20 ${
            isSidebarOpen ? "w-80 lg:w-96" : "w-0"
          }`}
        >
          <div className="w-80 lg:w-96 h-full overflow-hidden bg-navy-900 shadow-xl flex flex-col relative">
            <NormalUserLeft onCollapse={() => setIsSidebarOpen(false)} />
          </div>
        </div>

        {/* Expand Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 p-2.5 bg-navy-900 border border-navy-800 hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-400 text-slate-500 rounded-md shadow-md transition-all"
            title="Expand User Panel"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        )}

        {/* Map Canvas */}
        <div className="flex-1 relative h-full w-full bg-navy-800 isolate">
          <MapCanvas
            interactive={true}
            onEngineResolved={(eng) => setEngine(eng)}
            layers={layers}
            showHotspotMarkers={true}
            showClusterCandidates={true}
          />

          <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
            <LayerControl layers={layers} toggleLayer={toggleLayer} />
            <MapLegend
              excludeIds={["hindcast_trajectory", "ais_route", "correlation_point"]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
