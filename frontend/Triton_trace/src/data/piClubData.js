/**
 * Per-incident top-15 vessels with their assigned P&I (Protection & Indemnity)
 * club, used by the commercial portal's P&I Risk Assessor to let an operator
 * pick a club and see which of the incident's top suspect vessels it insures.
 * Source: src/data/incidents/<id>/AIS_top15_vessels_with_PI.csv.
 */
import Papa from "papaparse";
import ow0008Raw from "./incidents/ow-0008/AIS_top15_vessels_with_PI.csv?raw";
import ow0009Raw from "./incidents/ow-0009/AIS_top15_vessels_with_PI.csv?raw";

const parsePiData = (raw) =>
  Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true })
    .data.filter((row) => row.MMSI != null)
    .map((row) => ({
      piClub: row.pi_club,
      rank: row.AIS_rank,
      vesselName: row.vessel_name,
      mmsi: String(row.MMSI),
      imo: row.IMO,
      vesselType: row.vessel_type,
      attributionScore: row.AIS5_score,
      minSyncDistanceKm: row.min_synchronized_distance_km,
      exactCloseEncounterCount: row.exact_close_encounter_count,
      longestConsecutiveEncounter: row.longest_consecutive_encounter,
      consecutiveDurationHours: row.consecutive_duration_hours,
      coverageFraction: row.AIS_coverage_fraction,
      bestEncounterTimestamp: row.best_encounter_timestamp,
      bestEncounterLat: row.best_encounter_lat,
      bestEncounterLon: row.best_encounter_lon,
      matchedCandidateId: row.matched_candidate_id,
      matchedCandidateLat: row.matched_candidate_lat,
      matchedCandidateLon: row.matched_candidate_lon,
      candidateSupport: row.candidate_support,
      clusterId: row.cluster_id,
      nullPValue: row.AIS4_null_p_value,
      dataAvailabilityNote: row.data_availability_note,
    }))
    .sort((a, b) => a.rank - b.rank);

export const piClubDataByIncident = {
  "ow-0008": parsePiData(ow0008Raw),
  "ow-0009": parsePiData(ow0009Raw),
};

// Fixed dropdown order, independent of which clubs happen to appear in a
// given incident's top 15 — a club with no vessels this time still shows up
// with an explicit "no vessels" state rather than disappearing.
export const PI_CLUBS = ["Britannia P&I", "Gard P&I", "NorthStandard", "Skuld", "UK P&I Club"];

/** All top-15 vessels this incident has insured under a given P&I club. */
export const findVesselsByPiClub = (incidentId, piClub) => {
  const rows = piClubDataByIncident[incidentId] || [];
  return rows.filter((row) => row.piClub === piClub);
};
