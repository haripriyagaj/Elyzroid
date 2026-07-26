const DANGEROUS_PERM_COMBOS = [
  { perms: ["READ_SMS", "INTERNET"], reason: "SMS Exfiltration", weight: 0.85 },
  { perms: ["RECORD_AUDIO", "INTERNET"], reason: "Audio Spyware", weight: 0.82 },
  { perms: ["CAMERA", "INTERNET", "RECEIVE_BOOT_COMPLETED"], reason: "Remote Camera / Persistence", weight: 0.88 },
  { perms: ["READ_CONTACTS", "READ_CALL_LOG", "INTERNET"], reason: "Data Exfiltration", weight: 0.78 },
  { perms: ["PROCESS_OUTGOING_CALLS", "READ_SMS"], reason: "Call/SMS Interception", weight: 0.92 },
  { perms: ["WRITE_EXTERNAL_STORAGE", "READ_EXTERNAL_STORAGE", "INTERNET"], reason: "File Exfiltration", weight: 0.65 },
  { perms: ["BIND_ACCESSIBILITY_SERVICE"], reason: "Accessibility Abuse", weight: 0.75 },
  { perms: ["SYSTEM_ALERT_WINDOW", "INTERNET"], reason: "Overlay Attack", weight: 0.72 },
  { perms: ["DEVICE_ADMIN"], reason: "Device Admin Abuse", weight: 0.9 },
];

const KNOWN_SAFE_PREFIXES = ["com.google", "com.android", "com.whatsapp", "com.facebook", "com.instagram", "com.spotify", "com.netflix", "com.amazon", "com.samsung", "com.oneplus", "com.xiaomi"];

const DANGEROUS_PERMS = new Set(["READ_SMS", "RECORD_AUDIO", "CAMERA", "PROCESS_OUTGOING_CALLS", "READ_CONTACTS", "DEVICE_ADMIN", "BIND_ACCESSIBILITY_SERVICE", "READ_CALL_LOG"]);

export function analyzeAppLocally(app) {
  const perms = (app.permissions || []).map((p) => String(p).replace("android.permission.", "").replace("com.android.", ""));

  let score = 0;
  const triggeredRules = [];

  for (const combo of DANGEROUS_PERM_COMBOS) {
    if (combo.perms.every((p) => perms.includes(p))) {
      score += combo.weight * 0.35;
      triggeredRules.push({ reason: combo.reason, weight: combo.weight });
    }
  }

  const dangerousCount = perms.filter((p) => DANGEROUS_PERMS.has(p)).length;
  score += dangerousCount * 0.06;

  if (perms.includes("RECEIVE_BOOT_COMPLETED") && perms.includes("INTERNET")) {
    score += 0.15;
    triggeredRules.push({ reason: "Persistent background + network", weight: 0.6 });
  }

  const pkg = String(app.packageName || "");
  const isKnown = KNOWN_SAFE_PREFIXES.some((prefix) => pkg.startsWith(prefix));
  if (isKnown) score *= 0.25;
  if (app.isSystemApp) score *= 0.15;

  score = Math.min(Math.max(score, 0), 1.0);
  const label = score > 0.65 ? "MALWARE" : score > 0.35 ? "SUSPICIOUS" : "BENIGN";

  return {
    packageName: app.packageName,
    label,
    score: Math.round(score * 1000) / 1000,
    confidence: Math.round(Math.min(score * 100 + 25, 98)),
    topFeatures: triggeredRules.sort((a, b) => b.weight - a.weight).slice(0, 3),
    permissions: perms,
    dangerousCount,
  };
}

export function generateXAIExplanation(predictions) {
  const malware = predictions.filter((p) => p.label === "MALWARE");
  const suspicious = predictions.filter((p) => p.label === "SUSPICIOUS");

  if (malware.length > 0) {
    const top = malware[0];
    const features = top.topFeatures.slice(0, 2).map((f) => f.reason).join(", ");
    return {
      emoji: "🚨",
      title: "Oops — Malware Detected!",
      text: `"${top.packageName}" scored ${(top.score * 100).toFixed(0)}% malware probability. Top risk drivers: ${features || "suspicious permission combo"}. Confidence: ${top.confidence}%.`,
      riskLevel: "HIGH",
    };
  }

  if (suspicious.length > 0) {
    return {
      emoji: "⚠️",
      title: "Caution — Suspicious Apps Detected",
      text: `${suspicious.length} app(s) show suspicious permission patterns. Risk factors include unusual permission combinations. Review recommendations and enable monitoring modules.`,
      riskLevel: "MEDIUM",
    };
  }

  return {
    emoji: "✅",
    title: "Everything Looks Good!",
    text: "All scanned apps appear benign. No dangerous permission combinations or malware indicators detected by the local analyzer.",
    riskLevel: "LOW",
  };
}

export function explainRootResult(rootResult) {
  if (rootResult?.isRooted) {
    const indicators = rootResult.indicators || [];
    return {
      emoji: "🔓",
      title: "Device is Rooted — High Risk!",
      text: `Root indicators found: ${indicators.slice(0, 3).join(", ")}. Root access weakens Android security sandboxing; avoid financial apps and sensitive operations.`,
      riskLevel: "HIGH",
    };
  }
  return {
    emoji: "✅",
    title: "No Root Detected — Device Secure",
    text: "No su/Magisk indicators detected. Device integrity appears intact.",
    riskLevel: "LOW",
  };
}

