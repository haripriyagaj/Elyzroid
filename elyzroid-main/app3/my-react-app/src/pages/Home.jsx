import { useState, useEffect } from "react";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonIcon,
} from "@ionic/react";
import { trash, shield, settings } from "ionicons/icons";
import {
  getInstalledApps,
  uninstallApp,
  blockApp,
  openAppSettings,
} from "../services/nativeBridge";
import FileScanner from "../components/FileScanner";

function RiskBadge({ level }) {
  const cls = level === "LOW" ? "low" : level === "MEDIUM" ? "medium" : "high";
  return <span className={`ely-risk ${cls}`}>{level}</span>;
}

export function detectScanPayload(raw) {
  const v = String(raw || "").trim();
  if (!v) return null;
  if (/^[a-fA-F0-9]{64}$/.test(v)) return { type: "hash", value: v };
  if (v.startsWith("http")) return { type: "url", value: v };
  return { type: "package", value: v };
}

export default function Home({
  globalStatus,
  onRunScan,
  onScanAppUpload,
  scanBusy,
  onAddAlert,
  latestScanResult,
  latestScanTarget,
}) {
  const [scanInput, setScanInput] = useState("");
  const [installedApps, setInstalledApps] = useState([]);
  const [showApps, setShowApps] = useState(false);

  useEffect(() => {
    loadInstalledApps();
  }, []);

  const loadInstalledApps = async () => {
    const apps = await getInstalledApps();
    const scored = apps.map(app => {
      const permCount = app.permissions?.length || 0;
      const hasSms = app.permissions?.some(p => String(p).includes('SMS')) || false;
      const hasBoot = app.permissions?.some(p => String(p).includes('BOOT')) || false;
      const hasCalls = app.permissions?.some(p => String(p).includes('CALL')) || false;
      const score = Math.min(1.0, (permCount * 0.03) + (hasSms ? 0.25 : 0) + (hasBoot ? 0.2 : 0) + (hasCalls ? 0.15 : 0));
      let risk = "LOW";
      if (score >= 0.75) risk = "HIGH";
      else if (score >= 0.4) risk = "MEDIUM";
      return { ...app, score, risk };
    });
    setInstalledApps(scored);
  };

  const handleUninstall = async (pkg) => {
    if (confirm(`Uninstall ${pkg.label || pkg.packageName}?`)) {
      const result = await uninstallApp(pkg.packageName);
      if (result.success) {
        onAddAlert({
          severity: "MEDIUM",
          type: "App Action",
          title: `Uninstall initiated: ${pkg.label || pkg.packageName}`,
          desc: result.message,
          reco: "Follow the system uninstall prompt to complete removal.",
        });
        await loadInstalledApps();
      }
    }
  };

  const handleBlock = async (pkg) => {
    const result = await blockApp(pkg.packageName);
    if (result.success) {
      onAddAlert({
        severity: result.blocked ? "HIGH" : "MEDIUM",
        type: "App Action",
        title: `App blocked: ${pkg.label || pkg.packageName}`,
        desc: result.message,
        reco: result.blocked ? "App has been suspended." : "Open app settings to manually disable the app.",
      });
    }
  };

  const handleAppSettings = async (pkg) => {
    await openAppSettings(pkg.packageName);
  };

  const runQuickScan = () => {
    const payload = detectScanPayload(scanInput);
    if (!payload) {
      alert("Paste a Play Store link, package name, or SHA256.");
      return;
    }
    onRunScan(payload.type, payload.value);
  };

  const handleScanResultAction = async (action) => {
    const packageName = latestScanTarget?.type === "package" ? latestScanTarget?.value : latestScanResult?.meta?.packageName;
    if (!packageName) {
      alert("No package name available for this scan result.");
      return;
    }
    const yes = confirm("This app is malicious. Do you want to block or uninstall it?");
    if (!yes) return;

    const result = action === "block" ? await blockApp(packageName) : await uninstallApp(packageName);
    onAddAlert({
      severity: "HIGH",
      type: "Malicious App Action",
      title: `${action === "block" ? "Block" : "Uninstall"} action for ${packageName}`,
      desc: result?.message || "Action request submitted.",
      reco: action === "block" ? "If app still runs, uninstall it as well." : "Complete uninstall in Android system flow.",
    });
  };

  return (
    <IonPage className="ely-bg-grid">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Home</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="ely-layer" style={{ padding: 16 }}>
          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ely-text2)" }}>Security Score</div>
                  <div style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: 34, fontWeight: 800, color: globalStatus.color }}>{globalStatus.score}</div>
                </div>
                <div style={{ marginTop: 2 }}>
                  <span className={`ely-risk ${globalStatus.riskLevel === "LOW" ? "low" : globalStatus.riskLevel === "MEDIUM" ? "medium" : "high"}`}>
                    {globalStatus.badgeText}
                  </span>
                </div>
                <div style={{ marginTop: 10, color: "var(--ely-text2)", lineHeight: 1.6 }}>{globalStatus.xaiMsg}</div>
              </div>
            </IonCardContent>
          </IonCard>

          {latestScanResult?.risk === "HIGH" && (
            <IonCard className="ely-card">
              <IonCardContent>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Malicious App Remediation</div>
                <p style={{ color: "var(--ely-text2)", fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>
                  {latestScanResult?.remediation?.message || "This app is malicious. Do you want to block or uninstall it?"}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <IonButton color="warning" onClick={() => handleScanResultAction("block")}>
                    <IonIcon icon={shield} slot="start" />
                    Block App
                  </IonButton>
                  <IonButton color="danger" onClick={() => handleScanResultAction("uninstall")}>
                    <IonIcon icon={trash} slot="start" />
                    Uninstall App
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* File Scanner Component */}
          <FileScanner onAddAlert={onAddAlert} />

          {/* Text-based scan */}
          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Quick Scan (URL / Package / Hash)</div>
              <p style={{ color: "var(--ely-text2)", fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>
                Paste a Play Store link, package name, or SHA256 hash for a quick backend scan.
              </p>
              <IonItem lines="full" className="ely-card" style={{ borderRadius: 12, marginBottom: 8 }}>
                <IonInput
                  placeholder="Link, com.example.app, or SHA256"
                  value={scanInput}
                  disabled={scanBusy}
                  onIonInput={(e) => setScanInput(String(e.detail.value ?? ""))}
                />
              </IonItem>
              <IonButton expand="block" disabled={scanBusy} onClick={runQuickScan}>
                {scanBusy ? <IonSpinner name="crescent" /> : "Scan this app"}
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* Installed Apps with Block/Uninstall */}
          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Installed Apps</div>
                <IonButton size="small" onClick={() => setShowApps(!showApps)}>
                  {showApps ? "Hide" : "Show"} Apps
                </IonButton>
              </div>
              <p style={{ color: "var(--ely-text2)", fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>
                Scan installed apps for malicious behavior. Block or uninstall suspicious apps.
              </p>
              {showApps && (
                <div style={{ maxHeight: "300px", overflow: "auto" }}>
                  {installedApps.length === 0 ? (
                    <div style={{ color: "var(--ely-text2)", textAlign: "center", padding: "20px" }}>Loading apps...</div>
                  ) : (
                    installedApps.slice(0, 20).map((app) => (
                      <div
                        key={app.packageName}
                        style={{
                          padding: "10px", marginBottom: "8px", borderRadius: "8px",
                          background: "var(--ely-surface2)",
                          border: app.risk === "HIGH" ? "1px solid var(--ely-red)" : app.risk === "MEDIUM" ? "1px solid var(--ely-yellow)" : "1px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{app.label || app.packageName}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--ely-text2)" }}>{app.packageName}</div>
                          </div>
                          <IonBadge color={app.risk === "HIGH" ? "danger" : app.risk === "MEDIUM" ? "warning" : "success"}>
                            {Math.round(app.score * 100)}%
                          </IonBadge>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--ely-text2)", marginTop: "4px" }}>
                          Perms: {app.permissions?.length || 0} · {app.isSystemApp ? "System" : "User"}
                        </div>
                        {app.risk !== "LOW" && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <IonButton size="small" color="danger" fill="outline" onClick={() => handleUninstall(app)}>
                              <IonIcon icon={trash} slot="start" />
                              Uninstall
                            </IonButton>
                            <IonButton size="small" color="warning" fill="outline" onClick={() => handleBlock(app)}>
                              <IonIcon icon={shield} slot="start" />
                              Block
                            </IonButton>
                            <IonButton size="small" color="medium" fill="clear" onClick={() => handleAppSettings(app)}>
                              <IonIcon icon={settings} />
                            </IonButton>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <IonList inset>
            {[
              { type: "main", title: "Full Device Scan", sub: "Run ML backend on the input above.", badge: "READY", badgeColor: "success" },
              { type: "perm", title: "App Permission Scan", sub: "Uses backend scan with the identifier you entered above.", badge: "READY", badgeColor: "warning" },
              { type: "root", title: "Root Detection Scan", sub: "Uses backend scan with the identifier you entered above.", badge: "READY", badgeColor: "success" },
            ].map((s) => (
              <IonCard key={s.type} className="ely-card">
                <IonCardContent>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{s.title}</div>
                      <div style={{ color: "var(--ely-text2)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{s.sub}</div>
                    </div>
                    <IonBadge color={s.badgeColor}>{s.badge}</IonBadge>
                  </div>
                  <IonButton expand="block" style={{ marginTop: 12 }} disabled={scanBusy} onClick={() => {
                    const payload = detectScanPayload(scanInput);
                    if (!payload) { alert("Enter a link, package, or hash in the field above first."); return; }
                    onRunScan(payload.type, payload.value);
                  }}>
                    Run Scan
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ))}
          </IonList>

          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Web Blocking</div>
              <IonItem lines="none">
                <IonLabel>Local VPN (demo)</IonLabel>
                <IonBadge color="primary">Active</IonBadge>
              </IonItem>
              <div style={{ color: "var(--ely-text2)", fontSize: 13, lineHeight: 1.6 }}>
                Shows blocked redirects/domains while Local VPN and clipboard monitoring are enabled.
              </div>
              <IonButton expand="block" fill="outline" style={{ marginTop: 12 }} onClick={() => onRunScan("webblock")}>
                View Web Blocking
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Last Scan Snapshot</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "var(--ely-text2)" }}>Risk Level</div>
                <RiskBadge level={globalStatus.riskLevel} />
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}

