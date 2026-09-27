/**
 * Oil weathering timelines per incident — where the spilled mass goes over
 * the 72h forward forecast (src/data/incidents/<id>/weathering_timeline.csv).
 * One row per forecast hour (0..72, same index as forwardTrackStep), with
 * the seeded mass split into oil remaining / evaporated / dispersed /
 * biodegraded — both as kg and as a percentage of total_seeded_kg.
 */
import Papa from "papaparse";
import ow0008Raw from "./incidents/ow-0008/weathering_timeline.csv?raw";
import ow0009Raw from "./incidents/ow-0009/weathering_timeline.csv?raw";
import ow0008Url from "./incidents/ow-0008/weathering_timeline.csv?url";
import ow0009Url from "./incidents/ow-0009/weathering_timeline.csv?url";

const parseWeathering = (raw) =>
  Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true })
    .data.filter((row) => row.hour != null)
    .map((row) => ({
      hour: row.hour,
      timestampUtc: row.timestamp_utc,
      totalSeededKg: row.total_seeded_kg,
      oilRemainingKg: row.oil_remaining_kg,
      oilRemainingPct: row.oil_remaining_pct,
      evaporatedKg: row.evaporated_kg,
      evaporatedPct: row.evaporated_pct,
      dispersedKg: row.dispersed_kg,
      dispersedPct: row.dispersed_pct,
      biodegradedKg: row.biodegraded_kg,
      biodegradedPct: row.biodegraded_pct,
    }))
    .sort((a, b) => a.hour - b.hour);

export const weatheringTimelineByIncident = {
  "ow-0008": parseWeathering(ow0008Raw),
  "ow-0009": parseWeathering(ow0009Raw),
};

export const weatheringFileUrlByIncident = {
  "ow-0008": ow0008Url,
  "ow-0009": ow0009Url,
};
