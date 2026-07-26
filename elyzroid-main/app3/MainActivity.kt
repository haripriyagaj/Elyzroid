// android/app/src/main/java/com/elyzorid/MainActivity.kt
// ─────────────────────────────────────────────────────────────
// Main Capacitor Activity.
// Registers all native plugins so they can be called from React.
// ─────────────────────────────────────────────────────────────

package com.elyzorid

import com.getcapacitor.BridgeActivity
import com.elyzorid.plugins.RootDetectionPlugin
import com.elyzorid.plugins.PackageScannerPlugin
import com.elyzorid.plugins.ClipboardMonitorPlugin
import com.elyzorid.plugins.VpnControlPlugin
import com.elyzorid.plugins.FileSystemScanPlugin

class MainActivity : BridgeActivity() {

    override fun registerPlugins(bridge: com.getcapacitor.Bridge) {
        super.registerPlugins(bridge)

        // ── Register all Elyzorid native plugins ──
        bridge.registerPlugin(RootDetectionPlugin::class.java)
        bridge.registerPlugin(PackageScannerPlugin::class.java)
        bridge.registerPlugin(ClipboardMonitorPlugin::class.java)
        bridge.registerPlugin(VpnControlPlugin::class.java)
        bridge.registerPlugin(FileSystemScanPlugin::class.java)
    }
}
