import Papa from "papaparse";

// Downloads an array of plain objects as a CSV file. Each object's own keys
// become the header row — callers curate exactly which fields go in.
export const downloadCsv = (filename, rows) => {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Downloads an already-existing static file (e.g. a bundled `?url` asset)
// as-is, byte for byte — for raw source CSVs that shouldn't be
// re-serialized through Papa.unparse.
export const downloadFromUrl = (url, filename) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
};
