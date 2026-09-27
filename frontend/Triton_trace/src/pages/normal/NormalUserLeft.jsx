import React, { useState } from "react";
import { Layers, History, PenTool, Radio, PanelLeftClose } from "lucide-react";
import { useIncident } from "../../context/IncidentContext";
import { HistoricalFeed } from "./modules/HistoricalFeed";
import { IncidentReportForm } from "./modules/IncidentReportForm";
import { ManualMappingPanel } from "./modules/ManualMappingPanel";
import { SpillClassifier } from "./modules/SpillClassifier";

export const NormalUserLeft = ({ onCollapse }) => {
  const [activeTab, setActiveTab] = useState("history");
  const { setActiveAnalysisMode, setCorrelationMarker, setInteractionMode, clearPolygon } =
    useIncident();

  const tabs = [
    { id: "report", icon: Radio, label: "Report" },
    { id: "history", icon: History, label: "Historical Feed" },
    { id: "map", icon: PenTool, label: "Map" },
    { id: "classifier", icon: Layers, label: "Analysis" },
  ];

  // Each tab owns its own map-affecting tool (attribution/forward-track on
  // Historical Feed, draw-polygon on Map) — leaving one of those active
  // while switching to a different tab would leave its overlay stuck on the
  // map, so every tab switch clears them regardless of which way you're going.
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveAnalysisMode("none");
    setCorrelationMarker(null);
    setInteractionMode("none");
    clearPolygon();
  };

  return (
    <aside className="w-full h-full bg-navy-900 flex flex-col shrink-0 z-40 border-r border-navy-800">
      {/* Top Tab Navigation */}
      <div className="flex items-center justify-between border-b border-navy-800 bg-navy-900 px-2 pt-2">
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-2.5 px-2 flex flex-col items-center justify-center transition-colors ${
                activeTab === tab.id
                  ? "text-brand-300 border-b-2 border-brand-600 bg-navy-900"
                  : "text-slate-500 border-b-2 border-transparent hover:text-slate-200 hover:bg-navy-700/50"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Collapse Button */}
        <button
          onClick={onCollapse}
          className="flex-shrink-0 p-1.5 ml-2 mr-1 mb-1 text-slate-500 hover:text-slate-200 hover:bg-navy-700 rounded transition-colors"
          title="Collapse Panel"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Module Container */}
      <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar bg-navy-900/30">
        {activeTab === "report" && <IncidentReportForm />}
        {activeTab === "history" && <HistoricalFeed />}
        {activeTab === "map" && <ManualMappingPanel />}
        {activeTab === "classifier" && <SpillClassifier />}
      </div>
    </aside>
  );
};
