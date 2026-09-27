// A SAR product carries its own ground resolution; a plain uploaded photo
// doesn't, so there's no way to derive a real scale from the image alone.
// Per explicit product decision, every upload is assumed to be Sentinel-1
// resolution (~10m/pixel) — matching every other incident already seeded
// in this app, all of which are real Sentinel-1 SAR detections.
const METERS_PER_PIXEL = 10;

/**
 * Real-world slick measurements from the segmented region's pixel geometry.
 * Perimeter is the bounding box's perimeter (not a traced outline), the
 * same bounding-box approximation seedIncidents.js already uses elsewhere
 * in this app — flagged here for the same reason: it's an upper-bound
 * approximation of the true slick outline, not a precise measurement.
 */
export const estimateSlickMeasurements = ({ xmin, ymin, xmax, ymax, labelSize }) => {
  const widthPx = xmax - xmin;
  const heightPx = ymax - ymin;
  const areaKm2 = (labelSize * METERS_PER_PIXEL ** 2) / 1e6;
  const perimeterKm = (2 * (widthPx + heightPx) * METERS_PER_PIXEL) / 1000;
  return {
    areaKm2: Math.round(areaKm2 * 1000) / 1000,
    perimeterKm: Math.round(perimeterKm * 1000) / 1000,
  };
};
