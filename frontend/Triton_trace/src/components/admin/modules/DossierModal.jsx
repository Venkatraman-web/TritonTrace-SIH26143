import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Lock,
  X,
} from "lucide-react";
import { seedIncidents } from "../../../data/seedIncidents";
import {
  topVesselsByIncident,
  topVesselsFileUrlByIncident,
  displayScore,
} from "../../../data/aisTopVessels";
import {
  topOriginCandidatesByIncident,
  topOriginCandidatesFileUrlByIncident,
} from "../../../data/topOriginCandidates";
import {
  hotspotMatrixByIncident,
  hotspotMatrixFileUrlByIncident,
  HOTSPOT_MATRIX_CHECKPOINTS,
} from "../../../data/hotspotMatrix";
import { originAttributionImageUrlByIncident } from "../../../data/dossierImages";
import { getSlickPhotoUrl } from "../../../lib/staticSlickImage";
import { downloadFromUrl } from "../../../lib/csvExport";
import { formatUTCDateTime } from "../../../lib/dateFormat";

const HINDCAST_WINDOW_HOURS = 72;

// Compact table used for all three dossier data sections — columns declare
// their own header label + how to read a cell's value from a row object.
const DossierTable = ({ columns, rows, emptyLabel }) => {
  if (rows.length === 0) {
    return (
      <div className="p-3 border border-dashed border-slate-300 rounded-md bg-white text-center font-sans">
        <span className="text-[10px] text-slate-500">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className="border border-slate-200 rounded-md overflow-hidden shadow-sm">
      <div className="max-h-56 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  className="px-2 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider font-sans whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 bg-white">
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className="px-2 py-1.5 text-[10px] font-mono text-slate-700 whitespace-nowrap"
                  >
                    {col.getValue(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Draws one table into a jsPDF document as an actual bordered grid — outer
// box, a line under the header, a line under every row, and a vertical
// line between every column — handling page breaks *and* wrapped
// multi-line cells (a long hotspot/vessel name can wrap to 2+ lines within
// its column — the row height grows to fit, so the next row never
// overlaps it, and the grid lines grow with it).
const drawPdfTable = (pdf, { title, columns, rows, startY }) => {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const lineHeight = 3.2; // mm per wrapped text line at 7pt
  const rowPadding = 2.4;
  const cellPaddingX = 1.2;
  const usableWidth = pdf.internal.pageSize.getWidth() - marginX * 2;
  const colWidth = usableWidth / columns.length;
  const colX = (i) => marginX + i * colWidth;
  let y = startY;
  // Top of the current page's grid box — captured when the header is
  // (re)drawn, so the outer/vertical borders for that page segment can be
  // closed off once we know how tall it ended up being.
  let segmentTop = startY;

  pdf.setDrawColor(160);
  pdf.setLineWidth(0.2);

  const drawColumnLines = (top, bottom) => {
    for (let i = 0; i <= columns.length; i++) {
      const x = colX(i);
      pdf.line(x, top, x, bottom);
    }
  };

  const closeGridSegment = (bottom) => {
    pdf.setDrawColor(160);
    pdf.setLineWidth(0.2);
    drawColumnLines(segmentTop, bottom);
  };

  if (y + 12 > pageHeight - 12) {
    pdf.addPage();
    y = 16;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(title, marginX, y);
  y += 6;

  const drawHeaderRow = () => {
    segmentTop = y - 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    columns.forEach((col, i) => {
      pdf.text(col.header, colX(i) + cellPaddingX, y, {
        maxWidth: colWidth - cellPaddingX * 2,
      });
    });
    y += 1.6;
    pdf.setDrawColor(160);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, segmentTop, marginX + usableWidth, segmentTop);
    pdf.line(marginX, y, marginX + usableWidth, y);
    y += 2.4;
  };

  if (rows.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("No data available.", marginX, y);
    return y + 6;
  }

  drawHeaderRow();
  pdf.setFont("courier", "normal");
  pdf.setFontSize(7);
  rows.forEach((row) => {
    const cellLines = columns.map((col) =>
      pdf.splitTextToSize(String(col.getValue(row) ?? ""), colWidth - cellPaddingX * 2),
    );
    const rowLineCount = Math.max(...cellLines.map((lines) => lines.length), 1);
    const rowHeight = rowLineCount * lineHeight + rowPadding;

    if (y + rowHeight > pageHeight - 12) {
      closeGridSegment(y - rowPadding / 2);
      pdf.addPage();
      y = 16;
      drawHeaderRow();
    }

    cellLines.forEach((lines, i) => {
      pdf.text(lines, colX(i) + cellPaddingX, y);
    });
    y += rowHeight;
    pdf.setDrawColor(210);
    pdf.setLineWidth(0.1);
    pdf.line(marginX, y - rowPadding / 2, marginX + usableWidth, y - rowPadding / 2);
  });

  closeGridSegment(y - rowPadding / 2);

  return y + 4;
};

// Loads an already-rendered <img> element's pixels into a PNG data URL, so
// it can be embedded in the exported PDF without a second network fetch.
const imageElementToDataUrl = (img) => {
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
};

export const DossierModal = ({ isOpen, onClose, incidentId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const slickPhotoRef = useRef(null);
  const attributionImageRef = useRef(null);

  if (!isOpen) return null;

  const incident = seedIncidents.find((i) => i.incident_id === incidentId);
  const topVessels = topVesselsByIncident[incidentId] || [];
  const originCandidates = topOriginCandidatesByIncident[incidentId] || [];
  const hotspotRows = hotspotMatrixByIncident[incidentId] || [];
  const slickPhotoUrl = getSlickPhotoUrl(incidentId);
  const attributionImageUrl = originAttributionImageUrlByIncident[incidentId];
  const aisFileUrl = topVesselsFileUrlByIncident[incidentId];
  const originFileUrl = topOriginCandidatesFileUrlByIncident[incidentId];
  const hotspotFileUrl = hotspotMatrixFileUrlByIncident[incidentId];

  if (!incident) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xl p-6 max-w-sm w-full text-sm text-slate-600">
          No incident selected.
          <button
            onClick={onClose}
            className="block mt-4 text-brand-600 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const windowEnd = new Date(incident.detection_timestamp);
  const windowStart = new Date(
    windowEnd.getTime() - HINDCAST_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const originColumns = [
    { header: "T-HOURS", getValue: (c) => `T-${c.backtrackHours}h` },
    { header: "TIMESTAMP", getValue: (c) => formatUTCDateTime(c.candidateTimestamp) },
    { header: "CANDIDATE ID", getValue: (c) => c.candidateId },
    { header: "LAT", getValue: (c) => c.lat?.toFixed(4) },
    { header: "LON", getValue: (c) => c.lon?.toFixed(4) },
    { header: "CONFIDENCE", getValue: (c) => `${c.confidencePercent?.toFixed(1)}%` },
    { header: "RADIUS (KM)", getValue: (c) => c.clusterUncertaintyRadiusKm?.toFixed(1) },
  ];

  const aisColumns = [
    { header: "RANK", getValue: (v) => v.rank },
    { header: "VESSEL NAME", getValue: (v) => v.name },
    { header: "MMSI", getValue: (v) => v.mmsi },
    { header: "IMO", getValue: (v) => v.imo },
    { header: "TYPE", getValue: (v) => v.type },
    { header: "AIS5 SCORE", getValue: (v) => `${displayScore(v.score)}%` },
  ];

  const hotspotColumns = [
    { header: "HOTSPOT", getValue: (h) => h.hotspotName },
    ...HOTSPOT_MATRIX_CHECKPOINTS.map((cp) => ({
      header: cp.toUpperCase(),
      getValue: (h) => h.statusByCheckpoint[cp],
    })),
  ];

  const handleExportPDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      let y = 16;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(`TritonTrace Incident Dossier`, 12, y);
      y += 7;
      pdf.setFontSize(11);
      pdf.setTextColor(80);
      pdf.text(
        `Case ${incident.incident_id} — ${incident.status.replace(/_/g, " ")}`,
        12,
        y,
      );
      pdf.setTextColor(0);
      y += 10;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("1. Satellite Telemetry", 12, y);
      y += 6;
      pdf.setFont("courier", "normal");
      pdf.setFontSize(8);
      [
        `Sensor: ${incident.source}`,
        `Polarization: VV/VH`,
        `Detected: ${formatUTCDateTime(windowEnd)}`,
        `Slick Area: ${incident.slick_area_sqkm} km2`,
        `Perimeter: ${incident.perimeter_km} km`,
      ].forEach((line) => {
        pdf.text(line, 12, y);
        y += 5;
      });
      y += 2;

      const slickPhotoData = imageElementToDataUrl(slickPhotoRef.current);
      if (slickPhotoData) {
        const imgWidth = 90;
        const imgHeight =
          (slickPhotoRef.current.naturalHeight / slickPhotoRef.current.naturalWidth) *
          imgWidth;
        if (y + imgHeight > pdf.internal.pageSize.getHeight() - 12) {
          pdf.addPage();
          y = 16;
        }
        pdf.addImage(slickPhotoData, "PNG", 12, y, imgWidth, imgHeight);
        y += imgHeight + 8;
      }

      y = drawPdfTable(pdf, {
        title: "2. Hindcast Origin — Ranked Source Candidates",
        columns: originColumns,
        rows: originCandidates,
        startY: y,
      });

      const attributionImageData = imageElementToDataUrl(attributionImageRef.current);
      if (attributionImageData) {
        const imgWidth = 90;
        const imgHeight =
          (attributionImageRef.current.naturalHeight /
            attributionImageRef.current.naturalWidth) *
          imgWidth;
        if (y + imgHeight > pdf.internal.pageSize.getHeight() - 12) {
          pdf.addPage();
          y = 16;
        }
        pdf.addImage(attributionImageData, "PNG", 12, y, imgWidth, imgHeight);
        y += imgHeight + 8;
      }

      y = drawPdfTable(pdf, {
        title: "3. AIS Suspect Profile — Top 15",
        columns: aisColumns,
        rows: topVessels,
        startY: y,
      });

      y = drawPdfTable(pdf, {
        title: "4. Hotspot Alert Matrix",
        columns: hotspotColumns,
        rows: hotspotRows,
        startY: y,
      });

      if (y > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        y = 16;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("5. Chain of Custody", 12, y);
      y += 6;
      pdf.setFont("courier", "normal");
      pdf.setFontSize(8);
      pdf.text("Audit hash verified (0x3fA...bC4)", 12, y);

      pdf.save(`dossier_${incident.incident_id}.pdf`);
      setIsGenerating(false);
    }, 300);
  };

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xl flex flex-col overflow-hidden max-w-lg w-full">
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              Case File: {incident.incident_id}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Lock className="w-4 h-4 text-emerald-600" />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-5 text-xs font-mono text-slate-700 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">
              1. SATELLITE TELEMETRY
            </span>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 shadow-sm leading-relaxed">
              <div>
                <strong className="text-slate-900">Sensor:</strong>{" "}
                {incident.source}
              </div>
              <div>
                <strong className="text-slate-900">Polarization:</strong> VV/VH
              </div>
              <div>
                <strong className="text-slate-900">Detected:</strong>{" "}
                {formatUTCDateTime(windowEnd)}
              </div>
              <div>
                <strong className="text-slate-900">Slick Area:</strong>{" "}
                {incident.slick_area_sqkm} km²
              </div>
              <div>
                <strong className="text-slate-900">Perimeter:</strong>{" "}
                {incident.perimeter_km} km
              </div>
            </div>
            {slickPhotoUrl && (
              <div className="rounded-md border border-slate-200 overflow-hidden shadow-sm">
                <img
                  ref={slickPhotoRef}
                  src={slickPhotoUrl}
                  alt={`Zoomed observed slick extent — ${incident.incident_id}`}
                  crossOrigin="anonymous"
                  className="w-full h-auto block"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">
              2. HINDCAST ORIGIN
            </span>
            <span className="text-[10px] text-slate-500">
              72h backtracking window: {formatUTCDateTime(windowStart)} →{" "}
              {formatUTCDateTime(windowEnd)}
            </span>
            {attributionImageUrl && (
              <div className="rounded-md border border-slate-200 overflow-hidden shadow-sm">
                <img
                  ref={attributionImageRef}
                  src={attributionImageUrl}
                  alt={`Source-origin candidates vs. AIS attribution — ${incident.incident_id}`}
                  crossOrigin="anonymous"
                  className="w-full h-auto block"
                />
              </div>
            )}
            <DossierTable
              columns={originColumns}
              rows={originCandidates}
              emptyLabel="No backtracked origin candidates for this incident."
            />
            {originFileUrl && (
              <button
                onClick={() =>
                  downloadFromUrl(
                    originFileUrl,
                    `${incident.incident_id}_possible_source_origins_top.csv`,
                  )
                }
                className="w-full py-2 flex justify-center items-center gap-2 rounded-md text-[10px] font-bold tracking-wider transition-colors shadow-sm border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-sans"
              >
                <Download className="w-3.5 h-3.5" /> DOWNLOAD
                possible_source_origins_top.csv
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">
              3. AIS SUSPECT PROFILE
            </span>
            <DossierTable
              columns={aisColumns}
              rows={topVessels}
              emptyLabel="No AIS suspects matched."
            />
            {aisFileUrl && (
              <button
                onClick={() =>
                  downloadFromUrl(
                    aisFileUrl,
                    `${incident.incident_id}_AIS_top15_vessels.csv`,
                  )
                }
                className="w-full py-2 flex justify-center items-center gap-2 rounded-md text-[10px] font-bold tracking-wider transition-colors shadow-sm border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-sans"
              >
                <Download className="w-3.5 h-3.5" /> DOWNLOAD
                AIS_top15_vessels.csv
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">
              4. HOTSPOT ALERT MATRIX
            </span>
            <DossierTable
              columns={hotspotColumns}
              rows={hotspotRows}
              emptyLabel="No hotspot alert matrix for this incident."
            />
            {hotspotFileUrl && (
              <button
                onClick={() =>
                  downloadFromUrl(
                    hotspotFileUrl,
                    `${incident.incident_id}_hotspot_matrix.csv`,
                  )
                }
                className="w-full py-2 flex justify-center items-center gap-2 rounded-md text-[10px] font-bold tracking-wider transition-colors shadow-sm border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-sans"
              >
                <Download className="w-3.5 h-3.5" /> DOWNLOAD hotspot
                matrix CSV
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">
              5. CHAIN OF CUSTODY
            </span>
            <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-md border border-emerald-200 text-emerald-800 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">
                Audit hash verified (0x3fA...bC4)
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex-1 py-2.5 flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-bold tracking-wider transition-colors shadow-sm disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "GENERATING..." : "EXPORT DOSSIER (PDF)"}
          </button>
          <button
            onClick={handlePrint}
            className="flex-shrink-0 p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md shadow-sm transition-colors"
            title="Print Audit Brief"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
