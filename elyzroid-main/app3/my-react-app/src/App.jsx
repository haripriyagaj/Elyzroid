import { useCallback, useEffect, useRef, useState } from "react";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { Preferences } from "@capacitor/preferences";
import { registerPlugin } from "@capacitor/core";
import { alertCircleOutline, homeOutline, settingsOutline, constructOutline } from "ionicons/icons";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

import "./global.css";

import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Toolkit from "./pages/Toolkit";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import { scanApp, scanAppUpload, scanText } from "./services/api";
import {
  NotificationControlPlugin,
  openNotificationSettings,
  getInstalledApps,
  remediateMaliciousApp,
} from "./services/nativeBridge";
import { analyzeAppLocally } from "./services/heuristics";

setupIonicReact();

const PREFS = {
  onboarded: "elyzorid_onboarded_v1",
  user: "elyzorid_user_v1",
  consentAt: "elyzorid_consent_accepted_at_v1",
};

async function loadPref(key) {
  const { value } = await Preferences.get({ key });
  return value ?? null;
}

async function savePref(key, value) {
  await Preferences.set({ key, value });
}

async function clearPrefs() {
  await Preferences.remove({ key: PREFS.onboarded });
  await Preferences.remove({ key: PREFS.user });
  await Preferences.remove({ key: PREFS.consentAt });
}

const ClipboardMonitor = registerPlugin("ClipboardMonitor");

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [user, setUser] = useState(null);
  const [consentAcceptedAt, setConsentAcceptedAt] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [scansRun, setScansRun] = useState(0);
  const [modules, setModules] = useState({ clipboard: false, notification: false, vpn: false });
  const modulesRef = useRef(modules);
  const [toolkitLogs, setToolkitLogs] = useState([]);

  const [globalStatus, setGlobalStatus] = useState({
    score: "--",
    color: "var(--ely-green)",
    badgeText: "NOT SCANNED",
    riskLevel: "LOW",
    xaiMsg: "Run a scan to analyze your device security posture.",
  });
  const [scanBusy, setScanBusy] = useState(false);
  const [latestScanResult, setLatestScanResult] = useState(null);
  const [latestScanTarget, setLatestScanTarget] = useState(null);
  const appRiskCacheRef = useRef(new Map());

  const addAlert = useCallback((alertData) => {
    setAlerts((prev) => [{ ...alertData, id: Date.now(), time: new Date().toLocaleTimeString() }, ...prev]);
  }, []);

  const addToolkitLog = useCallback((html) => {
    setToolkitLogs((prev) => [html, ...prev]);
  }, []);

  // Native → JS real-time monitoring bridge
  useEffect(() => {
    let removeListener = null;

    const initSecurityMonitoring = async () => {
      try {
        // Notification-specific threat events from NotificationControlPlugin
        // Only surface in-app alerts when the Toolkit notification toggle is ON.
        removeListener = await NotificationControlPlugin?.addListener("threatEvent", async (e) => {
          console.log("NOTIFICATION THREAT EVENT", e);
          // Guard: ignore if user turned off the Notification Listener in Toolkit
          if (!modulesRef.current.notification) {
            console.log("[App] Notification listener is OFF — suppressing in-app alert.");
            return;
          }
          let severity = e.score >= 0.9 ? "HIGH" : e.score >= 0.75 ? "MEDIUM" : "LOW";
          let backend = null;

          try {
            if (e.message) {
              backend = await scanText({
                text: String(e.message),
                source: `notification:${e.packageName || "unknown"}`,
              });
              if (backend?.risk === "HIGH" || backend?.risk === "MEDIUM") {
                severity = backend.risk;
              }
            }
          } catch (scanErr) {
            console.warn("Notification text scan failed", scanErr);
          }

          addAlert({
            severity,
            type: e.isSms ? "Real-time SMS" : "Real-time notification",
            title: e.title || "Suspicious notification detected",
            desc: backend?.verdict || e.message || "Native notification scanner flagged this event as risky.",
            reco: e.isSms
              ? "Treat this SMS as phishing unless you can verify the sender via official channels."
              : "Avoid clicking links or giving credentials in this notification.",
          });

          if (severity === "HIGH" && e.packageName) {
            try {
              let pkgRisk = appRiskCacheRef.current.get(e.packageName);
              if (!pkgRisk) {
                const installed = await getInstalledApps();
                const found = installed.find((app) => app.packageName === e.packageName);
                if (found) {
                  pkgRisk = analyzeAppLocally(found);
                  appRiskCacheRef.current.set(e.packageName, pkgRisk);
                }
              }

              if (pkgRisk && (pkgRisk.label === "MALWARE" || pkgRisk.score >= 0.7)) {
                const uninstallResult = await remediateMaliciousApp(e.packageName, e.packageName);
                addAlert({
                  severity: "HIGH",
                  type: "Malicious Source App",
                  title: `Remediation for ${e.packageName}`,
                  desc: uninstallResult?.message || "Opened security action prompt for malicious app.",
                  reco: "Choose Block or Uninstall in the prompt to protect your phone.",
                });
              }
            } catch (actionErr) {
              console.warn("Source app block/uninstall flow failed", actionErr);
            }
          }
        });

        // Clipboard monitor
        await ClipboardMonitor?.startMonitoring();
      } catch (err) {
        console.warn("initSecurityMonitoring failed", err);
      }
    };

    initSecurityMonitoring();

    return () => {
      removeListener?.remove();
    };
  }, [addAlert]);

  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  useEffect(() => {
    (async () => {
      const isOnboarded = (await loadPref(PREFS.onboarded)) === "true";
      const rawUser = await loadPref(PREFS.user);
      const consentAt = await loadPref(PREFS.consentAt);
      setOnboarded(isOnboarded);
      setConsentAcceptedAt(consentAt);
      if (rawUser) {
        try {
          setUser(JSON.parse(rawUser));
        } catch {
          setUser(null);
        }
      }
      setHydrated(true);
    })();
  }, []);

  const onCompleteOnboarding = useCallback(async (nextUser) => {
    const acceptedAt = new Date().toISOString();
    await savePref(PREFS.user, JSON.stringify(nextUser));
    await savePref(PREFS.consentAt, acceptedAt);
    await savePref(PREFS.onboarded, "true");
    setUser(nextUser);
    setConsentAcceptedAt(acceptedAt);
    setOnboarded(true);
  }, []);

  const resetRegistration = useCallback(async () => {
    const ok = confirm("This will clear Elyzorid registration on this device and show onboarding again. Continue?");
    if (!ok) return;
    await clearPrefs();
    setOnboarded(false);
    setUser(null);
    setConsentAcceptedAt(null);
    setAlerts([]);
    setScansRun(0);
    setModules({ clipboard: false, notification: false, vpn: false });
    setToolkitLogs([]);
    setGlobalStatus({
      score: "--",
      color: "var(--ely-green)",
      badgeText: "NOT SCANNED",
      riskLevel: "LOW",
      xaiMsg: "Run a scan to analyze your device security posture.",
    });
  }, []);

  const applyScanResult = useCallback((data) => {
    const colors = {
      LOW: "var(--ely-green)",
      MEDIUM: "var(--ely-yellow)",
      HIGH: "var(--ely-red)",
    };
    const risk = data.risk === "HIGH" ? "HIGH" : data.risk === "MEDIUM" ? "MEDIUM" : "LOW";
    setGlobalStatus({
      score: `${Math.round((data.score ?? 0) * 100)}%`,
      color: colors[risk],
      badgeText: data.verdict,
      riskLevel: risk,
      xaiMsg: data.xai?.top_reasons?.join(" • ") || "No strong indicators detected.",
    });
    if (risk !== "LOW") {
      addAlert({
        severity: risk,
        type: "ML Scan",
        title: "Risk detected",
        desc: data.verdict,
        reco: data.xai?.top_reasons?.[0] || "Review this app carefully.",
      });
    }
  }, [addAlert]);

  const handleRunScan = useCallback(
    async (type, value) => {
      if (type === "webblock") {
        addAlert({
          severity: "LOW",
          type: "Web Blocking",
          title: "Web blocking dashboard opened",
          desc: "Viewing blocked domains and redirects (demo).",
          reco: "Enable Local VPN in Toolkit for live blocking in the Android build.",
        });
        return;
      }
      setScanBusy(true);
      try {
        setScansRun((n) => n + 1);
        const data = await scanApp({ type, value });
        setLatestScanResult(data);
        setLatestScanTarget({ type, value });
        applyScanResult(data);
      } catch (err) {
        alert("Quick scan failed. Is backend running?");
        console.error(err);
      } finally {
        setScanBusy(false);
      }
    },
    [addAlert, applyScanResult]
  );

  const handleScanAppUpload = useCallback(
    async (file) => {
      setScanBusy(true);
      try {
        setScansRun((n) => n + 1);
        const data = await scanAppUpload(file);
        applyScanResult(data);
      } catch (err) {
        alert("Quick scan failed. Is backend running?");
        console.error(err);
      } finally {
        setScanBusy(false);
      }
    },
    [applyScanResult]
  );

  const handleToggleModule = useCallback(
    (key, val) => {
      setModules((m) => ({ ...m, [key]: val }));
      const ts = new Date().toLocaleTimeString();
      addToolkitLog(`<span style="color:var(--ely-text2)">[${ts}]</span> <span style="color:var(--ely-accent)">${key.toUpperCase()}</span> → ${val ? "🟢 Enabled" : "🔴 Disabled"}`);

      if (key === "notification" && val) {
        openNotificationSettings();
      }
    },
    [addToolkitLog]
  );

  if (!hydrated) return null;

  if (!onboarded) {
    return (
      <IonApp>
        <Onboarding onComplete={onCompleteOnboarding} />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route
              exact
              path="/home"
              render={() => (
                <Home
                  globalStatus={globalStatus}
                  onRunScan={handleRunScan}
                  onScanAppUpload={handleScanAppUpload}
                  scanBusy={scanBusy}
                  onAddAlert={addAlert}
                  latestScanResult={latestScanResult}
                  latestScanTarget={latestScanTarget}
                />
              )}
            />
            <Route
              exact
              path="/toolkit"
              render={() => (
                <Toolkit
                  modules={modules}
                  onToggle={handleToggleModule}
                  toolkitLogs={toolkitLogs}
                  addToolkitLog={addToolkitLog}
                />
              )}
            />
            <Route
              exact
              path="/alerts"
              render={() => <Alerts alerts={alerts} onResolve={(id) => setAlerts((a) => a.filter((x) => x.id !== id))} />}
            />
            <Route
              exact
              path="/settings"
              render={() => (
                <Settings
                  user={user}
                  scansRun={scansRun}
                  alertsCount={alerts.length}
                  consentAcceptedAt={consentAcceptedAt}
                  onResetRegistration={resetRegistration}
                />
              )}
            />
            <Redirect exact from="/" to="/home" />
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={homeOutline} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="toolkit" href="/toolkit">
              <IonIcon icon={constructOutline} />
              <IonLabel>Toolkit</IonLabel>
            </IonTabButton>
            <IonTabButton tab="alerts" href="/alerts">
              <IonIcon icon={alertCircleOutline} />
              <IonLabel>Alerts</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settingsOutline} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}