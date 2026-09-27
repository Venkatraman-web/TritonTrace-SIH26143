import * as turf from "@turf/turf";
import { incidentParticlesById } from "../data/incidentParticles";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

/**
 * A zoomed-in "photo" of an incident's detected slick shape — a solid
 * polygon (the convex hull of the real SAR-detected particle cloud from
 * initial_particles.csv) rendered on the dark basemap via Mapbox's Static
 * Images API. This mirrors how the slick actually renders on the live map
 * (MapCanvas's blue sar_slick layer, same fill color) rather than pulling in
 * one of the research charts, which show something else (backtracked
 * candidates, weathering, etc.) rather than the observed slick itself.
 * Returns null if there's no Mapbox token or too few particles to form a
 * shape — callers should hide the image slot in that case.
 */
export const getSlickPhotoUrl = (incidentId, { width = 500, height = 300 } = {}) => {
  const particles = incidentParticlesById[incidentId];
  if (!MAPBOX_TOKEN || !particles || particles.length < 3) return null;

  const points = turf.featureCollection(
    particles.map((p) => turf.point([p.lon, p.lat])),
  );
  const hull = turf.convex(points);
  if (!hull) return null;

  hull.properties = {
    fill: "#2563eb",
    "fill-opacity": 0.85,
    stroke: "#93c5fd",
    "stroke-width": 2,
  };

  const geojson = encodeURIComponent(JSON.stringify(hull));
  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/geojson(${geojson})` +
    `/auto/${width}x${height}@2x?padding=60&access_token=${MAPBOX_TOKEN}`
  );
};
