import { useState, useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FallbackLeaflet } from "./FallbackLeaflet";
import { useIncident } from "../../context/IncidentContext";
import geofencesData from "../../utils/regional_alert_geofences.json";
import { densityGridByIncident } from "../../data/densityGrid";
import { topVesselsByIncident, colorForRank } from "../../data/aisTopVessels";
import { incidentParticlesById } from "../../data/incidentParticles";
import { computeHotspotStatuses } from "../../data/hotspotTimeline";
import { topOriginCandidatesByIncident } from "../../data/topOriginCandidates";
import { formatUTCDateTime } from "../../lib/dateFormat";
import * as turf from "@turf/turf";

const HOTSPOT_STATUS_COLORS = {
  CRITICAL: "#ef4444",
  WATCH: "#f59e0b",
  CLEAR: "#94a3b8",
};

const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection", features: [] };

// Applies the layer panel's on/off state to the underlying Mapbox layers.
// Shared by the initial "load" handler (so default-active layers are
// visible on first paint) and the ongoing styledata-driven sync effect.
const applyLayerVisibility = (map, layers) => {
  layers.forEach((layer) => {
    const visibility = layer.active ? "visible" : "none";
    if (layer.id === "sar_slick") {
      if (map.getLayer("sar_slick-halo"))
        map.setLayoutProperty("sar_slick-halo", "visibility", visibility);
      if (map.getLayer("sar_slick-points"))
        map.setLayoutProperty("sar_slick-points", "visibility", visibility);
    } else if (layer.id === "ais_tracks") {
      if (map.getLayer("ais_tracks-line"))
        map.setLayoutProperty("ais_tracks-line", "visibility", visibility);
      if (map.getLayer("live-vessels-symbol"))
        map.setLayoutProperty("live-vessels-symbol", "visibility", visibility);
    } else if (layer.id === "geofences") {
      if (map.getLayer("geofences-line"))
        map.setLayoutProperty("geofences-line", "visibility", visibility);
      if (map.getLayer("geofences-fill"))
        map.setLayoutProperty("geofences-fill", "visibility", visibility);
    }
  });
};

export const MapCanvas = ({
  interactive = true,
  className = "",
  onEngineResolved,
  layers = [],
  commercialFleet = [],
  selectedVesselId = null,
  // Off only for the commercial portal, which shows a specific vessel's
  // track on demand (Alibi Generator) rather than every fleet vessel's by
  // default — on everywhere else so existing behavior is unchanged.
  showFleetTracks = true,
  // A single vessel to spotlight with its own distinct track/marker,
  // independent of the generic fleet-tracks layer — the commercial
  // portal's Alibi Generator uses this for whichever vessel an operator
  // just looked up by MMSI, which may not be in commercialFleet at all.
  highlightedVessel = null,
  // Researcher-portal-only overlays for the backward ATTRIBUTION view — off
  // by default so the admin/commercial maps render exactly as before.
  showHotspotMarkers = false,
  showClusterCandidates = false,
  // When true, only the currently-focused candidate cluster is rendered
  // (instead of the full candidate list with one merely highlighted) —
  // used by the commercial portal, where a looked-up vessel's single
  // matched cluster is the only one that matters. Also gates geofences
  // (see highlightedGeofenceName below).
  onlyFocusedCandidate = false,
  // Commercial's P&I Risk Assessor: the name of the one geofence zone a
  // clicked vessel's route actually hits (its liability "threatened
  // asset"), shown on the map only while onlyFocusedCandidate is true.
  highlightedGeofenceName = null,
  // Admin/Investigator only: narrow the SAR slick + AIS fleet down to just
  // whichever triage card is selected (activeIncident), instead of always
  // showing both incidents at once. Off elsewhere — the commercial portal
  // also uses activeIncident (for its own spill picker), but its SAR slick
  // polygons are meant to always show regardless of that selection.
  isolateToActiveIncident = false,
}) => {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const defaultLat = Number(import.meta.env.VITE_DEFAULT_LAT) || 33.5;
  const defaultLon = Number(import.meta.env.VITE_DEFAULT_LON) || 34.9;
  const defaultZoom = Number(import.meta.env.VITE_DEFAULT_ZOOM) || 6.5;

  const {
    panToCoordinate,
    correlationMarker,
    interactionMode,
    drawnPolygon,
    addPolygonVertex,
    cursorCoordinate,
    setCursorCoordinate,
    isPolygonClosed,
    setIsPolygonClosed,
    pickedCoordinate,
    setPickedCoordinate,
    allIncidentParticles,
    activeAnalysisMode,
    activeIncident,
    vesselFleetByIncident,
    focusedVesselMmsi,
    focusedCandidateId,
    focusVessel,
    forwardTrackIncidentId,
    forwardTrackStep,
    forwardTrajectory,
  } = useIncident();

  // Which incident's source-attribution view (density cluster + top-15
  // routes/intersections) is currently open, if any.
  const attributionIncidentId =
    activeAnalysisMode === "attribution" ? activeIncident : null;

  const initialViewState = {
    longitude: defaultLon,
    latitude: defaultLat,
    zoom: defaultZoom,
  };

  const sarSlickParticlesGeoJSON = useMemo(() => {
    // While FORWARD TRACK is open, or (admin only) a single triage card is
    // selected, only that incident's own slick stays on the map — the
    // other incident's is hidden. Otherwise both show at once.
    const singleIncidentId =
      forwardTrackIncidentId ||
      (isolateToActiveIncident ? activeIncident : null);
    const particles = singleIncidentId
      ? incidentParticlesById[singleIncidentId] || []
      : allIncidentParticles;
    return {
      type: "FeatureCollection",
      features: particles.map((p) => ({
        type: "Feature",
        properties: { id: p.id, confidence: p.confidence },
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      })),
    };
  }, [
    allIncidentParticles,
    forwardTrackIncidentId,
    activeIncident,
    isolateToActiveIncident,
  ]);

  // The current forward-track step's actual particle positions — the
  // single source of truth for both what's drawn on the map and which
  // hotspots have really been entered (see geofencesGeoJSON below).
  const currentStepParticles = useMemo(() => {
    const frames = forwardTrajectory.particlesByStep;
    if (!forwardTrackIncidentId || frames.length === 0) return [];
    const step = Math.min(forwardTrackStep, frames.length - 1);
    return frames[step] || [];
  }, [forwardTrackIncidentId, forwardTrackStep, forwardTrajectory]);

  // Real forward-drift particle positions at the current hour, plus each
  // particle's cumulative drift path from t0 up to that hour — mirrors
  // final.png's cream parcels + dark-blue drift-path lines.
  const forwardTrackGeoJSON = useMemo(() => {
    const frames = forwardTrajectory.particlesByStep;
    if (!forwardTrackIncidentId || frames.length === 0) {
      return { points: EMPTY_FEATURE_COLLECTION, paths: EMPTY_FEATURE_COLLECTION };
    }
    const step = Math.min(forwardTrackStep, frames.length - 1);
    const currentFrame = currentStepParticles;

    const pointFeatures = currentFrame.map((p, i) => ({
      type: "Feature",
      properties: { id: i },
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    }));

    const pathFeatures = [];
    for (let i = 0; i < currentFrame.length; i++) {
      const coords = [];
      for (let s = 0; s <= step; s++) {
        const point = frames[s] && frames[s][i];
        if (point) coords.push([point.lon, point.lat]);
      }
      if (coords.length >= 2) {
        pathFeatures.push({
          type: "Feature",
          properties: { id: i },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    }

    return {
      points: { type: "FeatureCollection", features: pointFeatures },
      paths: { type: "FeatureCollection", features: pathFeatures },
    };
  }, [forwardTrackIncidentId, forwardTrackStep, forwardTrajectory, currentStepParticles]);

  // Regional geofences: normally always shown with their static Watch/
  // Critical colors, but while FORWARD TRACK is open they instead only
  // highlight once the current step's actual particles have entered that
  // hotspot's own zone (computeHotspotStatuses checks real point-in-polygon
  // against the same geofences drawn on the map, not a separately
  // precomputed table that could disagree with what's actually rendered).
  const geofencesGeoJSON = useMemo(() => {
    // Commercial's Alibi/P&I flow keeps geofences off entirely except to
    // call out the one specific zone a clicked vessel's route hits (the
    // P&I liability estimate's "threatened asset") — never the full set.
    if (onlyFocusedCandidate) {
      const matched = highlightedGeofenceName
        ? geofencesData.features.filter((f) => f.properties.name === highlightedGeofenceName)
        : [];
      return {
        ...geofencesData,
        features: matched.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            displayColor: f.properties.color,
            displayOpacity: 0.4,
            displayLineOpacity: 1,
          },
        })),
      };
    }
    if (!forwardTrackIncidentId) {
      return {
        ...geofencesData,
        features: geofencesData.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            displayColor: f.properties.color,
            displayOpacity: 0.2,
            displayLineOpacity: 1,
          },
        })),
      };
    }
    const statuses = computeHotspotStatuses(currentStepParticles);
    return {
      ...geofencesData,
      features: geofencesData.features.map((f) => {
        const status = statuses[f.properties.name] || "CLEAR";
        const zoneMatchesStatus =
          (status === "CRITICAL" && f.properties.zone_level === "Critical Strike Zone") ||
          (status === "WATCH" && f.properties.zone_level === "Watch Zone");
        return {
          ...f,
          properties: {
            ...f.properties,
            displayColor: HOTSPOT_STATUS_COLORS[status],
            displayOpacity: zoneMatchesStatus ? 0.45 : 0,
            displayLineOpacity: zoneMatchesStatus ? 1 : 0,
          },
        };
      }),
    };
  }, [forwardTrackIncidentId, currentStepParticles, onlyFocusedCandidate, highlightedGeofenceName]);

  // Commercial's Alibi/P&I flow hides the density heatmap until a vessel or
  // cluster is actually focused — an operator/underwriter shouldn't see the
  // full backtracked plume before they've picked a specific vessel or club.
  const attributionDensityGeoJSON = useMemo(() => {
    if (onlyFocusedCandidate && !focusedVesselMmsi && !focusedCandidateId) {
      return EMPTY_FEATURE_COLLECTION;
    }
    return densityGridByIncident[attributionIncidentId] || EMPTY_FEATURE_COLLECTION;
  }, [attributionIncidentId, onlyFocusedCandidate, focusedVesselMmsi, focusedCandidateId]);

  // Top 15 backtracked cluster candidate points (by source_score) for
  // whichever incident has ATTRIBUTION open — unlike
  // attributionVesselsGeoJSON.intersections below (only the candidates a
  // top-15 AIS vessel was matched against), this is ranked purely by
  // backtrack confidence, independent of any vessel match, so the researcher
  // view shows the strongest candidates rather than the vessel-correlated
  // subset the investigator view focuses on.
  const clusterCandidatesGeoJSON = useMemo(() => {
    if (!showClusterCandidates || !attributionIncidentId)
      return EMPTY_FEATURE_COLLECTION;
    const allCandidates = topOriginCandidatesByIncident[attributionIncidentId] || [];
    // Commercial's Alibi/P&I flow only ever cares about the one cluster a
    // looked-up vessel was actually matched to — show nothing until one is
    // focused, and then narrow down to just that point, instead of showing
    // the full candidate list (with one merely highlighted) at any point.
    let candidates = allCandidates;
    if (onlyFocusedCandidate) {
      candidates = focusedCandidateId
        ? allCandidates.filter((c) => c.candidateId === focusedCandidateId)
        : [];
    }
    return {
      type: "FeatureCollection",
      features: candidates
        .filter((c) => c.lat != null && c.lon != null)
        .map((c) => ({
          type: "Feature",
          properties: {
            candidateId: c.candidateId,
            sourceScore: c.sourceScore ?? 0,
            isFocused: focusedCandidateId === c.candidateId,
          },
          geometry: { type: "Point", coordinates: [c.lon, c.lat] },
        })),
    };
  }, [showClusterCandidates, attributionIncidentId, focusedCandidateId, onlyFocusedCandidate]);

  // Named hotspot locations (one point per zone name, deduped across its
  // Watch/Critical polygon pair) shown only while ATTRIBUTION is open, so a
  // researcher can see at a glance which known hotspots sit near the
  // backtracked density cluster.
  const hotspotMarkersGeoJSON = useMemo(() => {
    if (!showHotspotMarkers) return EMPTY_FEATURE_COLLECTION;
    const seen = new Set();
    const features = [];
    geofencesData.features.forEach((f) => {
      const name = f.properties.name;
      if (seen.has(name)) return;
      seen.add(name);
      const [lon, lat] = f.geometry.coordinates[0][0];
      features.push({
        type: "Feature",
        properties: { name },
        geometry: { type: "Point", coordinates: [lon, lat] },
      });
    });
    return { type: "FeatureCollection", features };
  }, [showHotspotMarkers]);

  // Top-15 vessel routes + where each one's route intersects the density
  // cluster (matched_candidate point), with a thin connector between a
  // vessel's own closest-approach position and that intersection point —
  // mirrors AIS_top15_tracks.png's flagged-vessel-vs-cluster view.
  const attributionVesselsGeoJSON = useMemo(() => {
    if (!attributionIncidentId) {
      return { routes: EMPTY_FEATURE_COLLECTION, intersections: EMPTY_FEATURE_COLLECTION, connectors: EMPTY_FEATURE_COLLECTION };
    }
    const fleetByMmsi = new Map(commercialFleet.map((v) => [v.id, v]));
    const allTopVessels = topVesselsByIncident[attributionIncidentId] || [];
    // Isolating one vessel or one origin candidate shows only the matching
    // route(s)/intersection(s)/connector(s) — a candidate can be matched by
    // more than one vessel (e.g. ow-0008's cand000).
    let topVessels = allTopVessels;
    if (focusedVesselMmsi) {
      topVessels = allTopVessels.filter((v) => v.mmsi === focusedVesselMmsi);
    } else if (focusedCandidateId) {
      topVessels = allTopVessels.filter(
        (v) => v.matchedCandidateId === focusedCandidateId,
      );
    } else if (onlyFocusedCandidate) {
      // Commercial's Alibi/P&I flow: no vessel markers at all until a
      // specific one is looked up — never the unfiltered top 15.
      topVessels = [];
    }
    const isFocused = Boolean(focusedVesselMmsi || focusedCandidateId);

    const routeFeatures = [];
    const intersectionFeatures = [];
    const connectorFeatures = [];

    topVessels.forEach((v) => {
      const color = colorForRank(v.rank);
      const track = fleetByMmsi.get(v.mmsi);
      if (track && track.trajectory && track.trajectory.length >= 2) {
        routeFeatures.push({
          type: "Feature",
          properties: { rank: v.rank, name: v.name, color, isFocused },
          geometry: { type: "LineString", coordinates: track.trajectory },
        });
      }

      if (v.matchedCandidateLon != null && v.matchedCandidateLat != null) {
        intersectionFeatures.push({
          type: "Feature",
          properties: {
            rank: v.rank,
            name: v.name,
            mmsi: v.mmsi,
            color,
            isFocused,
            encounterTime: v.bestEncounterTimestamp
              ? formatUTCDateTime(v.bestEncounterTimestamp)
              : "Unknown",
          },
          geometry: {
            type: "Point",
            coordinates: [v.matchedCandidateLon, v.matchedCandidateLat],
          },
        });

        if (v.bestEncounterLon != null && v.bestEncounterLat != null) {
          connectorFeatures.push({
            type: "Feature",
            properties: { rank: v.rank, color, isFocused },
            geometry: {
              type: "LineString",
              coordinates: [
                [v.bestEncounterLon, v.bestEncounterLat],
                [v.matchedCandidateLon, v.matchedCandidateLat],
              ],
            },
          });
        }
      }
    });

    return {
      routes: { type: "FeatureCollection", features: routeFeatures },
      intersections: { type: "FeatureCollection", features: intersectionFeatures },
      connectors: { type: "FeatureCollection", features: connectorFeatures },
    };
  }, [attributionIncidentId, commercialFleet, focusedVesselMmsi, focusedCandidateId, onlyFocusedCandidate]);

  // While ATTRIBUTION is open, the generic AIS layer narrows down to just
  // that incident's top-15 (already shown, colored, on the attribution
  // routes/intersections layers) instead of all 35 vessels — the extra 20
  // "nearest" vessels aren't relevant to a specific attribution and just
  // add clutter on top of it.
  const visibleVesselFleet = useMemo(() => {
    // Commercial portal opts out of showing every fleet vessel's track by
    // default (showFleetTracks=false) — routes there only appear once a
    // specific vessel is looked up (Alibi Generator), not for the whole
    // generic top-10 live fleet on load.
    if (!showFleetTracks) return [];
    // FORWARD TRACK is a single-incident view of the forecast only — no AIS.
    if (forwardTrackIncidentId) return [];
    if (!attributionIncidentId) {
      // Admin only: a single selected triage card narrows the fleet down
      // to just that incident's own 35 vessels instead of both incidents'.
      if (isolateToActiveIncident && activeIncident) {
        return vesselFleetByIncident[activeIncident] || [];
      }
      return commercialFleet;
    }
    if (focusedVesselMmsi)
      return commercialFleet.filter((v) => v.id === focusedVesselMmsi);
    const allTopVessels = topVesselsByIncident[attributionIncidentId] || [];
    const relevantVessels = focusedCandidateId
      ? allTopVessels.filter((v) => v.matchedCandidateId === focusedCandidateId)
      : allTopVessels;
    const topMmsiSet = new Set(relevantVessels.map((v) => v.mmsi));
    return commercialFleet.filter((v) => topMmsiSet.has(v.id));
  }, [
    showFleetTracks,
    commercialFleet,
    attributionIncidentId,
    focusedVesselMmsi,
    focusedCandidateId,
    forwardTrackIncidentId,
    isolateToActiveIncident,
    activeIncident,
    vesselFleetByIncident,
  ]);

  const highlightedVesselGeoJSON = useMemo(() => {
    if (!highlightedVessel || !highlightedVessel.trajectory || highlightedVessel.trajectory.length < 2) {
      return { track: EMPTY_FEATURE_COLLECTION, point: EMPTY_FEATURE_COLLECTION };
    }
    return {
      track: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: highlightedVessel.id },
            geometry: { type: "LineString", coordinates: highlightedVessel.trajectory },
          },
        ],
      },
      point: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: highlightedVessel.id, name: highlightedVessel.name },
            geometry: { type: "Point", coordinates: highlightedVessel.coordinates },
          },
        ],
      },
    };
  }, [highlightedVessel]);

  const vesselTracksGeoJSON = useMemo(() => {
    if (!visibleVesselFleet) return EMPTY_FEATURE_COLLECTION;
    return {
      type: "FeatureCollection",
      features: visibleVesselFleet
        .filter((v) => v.trajectory && v.trajectory.length >= 2)
        .map((vessel) => ({
          type: "Feature",
          properties: { id: vessel.id },
          geometry: {
            type: "LineString",
            coordinates: vessel.trajectory,
          },
        })),
    };
  }, [visibleVesselFleet]);

  const vesselPointsGeoJSON = useMemo(() => {
    if (!visibleVesselFleet) return EMPTY_FEATURE_COLLECTION;
    return {
      type: "FeatureCollection",
      features: visibleVesselFleet.map((vessel) => ({
        type: "Feature",
        properties: {
          id: vessel.id,
          name: vessel.name,
          heading: vessel.heading || 0,
          type: vessel.type || "Unknown",
        },
        geometry: {
          type: "Point",
          coordinates: vessel.coordinates,
        },
      })),
    };
  }, [visibleVesselFleet]);

  const aoiMaxBounds = [
    [18.37, 25.0],
    [45.0, 37.7],
  ];

  const [useFallback, setUseFallback] = useState(() => {
    if (!token || token.trim() === "") return true;
    if (!mapboxgl.supported || !mapboxgl.supported()) return true;
    return false;
  });

  const containerRef = useRef(null);
  const mapRef = useRef(null);

  // Create a ref for onEngineResolved to prevent infinite re-renders
  const engineResolvedRef = useRef(onEngineResolved);
  useEffect(() => {
    engineResolvedRef.current = onEngineResolved;
  }, [onEngineResolved]);

  const stateRef = useRef({ interactionMode, drawnPolygon, isPolygonClosed });
  useEffect(() => {
    stateRef.current = { interactionMode, drawnPolygon, isPolygonClosed };
  }, [interactionMode, drawnPolygon, isPolygonClosed]);

  useEffect(() => {
    if (useFallback) {
      if (engineResolvedRef.current) engineResolvedRef.current("leaflet");
      return;
    }

    try {
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [initialViewState.longitude, initialViewState.latitude],
        zoom: initialViewState.zoom,
        maxBounds: aoiMaxBounds,
        interactive: interactive,
        attributionControl: false,
      });

      map.on("error", (e) => {
        if (
          e &&
          e.error &&
          (e.error.status === 401 ||
            e.error.status === 403 ||
            e.error.message?.includes("token"))
        ) {
          setUseFallback(true);
          if (engineResolvedRef.current) engineResolvedRef.current("leaflet");
        }
      });

      map.on("load", () => {
        if (engineResolvedRef.current) engineResolvedRef.current("mapbox");

        try {
          // 1. SAR SLICK — real detected particles for the active incident
          // (initial_particles.csv). Dense overlapping points form the
          // visible slick shape; the halo layer gives it a soft edge glow.
          map.addSource("sar_slick-source", {
            type: "geojson",
            data: sarSlickParticlesGeoJSON,
          });
          map.addLayer({
            id: "sar_slick-halo",
            type: "circle",
            source: "sar_slick-source",
            layout: { visibility: "none" },
            paint: {
              "circle-radius": 7,
              "circle-color": "#2563eb",
              "circle-opacity": 0.14,
              "circle-blur": 1,
            },
          });
          map.addLayer({
            id: "sar_slick-points",
            type: "circle",
            source: "sar_slick-source",
            layout: { visibility: "none" },
            paint: {
              "circle-radius": 2.5,
              "circle-color": "#050403",
              "circle-opacity": 0.92,
            },
          });

          // 3. AIS TRACKS
          map.addSource("ais_tracks-source", {
            type: "geojson",
            data: vesselTracksGeoJSON,
          });
          map.addLayer({
            id: "ais_tracks-line",
            type: "line",
            source: "ais_tracks-source",
            layout: { visibility: "visible" },
            paint: {
              "line-color": "#94a3b8",
              "line-width": 2,
              "line-dasharray": [2, 2],
              "line-opacity": 0.8,
            },
          });

          // 3.5 LIVE VESSELS
          map.addSource("live-vessels-source", {
            type: "geojson",
            data: vesselPointsGeoJSON,
          });
          map.addLayer({
            id: "live-vessels-symbol",
            type: "symbol",
            source: "live-vessels-source",
            layout: {
              "text-field": "▲",
              "text-rotate": ["get", "heading"],
              "text-size": 18,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-pitch-alignment": "map",
            },
            paint: {
              "text-color": [
                "match",
                ["get", "type"],
                "Crude Oil Tanker",
                "#ef4444",
                "Chemical Tanker",
                "#f97316",
                "LNG Carrier",
                "#eab308",
                "#ffffff",
              ],
              "text-halo-color": "#1e293b",
              "text-halo-width": 1.5,
            },
          });

          // 4.5 HIGHLIGHTED VESSEL — one spotlighted vessel's real track +
          // position, for the commercial portal's Alibi Generator MMSI
          // lookup. Empty sources until a lookup actually resolves one.
          map.addSource("highlighted-vessel-track-source", {
            type: "geojson",
            data: highlightedVesselGeoJSON.track,
          });
          map.addLayer({
            id: "highlighted-vessel-track-line",
            type: "line",
            source: "highlighted-vessel-track-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#7c3aed",
              "line-width": 3,
              "line-opacity": 0.9,
            },
          });
          map.addSource("highlighted-vessel-point-source", {
            type: "geojson",
            data: highlightedVesselGeoJSON.point,
          });
          map.addLayer({
            id: "highlighted-vessel-point-halo",
            type: "circle",
            source: "highlighted-vessel-point-source",
            paint: {
              "circle-radius": 12,
              "circle-color": "#7c3aed",
              "circle-opacity": 0.25,
              "circle-blur": 0.6,
            },
          });
          map.addLayer({
            id: "highlighted-vessel-point-circle",
            type: "circle",
            source: "highlighted-vessel-point-source",
            paint: {
              "circle-radius": 6,
              "circle-color": "#7c3aed",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#f5f3ff",
            },
          });
          map.addLayer({
            id: "highlighted-vessel-point-label",
            type: "symbol",
            source: "highlighted-vessel-point-source",
            layout: {
              "text-field": ["get", "name"],
              "text-size": 10,
              "text-offset": [0, 1.3],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
            },
            paint: {
              "text-color": "#f5f3ff",
              "text-halo-color": "#4c1d95",
              "text-halo-width": 1.2,
            },
          });

          // 5. REGIONAL GEOFENCES — displayColor/displayOpacity default to
          // the static always-shown styling, and switch to reflect the real
          // per-hour hotspot status while FORWARD TRACK is open (see
          // geofencesGeoJSON).
          map.addSource("geofences-source", {
            type: "geojson",
            data: geofencesGeoJSON,
          });
          map.addLayer({
            id: "geofences-fill",
            type: "fill",
            source: "geofences-source",
            paint: {
              "fill-color": ["get", "displayColor"],
              "fill-opacity": ["get", "displayOpacity"],
            },
          });
          map.addLayer({
            id: "geofences-line",
            type: "line",
            source: "geofences-source",
            paint: {
              "line-color": ["get", "displayColor"],
              "line-width": 1.5,
              "line-opacity": ["get", "displayLineOpacity"],
            },
          });

          // 5.5 FORWARD TRACK — real OpenOil forward-drift particles at the
          // current hour + each particle's cumulative drift path so far.
          // Sources start empty and are filled by the sync effect below.
          map.addSource("forward-track-path-source", {
            type: "geojson",
            data: forwardTrackGeoJSON.paths,
          });
          map.addLayer({
            id: "forward-track-path-line",
            type: "line",
            source: "forward-track-path-source",
            paint: { "line-color": "#1e3a8a", "line-width": 1, "line-opacity": 0.5 },
          });
          map.addSource("forward-track-points-source", {
            type: "geojson",
            data: forwardTrackGeoJSON.points,
          });
          map.addLayer({
            id: "forward-track-points-circle",
            type: "circle",
            source: "forward-track-points-source",
            paint: {
              "circle-radius": 4,
              "circle-color": "#fef3c7",
              "circle-stroke-width": 1,
              "circle-stroke-color": "#78350f",
            },
          });

          // 6.5 SOURCE ATTRIBUTION — density cluster + top-15 routes/intersections
          // for whichever incident has ATTRIBUTION open. Sources start empty and
          // are filled by the sync effects below; layout stays "visible" since an
          // empty FeatureCollection already renders nothing.
          map.addSource("attribution-density-source", {
            type: "geojson",
            data: attributionDensityGeoJSON,
          });
          // Each grid cell's own density value is colored directly (viridis
          // scale, matching the source Python plots), rather than using a
          // KDE-style heatmap layer — the grid is already a raster of real
          // computed values, so summing overlapping points would misrepresent it.
          map.addLayer({
            id: "attribution-density-heatmap",
            type: "circle",
            source: "attribution-density-source",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 12, 9],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "density"],
                0, "#440154",
                0.25, "#3b528b",
                0.5, "#21908d",
                0.75, "#5dc963",
                1, "#fde725",
              ],
              "circle-opacity": 0.75,
              "circle-blur": 0.4,
            },
          });

          map.addSource("attribution-routes-source", {
            type: "geojson",
            data: attributionVesselsGeoJSON.routes,
          });
          map.addLayer({
            id: "attribution-routes-line",
            type: "line",
            source: "attribution-routes-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["case", ["get", "isFocused"], 4, 1.5],
              "line-opacity": ["case", ["get", "isFocused"], 1, 0.85],
            },
          });

          map.addSource("attribution-connectors-source", {
            type: "geojson",
            data: attributionVesselsGeoJSON.connectors,
          });
          map.addLayer({
            id: "attribution-connectors-line",
            type: "line",
            source: "attribution-connectors-source",
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["case", ["get", "isFocused"], 2, 1],
              "line-dasharray": [1, 1.5],
              "line-opacity": 0.9,
            },
          });

          map.addSource("attribution-intersections-source", {
            type: "geojson",
            data: attributionVesselsGeoJSON.intersections,
          });
          // Soft glow behind the isolated candidate/vessel marker — invisible
          // (radius 0) unless a vessel or candidate is focused.
          map.addLayer({
            id: "attribution-intersections-halo",
            type: "circle",
            source: "attribution-intersections-source",
            paint: {
              "circle-radius": ["case", ["get", "isFocused"], 22, 0],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.3,
              "circle-blur": 0.6,
            },
          });
          map.addLayer({
            id: "attribution-intersections-circle",
            type: "circle",
            source: "attribution-intersections-source",
            paint: {
              "circle-radius": ["case", ["get", "isFocused"], 13, 9],
              "circle-color": ["get", "color"],
              "circle-stroke-width": ["case", ["get", "isFocused"], 3, 2],
              "circle-stroke-color": "#0f172a",
            },
          });
          map.addLayer({
            id: "attribution-intersections-label",
            type: "symbol",
            source: "attribution-intersections-source",
            layout: {
              "text-field": ["get", "rank"],
              "text-size": 10,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: { "text-color": "#ffffff" },
          });
          // The time each vessel was closest to the spill origin, shown
          // just below its numbered marker.
          map.addLayer({
            id: "attribution-intersections-time-label",
            type: "symbol",
            source: "attribution-intersections-source",
            layout: {
              "text-field": ["get", "encounterTime"],
              "text-size": 9,
              "text-offset": [0, 1.3],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
            },
            paint: {
              "text-color": "#f8fafc",
              "text-halo-color": "#0f172a",
              "text-halo-width": 1.2,
            },
          });

          map.on("click", "attribution-intersections-circle", (e) => {
            const feature = e.features && e.features[0];
            if (!feature) return;
            const { name, rank, mmsi, encounterTime } = feature.properties;
            focusVessel(mmsi);
            new mapboxgl.Popup({ closeButton: true, offset: 12 })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:monospace;font-size:11px;line-height:1.5;">` +
                  `<strong>#${rank} ${name}</strong><br/>` +
                  `Near spill origin: ${encounterTime}` +
                  `</div>`,
              )
              .addTo(map);
          });
          map.on("mouseenter", "attribution-intersections-circle", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "attribution-intersections-circle", () => {
            map.getCanvas().style.cursor = "";
          });

          // 7. CLUSTER CANDIDATES — every backtracked candidate point for the
          // open ATTRIBUTION incident (researcher portal only). Only created
          // when the owning portal opts in, so the admin/commercial map
          // never pays for or shows this layer.
          if (showClusterCandidates) {
            map.addSource("cluster-candidates-source", {
              type: "geojson",
              data: clusterCandidatesGeoJSON,
            });
            map.addLayer({
              id: "cluster-candidates-circle",
              type: "circle",
              source: "cluster-candidates-source",
              paint: {
                "circle-radius": ["case", ["get", "isFocused"], 7, 3.5],
                "circle-color": "#22d3ee",
                "circle-opacity": ["case", ["get", "isFocused"], 0.95, 0.55],
                "circle-stroke-width": ["case", ["get", "isFocused"], 2, 0],
                "circle-stroke-color": "#0e7490",
              },
            });
          }

          // 8. REGIONAL HOTSPOT MARKERS — one labeled point per named
          // location, shown only while ATTRIBUTION is open (researcher
          // portal only), so it's clear at a glance which known hotspots sit
          // near the backtracked density cluster.
          if (showHotspotMarkers) {
            map.addSource("hotspot-markers-source", {
              type: "geojson",
              data: hotspotMarkersGeoJSON,
            });
            map.addLayer({
              id: "hotspot-markers-circle",
              type: "circle",
              source: "hotspot-markers-source",
              layout: { visibility: "none" },
              paint: {
                "circle-radius": 5,
                "circle-color": "#a855f7",
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#3b0764",
              },
            });
            map.addLayer({
              id: "hotspot-markers-label",
              type: "symbol",
              source: "hotspot-markers-source",
              layout: {
                visibility: "none",
                "text-field": ["get", "name"],
                "text-size": 10,
                "text-offset": [0, 1.1],
                "text-anchor": "top",
                "text-allow-overlap": false,
                "text-optional": true,
              },
              paint: {
                "text-color": "#e9d5ff",
                "text-halo-color": "#3b0764",
                "text-halo-width": 1.2,
              },
            });
          }

          // 6. DRAWN POLYGON (Manual Mapping)
          map.addSource("drawn-polygon-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "drawn-polygon-fill",
            type: "fill",
            source: "drawn-polygon-source",
            paint: { "fill-color": "#4f46e5", "fill-opacity": 0.3 },
          });
          map.addLayer({
            id: "drawn-polygon-line",
            type: "line",
            source: "drawn-polygon-source",
            paint: {
              "line-color": "#4f46e5",
              "line-width": 2,
              "line-dasharray": [2, 2],
            },
          });
          // Apply the layer panel's initial on/off state directly, since
          // the styledata-driven sync effect below can race style
          // readiness on first paint and silently leave layers hidden.
          applyLayerVisibility(map, layers);
        } catch {
          // Source addition handled cleanly
        }
      });

      mapRef.current = map;
    } catch {
      setTimeout(() => {
        setUseFallback(true);
        if (engineResolvedRef.current) engineResolvedRef.current("leaflet");
      }, 0);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // CRITICAL FIX: Removed onEngineResolved to prevent infinite re-renders
  }, [token, defaultLat, defaultLon, defaultZoom, interactive, useFallback]);

  // Sync SAR slick particle cloud for the active incident
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateSlickSource = () => {
      const source = map.getSource("sar_slick-source");
      if (source) source.setData(sarSlickParticlesGeoJSON);
    };

    updateSlickSource();
    map.on("styledata", updateSlickSource);
    return () => map.off("styledata", updateSlickSource);
  }, [sarSlickParticlesGeoJSON]);

  // Sync forward-track particles/paths for the current hour
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateForwardTrackSources = () => {
      const pointSource = map.getSource("forward-track-points-source");
      if (pointSource) pointSource.setData(forwardTrackGeoJSON.points);

      const pathSource = map.getSource("forward-track-path-source");
      if (pathSource) pathSource.setData(forwardTrackGeoJSON.paths);
    };

    updateForwardTrackSources();
    map.on("styledata", updateForwardTrackSources);
    return () => map.off("styledata", updateForwardTrackSources);
  }, [forwardTrackGeoJSON]);

  // Sync regional geofences' display color/opacity (static, or driven by
  // the active incident's real hotspot status while FORWARD TRACK is open)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateGeofencesSource = () => {
      const source = map.getSource("geofences-source");
      if (source) source.setData(geofencesGeoJSON);
    };

    updateGeofencesSource();
    map.on("styledata", updateGeofencesSource);
    return () => map.off("styledata", updateGeofencesSource);
  }, [geofencesGeoJSON]);

  // Sync the source-attribution view (density cluster + top-15 routes,
  // intersections, and connectors) for whichever incident has ATTRIBUTION open.
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateAttributionSources = () => {
      const densitySource = map.getSource("attribution-density-source");
      if (densitySource) densitySource.setData(attributionDensityGeoJSON);

      const routesSource = map.getSource("attribution-routes-source");
      if (routesSource) routesSource.setData(attributionVesselsGeoJSON.routes);

      const connectorsSource = map.getSource("attribution-connectors-source");
      if (connectorsSource)
        connectorsSource.setData(attributionVesselsGeoJSON.connectors);

      const intersectionsSource = map.getSource("attribution-intersections-source");
      if (intersectionsSource)
        intersectionsSource.setData(attributionVesselsGeoJSON.intersections);
    };

    updateAttributionSources();
    map.on("styledata", updateAttributionSources);
    return () => map.off("styledata", updateAttributionSources);
  }, [attributionDensityGeoJSON, attributionVesselsGeoJSON]);

  // Sync the highlighted (Alibi Generator) vessel's track + position
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateHighlightedVessel = () => {
      const trackSource = map.getSource("highlighted-vessel-track-source");
      if (trackSource) trackSource.setData(highlightedVesselGeoJSON.track);
      const pointSource = map.getSource("highlighted-vessel-point-source");
      if (pointSource) pointSource.setData(highlightedVesselGeoJSON.point);
    };

    updateHighlightedVessel();
    map.on("styledata", updateHighlightedVessel);
    return () => map.off("styledata", updateHighlightedVessel);
  }, [highlightedVesselGeoJSON]);

  // Sync cluster candidate points (researcher portal only — no-op if the
  // layer was never created because showClusterCandidates is false)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateClusterCandidates = () => {
      const source = map.getSource("cluster-candidates-source");
      if (source) source.setData(clusterCandidatesGeoJSON);
    };

    updateClusterCandidates();
    map.on("styledata", updateClusterCandidates);
    return () => map.off("styledata", updateClusterCandidates);
  }, [clusterCandidatesGeoJSON]);

  // Sync + show/hide the regional hotspot marker points (researcher portal
  // only) — visible only while ATTRIBUTION is open for an incident.
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const visibility = attributionIncidentId ? "visible" : "none";

    const updateHotspotMarkers = () => {
      const source = map.getSource("hotspot-markers-source");
      if (source) source.setData(hotspotMarkersGeoJSON);
      if (map.getLayer("hotspot-markers-circle"))
        map.setLayoutProperty("hotspot-markers-circle", "visibility", visibility);
      if (map.getLayer("hotspot-markers-label"))
        map.setLayoutProperty("hotspot-markers-label", "visibility", visibility);
    };

    updateHotspotMarkers();
    map.on("styledata", updateHotspotMarkers);
    return () => map.off("styledata", updateHotspotMarkers);
  }, [hotspotMarkersGeoJSON, attributionIncidentId]);

  // Sync vessel trajectories and live vessels
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateSources = () => {
      const trackSource = map.getSource("ais_tracks-source");
      if (trackSource) trackSource.setData(vesselTracksGeoJSON);

      const pointSource = map.getSource("live-vessels-source");
      if (pointSource) pointSource.setData(vesselPointsGeoJSON);
    };

    updateSources();
    map.on("styledata", updateSources);
    return () => {
      map.off("styledata", updateSources);
    };
  }, [vesselTracksGeoJSON, vesselPointsGeoJSON]);

  // Sync layers visibility from MapEngine
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateVisibility = () => applyLayerVisibility(map, layers);

    updateVisibility();
    map.on("styledata", updateVisibility);
    return () => map.off("styledata", updateVisibility);
  }, [layers]);

  // Handle Map Drawing Interactions
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleClick = (e) => {
      const { interactionMode, drawnPolygon, isPolygonClosed } =
        stateRef.current;

      if (interactionMode === "pick_coordinate") {
        setPickedCoordinate({ lat: e.lngLat.lat, lon: e.lngLat.lng });
        return;
      }

      if (interactionMode === "draw_polygon" && !isPolygonClosed) {
        const newPoint = [e.lngLat.lng, e.lngLat.lat];
        if (drawnPolygon.length >= 3) {
          const firstPoint = drawnPolygon[0];
          const dist = turf.distance(
            turf.point(firstPoint),
            turf.point(newPoint),
            { units: "kilometers" },
          );
          if (dist < 50) {
            setIsPolygonClosed(true);
            setCursorCoordinate(null);
            return;
          }
        }
        addPolygonVertex(newPoint);
      }
    };

    const handleMouseMove = (e) => {
      const { interactionMode, isPolygonClosed } = stateRef.current;
      if (interactionMode === "draw_polygon" && !isPolygonClosed) {
        setCursorCoordinate([e.lngLat.lng, e.lngLat.lat]);
      }
    };

    const handleDblClick = (e) => {
      const { interactionMode, drawnPolygon, isPolygonClosed } =
        stateRef.current;
      if (
        interactionMode === "draw_polygon" &&
        !isPolygonClosed &&
        drawnPolygon.length >= 3
      ) {
        e.preventDefault();
        setIsPolygonClosed(true);
        setCursorCoordinate(null);
      }
    };

    map.on("click", handleClick);
    map.on("mousemove", handleMouseMove);
    map.on("dblclick", handleDblClick);

    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMouseMove);
      map.off("dblclick", handleDblClick);
    };
  }, [
    addPolygonVertex,
    setCursorCoordinate,
    setIsPolygonClosed,
    setPickedCoordinate,
  ]);

  // Render Drawn Polygon
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateDrawnPolygon = () => {
      const source = map.getSource("drawn-polygon-source");
      if (!source) return;

      let coordinates = [...drawnPolygon];
      if (
        interactionMode === "draw_polygon" &&
        !isPolygonClosed &&
        cursorCoordinate
      ) {
        coordinates.push(cursorCoordinate);
      }

      if (coordinates.length > 0) {
        if (coordinates.length < 3) {
          source.setData({
            type: "Feature",
            geometry: { type: "LineString", coordinates },
          });
        } else {
          const polyCoords = [...coordinates];
          polyCoords.push(polyCoords[0]);
          source.setData({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [polyCoords] },
          });
        }
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    };

    updateDrawnPolygon();
    map.on("styledata", updateDrawnPolygon);
    return () => map.off("styledata", updateDrawnPolygon);
  }, [drawnPolygon, cursorCoordinate, isPolygonClosed, interactionMode]);

  // Camera FlyTo logic (cleaned up duplicate block). When `trajectory` is
  // present, fit the whole route in view instead of flying tight to a point —
  // used for low-confidence vessels where a close zoom to one ping isn't
  // representative of the overall route.
  useEffect(() => {
    if (!mapRef.current) return;
    if (panToCoordinate?.trajectory?.length >= 2) {
      const bbox = turf.bbox(turf.lineString(panToCoordinate.trajectory));
      mapRef.current.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 80, duration: 2000 },
      );
    } else if (panToCoordinate?.lat && panToCoordinate?.lon) {
      mapRef.current.flyTo({
        center: [panToCoordinate.lon, panToCoordinate.lat],
        zoom: panToCoordinate.zoom ?? 10, // Zoomed in closer so you can see the GPS selection clearly
        essential: true,
        duration: 2000,
      });
    }
  }, [panToCoordinate]);

  // Handle Picked Coordinate Visual Marker
  const pickedMarkerRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;

    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.remove();
      pickedMarkerRef.current = null;
    }

    if (pickedCoordinate?.lat && pickedCoordinate?.lon) {
      // Creates a blue marker pin to show exactly where the user clicked/GPS locked
      pickedMarkerRef.current = new mapboxgl.Marker({ color: "#0ea5e9" })
        .setLngLat([pickedCoordinate.lon, pickedCoordinate.lat])
        .addTo(mapRef.current);
    }

    return () => {
      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.remove();
        pickedMarkerRef.current = null;
      }
    };
  }, [pickedCoordinate]);

  if (useFallback) {
    return (
      <FallbackLeaflet
        center={[defaultLat, defaultLon]}
        zoom={defaultZoom}
        interactive={interactive}
        className={className}
        panToCoordinate={panToCoordinate}
        correlationMarker={correlationMarker}
        commercialFleet={commercialFleet}
        selectedVesselId={selectedVesselId}
      />
    );
  }

  return (
    <div
      className={`relative h-full w-full select-none overflow-hidden bg-slate-950 ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center space-x-1.5 rounded border border-slate-800 bg-slate-950/85 px-2.5 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>MAP ENGINE: MAPBOX GL (DARK-V11)</span>
        <span className="text-slate-600">·</span>
        <span className="text-cyan-300">ONLINE</span>
      </div>
    </div>
  );
};

export default MapCanvas;
