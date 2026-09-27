import { useState, useRef } from "react";
import { UploadCloud, RotateCcw, Activity, Droplets, Waves } from "lucide-react";
import { extractSarPatchFeatures } from "../../../lib/sarPatchFeatures";
import { classifyOilSpill, modelMetrics } from "../../../lib/oilSpillModel";
import { estimateSlickMeasurements } from "../../../lib/slickMeasurements";

export const SpillClassifier = () => {
  const [customImage, setCustomImage] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  const handleFileUpload = (e) => {
    setUploadError("");
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      setUploadError("INVALID ASSET: REQUIRES JPEG OR PNG");
      e.target.value = "";
      return;
    }

    setResult(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageMeta({ name: file.name, size: (file.size / 1024).toFixed(1) + " KB" });
      setCustomImage(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Fires once the newly-uploaded image has actually decoded — only then can
  // its real pixels be read off a canvas. Runs the real feature-extraction +
  // trained-model pipeline (see sarPatchFeatures.js / oilSpillModel.js),
  // not a placeholder.
  const handleImageLoaded = () => {
    if (!customImage || !imgRef.current) return;
    const features = extractSarPatchFeatures(imgRef.current);
    const classification = classifyOilSpill(features);
    const measurements = classification.isOil
      ? estimateSlickMeasurements(features)
      : null;
    setResult({ features, classification, measurements });
    setIsProcessing(false);
  };

  const handleReset = () => {
    setCustomImage(null);
    setImageMeta(null);
    setUploadError("");
    setResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col gap-4 font-sans pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
          SAR Classifier
        </h2>
        {customImage && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-navy-800 hover:bg-navy-700 text-slate-500 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed -mt-2">
        Upload a SAR image patch. A model trained on the real DARTIS 2019
        oil-slick/look-alike dataset (Sentinel-1, Eastern Mediterranean) runs
        entirely in your browser to classify it.
      </p>

      <div className="flex flex-col gap-2">
        <input
          type="file"
          accept="image/jpeg, image/png, .jpg, .jpeg, .png"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex justify-center items-center gap-2 w-full py-2.5 bg-navy-900 border border-navy-800 hover:border-brand-400 hover:bg-brand-500/10 rounded-md text-xs font-bold text-slate-300 transition-all shadow-sm disabled:opacity-50"
        >
          <UploadCloud className="w-4 h-4 text-brand-400" /> UPLOAD SAR CAPTURE
          (JPEG/PNG)
        </button>
        {uploadError && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold rounded">
            {uploadError}
          </div>
        )}
      </div>

      <div className="bg-navy-900 rounded-md border border-navy-800 shadow-sm overflow-hidden relative">
        <div className="relative bg-slate-900">
          <img
            ref={imgRef}
            src={customImage || "/oilspill.jpg"}
            alt="SAR Target"
            crossOrigin="anonymous"
            onLoad={handleImageLoaded}
            className={`w-full h-44 md:h-48 object-cover mix-blend-screen transition-opacity ${isProcessing ? "opacity-30" : "opacity-80"}`}
          />
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-900/80 backdrop-blur-sm z-10">
              <Activity className="w-6 h-6 text-brand-400 animate-pulse mb-2" />
              <div className="text-[10px] font-bold text-brand-300 tracking-widest uppercase animate-pulse">
                Analyzing SAR Signature...
              </div>
            </div>
          )}
        </div>

        {customImage && imageMeta && !isProcessing && (
          <div className="flex justify-between items-center px-4 py-2 border-b border-navy-800 bg-navy-900">
            <span className="text-[10px] font-mono font-bold text-slate-500 truncate">
              {imageMeta.name}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {imageMeta.size}
            </span>
          </div>
        )}

        {result && !isProcessing ? (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                CLASSIFICATION
              </span>
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-bold rounded ${
                  result.classification.isOil
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                {result.classification.isOil ? (
                  <Droplets className="w-3 h-3" />
                ) : (
                  <Waves className="w-3 h-3" />
                )}
                {result.classification.isOil
                  ? "OIL SPILL DETECTED"
                  : "NO OIL — LOOK-ALIKE / WATER"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div className="flex flex-col gap-1 p-2 bg-navy-900 rounded border border-navy-800">
                <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                  CONFIDENCE
                </span>
                <span className="font-mono font-bold text-xs text-brand-400">
                  {result.classification.confidencePercent}%
                </span>
              </div>
              <div className="flex flex-col gap-1 p-2 bg-navy-900 rounded border border-navy-800">
                <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                  SEGMENTED REGION
                </span>
                <span className="font-mono font-bold text-xs text-slate-300">
                  {result.features.labelSize.toLocaleString()} px
                </span>
              </div>

              {result.classification.isOil && result.measurements && (
                <>
                  <div className="flex flex-col gap-1 p-2 bg-navy-900 rounded border border-navy-800">
                    <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                      SLICK AREA
                    </span>
                    <span className="font-mono font-bold text-xs text-rose-400">
                      {result.measurements.areaKm2} km²
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 bg-navy-900 rounded border border-navy-800">
                    <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                      PERIMETER (EST.)
                    </span>
                    <span className="font-mono font-bold text-xs text-rose-400">
                      {result.measurements.perimeterKm} km
                    </span>
                  </div>
                </>
              )}
            </div>

            <p className="text-[9px] text-slate-500 leading-relaxed">
              Area/perimeter assume Sentinel-1 resolution (~10m/pixel);
              perimeter is the segmented region's bounding-box perimeter, an
              upper-bound approximation, not a traced outline. Model held-out
              test accuracy: {(modelMetrics.test_accuracy * 100).toFixed(1)}%
              (n={modelMetrics.n_test}).
            </p>
          </div>
        ) : (
          !isProcessing && (
            <div className="p-4 text-center">
              <span className="text-[10px] text-slate-500">
                Upload a SAR capture to classify it.
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
};
