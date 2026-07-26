// android/app/src/main/java/com/elyzorid/plugins/ClipboardMonitorPlugin.kt
package com.elyzorid.plugins

import android.content.ClipboardManager
import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ClipboardMonitor")
class ClipboardMonitorPlugin : Plugin() {

    private var clipListener: ClipboardManager.OnPrimaryClipChangedListener? = null
    private var clipboardManager: ClipboardManager? = null

    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        activity.runOnUiThread {
            clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

            clipListener = ClipboardManager.OnPrimaryClipChangedListener {
                val clip = clipboardManager?.primaryClip
                val text = clip?.getItemAt(0)?.text?.toString() ?: ""

                if (text.isNotEmpty()) {
                    val event = JSObject()
                    event.put("content", text)
                    event.put("timestamp", System.currentTimeMillis())
                    event.put("isUrl", text.startsWith("http://") || text.startsWith("https://"))
                    event.put("isCryptoAddress",
                        text.matches(Regex("^(bc1|0x)[a-fA-F0-9]{20,}.*")))

                    // Emit to React via Capacitor bridge
                    notifyListeners("clipboardEvent", event)
                }
            }

            clipboardManager?.addPrimaryClipChangedListener(clipListener!!)
            call.resolve(JSObject().apply { put("started", true) })
        }
    }

    @PluginMethod
    fun stopMonitoring(call: PluginCall) {
        activity.runOnUiThread {
            clipListener?.let { clipboardManager?.removePrimaryClipChangedListener(it) }
            clipListener = null
            call.resolve(JSObject().apply { put("stopped", true) })
        }
    }

    override fun handleOnDestroy() {
        clipListener?.let { clipboardManager?.removePrimaryClipChangedListener(it) }
        super.handleOnDestroy()
    }
}


// ─────────────────────────────────────────────────────────────
// VPN Control Plugin
// Controls the ElyzoridVpnService
// ─────────────────────────────────────────────────────────────

// android/app/src/main/java/com/elyzorid/plugins/VpnControlPlugin.kt
package com.elyzorid.plugins

import android.content.Intent
import android.net.VpnService
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

private const val VPN_REQUEST_CODE = 1001

@CapacitorPlugin(name = "VpnControl")
class VpnControlPlugin : Plugin() {

    private var pendingCall: PluginCall? = null

    @PluginMethod
    fun start(call: PluginCall) {
        val vpnIntent = VpnService.prepare(context)
        if (vpnIntent != null) {
            // Need user permission
            pendingCall = call
            saveCall(call)
            startActivityForResult(call, vpnIntent, VPN_REQUEST_CODE)
        } else {
            // Already has permission, start directly
            startVpnService()
            call.resolve(JSObject().apply { put("started", true) })
        }
    }

    override fun handleOnActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.handleOnActivityResult(requestCode, resultCode, data)
        if (requestCode == VPN_REQUEST_CODE) {
            val call = pendingCall ?: return
            if (resultCode == android.app.Activity.RESULT_OK) {
                startVpnService()
                call.resolve(JSObject().apply { put("started", true) })
            } else {
                call.resolve(JSObject().apply {
                    put("started", false)
                    put("error", "User denied VPN permission")
                })
            }
        }
    }

    private fun startVpnService() {
        val intent = Intent(context, ElyzoridVpnService::class.java)
        context.startService(intent)
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        val intent = Intent(context, ElyzoridVpnService::class.java)
        context.stopService(intent)
        call.resolve(JSObject().apply { put("stopped", true) })
    }

    @PluginMethod
    fun getStats(call: PluginCall) {
        val stats = ElyzoridVpnService.getStats()
        val ret = JSObject()
        ret.put("blockedCount", stats["blockedCount"] as? Int ?: 0)
        val domains = JSArray()
        (stats["blockedDomains"] as? List<*>)?.forEach { domains.put(it.toString()) }
        ret.put("blockedDomains", domains)
        call.resolve(ret)
    }
}


// ─────────────────────────────────────────────────────────────
// File System Scan Plugin
// Checks specified paths for suspicious binaries
// ─────────────────────────────────────────────────────────────

// android/app/src/main/java/com/elyzorid/plugins/FileSystemScanPlugin.kt
package com.elyzorid.plugins

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "FileSystemScan")
class FileSystemScanPlugin : Plugin() {

    private val SUSPICIOUS_BINARIES = listOf(
        "su", "busybox", "magisk", "resetprop", "magiskhide",
        "frida-server", "frida", "tcpdump", "nethunter",
        "superuser", "SuperSU",
    )

    private val ROOT_INDICATOR_FILES = listOf(
        "/system/bin/su", "/system/xbin/su", "/sbin/su",
        "/data/local/su", "/sbin/.magisk", "/data/adb/magisk",
        "/system/app/Superuser.apk",
    )

    @PluginMethod
    fun scan(call: PluginCall) {
        val pathsToScan = call.getArray("paths")?.toList<String>()
            ?: listOf("/system/bin", "/system/xbin", "/sbin", "/data/local")

        var filesScanned = 0
        val suspiciousFiles = JSArray()
        val binariesFound = JSArray()
        val rootPathsFound = JSArray()

        // Check root indicator files
        for (rootFile in ROOT_INDICATOR_FILES) {
            if (File(rootFile).exists()) {
                rootPathsFound.put(rootFile)
            }
        }

        // Scan specified directories
        for (dirPath in pathsToScan) {
            val dir = File(dirPath)
            if (!dir.exists() || !dir.isDirectory) continue

            try {
                dir.listFiles()?.forEach { file ->
                    filesScanned++
                    if (SUSPICIOUS_BINARIES.any { suspicious ->
                            file.name.lowercase().contains(suspicious.lowercase())
                        }) {
                        val fileInfo = JSObject()
                        fileInfo.put("path", file.absolutePath)
                        fileInfo.put("name", file.name)
                        fileInfo.put("sizeMb", file.length().toDouble() / (1024 * 1024))
                        fileInfo.put("isExecutable", file.canExecute())
                        binariesFound.put(fileInfo)
                    }
                }
            } catch (e: SecurityException) {
                // Access denied to this directory — expected for some system dirs
            }
        }

        // Also check /proc/net for network interfaces (abnormal if certain ones present)
        val procNet = File("/proc/net/if_inet6")
        if (procNet.exists()) {
            filesScanned++
        }

        val ret = JSObject()
        ret.put("filesScanned", filesScanned)
        ret.put("suspiciousFiles", suspiciousFiles)
        ret.put("binariesFound", binariesFound)
        ret.put("rootPathsFound", rootPathsFound)
        ret.put("scanDuration", 0.0) // Placeholder — measure actual time in production
        call.resolve(ret)
    }
}
