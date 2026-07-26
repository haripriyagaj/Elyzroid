# Notification Listener + App Blocker Implementation TODO

## Goal
Implement real notification listener service that detects malicious SMS/notifications and adds app block/uninstall feature for malicious apps.

## Steps

### Step 1: Android Native - NotificationMonitorService.kt
- [x] Create in `my-react-app/android/app/src/main/java/com/elyzorid/app/plugins/`
- [x] Extend NotificationListenerService
- [x] Extract notification text, title, package name
- [x] Run heuristics (phishing URLs, crypto addresses, suspicious keywords)
- [x] Broadcast threatEvent via Capacitor bridge

### Step 2: Android Native - NotificationControlPlugin.kt
- [x] Create Capacitor plugin for start/stop/getStats/openSettings
- [x] Register in MainActivity.java

### Step 3: Android Native - AppBlockerPlugin.kt
- [x] Create plugin for uninstallApp, blockApp, getAppRiskScore
- [x] Uses Intent.ACTION_DELETE for uninstall
- [x] Uses DevicePolicyManager for block (if available)

### Step 4: AndroidManifest.xml
- [x] Add BIND_NOTIFICATION_LISTENER_SERVICE permission
- [x] Add REQUEST_DELETE_PACKAGES permission
- [x] Declare NotificationMonitorService

### Step 5: MainActivity.java
- [x] Register NotificationControlPlugin and AppBlockerPlugin

### Step 6: React Native Bridge
- [x] Update nativeBridge.js with NotificationControlPlugin and AppBlockerPlugin

### Step 7: Toolkit.jsx
- [x] Replace simulation with real native notification monitoring
- [x] Show real stats from native service

### Step 8: Home.jsx
- [x] Add installed apps list with risk scores
- [x] Add Block and Uninstall buttons for malicious apps

### Step 9: App.jsx
- [x] Wire real notification threat events to addAlert
- [x] Handle app uninstall/block callbacks

### Step 10: Testing
- [ ] Build and test on Android
- [ ] Verify notification interception
- [ ] Verify app uninstall flow

