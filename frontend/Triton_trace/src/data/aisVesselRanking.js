/**
 * Full per-incident AIS attribution ranking — every vessel the model
 * scored for that spill (264 for ow-0008, 217 for ow-0009), not just the
 * top 15 (see aisTopVessels.js, a separate curated shortlist with
 * different/renamed columns). Source:
 * src/data/incidents/<id>/AIS5_vessel_ranking.csv. Used by the commercial
 * portal's Alibi Generator, which needs to look up *any* vessel by MMSI,
 * not only the ones already surfaced as top suspects elsewhere.
 */
import Papa from "papaparse";
import ow0008Raw from "./incidents/ow-0008/AIS5_vessel_ranking.csv?raw";
import ow0009Raw from "./incidents/ow-0009/AIS5_vessel_ranking.csv?raw";

const parseRanking = (raw) =>
  Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true })
    .data.filter((row) => row.mmsi != null)
    .map((row) => ({
      rank: row.rank,
      mmsi: String(row.mmsi),
      vesselName: row.vessel_name,
      imo: row.imo,
      vesselType: row.vessel_type,
      attributionScore: row.ais_attribution_score,
      spatialEvidence: row.spatial_evidence,
      temporalConsecutiveEvidence: row.temporal_consecutive_evidence,
      temporalCoverageEvidence: row.temporal_coverage_evidence,
      supportEvidence: row.support_evidence,
      nullEvidence: row.null_evidence,
      nullPValue: row.null_p_value,
      coverageFraction: row.coverage_fraction,
      nMatches: row.n_matches,
      nObservationsTotal: row.n_observations_total,
      maxIntervalHours: row.max_interval_hours,
      nGapsOverThreshold: row.n_gaps_over_threshold,
      strongestEncounterTimestamp: row.strongest_encounter_ais_t_s,
      strongestEncounterDistanceKm: row.strongest_encounter_distance_km,
      strongestMatchingCandidateId: row.strongest_matching_candidate_id,
      strongestCandidateSupport: row.strongest_candidate_support,
      strongestCandidateClusterId: row.strongest_candidate_cluster_id,
      firstCloseEncounterTimestamp: row.first_close_encounter_t_s,
      lastCloseEncounterTimestamp: row.last_close_encounter_t_s,
    }))
    .sort((a, b) => a.rank - b.rank);

export const aisVesselRankingByIncident = {
  "ow-0008": parseRanking(ow0008Raw),
  "ow-0009": parseRanking(ow0009Raw),
};

/**
 * Looks up one vessel by MMSI within a specific incident's ranking.
 * Returns null if that MMSI was never scored for this incident (it may
 * still be a real, trackable vessel — just not one the model evaluated for
 * this particular spill).
 */
export const findVesselRanking = (incidentId, mmsi) => {
  const rows = aisVesselRankingByIncident[incidentId] || [];
  const target = String(mmsi).trim();
  return rows.find((row) => row.mmsi === target) || null;
};
