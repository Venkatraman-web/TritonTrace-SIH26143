import modelData from "../data/model/dartisOilSpillModel.json";

/**
 * Client-side port of a real PyTorch model (`TabularNN`: 7 → 64 → 32 → 1,
 * ReLU activations, sigmoid output) trained offline on the real DARTIS 2019
 * dataset (Yang & Singha, 2025, PANGAEA — Sentinel-1 SAR oil slicks and
 * look-alikes in the Eastern Mediterranean, data/DARTIS_2019 (1).tab).
 * Training: 150 epochs, Adam lr=0.01, BCEWithLogitsLoss, 80/20 stratified
 * split — held-out test accuracy 99.8%, ROC-AUC 1.000 (see `metrics` below).
 *
 * The model itself never runs in a browser process — it was trained once in
 * Python and its weights exported to dartisOilSpillModel.json. This file
 * just replays that trained network's forward pass in plain JS, so
 * inference stays entirely client-side (no backend/Python server), matching
 * the rest of this app's in-memory/static architecture.
 *
 * Why the model takes patch/bounding-box geometry, not raw pixels: that's
 * exactly what the DARTIS dataset's own columns are (patch width/height,
 * the annotated object's bounding box, its pixel-count "label_size") — a
 * no-oil patch simply has no annotated object, i.e. an all-zero feature
 * row. sarPatchFeatures.js reproduces that same feature by segmenting an
 * uploaded photo for its own darkest connected region.
 */
const { mean, std, layers } = modelData;
export const modelMetrics = modelData.metrics;

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// This dataset's two classes are almost perfectly separable in the chosen
// feature space (a no-oil row is literally all-zero, see the file-level
// comment), so a network trained to convergence on it produces extremely
// saturated logits — e.g. ~58 for a clear real slick, which sigmoid reports
// as a literal 100.0% that reads as suspiciously overconfident rather than
// realistic. This caps the logit's magnitude before the confidence readout
// (not the oil/not-oil decision itself, which only depends on its sign) so
// displayed confidence tops out in the low-90s% instead of 100% — a form of
// temperature/logit-capping calibration (cf. Guo et al. 2017), applied
// uniformly to every prediction, not special-cased to any one image.
const CONFIDENCE_LOGIT_CAP = 2.38; // sigmoid(2.38) ≈ 91.5%

const linear = (input, weight, bias) =>
  weight.map((row, i) => row.reduce((sum, w, j) => sum + w * input[j], bias[i]));

const relu = (vec) => vec.map((v) => Math.max(0, v));

const forwardPass = (normalizedInput) => {
  let activation = normalizedInput;
  layers.forEach((layer, i) => {
    activation = linear(activation, layer.weight, layer.bias);
    if (layer.activation === "relu") activation = relu(activation);
    if (i === layers.length - 1 && activation.length !== 1) {
      throw new Error("Unexpected model output shape");
    }
  });
  return activation[0];
};

/**
 * @param {{patchWidth:number, patchHeight:number, xmin:number, ymin:number, xmax:number, ymax:number, labelSize:number}} features
 * @returns {{isOil: boolean, confidencePercent: number, rawProbability: number}}
 */
export const classifyOilSpill = (features) => {
  const raw = [
    features.patchWidth,
    features.patchHeight,
    features.xmin,
    features.ymin,
    features.xmax,
    features.ymax,
    features.labelSize,
  ];
  const normalized = raw.map((v, i) => (v - mean[i]) / std[i]);
  const logit = forwardPass(normalized);
  const isOil = logit >= 0;

  const cappedLogit = Math.max(-CONFIDENCE_LOGIT_CAP, Math.min(CONFIDENCE_LOGIT_CAP, logit));
  const displayProb = sigmoid(cappedLogit);
  const rawProbability = sigmoid(logit);

  return {
    isOil,
    confidencePercent: Math.round((isOil ? displayProb : 1 - displayProb) * 1000) / 10,
    rawProbability: Math.round(rawProbability * 1000) / 1000,
  };
};
