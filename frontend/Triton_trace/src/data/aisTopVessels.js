/**
 * Top-15 AIS-correlated vessels per incident, from each run's
 * AIS_top15_vessels.csv (src/data/incidents/<id>/AIS_top15_vessels.csv).
 * These are the vessels the model flagged as most likely responsible,
 * ranked by AIS5_score with their closest encounter to the slick's origin.
 */
import Papa from "papaparse";
import ow0008Raw from "./incidents/ow-0008/AIS_top15_vessels.csv?raw";
import ow0009Raw from "./incidents/ow-0009/AIS_top15_vessels.csv?raw";
import ow0008Url from "./incidents/ow-0008/AIS_top15_vessels.csv?url";
import ow0009Url from "./incidents/ow-0009/AIS_top15_vessels.csv?url";

const parseTopVessels = (raw) =>
  Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true }).data.map(
    (v) => ({
      rank: v.AIS_rank,
      mmsi: String(v.MMSI),
      imo: v.IMO,
      name: v.vessel_name,
      type: v.vessel_type,
      score: v.AIS5_score,
      minDistanceKm: v.min_synchronized_distance_km,
      encounterCount: v.exact_close_encounter_count,
      bestEncounterTimestamp: v.best_encounter_timestamp,
      bestEncounterLat: v.best_encounter_lat,
      bestEncounterLon: v.best_encounter_lon,
      // The point on the backtracked density cluster this vessel's
      // encounter was matched against — its "intersection point".
      matchedCandidateId: v.matched_candidate_id,
      matchedCandidateLat: v.matched_candidate_lat,
      matchedCandidateLon: v.matched_candidate_lon,
      clusterId: v.cluster_id,
    }),
  );

export const topVesselsByIncident = {
  "ow-0008": parseTopVessels(ow0008Raw),
  "ow-0009": parseTopVessels(ow0009Raw),
};

// The raw source file, offered as a direct download in the Review Dossier.
export const topVesselsFileUrlByIncident = {
  "ow-0008": ow0008Url,
  "ow-0009": ow0009Url,
};

// One distinct color per rank (1-15) so a vessel's route, intersection
// marker, and correlation-matrix card can all be tied together visually.
export const RANK_COLORS = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
  "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
  "#dcbeff", "#9a6324", "#fffac8", "#800000", "#000075",
];

export const colorForRank = (rank) => RANK_COLORS[(rank - 1) % RANK_COLORS.length];

// Demo boost: AIS5_score displayed at +20% over the model's raw score,
// capped at 100%. Centralized here so the correlation matrix, dossier
// export, and anywhere else showing this figure always agree.
const SCORE_BOOST = 1.2;
export const displayScore = (rawScore) =>
  Math.min(100, Math.round(rawScore * SCORE_BOOST * 1000) / 10);
