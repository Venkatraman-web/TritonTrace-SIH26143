import React, { useState, useRef } from "react";
import { useIncident } from "../../../context/IncidentContext";
import { reportService } from "../../../services/reportService";
import {
  MapPin,
  Target,
  LocateFixed,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react";

export const IncidentReportForm = () => {
  const {
    interactionMode,
    setInteractionMode,
    pickedCoordinate,
    setPickedCoordinate,
    setPanToCoordinate,
  } = useIncident();
  const [severity, setSeverity] = useState("Moderate");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [geoError, setGeoError] = useState("");

  const [evidenceImage, setEvidenceImage] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceError, setEvidenceError] = useState("");

  const isPicking = interactionMode === "pick_coordinate";

  const togglePicking = () => {
    setInteractionMode(isPicking ? "none" : "pick_coordinate");
    setGeoError("");
  };

  const handleAutoDetect = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("GEOLOCATION NOT SUPPORTED");
      return;
    }

    setIsDetecting(true);
    setInteractionMode("none");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetecting(false);
        const coord = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setPickedCoordinate(coord);
        setPanToCoordinate(coord);
        setToast("GPS FIX ACQUIRED");
        setTimeout(() => setToast(""), 3000);
      },
      (error) => {
        setIsDetecting(false);
        setGeoError(
          error.code === error.TIMEOUT
            ? "GPS REQUEST TIMED OUT"
            : "LOCATION ACCESS DENIED",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleImageUpload = (e) => {
    setEvidenceError("");
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      setEvidenceError("INVALID FORMAT: ONLY JPEG / JPG SUPPORTED");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError("FILE TOO LARGE: MAXIMUM SIZE IS 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEvidenceImage(event.target.result);
      setEvidenceFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pickedCoordinate)
      return alert("Please select a coordinate on the map.");

    const report = reportService.createReport({
      lat: pickedCoordinate.lat,
      lon: pickedCoordinate.lon,
      severity,
      notes,
      evidenceImage,
    });

    setToast(`Alert Generated: ${report.id}`);
    setTimeout(() => setToast(""), 5000);
    setPickedCoordinate(null);
    setNotes("");
    setEvidenceImage(null);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
        Report Incident
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Location Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider">
            LOCATION
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={togglePicking}
              className={`flex-1 flex items-center justify-center text-xs font-bold px-3 py-2 rounded-md border transition-colors shadow-sm ${
                isPicking
                  ? "bg-brand-500/10 border-brand-500/40 text-brand-300"
                  : "bg-navy-900 border-navy-800 text-slate-300 hover:bg-navy-800"
              }`}
            >
              <Target className="w-3.5 h-3.5 mr-2" />
              {isPicking ? "CLICK MAP" : "MAP PICK"}
            </button>

            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isDetecting}
              className="flex-1 flex items-center justify-center text-xs font-bold px-3 py-2 rounded-md bg-navy-900 border border-navy-800 text-slate-300 hover:bg-navy-800 transition-colors shadow-sm disabled:opacity-70"
            >
              {isDetecting ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-brand-400" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 mr-2 text-brand-400" />
              )}
              {isDetecting ? "ACQUIRING..." : "AUTO GPS"}
            </button>
          </div>

          {geoError && (
            <div className="text-[10px] font-bold mt-1 p-2 border rounded bg-rose-500/10 border-rose-500/30 text-rose-300">
              {geoError}
            </div>
          )}
          {pickedCoordinate && (
            <div className="flex items-center gap-2 p-2.5 bg-brand-500/10 border border-brand-500/30 rounded-md text-xs font-mono font-bold text-brand-300">
              <MapPin className="w-4 h-4 text-brand-400" />
              {pickedCoordinate.lat.toFixed(4)},{" "}
              {pickedCoordinate.lon.toFixed(4)}
            </div>
          )}
        </div>

        {/* Severity Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider">
            SEVERITY
          </label>
          <div className="flex gap-2">
            {["Minor", "Moderate", "Major"].map((sev) => (
              <button
                type="button"
                key={sev}
                onClick={() => setSeverity(sev)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md border shadow-sm transition-colors ${
                  severity === sev
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-navy-900 text-slate-500 border-navy-800 hover:bg-navy-800"
                }`}
              >
                {sev.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider">
            UPLOAD FIELD EVIDENCE (JPEG)
          </label>
          {!evidenceImage ? (
            <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-navy-700 rounded-md bg-navy-900 hover:bg-navy-700 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/jpeg, .jpg"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-500 font-medium">
                Drag & drop or browse .jpg
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-2 border border-navy-800 bg-navy-900 rounded-md shadow-sm">
              <div className="relative">
                <img
                  src={evidenceImage}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => setEvidenceImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-navy-900 text-rose-400 border border-navy-800 rounded-md shadow hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono text-slate-300 truncate">
                  {evidenceFile.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {evidenceFile.size} MB
                </span>
              </div>
            </div>
          )}
          {evidenceError && (
            <div className="text-[10px] font-bold mt-1 p-2 border rounded bg-rose-500/10 border-rose-500/30 text-rose-300">
              {evidenceError}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider">
            VISUAL NOTES
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-navy-900 border border-navy-800 rounded-md p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 min-h-[80px] shadow-sm"
            placeholder="Describe slick appearance, odor, or local observations..."
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-bold tracking-widest shadow-md transition-colors"
        >
          SUBMIT INCIDENT ALERT
        </button>
      </form>

      {toast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center rounded-md shadow-sm">
          {toast}
        </div>
      )}
    </div>
  );
};
