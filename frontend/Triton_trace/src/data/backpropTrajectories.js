/**
 * Full backward-trajectory particle archives (10-particle demo runs) per
 * incident (src/data/incidents/<id>/backprop_trajectories_10particle_demo.csv).
 * These are the researcher's downloadable raw backtrack data — unlike
 * matched_origin_candidates.csv (a curated top-candidate subset used to draw
 * the density cluster on the map), this is the full per-particle,
 * per-timestep backward trajectory a researcher would analyze offline.
 *
 * Only the file URL is needed (for a direct download), so these are never
 * parsed into JS — the same `?url` pattern forwardTrajectory.js uses for its
 * own large CSVs.
 */
import ow0008Url from "./incidents/ow-0008/backprop_trajectories_10particle_demo.csv?url";
import ow0009Url from "./incidents/ow-0009/backprop_trajectories_10particle_demo.csv?url";

export const backpropTrajectoryUrlByIncident = {
  "ow-0008": ow0008Url,
  "ow-0009": ow0009Url,
};
