/**
 * Top 15 backtracked source-origin candidates per incident, ranked by
 * source_score, from each run's possible_source_origins_top.csv
 * (src/data/incidents/<id>/possible_source_origins_top.csv). Unlike
 * originCandidates.js (originCandidatesByIncident — candidates filtered to
 * just the ones a top-15 AIS vessel was matched against, used by the
 * investigator's AIS-attribution tooling), this is filtered purely by
 * backtrack confidence, independent of any vessel match — the researcher
 * portal's cluster view.
 */
import Papa from "papaparse";
import ow0008Raw from "./incidents/ow-0008/possible_source_origins_top.csv?raw";
import ow0009Raw from "./incidents/ow-0009/possible_source_origins_top.csv?raw";
import ow0008Url from "./incidents/ow-0008/possible_source_origins_top.csv?url";
import ow0009Url from "./incidents/ow-0009/possible_source_origins_top.csv?url";

const TOP_N = 15;

const parseAllCandidateRows = (raw) =>
  Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true })
    .data.filter((row) => row.candidate_id != null && row.source_score != null);

const parseTopCandidates = (raw) => {
  const allRows = parseAllCandidateRows(raw);
  // source_score is an unbounded model score (can exceed 1.0), not a
  // probability — normalizing it against the incident's own highest-scoring
  // candidate turns it into an interpretable 0-100% confidence, where the
  // single best candidate reads 100% and the rest are relative to it.
  const maxSourceScore = Math.max(...allRows.map((row) => row.source_score), 1e-9);

  return allRows
    .map((row) => ({
      candidateId: row.candidate_id,
      candidateTimestamp: row.candidate_timestamp,
      backtrackHours: row.backtrack_hours,
      lat: row.latitude,
      lon: row.longitude,
      supportScore: row.support_score,
      normalizedSupport: row.normalized_support,
      sourceScore: row.source_score,
      confidencePercent:
        Math.round(Math.min(1, row.source_score / maxSourceScore) * 1000) / 10,
      clusterId: row.cluster_id,
      clusterUncertaintyRadiusKm: row.cluster_uncertainty_radius_km,
      clusterTemporalUncertaintyHours: row.cluster_temporal_uncertainty_hours,
      clusterCandidateStabilityPercent: row.cluster_candidate_stability_percent,
    }))
    // Rank by confidence to pick the top 15, and leave them in that same
    // descending-confidence order for display (row 1 is always the
    // strongest-supported candidate for that incident).
    .sort((a, b) => b.sourceScore - a.sourceScore)
    .slice(0, TOP_N);
};

export const topOriginCandidatesByIncident = {
  "ow-0008": parseTopCandidates(ow0008Raw),
  "ow-0009": parseTopCandidates(ow0009Raw),
};

// The full source file (all ranked candidates, not just the app's top 15) —
// offered as a raw download for a researcher who wants the complete list.
export const topOriginCandidatesFileUrlByIncident = {
  "ow-0008": ow0008Url,
  "ow-0009": ow0009Url,
};

export const topOriginCandidatesFileRowCountByIncident = {
  "ow-0008": parseAllCandidateRows(ow0008Raw).length,
  "ow-0009": parseAllCandidateRows(ow0009Raw).length,
};
