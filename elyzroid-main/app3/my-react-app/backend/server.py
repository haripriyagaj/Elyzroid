import hashlib
import io
import json
import math
import os
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

import joblib
import numpy as np
from flask import Flask, jsonify, request

try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

APP = Flask(__name__)

# --- CORS ---
@APP.after_request
def add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp

# ---- Paths to saved models ----
REPO_ROOT = Path(__file__).resolve().parents[2]
RF_PATH = REPO_ROOT / "drebin_rf.pkl"
RF_SCALER_PATH = REPO_ROOT / "drebin_scaler.pkl"
ISO_PATH = REPO_ROOT / "isolation_forest_model.pkl"
ISO_SCALER_PATH = REPO_ROOT / "feature_scaler.pkl"
MOBILENET_PATH = REPO_ROOT / "my-react-app" / "models" / "mobilenet_model.keras"

_MODEL_STATUS: Dict[str, str] = {}
_MODELS: Optional[Any] = None


@dataclass
class Models:
    rf: Any = None
    rf_scaler: Any = None
    iso: Any = None
    iso_scaler: Any = None
    mobilenet: Any = None


def load_models() -> Models:
    global _MODELS, _MODEL_STATUS
    if _MODELS is not None:
        return _MODELS
    m = Models()
    for path, attr, label in [
        (RF_PATH, "rf", "rf"),
        (RF_SCALER_PATH, "rf_scaler", "rf_scaler"),
        (ISO_PATH, "iso", "iso"),
        (ISO_SCALER_PATH, "iso_scaler", "iso_scaler"),
    ]:
        if path.exists():
            try:
                obj = joblib.load(str(path))
                setattr(m, attr, obj)
                _MODEL_STATUS[label] = "loaded"
            except Exception as e:
                _MODEL_STATUS[label] = f"error: {e}"
        else:
            _MODEL_STATUS[label] = "missing"
    if TF_AVAILABLE and MOBILENET_PATH.exists():
        try:
            m.mobilenet = tf.keras.models.load_model(str(MOBILENET_PATH))
            _MODEL_STATUS["mobilenet"] = "loaded"
        except Exception as e:
            _MODEL_STATUS["mobilenet"] = f"error: {e}"
    else:
        _MODEL_STATUS["mobilenet"] = "missing" if not TF_AVAILABLE else "missing file"
    _MODELS = m
    return m


# ---- Feature hashing ----
def stable_hash(s: str) -> int:
    return int(hashlib.md5(s.encode("utf-8", errors="ignore")).hexdigest(), 16)


def hashed_ngrams(text: str, n: int, bins: int) -> np.ndarray:
    t = (text or "").lower()
    if len(t) < n:
        return np.zeros((bins,), dtype=np.float32)
    v = np.zeros((bins,), dtype=np.float32)
    for i in range(len(t) - n + 1):
        g = t[i : i + n]
        v[stable_hash(g) % bins] += 1.0
    v = np.log1p(v)
    return v


def make_vector(text: str, size: int) -> np.ndarray:
    a = hashed_ngrams(text, 2, size)
    b = hashed_ngrams(text, 3, size)
    v = (a + b) * 0.5
    return v.astype(np.float32)


# ---- APK deep analysis ----
DANGEROUS_PERMISSIONS = {
    "SEND_SMS": 0.35, "READ_SMS": 0.30, "RECEIVE_SMS": 0.30,
    "CALL_PHONE": 0.25, "PROCESS_OUTGOING_CALLS": 0.35,
    "READ_PHONE_STATE": 0.15, "READ_CONTACTS": 0.15,
    "RECORD_AUDIO": 0.20, "CAMERA": 0.10, "ACCESS_FINE_LOCATION": 0.10,
    "SYSTEM_ALERT_WINDOW": 0.25, "WRITE_SETTINGS": 0.15,
    "RECEIVE_BOOT_COMPLETED": 0.15, "INSTALL_PACKAGES": 0.40,
    "DELETE_PACKAGES": 0.30, "BIND_ACCESSIBILITY_SERVICE": 0.40,
    "BIND_NOTIFICATION_LISTENER_SERVICE": 0.30,
}

SUSPICIOUS_ACTIVITIES = {"MainActivity", "SplashActivity", "LaunchActivity"}
SUSPICIOUS_RECEIVERS = {"BootReceiver", "SmsReceiver", "AlarmReceiver", "AdminReceiver"}
SUSPICIOUS_SERVICES = {"BackgroundService", "MonitorService", "KeepAliveService"}

MALICIOUS_STRING_PATTERNS = [
    re.compile(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", re.I),
    re.compile(r"https?://[^/\s]*(?:bit\.ly|tinyurl|t\.co|goo\.gl|short\.link|ow\.ly)", re.I),
    re.compile(r"[13][a-km-zA-HJ-NP-Z1-9]{25,34}"),  # BTC
    re.compile(r"0x[a-fA-F0-9]{40}"),  # ETH
    re.compile(r"bc1[ac-hj-np-z02-9]{11,71}"),  # Bech32
    re.compile(r"(\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b)"),  # Credit card-ish
    re.compile(r"(?:password|passwd|pwd)\s*[=:]", re.I),
    re.compile(r"base64", re.I),
    re.compile(r"aes|des|rc4|blowfish", re.I),
    re.compile(r"exec\(|Runtime\.getRuntime\(|ProcessBuilder", re.I),
    re.compile(r"http://[^/\s]*\.(xyz|tk|ml|ga|cf|top|click|link|pw)", re.I),
]


def extract_apk_features(apk_bytes: bytes) -> Dict[str, Any]:
    """Deep APK analysis: manifest permissions, components, strings."""
    stats = {
        "sha256": hashlib.sha256(apk_bytes).hexdigest(),
        "size_bytes": len(apk_bytes),
        "permissions": [],
        "activities": [],
        "services": [],
        "receivers": [],
        "providers": [],
        "suspicious_strings": [],
        "dex_count": 0,
        "file_count": 0,
        "has_manifest": False,
        "min_sdk": None,
        "target_sdk": None,
        "package_name": None,
        "package_name": None,
        "package_name": None,
    }
    try:
        with zipfile.ZipFile(io.BytesIO(apk_bytes)) as z:
            names = z.namelist()
            stats["file_count"] = len(names)
            stats["dex_count"] = sum(1 for n in names if n.lower().endswith(".dex"))

            # Parse AndroidManifest.xml
            if "AndroidManifest.xml" in names:
                stats["has_manifest"] = True
                try:
                    raw = z.read("AndroidManifest.xml")
                    # Android binary XML → basic string extraction
                    text = raw.decode("utf-8", errors="ignore")
                    # Permission extraction from text
                    for perm in DANGEROUS_PERMISSIONS:
                        if perm in text:
                            stats["permissions"].append(perm)
                    # Component extraction
                    for tag in ["activity", "service", "receiver", "provider"]:
                        # Very rough extraction from decoded binary xml strings
                        found = re.findall(rf'({tag}[^>]+name="([^"]+)"', text, re.I)
                        # Alternative: just scan for class names
                    # Try AXML parsing fallback - just look for known patterns
                    all_text = text
                    for p in DANGEROUS_PERMISSIONS:
                        if p in all_text and p not in stats["permissions"]:
                            stats["permissions"].append(p)

                    # Look for component names
                    for comp in re.findall(r'android:name="([^"]+)"', all_text):
                        if ".activity." in comp.lower() or "Activity" in comp:
                            stats["activities"].append(comp)
                        elif ".service." in comp.lower() or "Service" in comp:
                            stats["services"].append(comp)
                        elif ".receiver." in comp.lower() or "Receiver" in comp:
                            stats["receivers"].append(comp)
                        elif ".provider." in comp.lower() or "Provider" in comp:
                            stats["providers"].append(comp)

                    # SDK versions
                    sdk_match = re.search(r'minSdkVersion.*?["\']?(\d+)', all_text)
                    if sdk_match:
                        stats["min_sdk"] = int(sdk_match.group(1))
                    tgt_match = re.search(r'targetSdkVersion.*?["\']?(\d+)', all_text)
                    if tgt_match:
                        stats["target_sdk"] = int(tgt_match.group(1))
                    pkg_match = re.search(r'package="([^"]+)"', all_text)
                    if pkg_match:
                        stats["package_name"] = pkg_match.group(1)
                except Exception:
                    pass

            # Extract suspicious strings from all text files / dex
            for n in names:
                if n.endswith((".dex", ".txt", ".xml", ".json")) or "classes" in n:
                    try:
                        data = z.read(n)
                        text = data.decode("utf-8", errors="ignore")
                        for pat in MALICIOUS_STRING_PATTERNS:
                            for match in pat.finditer(text):
                                s = match.group(0)
                                if s not in stats["suspicious_strings"]:
                                    stats["suspicious_strings"].append(s)
                                if len(stats["suspicious_strings"]) >= 50:
                                    break
                            if len(stats["suspicious_strings"]) >= 50:
                                break
                    except Exception:
                        pass

    except Exception:
        stats["file_count"] = 0
    return stats


def heuristic_apk_score(stats: Dict[str, Any], filename: str) -> float:
    """Score APK based on extracted features. 0=safe, 1=malicious."""
    score = 0.0
    reasons = []

    # Permission risk
    perm_score = sum(DANGEROUS_PERMISSIONS.get(p, 0.05) for p in stats["permissions"])
    score += min(perm_score, 0.60)
    if perm_score > 0:
        reasons.append(f"{len(stats['permissions'])} dangerous permissions")

    # Component suspiciousness
    comp_score = 0.0
    for r in stats["receivers"]:
        rname = r.split(".")[-1]
        if any(s in rname for s in SUSPICIOUS_RECEIVERS):
            comp_score += 0.15
    for s in stats["services"]:
        sname = s.split(".")[-1]
        if any(sus in sname for sus in SUSPICIOUS_SERVICES):
            comp_score += 0.10
    score += min(comp_score, 0.30)
    if comp_score > 0:
        reasons.append(f"suspicious components ({len(stats['receivers'])} receivers)")

    # Suspicious strings
    str_score = min(len(stats["suspicious_strings"]) * 0.04, 0.35)
    score += str_score
    if str_score > 0:
        reasons.append(f"{len(stats['suspicious_strings'])} suspicious strings")

    # Filename heuristics
    fname = filename.lower()
    if any(k in fname for k in ["malware", "trojan", "spy", "hack", "crack", "keylogger", "botnet", "rat", "stealer"]):
        score += 0.30
        reasons.append("malicious filename keyword")
    elif any(k in fname for k in ["cheat", "mod", "premium", "unlocker", "generator", "fake"]):
        score += 0.15
        reasons.append("suspicious filename keyword")

    # APK size anomaly (very small or very large)
    size_mb = stats["size_bytes"] / (1024 * 1024)
    if size_mb < 0.5 and stats["permissions"]:
        score += 0.10
        reasons.append("tiny APK with permissions")
    if size_mb > 200:
        score += 0.05

    # Low SDK = more suspicious
    if stats["min_sdk"] is not None and stats["min_sdk"] < 21:
        score += 0.08
        reasons.append(f"very low minSdk ({stats['min_sdk']})")

    final = min(score, 1.0)
    return final, reasons


# ---- Model scoring with graceful fallback ----
def rf_score(models: Models, x: np.ndarray) -> Optional[float]:
    if models.rf is None:
        return None
    try:
        X = x.reshape(1, -1)
        expected = getattr(models.rf, "n_features_in_", None)
        if expected is not None and expected != X.shape[1]:
            return None
        if models.rf_scaler is not None:
            X = models.rf_scaler.transform(X)
        proba = models.rf.predict_proba(X)[0]
        return float(proba[1]) if len(proba) == 2 else float(np.max(proba))
    except Exception:
        return None


def iso_score(models: Models, x: np.ndarray) -> Optional[float]:
    if models.iso is None:
        return None
    try:
        X = x.reshape(1, -1)
        expected = getattr(models.iso, "n_features_in_", None)
        if expected is not None and expected != X.shape[1]:
            return None
        if models.iso_scaler is not None:
            X = models.iso_scaler.transform(X)
        df = float(models.iso.decision_function(X)[0])
        return float(1.0 / (1.0 + math.exp(5.0 * df)))
    except Exception:
        return None


def mobilenet_score(models: Models, apk_bytes: bytes) -> Optional[float]:
    if models.mobilenet is None:
        return None
    try:
        h = hashlib.sha256(apk_bytes).digest()
        arr = np.frombuffer(h, dtype=np.uint8)
        img_flat = np.tile(arr, (50176 // len(arr) + 1))[:50176].astype(np.float32) / 255.0
        img = img_flat.reshape(224, 224, 1)
        img = np.repeat(img, 3, axis=2)
        img_batch = np.expand_dims(img, 0)
        pred = models.mobilenet.predict(img_batch, verbose=0)[0]
        return float(np.max(pred))
    except Exception:
        return None


def ensemble_vote(mobile: Optional[float], rf: Optional[float], iso: Optional[float]) -> Tuple[float, Dict[str, float]]:
    parts = []
    if mobile is not None:
        parts.append(("mobile", mobile, 0.40))
    if rf is not None:
        parts.append(("rf", rf, 0.35))
    if iso is not None:
        parts.append(("iso", iso, 0.25))
    if not parts:
        return 0.5, {}
    wsum = sum(w for _, _, w in parts)
    contrib = {name: (w / wsum) for name, _, w in parts}
    score = sum(val * (w / wsum) for name, val, w in parts)
    return float(score), contrib


def score_to_label(score: float) -> Tuple[str, str]:
    if score < 0.30:
        return "LOW", "Safe"
    if score < 0.60:
        return "MEDIUM", "Suspicious"
    return "HIGH", "Malicious"


def model_label(score: Optional[float]) -> str:
    if score is None:
        return "N/A"
    if score < 0.30:
        return "Safe"
    if score < 0.60:
        return "Suspicious"
    return "Malicious"


def make_response(final_score: float, risk: str, verdict: str, reasons: List[str],
                  input_type: str, meta: Dict[str, Any], explanation: str = "",
                  recommendations: List[str] = None, model_breakdown: Dict[str, Any] = None,
                  file_info: Dict[str, Any] = None, model_status: Dict[str, str] = None):
    resp = {
        "score": round(float(final_score), 4),
        "risk": risk,
        "verdict": verdict,
        "input_type": input_type,
        "meta": meta,
        "xai": {"top_reasons": reasons[:8]},
    }
    if explanation:
        resp["explanation"] = explanation
    if recommendations:
        resp["recommendations"] = recommendations
    if model_breakdown:
        resp["modelBreakdown"] = model_breakdown
    if file_info:
        resp["fileInfo"] = file_info
    if model_status:
        resp["modelStatus"] = model_status
    if risk == "HIGH":
        detected_package = None
        if file_info:
            detected_package = file_info.get("packageName")
        if not detected_package:
            detected_package = meta.get("packageName") if isinstance(meta, dict) else None
        resp["remediation"] = {
            "required": True,
            "message": "This app is malicious. Do you want to block or uninstall it?",
            "actions": ["block", "uninstall"],
            "packageName": detected_package,
        }
    return resp


# ---- API endpoints ----
@APP.route("/api/scan/app", methods=["POST", "OPTIONS"])
def api_scan_app():
    if request.method == "OPTIONS":
        return ("", 204)

    models = load_models()

    # Multipart APK upload
    if "apk" in request.files:
        f = request.files["apk"]
        apk_bytes = f.read() if f else b""
        filename = (f.filename or "unknown.apk").lower()

        # Deep APK analysis
        stats = extract_apk_features(apk_bytes)

        # Heuristic score from actual APK contents
        heuristic_score, heuristic_reasons = heuristic_apk_score(stats, filename)

        # Try ML models (may fail due to feature mismatch)
        text_tokens = " ".join(stats["permissions"] + stats["activities"] + stats["services"] + stats["receivers"] + stats["suspicious_strings"][:20])
        x_rf = make_vector(text_tokens, 215)
        x_iso = make_vector(text_tokens, 119)
        rf = rf_score(models, x_rf)
        iso = iso_score(models, x_iso)
        mobile = mobilenet_score(models, apk_bytes)

        # Build model breakdown
        model_breakdown = {
            "heuristic": {
                "score": round(heuristic_score, 4),
                "label": model_label(heuristic_score),
                "reasons": heuristic_reasons,
                "source": "rule-based"
            },
            "randomForest": {
                "score": round(rf, 4) if rf is not None else None,
                "label": model_label(rf) if rf is not None else "N/A"
            },
            "isolationForest": {
                "score": round(iso, 4) if iso is not None else None,
                "label": model_label(iso) if iso is not None else "N/A"
            },
            "mobilenet": {
                "score": round(mobile, 4) if mobile is not None else None,
                "label": model_label(mobile) if mobile is not None else "N/A"
            }
        }

        # Ensemble: trust heuristic most since it analyzes actual APK content
        # RF/ISO are fallbacks that may not work with current feature vectors
        parts = []
        parts.append(("heuristic", heuristic_score, 0.50))
        if rf is not None:
            parts.append(("rf", rf, 0.20))
        if iso is not None:
            parts.append(("iso", iso, 0.15))
        if mobile is not None:
            parts.append(("mobile", mobile, 0.15))

        wsum = sum(w for _, _, w in parts)
        final = sum(val * (w / wsum) for _, val, w in parts)

        risk, verdict = score_to_label(final)

        reasons = [f"Heuristic APK analysis: {heuristic_score:.2f}"] + heuristic_reasons
        if rf is not None:
            reasons.append(f"RandomForest={rf:.3f}")
        if iso is not None:
            reasons.append(f"IsolationForest={iso:.3f}")
        if mobile is not None:
            reasons.append(f"MobileNet={mobile:.3f}")

        # Recommendations based on risk
        if risk == "LOW":
            recommendations = [
                f"'{filename}' appears safe to install.",
                "Permissions and components look normal.",
                "Continue using official app stores for updates."
            ]
        elif risk == "MEDIUM":
            recommendations = [
                f"Review '{filename}' carefully before installing.",
                f"Found {len(stats['permissions'])} potentially dangerous permissions.",
                "Check the developer and source before installing.",
                "Enable Toolkit monitoring modules for protection."
            ]
        else:
            recommendations = [
                f"DO NOT install '{filename}'. Flagged as malicious.",
                f"Dangerous permissions: {', '.join(stats['permissions'][:6])}",
                "Delete this file immediately.",
                "Run a full device scan if already installed.",
                "Enable all Toolkit modules for real-time defense."
            ]

        file_info = {
            "filename": filename,
            "sizeBytes": stats["size_bytes"],
            "sha256Prefix": stats["sha256"][:16],
            "fileType": "APK",
            "packageName": stats["package_name"],
            "dexCount": stats["dex_count"],
            "fileCount": stats["file_count"],
            "permissions": stats["permissions"],
            "activitiesCount": len(stats["activities"]),
            "servicesCount": len(stats["services"]),
            "receiversCount": len(stats["receivers"]),
            "suspiciousStringsCount": len(stats["suspicious_strings"]),
            "hasManifest": stats["has_manifest"],
            "minSdk": stats["min_sdk"],
            "targetSdk": stats["target_sdk"],
        }

        return jsonify(make_response(
            final, risk, verdict, reasons, "apk",
            {"weights": {k: v for k, _, v in parts}, "sha256": stats["sha256"], "packageName": stats["package_name"]},
            recommendations=recommendations,
            model_breakdown=model_breakdown,
            file_info=file_info,
            model_status=_MODEL_STATUS
        ))

    # JSON scan (URL / package / hash)
    data = request.get_json(silent=True) or {}
    typ = str(data.get("type", "")).strip().lower()
    value = str(data.get("value", "")).strip()
    if not typ or not value:
        return jsonify({"error": "Missing JSON fields: type, value"}), 400

    text = f"{typ}:{value}"
    x_rf = make_vector(text, 215)
    x_iso = make_vector(text, 119)
    rf = rf_score(models, x_rf)
    iso = iso_score(models, x_iso)
    text_hash = stable_hash(value)
    # Simple text heuristic for URLs/packages
    mobile = 0.5
    vlower = value.lower()
    if any(d in vlower for d in [".xyz", ".tk", ".ml", ".ga", ".cf", ".top", ".click", ".link", ".pw"]):
        mobile = 0.85
    elif any(k in vlower for k in ["verify", "login", "secure", "account", "update", "confirm", "bank", "paypal"]):
        mobile = 0.65
    elif "com.google" in vlower or "com.android" in vlower or "play.google.com" in vlower:
        mobile = 0.10

    final, contrib = ensemble_vote(mobile, rf, iso)
    risk, verdict = score_to_label(final)
    reasons = [f"URL/package heuristic={mobile:.3f}"]
    if rf is not None:
        reasons.append(f"RandomForest={rf:.3f}")
    if iso is not None:
        reasons.append(f"IsolationForest={iso:.3f}")

    return jsonify(make_response(final, risk, verdict, reasons, typ, {"weights": contrib}, model_status=_MODEL_STATUS))


@APP.route("/api/scan/filename", methods=["POST", "OPTIONS"])
def api_scan_filename():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    filename = str(data.get("filename", "")).strip()
    if not filename:
        return jsonify({"error": "Missing JSON: filename"}), 400

    models = load_models()
    fname = filename.lower()

    # Filename-only heuristic
    score = 0.3
    reasons = ["filename-only scan"]
    if any(k in fname for k in ["malware", "trojan", "spy", "hack", "crack", "keylogger", "botnet", "rat", "stealer"]):
        score = 0.92
        reasons.append("malicious filename keyword")
    elif any(k in fname for k in ["cheat", "mod", "premium", "unlocker", "generator", "fake", "free"]):
        score = 0.55
        reasons.append("suspicious filename keyword")
    elif any(k in fname for k in ["system", "google", "android", "chrome", "gallery", "camera", "clock"]):
        score = 0.08
        reasons.append("known safe app name")

    x_mock = make_vector(fname, 215)
    rf = rf_score(models, x_mock)
    iso = iso_score(models, x_mock)
    final, contrib = ensemble_vote(score, rf, iso)
    risk, verdict = score_to_label(final)
    if rf is not None:
        reasons.append(f"RF={rf:.3f}")
    if iso is not None:
        reasons.append(f"Iso={iso:.3f}")

    return jsonify(make_response(final, risk, verdict, reasons, "filename", {"weights": contrib}, model_status=_MODEL_STATUS))


@APP.route("/api/scan/text", methods=["POST", "OPTIONS"])
def api_scan_text():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    source = str(data.get("source", "text")).strip()
    if not text:
        return jsonify({"error": "Missing JSON field: text"}), 400

    models = load_models()

    # Text heuristic scoring for SMS/notifications
    tlower = text.lower()
    score = 0.15  # Lower default for text
    reasons = []

    # Phishing patterns
    if re.search(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", tlower):
        score += 0.35
        reasons.append("IP-based URL")
    if re.search(r"(?:bit\.ly|tinyurl|t\.co|goo\.gl|short\.link)/", tlower):
        score += 0.30
        reasons.append("shortened URL")
    if re.search(r"https?://[^/\s]*\.(xyz|tk|ml|ga|cf|top|click|link|pw)", tlower):
        score += 0.30
        reasons.append("suspicious TLD")

    # Keyword scoring
    high_risk_keywords = ["verify account", "suspended", "password expired", "unusual activity",
                          "confirm your identity", "bank verification", "wire transfer", "gift card",
                          "send money", "crypto investment", "double your money"]
    medium_risk_keywords = ["urgent", "click here", "limited time", "congratulations you won",
                            "free gift", "claim now", "act immediately", "lottery winner", "inheritance"]

    for kw in high_risk_keywords:
        if kw in tlower:
            score += 0.25
            reasons.append(f"high-risk keyword: '{kw}'")
            break  # Only count once per category
    for kw in medium_risk_keywords:
        if kw in tlower:
            score += 0.15
            reasons.append(f"medium-risk keyword: '{kw}'")
            break

    # Crypto addresses
    if re.search(r"\b(bc1[ac-hj-np-z02-9]{11,71})\b", text):
        score += 0.30
        reasons.append("Bitcoin address")
    if re.search(r"\b(0x[a-fA-F0-9]{40})\b", text):
        score += 0.30
        reasons.append("Ethereum address")

    score = min(score, 1.0)

    # Try ML models
    x_rf = make_vector(text, 215)
    x_iso = make_vector(text, 119)
    rf = rf_score(models, x_rf)
    iso = iso_score(models, x_iso)

    final, contrib = ensemble_vote(score, rf, iso)
    risk, verdict = score_to_label(final)

    all_reasons = [f"Text heuristic={score:.3f}"] + reasons
    if rf is not None:
        all_reasons.append(f"RandomForest={rf:.3f}")
    if iso is not None:
        all_reasons.append(f"IsolationForest={iso:.3f}")

    if risk == "LOW":
        recommendations = ["This message appears safe.", "Continue normal usage."]
    elif risk == "MEDIUM":
        recommendations = ["Review this message carefully.", "Do not click unknown links.", "Verify sender identity."]
    else:
        recommendations = ["DO NOT trust this message.", "Do not click any links.", "Delete immediately.", "Report as spam/phishing."]

    return jsonify(make_response(final, risk, verdict, all_reasons, source,
                                {"weights": contrib, "text_length": len(text)},
                                recommendations=recommendations, model_status=_MODEL_STATUS))


@APP.get("/health")
def health():
    m = load_models()
    return jsonify({
        "ok": True,
        "port": 5001,
        "tensorflow_available": TF_AVAILABLE,
        "models": {
            "rf": bool(m.rf),
            "rf_scaler": bool(m.rf_scaler),
            "iso": bool(m.iso),
            "iso_scaler": bool(m.iso_scaler),
            "mobilenet": bool(m.mobilenet),
        },
        "modelStatus": _MODEL_STATUS,
    })


# Root route - serves API info/welcome page
@APP.get("/")
def index():
    """Root URL - serves as API documentation/info page."""
    return jsonify({
        "name": "Elyzorid APK Scanner API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "POST /api/scan/app": "Scan APK file (multipart) or JSON (type:value)",
            "POST /api/scan/text": "Scan text content (SMS/notifications)",
            "POST /api/scan/filename": "Scan filename only",
            "GET /health": "Backend health and model status",
            "GET /": "This info page"
        },
        "ngrok": "https://map-reversing-dude.ngrok-free.dev",
        "note": "Use POST /api/scan/app with multipart APK file or JSON body"
    })


if __name__ == "__main__":
    APP.run(host="0.0.0.0", port=5001, debug=True)
