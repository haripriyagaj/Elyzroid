import { useRef, useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import {
  cloudUploadOutline,
  shieldCheckmarkOutline,
  warningOutline,
  skullOutline,
  trashOutline,
  banOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  hardwareChipOutline,
  bulbOutline,
  closeCircleOutline,
} from "ionicons/icons";
import { deleteFile, blockFileInstallation, blockApp, uninstallApp, blockApkInstallation, blockFile, showSecurityPrompt, triggerMaliciousAction, scanApkBytes } from "../services/nativeBridge";

function ProgressBar({ label, score, color }) {
  const pct = Math.round((score || 0) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--ely-text2)" }}>{label}</span>
        <span style={{ fontWeight: 700, color: color || "var(--ely-text)" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--ely-surface2)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: color || "var(--ely-accent)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function RiskBadgeLarge({ risk }) {
  const config = {
    LOW: { icon: shieldCheckmarkOutline, text: "SAFE", color: "var(--ely-green)", bg: "rgba(0,230,118,0.12)", border: "rgba(0,230,118,0.3)" },
    MEDIUM: { icon: warningOutline, text: "MEDIUM", color: "var(--ely-yellow)", bg: "rgba(255,202,40,0.12)", border: "rgba(255,202,40,0.3)" },
    HIGH: { icon: skullOutline, text: "MALICIOUS", color: "var(--ely-red)", bg: "rgba(255,23,68,0.12)", border: "rgba(255,23,68,0.3)" },
  };
  const c = config[risk] || config.LOW;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 800,
        fontFamily: '"Space Mono", ui-monospace, monospace',
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      <IonIcon icon={c.icon} style={{ fontSize: 18 }} />
      {c.text}
    </div>
  );
}

export default function FileScanner({ onAddAlert }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionStatus, setActionStatus] = useState("");

  const runScan = async (file) => {
    if (!file) return;
    setScanBusy(true);
    setResult(null);
    setActionStatus("");
    try {
      // Read file as ArrayBuffer and convert to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const apkBytes = new Uint8Array(arrayBuffer);

      const data = await scanApkBytes(apkBytes, file.name);
      setResult({ ...data, _fileName: file.name });
      if (onAddAlert && data.risk !== "LOW") {
        onAddAlert({
          severity: data.risk,
          type: "File Scanner",
          title: `File scan result: ${data.verdict}`,
          desc: data.explanation || data.verdict,
          reco: data.recommendations?.[0] || "Review this file carefully.",
        });
      }
    } catch (err) {
      alert("Scan failed: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setScanBusy(false);
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) runScan(f);
  };

  const handleDelete = async () => {
    if (!result?._fileName) return;
    setActionLoading("delete");
    const res = await deleteFile(result._fileName);
    setActionLoading(null);
    if (res.success) {
      alert(`File ${result._fileName} deleted successfully.`);
      setResult(null);
    } else {
      alert("Delete failed: " + res.message);
    }
  };

  const handleBlockApk = async () => {
    const identifier = result?.fileInfo?.sha256Prefix || result?._fileName || result?.fileInfo?.filename;
    setActionLoading("block-apk");
    const res = await blockApkInstallation(identifier);
    setActionLoading(null);
    if (res.success) {
      setActionStatus(`APK blocked: ${res.message}`);
    } else {
      alert("APK block failed: " + res.message);
    }
  };

  const handleNativePrompt = async () => {
    const pkg = result?.fileInfo?.packageName || result?.fileInfo?.filename;
    if (!pkg) {
      alert("No package available for native prompt");
      return;
    }
    const res = await showSecurityPrompt(pkg, result.fileInfo?.filename || "Malicious APK");
    setActionStatus(res.message || "Native security prompt shown");
  };

  const handleBlockFile = async () => {
    if (!result?._fileName) return;
    setActionLoading("block-file");
    const res = await blockFile(result._fileName);
    setActionLoading(null);
    if (res.success) {
      setActionStatus(res.message);
    } else {
      alert("File block failed: " + res.message);
    }
  };

  const handleBlock = async () => {
    const pkg = result?.fileInfo?.filename || result?._fileName || "unknown";
    setActionLoading("block");
    const res = await blockFileInstallation(pkg);
    setActionLoading(null);
    if (res.success) {
      alert(`Installation blocked for ${pkg}.`);
    } else {
      alert("Block failed: " + res.message);
    }
  };

  const handleBlockDetectedApp = async () => {
    const pkg = result?.fileInfo?.packageName;
    if (!pkg) return;
    if (!confirm("This app is malicious. Do you want to block or uninstall it?")) return;
    setActionLoading("block-app");
    const res = await blockApp(pkg);
    setActionLoading(null);
    setActionStatus(res?.message || `Block requested for ${pkg}.`);
  };

  const handleUninstallDetectedApp = async () => {
    const pkg = result?.fileInfo?.packageName;
    if (!pkg) return;
    if (!confirm("This app is malicious. Do you want to block or uninstall it?")) return;
    setActionLoading("uninstall-app");
    const res = await uninstallApp(pkg);
    setActionLoading(null);
    setActionStatus(res?.message || `Uninstall requested for ${pkg}.`);
  };

  const handleDismiss = () => {
    setResult(null);
    setActionStatus("");
  };

  const getScoreColor = (score) => {
    if (score < 0.3) return "var(--ely-green)";
    if (score < 0.6) return "var(--ely-yellow)";
    return "var(--ely-red)";
  };

  return (
    <IonCard className="ely-card">
      <IonCardContent>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>File Scanner (ML Powered)</div>
        <p style={{ color: "var(--ely-text2)", fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>
          Upload any APK or file to analyze it with heuristic rules and ML models.
        </p>

        {!result && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".apk,*/*"
              style={{ display: "none", visibility: "hidden", position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
              onChange={onFileChange}
            />
            <IonButton
              expand="block"
              disabled={scanBusy}
              onClick={() => fileRef.current?.click()}
            >
              {scanBusy ? <IonSpinner name="crescent" /> : <IonIcon icon={cloudUploadOutline} slot="start" />}
              {scanBusy ? "Analyzing…" : "Choose File"}
            </IonButton>

            <div
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (scanBusy) return; setDragOver(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (scanBusy) return; setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation(); setDragOver(false);
                if (scanBusy) return;
                const f = e.dataTransfer?.files?.[0];
                if (!f) return;
                runScan(f);
              }}
              style={{
                marginTop: 10,
                padding: 16,
                borderRadius: 12,
                border: `1px dashed ${dragOver ? "var(--ely-accent)" : "rgba(255,255,255,0.18)"}`,
                background: dragOver ? "rgba(0,255,180,0.06)" : "rgba(255,255,255,0.03)",
                color: "var(--ely-text2)",
                fontSize: 13,
                textAlign: "center",
                userSelect: "none",
              }}
            >
              <IonIcon icon={cloudUploadOutline} style={{ fontSize: 24, marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
              {dragOver ? "Drop file here" : "Drag & drop a file here"}
            </div>
          </>
        )}

        {result && (
          <div style={{ marginTop: 8 }}>
            {/* Verdict Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <RiskBadgeLarge risk={result.risk} />
              <div style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: 28, fontWeight: 800, color: getScoreColor(result.score) }}>
                {Math.round((result.score || 0) * 100)}%
              </div>
            </div>

            {/* File Info */}
            {result.fileInfo && (
              <div
                style={{
                  background: "var(--ely-surface2)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  border: "1px solid var(--ely-border)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <IonIcon icon={documentTextOutline} color="primary" />
                  File Information
                </div>
                <div style={{ fontSize: 12, color: "var(--ely-text2)", lineHeight: 1.8 }}>
                  <div><strong>Name:</strong> {result.fileInfo.filename}</div>
                  <div><strong>Type:</strong> {result.fileInfo.fileType}</div>
                  <div><strong>Size:</strong> {(result.fileInfo.sizeBytes / 1024).toFixed(1)} KB</div>
                  <div><strong>SHA256:</strong> {result.fileInfo.sha256Prefix}…</div>
                  {result.fileInfo.dexCount > 0 && (
                    <div><strong>DEX files:</strong> {result.fileInfo.dexCount} · <strong>Total files:</strong> {result.fileInfo.fileCount}</div>
                  )}
                  {result.fileInfo.permissions && result.fileInfo.permissions.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Permissions ({result.fileInfo.permissions.length}):</strong>{" "}
                      <span style={{ fontSize: 11 }}>{result.fileInfo.permissions.slice(0, 8).join(", ")}
                        {result.fileInfo.permissions.length > 8 ? "…" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Model Breakdown */}
            {result.modelBreakdown && (
              <div
                style={{
                  background: "var(--ely-surface2)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  border: "1px solid var(--ely-border)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <IonIcon icon={hardwareChipOutline} color="primary" />
                  Model Breakdown
                </div>
                {result.modelBreakdown.heuristic && (
                  <ProgressBar
                    label={`Heuristic APK Analysis (${result.modelBreakdown.heuristic.source || "rule-based"})`}
                    score={result.modelBreakdown.heuristic.score}
                    color={getScoreColor(result.modelBreakdown.heuristic.score)}
                  />
                )}
                {result.modelBreakdown.mobilenet?.score !== null && result.modelBreakdown.mobilenet?.score !== undefined && (
                  <ProgressBar
                    label="MobileNetV2 (CNN)"
                    score={result.modelBreakdown.mobilenet.score}
                    color={getScoreColor(result.modelBreakdown.mobilenet.score)}
                  />
                )}
                {result.modelBreakdown.randomForest?.score !== null && result.modelBreakdown.randomForest?.score !== undefined && (
                  <ProgressBar
                    label="Random Forest"
                    score={result.modelBreakdown.randomForest.score}
                    color={getScoreColor(result.modelBreakdown.randomForest.score)}
                  />
                )}
                {result.modelBreakdown.isolationForest?.score !== null && result.modelBreakdown.isolationForest?.score !== undefined && (
                  <ProgressBar
                    label="Isolation Forest"
                    score={result.modelBreakdown.isolationForest.score}
                    color={getScoreColor(result.modelBreakdown.isolationForest.score)}
                  />
                )}
                {result.modelStatus && Object.keys(result.modelStatus).some(k => result.modelStatus[k].startsWith("error") || result.modelStatus[k] === "missing") && (
                  <div style={{ fontSize: 11, color: "var(--ely-yellow)", marginTop: 8, lineHeight: 1.6 }}>
                    <strong>Model Status:</strong> Some ML models failed to load.
                    {Object.entries(result.modelStatus).filter(([_, v]) => v.startsWith("error") || v === "missing").map(([k, v]) => (
                      <div key={k}>• {k}: {v}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {result.explanation && (
              <div
                style={{
                  background: "var(--ely-surface2)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  border: "1px solid var(--ely-border)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <IonIcon icon={bulbOutline} color="primary" />
                  Why this result?
                </div>
                <div style={{ fontSize: 13, color: "var(--ely-text2)", lineHeight: 1.7 }}>
                  {result.explanation}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div
                style={{
                  background: "var(--ely-surface2)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  border: "1px solid var(--ely-border)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <IonIcon icon={checkmarkCircleOutline} color="primary" />
                  Recommendations
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ely-text2)", lineHeight: 1.8 }}>
                  {result.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            {result.risk !== "LOW" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <IonButton
                  color="danger"
                  fill="solid"
                  disabled={actionLoading === "delete"}
                  onClick={handleDelete}
                >
                  {actionLoading === "delete" ? <IonSpinner name="crescent" /> : <IonIcon icon={trashOutline} slot="start" />}
                  Delete File
                </IonButton>
                <IonButton
                  color="warning"
                  fill="solid"
                  disabled={actionLoading === "block-file"}
                  onClick={handleBlockFile}
                >
                  {actionLoading === "block-file" ? <IonSpinner name="crescent" /> : <IonIcon icon={trashOutline} slot="start" />}
                  Block & Delete APK
                </IonButton>
                <IonButton
                  color="warning"
                  fill="solid"
                  disabled={actionLoading === "block-apk"}
                  onClick={handleBlockApk}
                >
                  {actionLoading === "block-apk" ? <IonSpinner name="crescent" /> : <IonIcon icon={banOutline} slot="start" />}
                  Block APK Install
                </IonButton>
                <IonButton
                  color="warning"
                  fill="outline"
                  disabled={actionLoading === "native-prompt"}
                  onClick={handleNativePrompt}
                >
                  Native Security Prompt
                </IonButton>
                {result.risk === "HIGH" && result?.fileInfo?.packageName && (
                  <>
                    <IonButton
                      color="warning"
                      fill="outline"
                      disabled={actionLoading === "block-app"}
                      onClick={handleBlockDetectedApp}
                    >
                      {actionLoading === "block-app" ? <IonSpinner name="crescent" /> : <IonIcon icon={banOutline} slot="start" />}
                      Block App
                    </IonButton>
                    <IonButton
                      color="danger"
                      fill="outline"
                      disabled={actionLoading === "uninstall-app"}
                      onClick={handleUninstallDetectedApp}
                    >
                      {actionLoading === "uninstall-app" ? <IonSpinner name="crescent" /> : <IonIcon icon={trashOutline} slot="start" />}
                      Uninstall App
                    </IonButton>
                  </>
                )}
              </div>
            )}

            {actionStatus && (
              <div style={{ fontSize: 12, color: "var(--ely-text2)", marginBottom: 10 }}>
                {actionStatus}
              </div>
            )}

            <IonButton expand="block" fill="outline" color="medium" onClick={handleDismiss}>
              <IonIcon icon={closeCircleOutline} slot="start" />
              {result.risk === "LOW" ? "Scan Another File" : "Dismiss"}
            </IonButton>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
}

