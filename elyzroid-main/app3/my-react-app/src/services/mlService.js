import * as tf from "@tensorflow/tfjs";

// Optional: only load when you actually use TFLite in the browser build.
// eslint-disable-next-line import/no-unresolved
let tflite = null;

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;

  // Lazy import so the app can run even if the runtime isn't available yet.
  try {
    // eslint-disable-next-line import/no-unresolved
    tflite = await import("@tensorflow/tfjs-tflite");
  } catch {
    tflite = null;
  }

  // In a real implementation you would:
  // - await tf.setBackend('wasm') or 'webgl' as appropriate
  // - fetch TFLite model files and call tflite.loadTFLiteModel(...)
  await tf.ready();
  modelsLoaded = true;
}

export async function runInference({ features }) {
  await loadModels();

  // Placeholder: return a deterministic-ish score from the feature count
  const n = Array.isArray(features) ? features.length : 0;
  const score = Math.max(0, Math.min(1, (n % 17) / 16));

  return {
    riskLevel: score < 0.25 ? "LOW" : score < 0.65 ? "MEDIUM" : "HIGH",
    malwareProbability: score,
    anomalyScore: score * 0.9,
    details: {
      tfliteAvailable: Boolean(tflite),
    },
  };
}

export function getShapText({ topFactors = [] } = {}) {
  if (!topFactors.length) {
    return "Everything looks good. No strong risk indicators were found.";
  }
  return `Top risk drivers: ${topFactors.slice(0, 4).join(", ")}.`;
}

