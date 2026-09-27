import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Papa from "papaparse";
import * as turf from "@turf/turf";
import aisDataUrl from "../utils/east_med_massive_random_ais.csv?url";
import { incidentParticlesById } from "../data/incidentParticles";
import { seedIncidents } from "../data/seedIncidents";
import { topVesselsByIncident } from "../data/aisTopVessels";
import { loadForwardTrajectory } from "../data/forwardTrajectory";

const EXTRA_NEAREST_VESSELS_PER_INCIDENT = 20;
// Vessels closer than this are excluded from the "extra" set so they don't
// bunch up right on top of the origin; picking one per compass sector beyond
// that radius spreads them evenly in a ring around the incident instead.
const EXTRA_VESSELS_MIN_DISTANCE_KM = 15;
const EXTRA_VESSELS_SECTOR_COUNT = EXTRA_NEAREST_VESSELS_PER_INCIDENT;
const EXTRA_VESSELS_SECTOR_DEGREES = 360 / EXTRA_VESSELS_SECTOR_COUNT;

// Each incident's hindcast covers the 72 hours before its SAR detection
// (T0), e.g. ow-0008's T0 2019-06-14T20:35:58Z back to T-72h 2019-06-11
// 20:35:58 — matching frontend_files/final_particle_positions.csv's own
// checkpoint range. AIS trajectories are clipped to that same window per
// incident, since pings outside it aren't relevant to that spill's attribution.
const HINDCAST_WINDOW_HOURS = 72;

// Re-derives a vessel's trajectory/position using only pings that fall
// within the given incident's T0-72h..T0 window. Returns null if the vessel
// has no pings in that window (nothing to show for that incident).
const clipVesselToIncidentWindow = (vessel, incidentDetectionTimestamp) => {
  const windowEnd = new Date(incidentDetectionTimestamp).getTime();
  const windowStart = windowEnd - HINDCAST_WINDOW_HOURS * 60 * 60 * 1000;

  const pingsInWindow = vessel.pings.filter((p) => {
    const t = new Date(p.timestamp).getTime();
    return t >= windowStart && t <= windowEnd;
  });
  if (pingsInWindow.length < 2) return null;

  const latest = pingsInWindow[pingsInWindow.length - 1];
  return {
    ...vessel,
    coordinates: [latest.lon, latest.lat],
    lat: latest.lat,
    lon: latest.lon,
    trajectory: pingsInWindow.map((p) => [p.lon, p.lat]),
  };
};

// For each incident: its real top-15 AIS-correlated vessels (matched to their
// real trajectory in the parsed AIS pool) plus the 20 vessels from that pool
// geographically nearest to the incident's origin, both clipped to that
// incident's 72h hindcast window. Returns both a flat de-duplicated merge
// (for when both incidents are shown on the map at once — see
// allIncidentParticles above for the same pattern) and each incident's own
// set (for when only one incident is selected).
const buildIncidentVesselFleet = (allVesselTracks) => {
  if (!allVesselTracks || allVesselTracks.length === 0) {
    return { merged: [], byIncident: {} };
  }

  const trackByMmsi = new Map(allVesselTracks.map((v) => [v.id, v]));
  const selected = new Map();
  const byIncident = {};

  seedIncidents.forEach((incident) => {
    const clip = (vessel) =>
      clipVesselToIncidentWindow(vessel, incident.detection_timestamp);
    const thisIncidentVessels = new Map();

    const topVessels = topVesselsByIncident[incident.incident_id] || [];
    topVessels.forEach((tv) => {
      const track = trackByMmsi.get(tv.mmsi);
      const clipped = track && clip(track);
      if (clipped) {
        selected.set(clipped.id, clipped);
        thisIncidentVessels.set(clipped.id, clipped);
      }
    });

    // Clip first, then measure distance/bearing off the clipped position —
    // vessels with no pings in this incident's window are dropped up front
    // so the sector-spread only competes among vessels that actually have
    // something to show, rather than picking a geometrically-nearest vessel
    // per sector that then turns out to have no data in this window.
    const origin = turf.point([incident.coordinates.lon, incident.coordinates.lat]);
    const candidates = allVesselTracks
      .filter((v) => !thisIncidentVessels.has(v.id))
      .map((v) => clip(v))
      .filter(Boolean)
      .map((vessel) => {
        const point = turf.point(vessel.coordinates);
        return {
          vessel,
          distanceKm: turf.distance(origin, point, { units: "kilometers" }),
          sector: Math.floor(
            ((turf.bearing(origin, point) + 360) % 360) /
              EXTRA_VESSELS_SECTOR_DEGREES,
          ),
        };
      })
      .filter((c) => c.distanceKm >= EXTRA_VESSELS_MIN_DISTANCE_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // One nearest-beyond-the-exclusion-radius vessel per compass sector, so
    // the extras ring the incident evenly instead of clustering on one side.
    const bySector = [];
    const leftovers = [];
    const usedSectors = new Set();
    candidates.forEach((c) => {
      if (usedSectors.has(c.sector)) {
        leftovers.push(c);
        return;
      }
      usedSectors.add(c.sector);
      bySector.push(c);
    });

    const nearest = [...bySector, ...leftovers]
      .slice(0, EXTRA_NEAREST_VESSELS_PER_INCIDENT)
      .map((c) => c.vessel);
    nearest.forEach((vessel) => {
      selected.set(vessel.id, vessel);
      thisIncidentVessels.set(vessel.id, vessel);
    });

    byIncident[incident.incident_id] = Array.from(thisIncidentVessels.values());
  });

  return { merged: Array.from(selected.values()), byIncident };
};

const IncidentContext = createContext();

export const IncidentProvider = ({ children }) => {
  // 1. Global Incident State
  const [activeIncident, setActiveIncident] = useState(null);
  const [panToCoordinate, setPanToCoordinate] = useState(null); // {lat, lon}

  // Real T0 SAR-detected particles for every seeded incident, shown on the
  // map at once. Selecting a triage card doesn't change which particles are
  // visible — it just pans/zooms to that incident (see panToCoordinate).
  const allIncidentParticles = useMemo(
    () => Object.values(incidentParticlesById).flat(),
    [],
  );

  // 2. Normal User Manual Mapping State
  // interactionMode: 'none' | 'pick_coordinate' | 'draw_polygon'
  const [interactionMode, setInteractionMode] = useState("none");
  const [pickedCoordinate, setPickedCoordinate] = useState(null);
  const [drawnPolygon, setDrawnPolygon] = useState([]); // array of [lon, lat]
  const [cursorCoordinate, setCursorCoordinate] = useState(null); // [lon, lat]
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);

  // 2.5 Live Fleet State
  const [commercialFleet, setCommercialFleet] = useState([]);
  const [allVesselTracks, setAllVesselTracks] = useState([]);

  useEffect(() => {
    Papa.parse(aisDataUrl, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const grouped = {};
        results.data.forEach((row) => {
          if (!row.mmsi || !row.lat || !row.lon) return;
          if (!grouped[row.mmsi]) grouped[row.mmsi] = [];
          grouped[row.mmsi].push(row);
        });

        const liveFleet = Object.values(grouped)
          .map((pings) => {
            pings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const latest = pings[pings.length - 1];
            const sortedPings = pings.map((p) => ({
              timestamp: p.timestamp,
              lon: parseFloat(p.lon),
              lat: parseFloat(p.lat),
            }));
            return {
              id: latest.mmsi.toString(),
              name: latest.vessel_name || `UNKNOWN-${latest.mmsi}`,
              type: latest.vessel_type,
              speed: latest.sog,
              heading: latest.cog,
              status: "NORMAL",
              coordinates: [parseFloat(latest.lon), parseFloat(latest.lat)],
              lat: parseFloat(latest.lat),
              lon: parseFloat(latest.lon),
              pings: sortedPings,
              // Unclipped trajectory, used by the Commercial Operator portal's
              // own fleet view (commercialFleet) which isn't tied to an incident.
              trajectory: sortedPings.map((p) => [p.lon, p.lat]),
            };
          })
          .filter((v) => v.trajectory.length >= 2);

        setCommercialFleet(liveFleet.slice(0, 10)); // Load top 10 ships
        setAllVesselTracks(liveFleet);
      },
    });
  }, []);

  // Top-15 AIS suspects + 20 nearest per incident. `incidentVesselFleet` is
  // both incidents merged (shown when no single incident is selected);
  // `vesselFleetByIncident` is each incident's own set (shown once one is).
  const { merged: incidentVesselFleet, byIncident: vesselFleetByIncident } =
    useMemo(() => buildIncidentVesselFleet(allVesselTracks), [allVesselTracks]);

  // 3. Admin / Investigator Analytical State
  const [activeAnalysisMode, setActiveAnalysisMode] = useState("none"); // 'none' | 'attribution' | 'forward_track'
  const [correlationMarker, setCorrelationMarker] = useState(null); // [lon, lat]

  // Which single top-15 vessel (by MMSI), or which single backtracked origin
  // candidate (by candidate_id), is isolated in the ATTRIBUTION view — the
  // two are mutually exclusive, and only one (or neither) is set at a time.
  // Clicking the same one again, switching incidents, or leaving ATTRIBUTION
  // clears it back to showing all 15. Reset during render (rather than in an
  // effect) when the attribution context changes, per React's guidance for
  // resetting state in response to a prop/derived-value change.
  const [focusedVesselMmsi, setFocusedVesselMmsi] = useState(null);
  const [focusedCandidateId, setFocusedCandidateId] = useState(null);
  const focusVessel = useCallback((mmsi) => {
    setFocusedCandidateId(null);
    setFocusedVesselMmsi((current) => (current === mmsi ? null : mmsi));
  }, []);
  const focusCandidate = useCallback((candidateId) => {
    setFocusedVesselMmsi(null);
    setFocusedCandidateId((current) => (current === candidateId ? null : candidateId));
  }, []);
  // Which sidebar view the ATTRIBUTION panel shows: the AIS vessel
  // correlation matrix, or the cluster origin-candidate matrix.
  const [attributionView, setAttributionView] = useState("ais"); // 'ais' | 'origin_matrix'

  // Which incident's real forward-drift trajectory (73 hourly steps) is
  // animating on the map, if any.
  const forwardTrackIncidentId =
    activeAnalysisMode === "forward_track" ? activeIncident : null;
  const [forwardTrackStep, setForwardTrackStep] = useState(0);
  const [isForwardTrackPlaying, setIsForwardTrackPlaying] = useState(false);
  const [forwardTrajectory, setForwardTrajectory] = useState({
    timestamps: [],
    particlesByStep: [],
  });

  const attributionKey = `${activeAnalysisMode}:${activeIncident}`;
  const [lastAttributionKey, setLastAttributionKey] = useState(attributionKey);
  if (attributionKey !== lastAttributionKey) {
    setLastAttributionKey(attributionKey);
    setFocusedVesselMmsi(null);
    setFocusedCandidateId(null);
    setAttributionView("ais");
    setForwardTrackStep(0);
    setIsForwardTrackPlaying(false);
  }

  useEffect(() => {
    // Consumers already gate on forwardTrackIncidentId being set, so a stale
    // forwardTrajectory left over from a previous incident is never read
    // while null — no need to eagerly clear it here.
    if (!forwardTrackIncidentId) return;
    let cancelled = false;
    loadForwardTrajectory(forwardTrackIncidentId).then((data) => {
      if (!cancelled) setForwardTrajectory(data);
    });
    return () => {
      cancelled = true;
    };
  }, [forwardTrackIncidentId]);

  // Auto-advance the step while playing; stops at the final step.
  useEffect(() => {
    if (!isForwardTrackPlaying) return;
    const maxStep = forwardTrajectory.particlesByStep.length - 1;
    if (maxStep < 0) return;
    const interval = setInterval(() => {
      setForwardTrackStep((current) => {
        if (current >= maxStep) {
          setIsForwardTrackPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isForwardTrackPlaying, forwardTrajectory.particlesByStep.length]);

  // Custom setter for drawn polygon to easily add vertices
  const addPolygonVertex = useCallback((coord) => {
    setDrawnPolygon((prev) => [...prev, coord]);
  }, []);

  const clearPolygon = useCallback(() => {
    setDrawnPolygon([]);
    setCursorCoordinate(null);
    setIsPolygonClosed(false);
  }, []);

  const value = {
    activeIncident,
    setActiveIncident,
    allIncidentParticles,
    interactionMode,
    setInteractionMode,
    pickedCoordinate,
    setPickedCoordinate,
    drawnPolygon,
    setDrawnPolygon,
    addPolygonVertex,
    clearPolygon,
    cursorCoordinate,
    setCursorCoordinate,
    isPolygonClosed,
    setIsPolygonClosed,
    panToCoordinate,
    setPanToCoordinate,
    correlationMarker,
    setCorrelationMarker,
    activeAnalysisMode,
    setActiveAnalysisMode,
    focusedVesselMmsi,
    focusedCandidateId,
    focusVessel,
    focusCandidate,
    attributionView,
    setAttributionView,
    forwardTrackIncidentId,
    forwardTrackStep,
    setForwardTrackStep,
    isForwardTrackPlaying,
    setIsForwardTrackPlaying,
    forwardTrajectory,
    commercialFleet,
    incidentVesselFleet,
    vesselFleetByIncident,
    // The full unfiltered AIS pool (~2000 vessels) — needed wherever a
    // researcher/operator looks up an arbitrary MMSI (e.g. the commercial
    // portal's Alibi Generator) that isn't necessarily one of the
    // already-curated commercialFleet/incidentVesselFleet subsets.
    allVesselTracks,
  };

  return (
    <IncidentContext.Provider value={value}>
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncident = () => {
  const context = useContext(IncidentContext);
  if (context === undefined) {
    throw new Error("useIncident must be used within an IncidentProvider");
  }
  return context;
};
