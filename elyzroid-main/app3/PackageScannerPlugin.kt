// android/app/src/main/java/com/elyzorid/plugins/PackageScannerPlugin.kt
// ─────────────────────────────────────────────────────────────
// REAL package scanning using Android PackageManager.
// Returns ALL installed apps with their permissions, sizes, signatures.
// ─────────────────────────────────────────────────────────────

package com.elyzorid.plugins

import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "PackageScanner")
class PackageScannerPlugin : Plugin() {

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val pm: PackageManager = context.packageManager
        val appsArray = JSArray()

        try {
            val packages: List<PackageInfo> = pm.getInstalledPackages(
                PackageManager.GET_PERMISSIONS or
                PackageManager.GET_ACTIVITIES or
                PackageManager.GET_SERVICES or
                PackageManager.GET_RECEIVERS or
                PackageManager.GET_PROVIDERS
            )

            for (pkg in packages) {
                val appObj = JSObject()
                val appInfo = pkg.applicationInfo

                // Basic info
                appObj.put("packageName", pkg.packageName)
                appObj.put("version", pkg.versionName ?: "unknown")
                appObj.put("versionCode", pkg.longVersionCode)
                appObj.put("label", pm.getApplicationLabel(appInfo).toString())
                appObj.put("isSystemApp",
                    appInfo.flags and ApplicationInfo.FLAG_SYSTEM != 0)
                appObj.put("isUpdatedSystemApp",
                    appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP != 0)

                // APK file size
                val apkFile = File(appInfo.sourceDir)
                appObj.put("apkSizeMb", apkFile.length().toDouble() / (1024 * 1024))

                // Install/update times
                appObj.put("firstInstalled", pkg.firstInstallTime)
                appObj.put("lastUpdated", pkg.lastUpdateTime)

                // Target SDK
                appObj.put("targetSdk", appInfo.targetSdkVersion)
                appObj.put("minSdk", appInfo.minSdkVersion)

                // APK path (for further static analysis)
                appObj.put("apkPath", appInfo.sourceDir)

                // Permissions — strip android.permission. prefix for readability
                val permsArray = JSArray()
                pkg.requestedPermissions?.forEach { perm ->
                    permsArray.put(perm.removePrefix("android.permission."))
                }
                appObj.put("permissions", permsArray)

                // Permission grant status
                val grantedPerms = JSArray()
                pkg.requestedPermissionsFlags?.forEachIndexed { idx, flags ->
                    if (flags and PackageInfo.REQUESTED_PERMISSION_GRANTED != 0) {
                        pkg.requestedPermissions?.getOrNull(idx)?.let { p ->
                            grantedPerms.put(p.removePrefix("android.permission."))
                        }
                    }
                }
                appObj.put("grantedPermissions", grantedPerms)

                // Component counts
                appObj.put("activityCount", pkg.activities?.size ?: 0)
                appObj.put("serviceCount", pkg.services?.size ?: 0)
                appObj.put("receiverCount", pkg.receivers?.size ?: 0)
                appObj.put("providerCount", pkg.providers?.size ?: 0)

                // Boot receivers (persistence indicator)
                val hasBootReceiver = pkg.receivers?.any { receiver ->
                    receiver.exported == true
                } ?: false
                appObj.put("hasExportedReceiver", hasBootReceiver)

                // Signature hash (for certificate pinning / trust check)
                try {
                    val sig = pm.getPackageInfo(pkg.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                    val sigHash = sig.signingInfo?.apkContentsSigners?.firstOrNull()?.let {
                        it.toCharsString().take(16)
                    } ?: "unknown"
                    appObj.put("signatureHash", sigHash)
                } catch (e: Exception) {
                    appObj.put("signatureHash", "unknown")
                }

                appsArray.put(appObj)
            }

            val ret = JSObject()
            ret.put("apps", appsArray)
            ret.put("totalCount", packages.size)
            call.resolve(ret)

        } catch (e: Exception) {
            call.reject("Failed to scan packages: ${e.message}", e)
        }
    }

    @PluginMethod
    fun analyzeApk(call: PluginCall) {
        val packageName = call.getString("packageName") ?: run {
            call.reject("packageName required"); return
        }

        try {
            val pm = context.packageManager
            val pkg = pm.getPackageInfo(
                packageName,
                PackageManager.GET_PERMISSIONS or
                PackageManager.GET_ACTIVITIES or
                PackageManager.GET_SERVICES or
                PackageManager.GET_RECEIVERS
            )

            val ret = JSObject()
            ret.put("packageName", packageName)

            // Intent filters from receivers (common malware persistence)
            val intentFilters = JSArray()
            pkg.receivers?.forEach { receiver ->
                intentFilters.put(receiver.name)
            }
            ret.put("intentFilters", intentFilters)

            // Services (background persistence)
            val services = JSArray()
            pkg.services?.forEach { svc ->
                services.put(svc.name)
            }
            ret.put("services", services)

            // Activities (UI components)
            val activities = JSArray()
            pkg.activities?.forEach { act ->
                activities.put(act.name)
            }
            ret.put("activities", activities)

            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to analyze APK: ${e.message}", e)
        }
    }
}
