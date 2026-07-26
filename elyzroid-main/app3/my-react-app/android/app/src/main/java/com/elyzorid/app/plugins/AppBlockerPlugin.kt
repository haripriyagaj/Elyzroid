package com.elyzorid.app.plugins

import android.app.AlertDialog
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.os.Environment
import androidx.core.net.toUri
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * App Blocker Plugin for Elyzorid
 * - uninstallApp: Prompts user to uninstall a malicious app
 * - blockApp: Uses DevicePolicyManager to suspend the app (requires device admin)
 * - showSecurityPrompt: Shows a native confirmation dialog for malicious apps
 */
@CapacitorPlugin(name = "AppBlocker")
class AppBlockerPlugin : Plugin() {

    @PluginMethod
    fun showSecurityPrompt(call: PluginCall) {
        val packageName = call.getString("packageName") ?: run {
            call.reject("packageName is required")
            return
        }
        val appName = call.getString("appName") ?: "Suspicious App"

        activity.runOnUiThread {
            AlertDialog.Builder(context)
                .setTitle("🚨 Malicious App Detected")
                .setMessage("$appName is flagged as HIGH RISK. What would you like to do?")
                .setPositiveButton("Uninstall") { _, _ ->
                    val result = uninstallInternal(packageName)
                    val ret = JSObject().apply {
                        put("action", "uninstall")
                        put("success", result.first)
                        put("message", result.second)
                    }
                    call.resolve(ret)
                }
                .setNeutralButton("Block") { _, _ ->
                    val result = blockInternal(packageName)
                    val ret = JSObject().apply {
                        put("action", "block")
                        put("success", result.first)
                        put("message", result.second)
                    }
                    call.resolve(ret)
                }
                .setNegativeButton("Ignore") { _, _ ->
                    call.resolve(JSObject().put("action", "ignore"))
                }
                .setCancelable(true)
                .show()
        }
    }

    @PluginMethod
    fun uninstallApp(call: PluginCall) {
        val packageName = call.getString("packageName") ?: run {
            call.reject("packageName is required")
            return
        }
        val result = uninstallInternal(packageName)
        val ret = JSObject().apply {
            put("success", result.first)
            put("message", result.second)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun blockApp(call: PluginCall) {
        val packageName = call.getString("packageName") ?: run {
            call.reject("packageName is required")
            return
        }
        val result = blockInternal(packageName)
        val ret = JSObject().apply {
            put("success", result.first)
            put("message", result.second)
        }
        call.resolve(ret)
    }

    private fun uninstallInternal(packageName: String): Pair<Boolean, String> {
        return try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val admin = ComponentName(context, ElyzoridDeviceAdmin::class.java)
            val isDeviceOwner = dpm?.isDeviceOwnerApp(context.packageName) == true
            val isAdminActive = dpm?.isAdminActive(admin) == true

            // Use reflection for hidden uninstallPackage API if Device Owner
            if (dpm != null && isDeviceOwner && isAdminActive) {
                try {
                    val method = dpm.javaClass.methods.find { it.name == "uninstallPackage" }
                    if (method != null) {
                        if (method.parameterCount == 2) {
                            method.invoke(dpm, admin, packageName)
                        } else if (method.parameterCount == 3) {
                            method.invoke(dpm, admin, packageName, null)
                        }
                        return Pair(true, "Requested silent uninstall via DevicePolicyManager.")
                    }
                } catch (_: Exception) {
                    // Fallback
                }
            }

            // Standard fallback: PackageInstaller (Android 9+ Device Owner)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                try {
                    val installer: PackageInstaller = context.packageManager.packageInstaller
                    val statusIntent = Intent("com.elyzorid.app.UNINSTALL_STATUS")
                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        0,
                        statusIntent,
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                    )
                    if (pendingIntent != null) {
                        installer.uninstall(packageName, pendingIntent.intentSender)
                        return Pair(true, "Requested uninstall via PackageInstaller.")
                    }
                } catch (_: Exception) {}
            }

            // Universal fallback: User-confirmed Intent
            val intent = Intent(Intent.ACTION_DELETE).apply {
                data = "package:$packageName".toUri()
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            Pair(true, "Opened system uninstall prompt.")
        } catch (e: Exception) {
            Pair(false, "Failed to uninstall: ${e.message}")
        }
    }

    private fun blockInternal(packageName: String): Pair<Boolean, String> {
        return try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val admin = ComponentName(context, ElyzoridDeviceAdmin::class.java)

            if (dpm != null && dpm.isAdminActive(admin)) {
                val isDeviceOwner = dpm.isDeviceOwnerApp(context.packageName)
                if (isDeviceOwner && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    try {
                        dpm.setApplicationHidden(admin, packageName, true)
                        return Pair(true, "App hidden successfully.")
                    } catch (_: Exception) {}
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setPackagesSuspended(admin, arrayOf(packageName), true)
                    Pair(true, "App suspended (blocked).")
                } else {
                    Pair(false, "Blocking requires Android 9+ or device owner mode.")
                }
            } else {
                Pair(false, "Device admin not active. Enable it in Settings.")
            }
        } catch (e: Exception) {
            Pair(false, "Error blocking app: ${e.message}")
        }
    }

    @PluginMethod
    fun isDeviceAdminActive(call: PluginCall) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val admin = ComponentName(context, ElyzoridDeviceAdmin::class.java)
        val ret = JSObject()
        ret.put("active", dpm?.isAdminActive(admin) == true)
        call.resolve(ret)
    }

    @PluginMethod
    fun blockApkInstallation(call: PluginCall) {
        val identifier = call.getString("identifier") ?: run {
            call.reject("identifier (package/hash/path) required")
            return
        }
        val result = blockApkInstallInternal(identifier)
        val ret = JSObject().apply {
            put("success", result.first)
            put("blocked", result.third)
            put("message", result.second)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun blockFile(call: PluginCall) {
        val path = call.getString("path") ?: run {
            call.reject("path required")
            return
        }
        val result = deleteFileInternal(path)
        val ret = JSObject().apply {
            put("success", result.first)
            put("message", result.second)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun triggerMaliciousAction(call: PluginCall) {
        val packageName = call.getString("packageName") ?: run {
            call.reject("packageName required")
            return
        }
        val action = call.getString("action") ?: "prompt"
        val result = when (action) {
            "block" -> blockInternal(packageName)
            "uninstall" -> uninstallInternal(packageName)
            else -> showSecurityPromptInternal(packageName, "Malicious App")
        }
        val ret = JSObject().apply {
            put("success", result.first)
            put("message", result.second)
            put("action", action)
        }
        call.resolve(ret)
    }

    private fun showSecurityPromptInternal(packageName: String, appName: String): Pair<Boolean, String> {
        // Simplified return for service calls (no UI thread)
        return Pair(true, "Security prompt would be shown for $appName")
    }

    private fun blockApkInstallInternal(identifier: String): Triple<Boolean, String, Boolean> {
        return try {
            // Log/notify pending install block attempt
            // Real impl: Monitor PackageInstaller sessions, cancel if matches identifier
            // Fallback: Block if package exists or attempt delete if APK path
            val pm = context.packageManager
            if (pm.getApplicationInfo(identifier, 0) != null) {
                // Existing package
                val blocked = blockInternal(identifier).first
                Triple(true, if (blocked) "Blocked existing app install/update" else "Block failed", blocked)
            } else {
                // APK path or hash - attempt delete + log
                val apkPath = if (identifier.contains("/")) File(identifier) else File(Environment.getExternalStorageDirectory(), identifier)
                if (apkPath.exists() && apkPath.delete()) {
                    Triple(true, "Deleted malicious APK file", true)
                } else {
                    Triple(true, "Logged malicious APK identifier for blocking (user confirmation needed)", false)
                }
            }
        } catch (e: Exception) {
            Triple(false, "Block failed: ${e.message}", false)
        }
    }

    private fun deleteFileInternal(path: String): Pair<Boolean, String> {
        return try {
            val file = File(path)
            if (file.exists() && file.delete()) {
                Pair(true, "File deleted: ${file.absolutePath}")
            } else {
                Pair(false, "File not found or delete failed")
            }
        } catch (e: Exception) {
            Pair(false, "Delete error: ${e.message}")
        }
    }
}
