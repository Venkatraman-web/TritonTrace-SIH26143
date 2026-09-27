/**
 * Reference images shown in the Review Dossier, per incident.
 *
 * The satellite-telemetry slick photo isn't a bundled static file — it's
 * rendered live from the real particle data (see ../lib/staticSlickImage.js)
 * so it matches the incident's actual detected footprint.
 */
import ow0008AttributionUrl from "./incidents/ow-0008/possible_source_origins_ais_attribution.png";
import ow0009AttributionUrl from "./incidents/ow-0009/possible_source_origins_ais_attribution.png";

// Backtracked source-origin candidates plotted against AIS attribution.
export const originAttributionImageUrlByIncident = {
  "ow-0008": ow0008AttributionUrl,
  "ow-0009": ow0009AttributionUrl,
};
