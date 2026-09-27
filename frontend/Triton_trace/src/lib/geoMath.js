import * as turf from '@turf/turf';

/**
 * Checks which incidents fall within a given drawn polygon.
 * @param {Array<Array<number>>} polygonCoords - Array of [longitude, latitude] coordinates.
 * @param {Array<Object>} incidents - Array of incident objects, each having `lat` and `lon`.
 * @returns {Array<Object>} - Filtered list of incidents inside the polygon.
 */
export const getIncidentsInsidePolygon = (polygonCoords, incidents) => {
  if (!polygonCoords || polygonCoords.length < 3) return [];

  try {
    // Ensure the polygon is a closed loop
    const coords = [...polygonCoords];
    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];
    
    if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
      coords.push(firstCoord);
    }

    const polygon = turf.polygon([coords]);

    return incidents.filter(incident => {
      const lat = incident.coordinates?.lat ?? incident.lat;
      const lon = incident.coordinates?.lon ?? incident.lon;
      if (lat == null || lon == null) return false;
      // Turf expects [lon, lat] for points
      const point = turf.point([lon, lat]);
      return turf.booleanPointInPolygon(point, polygon);
    });
  } catch (error) {
    console.error("Error calculating point-in-polygon:", error);
    return [];
  }
};
