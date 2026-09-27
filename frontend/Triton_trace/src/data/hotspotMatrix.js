/**
 * 12-hourly hotspot alert matrix per incident — coarser checkpoints (t-0,
 * t-12, ..., t-72) than the hourly computeHotspotStatuses() used elsewhere
 * in the app, from each run's own 000{8,9}-hotspot.csv
 * (src/data/incidents/<id>/hotspot_matrix.csv). Used by the Review
 * Dossier's Hotspot Alert Matrix section.
 */
import Papa from "papaparse";
import ow0008Raw from "./incidents/ow-0008/hotspot_matrix.csv?raw";
import ow0009Raw from "./incidents/ow-0009/hotspot_matrix.csv?raw";
import ow0008Url from "./incidents/ow-0008/hotspot_matrix.csv?url";
import ow0009Url from "./incidents/ow-0009/hotspot_matrix.csv?url";

export const HOTSPOT_MATRIX_CHECKPOINTS = ["t-0", "t-12", "t-24", "t-36", "t-48", "t-60", "t-72"];

const parseHotspotMatrix = (raw) =>
  Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true })
    .data.filter((row) => row.hotspot_name != null)
    .map((row) => ({
      hotspotName: row.hotspot_name,
      statusByCheckpoint: Object.fromEntries(
        HOTSPOT_MATRIX_CHECKPOINTS.map((cp) => [cp, row[cp]]),
      ),
    }));

export const hotspotMatrixByIncident = {
  "ow-0008": parseHotspotMatrix(ow0008Raw),
  "ow-0009": parseHotspotMatrix(ow0009Raw),
};

export const hotspotMatrixFileUrlByIncident = {
  "ow-0008": ow0008Url,
  "ow-0009": ow0009Url,
};
