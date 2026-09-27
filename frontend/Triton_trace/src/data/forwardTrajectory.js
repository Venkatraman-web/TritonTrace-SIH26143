/**
 * Real OpenOil forward-drift trajectories (trajectory.parquet, exported to
 * CSV via a one-off DuckDB conversion — see tasks.md Task 6) for each
 * incident's 72h forward projection: 73 hourly steps of particle positions,
 * matching final.png / the reference animation.
 *
 * These are ~1.2-1.8MB each, so unlike the smaller bundled CSVs they're
 * fetched lazily (only once FORWARD TRACK is actually opened) via the same
 * `?url` + PapaParse download pattern already used for the AIS pool CSV,
 * rather than bundled eagerly into the JS bundle.
 */
import Papa from "papaparse";
import ow0008Url from "./incidents/ow-0008/forward_trajectory.csv?url";
import ow0009Url from "./incidents/ow-0009/forward_trajectory.csv?url";
import ow0008ParquetUrl from "./incidents/ow-0008/trajectory.parquet?url";
import ow0009ParquetUrl from "./incidents/ow-0009/trajectory.parquet?url";

const URLS_BY_INCIDENT = {
  "ow-0008": ow0008Url,
  "ow-0009": ow0009Url,
};

// The original OpenOil output this CSV was converted from — offered as a
// download so a researcher can inspect the full-resolution forward run
// (every member/particle field) in their own tooling rather than just the
// lon/lat-per-step slice the app renders.
export const forwardTrajectoryParquetUrlByIncident = {
  "ow-0008": ow0008ParquetUrl,
  "ow-0009": ow0009ParquetUrl,
};

const cache = new Map();

const parseIntoSteps = (rows) => {
  const timestamps = [];
  const particlesByStep = [];
  rows.forEach((row) => {
    if (row.step == null || row.lon == null || row.lat == null) return;
    if (!particlesByStep[row.step]) {
      particlesByStep[row.step] = [];
      timestamps[row.step] = row.time;
    }
    particlesByStep[row.step].push({ lon: row.lon, lat: row.lat });
  });
  return { timestamps, particlesByStep };
};

export const loadForwardTrajectory = (incidentId) => {
  if (cache.has(incidentId)) return cache.get(incidentId);

  const url = URLS_BY_INCIDENT[incidentId];
  const promise = url
    ? new Promise((resolve, reject) => {
        Papa.parse(url, {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(parseIntoSteps(results.data)),
          error: reject,
        });
      })
    : Promise.resolve({ timestamps: [], particlesByStep: [] });

  cache.set(incidentId, promise);
  return promise;
};
