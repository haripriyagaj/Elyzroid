# Elyzorid React + Capacitor — Complete Setup Guide
## From VS Code → Android Studio → Real Device / Emulator

---

## STEP 1: Install Prerequisites

```bash
# Node.js 18+ (https://nodejs.org)
node --version   # must be >= 18

# Java JDK 17 (https://adoptium.net)
java --version   # must be 17.x

# Android Studio (https://developer.android.com/studio)
# Install with: SDK Platform 34, Build Tools 34, Emulator
```

---

## STEP 2: Install Dependencies & Create Android Project

```bash
# Navigate to elyzorid-react folder
cd elyzorid-react

# Install all npm packages
npm install

# Build the React app (creates /build folder)
npm run build

# Add Android platform (creates /android folder)
npx cap add android

# Sync React build into Android project
npx cap sync android
```

---

## STEP 3: Copy Native Kotlin Plugin Files

After running `npx cap add android`, copy the Kotlin files into Android project:

```bash
# Copy ALL Kotlin plugin files from android-plugins/ into:
# android/app/src/main/java/com/elyzorid/

cp android-plugins/src/main/java/com/elyzorid/plugins/*.kt \
   android/app/src/main/java/com/elyzorid/plugins/

cp android-plugins/src/main/java/com/elyzorid/MainActivity.kt \
   android/app/src/main/java/com/elyzorid/

# On Windows, do this manually in File Explorer.
```

---

## STEP 4: Update AndroidManifest.xml

Open `android/app/src/main/AndroidManifest.xml` and **replace its contents** with the contents of `android-plugins/AndroidManifest.xml`.

---

## STEP 5: Update MainActivity.kt (if already exists)

Replace the default MainActivity.kt with the one in `android-plugins/` which registers all plugins.

---

## STEP 6: Add to app/build.gradle

Open `android/app/build.gradle` and make sure these are in `dependencies {}`:

```groovy
dependencies {
    implementation "com.getcapacitor:capacitor-android:6.+"
    implementation "androidx.core:core-ktx:1.12.0"
    implementation "org.jetbrains.kotlin:kotlin-stdlib:1.9.0"
    // Already included via Capacitor:
    // implementation "androidx.appcompat:appcompat:1.6.1"
}
```

---

## STEP 7: Open in Android Studio and Run

```bash
# Opens Android Studio with the project
npx cap open android
```

**In Android Studio:**

### For Emulator:
1. Click AVD Manager (phone icon in toolbar)
2. Create Virtual Device → Pixel 7 → API 34 (Android 14)
3. Click ▶ Run button
4. App installs and opens automatically

### For Real Android Device (USB):
1. On your Android phone:
   - Settings → About Phone → Tap Build Number **7 times**
   - Settings → Developer Options → Enable **USB Debugging**
2. Connect phone via USB cable
3. Allow USB debugging dialog on phone (tap "Always Allow")
4. In Android Studio, select your device from the dropdown
5. Click ▶ Run

---

## STEP 8: Grant Special Permissions on Device

Some features need permissions granted OUTSIDE the app:

### Notification Listener (for Notification Monitoring):
```
Android Settings → Apps → Special App Access → Notification Access → Elyzorid → Enable
```

### Usage Stats (for Package Scanner):
```
Android Settings → Apps → Special App Access → Usage Access → Elyzorid → Enable
```

### VPN: 
Android automatically prompts when you tap "Enable Local VPN" in Toolkit. Tap **OK**.

---

## STEP 9: Live Development (Hot Reload)

For faster development with live reload:

```bash
# Start React dev server
npm start

# In capacitor.config.ts, UNCOMMENT the server block:
# server: {
#   url: 'http://10.0.2.2:3000',  # emulator
#   # url: 'http://YOUR_PC_IP:3000',  # real device
#   cleartext: true,
# }

# Then sync and run
npx cap sync android
npx cap run android
```

> **Emulator**: Uses `10.0.2.2` (Android's loopback to your PC)
> **Real device**: Use your PC's local IP: `192.168.x.x` (must be on same WiFi)

---

## STEP 10: How Real Scanning Works

| Feature | What Happens on Device |
|---------|----------------------|
| **Full Scan** | `PackageScannerPlugin.getInstalledApps()` calls Android `PackageManager.getInstalledPackages()` and returns all real apps with real permissions. JS ML engine scores them. |
| **Permission Scan** | Same PackageManager call, filtered and analyzed for dangerous permission combos. |
| **Root Detection** | `RootDetectionPlugin.scan()` checks 18 real filesystem paths, runs `su -c id`, checks mounted volumes, reads build tags. |
| **Clipboard Monitor** | `ClipboardMonitorPlugin` registers `OnPrimaryClipChangedListener`. Every paste fires the event. |
| **Local VPN** | `ElyzoridVpnService` creates a real Android `VpnService`. All DNS queries pass through it. Malware domains are dropped. |
| **File System Scan** | `FileSystemScanPlugin` lists directories in `/system/bin`, `/system/xbin`, `/sbin` and checks for su/busybox/magisk. |

---

## STEP 11: Backend (Optional, for cloud ML)

```bash
cd backend
pip install -r requirements.txt
python train_models.py --demo
python app.py
# → http://localhost:5000
```

To use backend ML from app, edit `src/plugins/NativePlugins.js`:
```js
const API_BASE = 'http://10.0.2.2:5000/api'; // emulator → your PC
// const API_BASE = 'http://192.168.x.x:5000/api'; // real device
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npx cap sync` fails | Run `npm run build` first |
| Plugin not found | Check MainActivity.kt registers the plugin |
| VPN doesn't start | Check VPN permission in manifest and user grants it |
| Notification listener not working | Grant access in Android Special App Access settings |
| `QUERY_ALL_PACKAGES` rejected | Add `tools:targetApi="31"` to manifest |
| Device not found in Android Studio | Enable USB debugging, try different USB cable |
| App crashes on launch | Check Logcat in Android Studio (View → Tool Windows → Logcat) |

---

## Project File Structure

```
elyzorid-react/
├── src/
│   ├── App.js                    ← Root component + routing
│   ├── index.js                  ← React entry point
│   ├── theme/global.css          ← Complete design system
│   ├── pages/
│   │   ├── SplashScreen.js       ← Login/Register with consent
│   │   ├── HomePage.js           ← 3 scan boxes + scan sheets
│   │   ├── ToolkitPage.js        ← Clipboard/Notif/VPN toggles
│   │   ├── AlertPage.js          ← Threat alerts with dismiss
│   │   └── SettingsPage.js       ← Account/About/Support/Update
│   ├── plugins/
│   │   └── NativePlugins.js      ← Capacitor bridge + ML scoring
│   └── services/
│       └── AuthService.js        ← Auth + persistent alert store
├── android-plugins/
│   └── src/main/java/com/elyzorid/
│       ├── MainActivity.kt        ← Registers all plugins
│       └── plugins/
│           ├── RootDetectionPlugin.kt    ← 18-path root check
│           ├── PackageScannerPlugin.kt   ← Real PackageManager scan
│           ├── MonitoringPlugins.kt      ← Clipboard + VPN + FS scan
│           ├── ElyzoridVpnService.kt     ← Real DNS-filtering VPN
│           └── AndroidManifest.xml       ← All required permissions
├── capacitor.config.ts
├── package.json
└── SETUP_GUIDE.md
```
