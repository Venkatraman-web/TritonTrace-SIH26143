import { useMemo } from "react";
import { useIncident } from "../../../context/IncidentContext";
import { MousePointer2, Trash2 } from "lucide-react";
import * as turf from "@turf/turf";
import { seedIncidents } from "../../../data/seedIncidents";
import { getIncidentsInsidePolygon } from "../../../lib/geoMath";

export const ManualMappingPanel = () => {
  const {
    interactionMode,
    setInteractionMode,
    drawnPolygon,
    clearPolygon,
    setActiveIncident,
    cursorCoordinate,
    isPolygonClosed,
  } = useIncident();
  const isDrawing = interactionMode === "draw_polygon";

  const toggleDrawing = () =>
    setInteractionMode(isDrawing ? "none" : "draw_polygon");

  const metrics = useMemo(() => {
    if (
      drawnPolygon.length < 2 &&
      (!cursorCoordinate || (drawnPolygon.length < 3 && isPolygonClosed))
    )
      return { area: 0, perimeter: 0 };
    try {
      const coords = [...drawnPolygon];
      if (!isPolygonClosed && cursorCoordinate) coords.push(cursorCoordinate);
      if (coords.length < 3) return { area: 0, perimeter: 0 };
      coords.push(coords[0]);

      const polygon = turf.polygon([coords]);
      return {
        area: (turf.area(polygon) / 1000000).toFixed(2),
        perimeter: turf.length(polygon, { units: "kilometers" }).toFixed(2),
      };
    } catch (e) {
      return { area: 0, perimeter: 0 };
    }
  }, [drawnPolygon, cursorCoordinate, isPolygonClosed]);

  const containedIncidents = useMemo(() => {
    if (!isPolygonClosed || drawnPolygon.length < 3) return [];
    return getIncidentsInsidePolygon(drawnPolygon, seedIncidents);
  }, [drawnPolygon, isPolygonClosed]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
        Manual Mapping
      </h2>

      <div className="flex flex-col gap-4 bg-navy-900 p-4 rounded-md border border-navy-800 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider">
            DRAW MODE
          </span>
          <button
            onClick={toggleDrawing}
            className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-md border transition-colors ${
              isDrawing
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-navy-900 text-slate-300 border-navy-800 hover:bg-navy-800"
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5 mr-1.5" />
            {isDrawing ? "ACTIVE" : "ENABLE"}
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Click on the map to drop vertices. You need at least 3 points to form
          a polygon.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col p-3 bg-navy-900 rounded border border-navy-800">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider">
              EST. AREA
            </span>
            <span className="font-mono text-brand-300 font-bold text-lg">
              {metrics.area}{" "}
              <span className="text-xs text-slate-500 font-sans">km²</span>
            </span>
          </div>
          <div className="flex flex-col p-3 bg-navy-900 rounded border border-navy-800">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider">
              PERIMETER
            </span>
            <span className="font-mono text-brand-300 font-bold text-lg">
              {metrics.perimeter}{" "}
              <span className="text-xs text-slate-500 font-sans">km</span>
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2 pt-4 border-t border-navy-800">
          <span className="text-[10px] font-mono font-bold text-slate-500">
            {drawnPolygon.length} VERTICES
          </span>
          <button
            onClick={clearPolygon}
            className="flex items-center text-xs font-bold text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> CLEAR
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
          Incidents In Envelope
        </h3>

        {isPolygonClosed ? (
          containedIncidents.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-brand-300 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/30 w-max mb-1">
                {containedIncidents.length} Detected
              </span>
              {containedIncidents.map((inc) => (
                <button
                  key={inc.incident_id}
                  onClick={() => setActiveIncident(inc.incident_id)}
                  className="flex flex-col gap-1.5 p-3 bg-navy-900 border border-navy-800 rounded-md hover:border-navy-700 hover:shadow-sm text-left transition-all"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-mono font-bold text-xs text-white">
                      {inc.incident_id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {inc.slick_area_sqkm} km²
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-navy-700 rounded-md bg-navy-900 text-center">
              <span className="text-xs text-slate-500">
                0 historical incidents within current perimeter
              </span>
            </div>
          )
        ) : (
          <div className="p-4 border border-navy-800 rounded-md bg-navy-900 text-center">
            <span className="text-xs text-slate-500">
              {drawnPolygon.length > 0
                ? "Double-click map to close polygon"
                : "Draw a polygon to scan for incidents"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
