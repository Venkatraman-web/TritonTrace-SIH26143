import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import geofencesData from "../../utils/regional_alert_geofences.json";
import { useIncident } from "../../context/IncidentContext";

// Fix Leaflet asset path resolution for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * FallbackLeaflet component
 * Silently mounts when Mapbox token is missing or initialization fails.
 * Uses CartoDB Dark Matter tiles for a tactical intelligence appearance.
 */
export const FallbackLeaflet = ({
  center = [31.35, 31.685], // Leaflet uses [Latitude, Longitude]
  zoom = 5.5,
  interactive = true,
  className = "",
  panToCoordinate,
  correlationMarker,
  commercialFleet = [],
  selectedVesselId = null,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const correlationMarkerRef = useRef(null);
  const {
    interactionMode,
    drawnPolygon,
    addPolygonVertex,
    cursorCoordinate,
    setCursorCoordinate,
    isPolygonClosed,
    setIsPolygonClosed,
    setPickedCoordinate,
  } = useIncident();
  const stateRef = useRef({ interactionMode, drawnPolygon, isPolygonClosed });
  useEffect(() => {
    stateRef.current = { interactionMode, drawnPolygon, isPolygonClosed };
  }, [interactionMode, drawnPolygon, isPolygonClosed]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      // Bounding box: Longitude 18.37°E to 45.0°E, Latitude 25.0°N to 37.7°N
      const bounds = L.latLngBounds([25.0, 18.37], [37.7, 45.0]);

      // Initialize Leaflet map instance
      const map = L.map(containerRef.current, {
        center: center,
        zoom: zoom,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
      });

      // CartoDB Dark Matter tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      // Attribution control in discreet corner
      L.control
        .attribution({
          position: "bottomright",
          prefix: false,
        })
        .addTo(map);

      if (interactive) {
        L.control.zoom({ position: "bottomright" }).addTo(map);
      }

      // Incident Slick Polygon for Med-Spill-017 centered at Lat 32.5, Lon 33.1
      const slickCoords = [
        [32.52, 33.05],
        [32.51, 33.15],
        [32.48, 33.25],
        [32.45, 33.28],
        [32.47, 33.2],
        [32.5, 33.08],
        [32.52, 33.05],
      ];

      L.polygon(slickCoords, {
        color: "#22d3ee",
        weight: 2,
        fillColor: "#22d3ee",
        fillOpacity: 0.25,
        dashArray: "4, 4",
      }).addTo(map);

      // Hindcast Origin Uncertainty Circle (1.8km radius)
      L.circle([32.35, 32.92], {
        radius: 1800,
        color: "#34d399",
        weight: 1.5,
        fillColor: "#34d399",
        fillOpacity: 0.15,
        dashArray: "3, 3",
      }).addTo(map);

      // Discharge drift vector line (from origin to slick)
      L.polyline(
        [
          [32.35, 32.92],
          [32.5, 33.1],
        ],
        {
          color: "#34d399",
          weight: 1.5,
          dashArray: "5, 5",
          opacity: 0.6,
        },
      ).addTo(map);

      // Target slick marker
      L.circleMarker([32.5, 33.1], {
        radius: 6,
        color: "#22d3ee",
        fillColor: "#0891b2",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      // AIS Correlated Vessel (Pacific Horizon)
      L.circleMarker([32.36, 32.93], {
        radius: 5,
        color: "#f43f5e",
        fillColor: "#f43f5e",
        fillOpacity: 0.9,
        weight: 1.5,
      }).addTo(map);

      // REGIONAL GEOFENCES
      L.geoJSON(geofencesData, {
        style: function (feature) {
          return {
            color: feature.properties.color,
            fillColor: feature.properties.color,
            fillOpacity: 0.2,
            weight: 1.5,
          };
        },
      }).addTo(map);

      // REGIONAL GEOFENCES
      L.geoJSON(geofencesData, {
        style: function (feature) {
          return {
            color: feature.properties.color,
            fillColor: feature.properties.color,
            fillOpacity: 0.2,
            weight: 1.5,
          };
        },
      }).addTo(map);

      mapRef.current = map;

      // Handle map clicks for picking and drawing
      map.on("click", (e) => {
        const { interactionMode, drawnPolygon, isPolygonClosed } = stateRef.current;
        
        if (interactionMode === "pick_coordinate") {
          setPickedCoordinate({ lat: e.latlng.lat, lon: e.latlng.lng });
          return;
        }

        if (interactionMode === "draw_polygon" && !isPolygonClosed) {
          const newPoint = [e.latlng.lng, e.latlng.lat];

          if (drawnPolygon.length >= 3) {
            const firstPoint = drawnPolygon[0];
            // Approximate distance in km using Leaflet's built-in distance method (returns meters)
            const firstLatLng = L.latLng(firstPoint[1], firstPoint[0]);
            const dist = firstLatLng.distanceTo(e.latlng) / 1000;

            if (dist < 50) {
              setIsPolygonClosed(true);
              setCursorCoordinate(null);
              return;
            }
          }
          addPolygonVertex(newPoint);
        }
      });

      map.on("mousemove", (e) => {
        const { interactionMode, isPolygonClosed } = stateRef.current;
        if (interactionMode === "draw_polygon" && !isPolygonClosed) {
          setCursorCoordinate([e.latlng.lng, e.latlng.lat]);
        }
      });

      map.on("dblclick", (e) => {
        const { interactionMode, drawnPolygon, isPolygonClosed } = stateRef.current;
        if (
          interactionMode === "draw_polygon" &&
          !isPolygonClosed &&
          drawnPolygon.length >= 3
        ) {
          // Prevent Leaflet double click zoom
          setIsPolygonClosed(true);
          setCursorCoordinate(null);
        }
      });

      // Invalidate size to guarantee crisp tile alignment
      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);

      return () => clearTimeout(timer);
    } catch (err) {
      // Suppress console-breaking errors per PRD requirements
      console.warn("FallbackLeaflet initialization error handled:", err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, interactive]);

  // Update center/zoom if changed
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Pan to requested incident or asset coordinate. When `trajectory` is
  // present, fit the whole route in view instead of flying tight to a point.
  useEffect(() => {
    if (!mapRef.current) return;
    if (panToCoordinate?.trajectory?.length >= 2) {
      const latLngs = panToCoordinate.trajectory.map(([lon, lat]) => [lat, lon]);
      mapRef.current.flyToBounds(latLngs, { padding: [60, 60], duration: 1.2 });
    } else if (panToCoordinate?.lat && panToCoordinate?.lon) {
      mapRef.current.flyTo([panToCoordinate.lat, panToCoordinate.lon], panToCoordinate.zoom ?? 7.5, {
        duration: 1.2,
      });
    }
  }, [panToCoordinate]);

  // Fly to selected vessel
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedVesselId && commercialFleet.length > 0) {
      const vessel = commercialFleet.find((v) => v.id === selectedVesselId);
      if (vessel && vessel.lat !== undefined && vessel.lon !== undefined) {
        mapRef.current.flyTo([vessel.lat, vessel.lon], 9, {
          animate: true,
          duration: 1.5,
        });
      }
    }
  }, [selectedVesselId, commercialFleet]);

  // Render or remove AIS Intersect target marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (correlationMarkerRef.current) {
      correlationMarkerRef.current.remove();
      correlationMarkerRef.current = null;
    }
    if (correlationMarker && correlationMarker.length >= 2) {
      // correlationMarker is [lon, lat] -> Leaflet uses [lat, lon]
      const lat = correlationMarker[1];
      const lon = correlationMarker[0];
      const targetIcon = L.divIcon({
        className: "custom-crosshair-marker",
        html: `<div style="width:24px;height:24px;border:2px solid #f43f5e;border-radius:50%;background:rgba(244,63,94,0.25);box-shadow:0 0 12px #f43f5e;display:flex;align-items:center;justify-content:center;animation:pulse 1.5s infinite;">
                 <div style="width:6px;height:6px;background:#f43f5e;border-radius:50%;"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      correlationMarkerRef.current = L.marker([lat, lon], {
        icon: targetIcon,
      }).addTo(mapRef.current);
    }
  }, [correlationMarker]);

  // Commercial Fleet Markers
  const fleetMarkersRef = useRef({});
  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(fleetMarkersRef.current).forEach((marker) => marker.remove());
    fleetMarkersRef.current = {};

    commercialFleet.forEach((vessel) => {
      const icon = L.divIcon({
        className: "custom-fleet-marker",
        html: `<div class="w-5 h-5 bg-cyan-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold" style="box-shadow: 0 0 12px rgba(6,182,212,0.8); transform: rotate(${vessel.heading || 0}deg);">↑</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      fleetMarkersRef.current[vessel.id] = L.marker([vessel.lat, vessel.lon], {
        icon,
      }).addTo(mapRef.current);
    });
  }, [commercialFleet]);

  // Render Drawn Polygon
  const drawnPolygonRef = useRef(null);
  const cursorLineRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (drawnPolygonRef.current) {
      drawnPolygonRef.current.remove();
      drawnPolygonRef.current = null;
    }
    if (cursorLineRef.current) {
      cursorLineRef.current.remove();
      cursorLineRef.current = null;
    }

    if (drawnPolygon.length > 0) {
      const latlngs = drawnPolygon.map(p => [p[1], p[0]]); // [lat, lon]
      
      if (drawnPolygon.length < 3 || (!isPolygonClosed && interactionMode === "draw_polygon")) {
        // Draw as polyline
        const lineCoords = [...latlngs];
        if (!isPolygonClosed && cursorCoordinate) {
          lineCoords.push([cursorCoordinate[1], cursorCoordinate[0]]);
        }
        drawnPolygonRef.current = L.polyline(lineCoords, {
          color: "#4f46e5",
          weight: 2,
          dashArray: "4, 4"
        }).addTo(mapRef.current);
      } else {
        // Draw as polygon
        drawnPolygonRef.current = L.polygon(latlngs, {
          color: "#4f46e5",
          weight: 2,
          fillColor: "#4f46e5",
          fillOpacity: 0.3,
          dashArray: "4, 4"
        }).addTo(mapRef.current);
      }
    }
  }, [drawnPolygon, cursorCoordinate, isPolygonClosed, interactionMode]);

  return (
    <div
      className={`relative h-full w-full select-none overflow-hidden bg-slate-950 ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Tactical Engine Indicator */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center space-x-1.5 rounded border border-slate-800 bg-slate-950/85 px-2.5 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>MAP ENGINE: LEAFLET (CARTODB DARK MATTER)</span>
        <span className="text-slate-600">·</span>
        <span className="text-amber-300">FALLBACK ACTIVE</span>
      </div>
    </div>
  );
};

export default FallbackLeaflet;
