import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Capacitor bridge to your Android Kotlin plugins.
 * - On Android: calls the real plugin methods.
 * - On Web: returns safe mock/demo results so UI remains usable.
 */

export const RootDetectionPlugin = registerPlugin("RootDetection");
export const PackageScannerPlugin = registerPlugin("PackageScanner");
export const ClipboardMonitorPlugin = registerPlugin("ClipboardMonitor");
export const VpnControlPlugin = registerPlugin("VpnControl");
export const FileSystemScanPlugin = registerPlugin("FileSystemScan");
export const NotificationControlPlugin = registerPlugin("NotificationControl");
export const AppBlockerPlugin = registerPlugin("AppBlocker");
export const ScanPlugin = registerPlugin("Scan");

export const NativeBridge = {
  isNative: () => Capacitor.isNativePlatform(),
};

export async function scanForRoot() {
  try {
    if (!Capacitor.isNativePlatform()) return simulateRootScan();
    return await RootDetectionPlugin.scan();
  } catch {
    return simulateRootScan();
  }
}

export async function getInstalledApps() {
  try {
    if (!Capacitor.isNativePlatform()) return simulateInstalledApps();
    const result = await PackageScannerPlugin.getInstalledApps();
    return result.apps || [];
  } catch {
    return simulateInstalledApps();
  }
}

export async function analyzeApk(packageName) {
  try {
    if (!Capacitor.isNativePlatform()) return { packageName, receivers: [], services: [], activities: [] };
    return await PackageScannerPlugin.analyzeApk({ packageName });
  } catch {
    return { packageName, receivers: [], services: [], activities: [] };
  }
}

export async function scanFileSystem() {
  const pathsToCheck = ["/system/bin", "/system/xbin", "/sbin", "/data/local", "/data/local/bin", "/data/local/xbin", "/system/app", "/system/priv-app", "/proc/net"];
  try {
    if (!Capacitor.isNativePlatform()) return simulateFileScan();
    return await FileSystemScanPlugin.scan({ paths: pathsToCheck });
  } catch {
    return simulateFileScan();
  }
}

export async function startClipboardMonitor() {
  try {
    if (!Capacitor.isNativePlatform()) return true;
    await ClipboardMonitorPlugin.startMonitoring();
    return true;
  } catch {
    return false;
  }
}

export async function stopClipboardMonitor() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await ClipboardMonitorPlugin.stopMonitoring();
  } catch {
    // ignore
  }
}

export async function startVpn() {
  try {
    if (!Capacitor.isNativePlatform()) return { started: true, mode: "web-mock" };
    return await VpnControlPlugin.start();
  } catch (e) {
    return { started: false, error: e?.message || "VPN start failed" };
  }
}

export async function stopVpn() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await VpnControlPlugin.stop();
  } catch {
    // ignore
  }
}

export async function getVpnStats() {
  try {
    if (!Capacitor.isNativePlatform()) return { blockedCount: 0, blockedDomains: [] };
    return await VpnControlPlugin.getStats();
  } catch {
    return { blockedCount: 0, blockedDomains: [] };
  }
}

// ── Notification Control ──
export async function startNotificationMonitor() {
  try {
    if (!Capacitor.isNativePlatform()) return { started: true, mode: "web-mock" };
    return await NotificationControlPlugin.startMonitoring();
  } catch (e) {
    return { started: false, error: e?.message || "Notification monitor start failed" };
  }
}

export async function stopNotificationMonitor() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await NotificationControlPlugin.stopMonitoring();
  } catch {
    // ignore
  }
}

export async function getNotificationStats() {
  try {
    if (!Capacitor.isNativePlatform()) return { totalIntercepted: 0, totalSuspicious: 0 };
    return await NotificationControlPlugin.getStats();
  } catch {
    return { totalIntercepted: 0, totalSuspicious: 0 };
  }
}

export async function openNotificationSettings() {
  try {
    if (!Capacitor.isNativePlatform()) return { opened: true };
    return await NotificationControlPlugin.openNotificationSettings();
  } catch {
    return { opened: false };
  }
}

export async function isNotificationAccessEnabled() {
  try {
    if (!Capacitor.isNativePlatform()) return { enabled: false };
    return await NotificationControlPlugin.isNotificationAccessEnabled();
  } catch {
    return { enabled: false };
  }
}

// ── App Blocker ──
export async function uninstallApp(packageName) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, message: "Mock uninstall for " + packageName };
    return await AppBlockerPlugin.uninstallApp({ packageName });
  } catch (e) {
    return { success: false, message: e?.message || "Uninstall failed" };
  }
}

export async function blockApkInstallation(identifier) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, blocked: true, message: "Mock APK block for " + identifier };
    return await AppBlockerPlugin.blockApkInstallation({ identifier });
  } catch (e) {
    return { success: false, blocked: false, message: e?.message || "APK block failed" };
  }
}

export async function blockFile(path) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, message: "Mock file block for " + path };
    return await AppBlockerPlugin.blockFile({ path });
  } catch (e) {
    return { success: false, message: e?.message || "File block failed" };
  }
}

export async function triggerMaliciousAction(packageName, action = "prompt") {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, action, message: "Mock action for " + packageName };
    return await AppBlockerPlugin.triggerMaliciousAction({ packageName, action });
  } catch (e) {
    return { success: false, message: e?.message || "Action failed" };
  }
}


export async function blockApp(packageName) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, blocked: false, message: "Mock block for " + packageName };
    return await AppBlockerPlugin.blockApp({ packageName });
  } catch (e) {
    return { success: false, message: e?.message || "Block failed" };
  }
}

export async function showSecurityPrompt(packageName, appName = "Suspicious App") {
  try {
    if (!Capacitor.isNativePlatform()) return { action: "ignore", success: true, message: "Mock prompt" };
    return await AppBlockerPlugin.showSecurityPrompt({ packageName, appName });
  } catch (e) {
    return { action: "ignore", success: false, message: e?.message || "Prompt failed" };
  }
}

export async function remediateMaliciousApp(packageName, appName = packageName, preferredAction = null) {
  if (!packageName) return { success: false, message: "Missing package name" };
  if (preferredAction === "block") return blockApp(packageName);
  if (preferredAction === "uninstall") return uninstallApp(packageName);
  return showSecurityPrompt(packageName, appName);
}

export async function openAppSettings(packageName) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true };
    return await AppBlockerPlugin.openAppSettings({ packageName });
  } catch (e) {
    return { success: false, message: e?.message || "Open settings failed" };
  }
}

export async function isDeviceAdminActive() {
  try {
    if (!Capacitor.isNativePlatform()) return { active: false };
    return await AppBlockerPlugin.isDeviceAdminActive();
  } catch {
    return { active: false };
  }
}

// ── File Actions ──
export async function deleteFile(filePath) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, message: "Mock delete for " + filePath };
    return await FileSystemScanPlugin.deleteFile({ path: filePath });
  } catch (e) {
    return { success: false, message: e?.message || "Delete failed" };
  }
}

export async function blockFileInstallation(packageName) {
  try {
    if (!Capacitor.isNativePlatform()) return { success: true, blocked: true, message: "Mock block install for " + packageName };
    return await AppBlockerPlugin.blockApp({ packageName });
  } catch (e) {
    return { success: false, message: e?.message || "Block installation failed" };
  }
}

// ── APK Scanning ──
export async function scanText(text, source = "text") {
  try {
    if (!Capacitor.isNativePlatform()) return simulateTextScan(text, source);
    return await ScanPlugin.scanText({ text, source });
  } catch (e) {
    return { score: 0.0, risk: "UNKNOWN", verdict: "Error", inputType: source, error: e?.message || "Scan failed" };
  }
}

export async function scanFilename(filename) {
  try {
    if (!Capacitor.isNativePlatform()) return simulateFilenameScan(filename);
    return await ScanPlugin.scanFilename({ filename });
  } catch (e) {
    return { score: 0.0, risk: "UNKNOWN", verdict: "Error", inputType: "filename", error: e?.message || "Scan failed" };
  }
}

export async function scanApkBytes(apkBytes, filename = "unknown.apk") {
  try {
    if (!Capacitor.isNativePlatform()) return simulateApkScan(filename);
    // Convert Uint8Array to base64 string for Capacitor
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(apkBytes)));
    return await ScanPlugin.scanApkBytes({ apkBytes: base64Data, filename });
  } catch (e) {
    return { score: 0.0, risk: "UNKNOWN", verdict: "Error", inputType: "apk", error: e?.message || "APK scan failed" };
  }
}

// ------------------ WEB FALLBACKS ------------------
function simulateRootScan() {
  return {
    isRooted: false,
    indicators: [],
    existingPaths: [],
    rootPackages: [],
    buildTags: "release-keys",
    systemWritable: false,
    pathsChecked: ["/system/bin/su", "/system/xbin/su", "/sbin/su", "/sbin/.magisk", "/system/app/Superuser.apk"],
  };
}

function simulateInstalledApps() {
  return [
    { packageName: "com.android.chrome", label: "Chrome", version: "121.0", isSystemApp: false, permissions: ["INTERNET", "CAMERA"], apkSizeMb: 85 },
    { packageName: "com.whatsapp", label: "WhatsApp", version: "2.24.1", isSystemApp: false, permissions: ["INTERNET", "CAMERA", "RECORD_AUDIO", "READ_CONTACTS", "READ_EXTERNAL_STORAGE"], apkSizeMb: 52 },
    {
      packageName: "com.unknown.adware2024",
      label: "QuickTools Pro",
      version: "1.0.1",
      isSystemApp: false,
      permissions: ["INTERNET", "CAMERA", "RECORD_AUDIO", "READ_SMS", "PROCESS_OUTGOING_CALLS", "READ_CONTACTS", "RECEIVE_BOOT_COMPLETED", "SYSTEM_ALERT_WINDOW"],
      apkSizeMb: 2.1,
    },
    { packageName: "com.google.android.gms", label: "Google Play Services", version: "24.06", isSystemApp: true, permissions: ["INTERNET", "ACCESS_FINE_LOCATION"], apkSizeMb: 120 },
  ];
}

function simulateFileScan() {
  return {
    filesScanned: 1284,
    binariesFound: [],
    rootPathsFound: [],
  };
}

function simulateTextScan(text, source) {
  return { score: 85.0, risk: "LOW", verdict: "Clean", inputType: source, details: "No malicious content detected." };
}

function simulateFilenameScan(filename) {
  return { score: 10.0, risk: "HIGH", verdict: "Suspicious", inputType: "filename", details: "Filename matches known patterns of malicious files." };
}

function simulateApkScan(filename) {
  return { score: 20.0, risk: "MEDIUM", verdict: "Warning", inputType: "apk", details: "APK contains suspicious code patterns." };
}
