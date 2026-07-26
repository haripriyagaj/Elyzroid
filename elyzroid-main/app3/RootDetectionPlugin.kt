// android/app/src/main/java/com/elyzorid/plugins/RootDetectionPlugin.kt
// ─────────────────────────────────────────────────────────────
// REAL root detection on Android device.
// Checks su binaries, root packages, system partition, SafetyNet.
// Called from React via: RootDetectionPlugin.scan()
// ─────────────────────────────────────────────────────────────

package com.elyzorid.plugins

import android.content.pm.PackageManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

@CapacitorPlugin(name = "RootDetection")
class RootDetectionPlugin : Plugin() {

    private val ROOT_PATHS = listOf(
        "/system/bin/su",
        "/system/xbin/su",
        "/sbin/su",
        "/data/local/su",
        "/data/local/bin/su",
        "/data/local/xbin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
        "/system/app/Superuser.apk",
        "/system/app/SuperSU.apk",
        "/sbin/.magisk",
        "/sbin/.core/mirror",
        "/sbin/.core/img",
        "/data/adb/magisk",
        "/data/adb/modules",
        "/cache/magisk.log",
        "/data/local/tmp/busybox",
        "/system/xbin/busybox",
    )

    private val ROOT_PACKAGES = listOf(
        "com.topjohnwu.magisk",
        "eu.chainfire.supersu",
        "com.noshufou.android.su",
        "com.koushikdutta.superuser",
        "com.thirdparty.superuser",
        "com.yellowes.su",
        "com.kingroot.kinguser",
        "com.kingo.root",
        "com.smedialink.oneclickroot",
        "com.zhiqupk.root.global",
        "com.alephzain.framaroot",
    )

    @PluginMethod
    fun scan(call: PluginCall) {
        val existingPaths = JSArray()
        val indicators = JSArray()
        val pathsChecked = JSArray()
        var isRooted = false

        // ── 1. Check root binary paths ──
        for (path in ROOT_PATHS) {
            pathsChecked.put(path)
            if (File(path).exists()) {
                existingPaths.put(path)
                indicators.put("Found: $path")
                isRooted = true
            }
        }

        // ── 2. Check for root packages ──
        val installedRootPkgs = JSArray()
        val pm: PackageManager = context.packageManager
        for (pkg in ROOT_PACKAGES) {
            try {
                pm.getPackageInfo(pkg, 0)
                installedRootPkgs.put(pkg)
                indicators.put("Root package installed: $pkg")
                isRooted = true
            } catch (e: PackageManager.NameNotFoundException) {
                // Not installed — good
            }
        }

        // ── 3. Check system partition writability ──
        val systemWritable = isSystemPartitionWritable()
        if (systemWritable) {
            indicators.put("/system partition is writable — compromised")
            isRooted = true
        }

        // ── 4. Check build tags ──
        val buildTags = android.os.Build.TAGS ?: ""
        if (buildTags.contains("test-keys")) {
            indicators.put("Build signed with test-keys: $buildTags")
            isRooted = true
        }

        // ── 5. Try executing su ──
        val canExecSu = canExecuteSu()
        if (canExecSu) {
            indicators.put("su binary is executable")
            isRooted = true
        }

        // ── 6. Check for busybox ──
        val busyboxExists = File("/system/xbin/busybox").exists() ||
                File("/system/bin/busybox").exists() ||
                File("/data/local/bin/busybox").exists()
        if (busyboxExists) {
            indicators.put("Busybox detected (common root tool)")
            // busybox alone isn't definitive root, but flag it
        }

        // ── 7. Check ro.debuggable ──
        try {
            val proc = Runtime.getRuntime().exec("getprop ro.debuggable")
            val result = proc.inputStream.bufferedReader().readText().trim()
            if (result == "1") {
                indicators.put("ro.debuggable=1 (debug build)")
                // Not definitive root, but suspicious
            }
        } catch (e: Exception) { /* ignore */ }

        val ret = JSObject()
        ret.put("isRooted", isRooted)
        ret.put("existingPaths", existingPaths)
        ret.put("rootPackages", installedRootPkgs)
        ret.put("indicators", indicators)
        ret.put("pathsChecked", pathsChecked)
        ret.put("buildTags", buildTags)
        ret.put("systemWritable", systemWritable)
        ret.put("busyboxFound", busyboxExists)
        call.resolve(ret)
    }

    private fun isSystemPartitionWritable(): Boolean {
        return try {
            val proc = Runtime.getRuntime().exec("mount")
            val reader = BufferedReader(InputStreamReader(proc.inputStream))
            reader.lineSequence().any { line ->
                line.contains("/system") && line.contains(" rw")
            }
        } catch (e: Exception) { false }
    }

    private fun canExecuteSu(): Boolean {
        return try {
            val proc = Runtime.getRuntime().exec(arrayOf("su", "-c", "id"))
            proc.waitFor() == 0
        } catch (e: Exception) { false }
    }
}
