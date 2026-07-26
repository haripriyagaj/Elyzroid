package com.elyzorid.app.plugins

import android.util.Base64
import com.elyzorid.app.security.ElyzoridScanEngine
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin to expose ElyzoridScanEngine scanning functionality.
 */
@CapacitorPlugin(name = "Scan")
class ScanPlugin : Plugin() {

    @PluginMethod
    fun scanText(call: PluginCall) {
        val text = call.getString("text")
        val source = call.getString("source", "text")

        if (text.isNullOrEmpty()) {
            call.reject("Text is required")
            return
        }

        try {
            val result = ElyzoridScanEngine.scanText(text, source)
            val ret = JSObject()

            ret.put("score", result.score)
            ret.put("risk", result.risk)
            ret.put("verdict", result.verdict)
            ret.put("inputType", result.inputType)

            val metaObj = JSObject()
            for ((key, value) in result.meta) {
                metaObj.put(key, value)
            }
            ret.put("meta", metaObj)

            val xaiObj = JSObject()
            for ((key, value) in result.xai) {
                xaiObj.put(key, value)
            }
            ret.put("xai", xaiObj)

            ret.put("explanation", result.explanation)
            ret.put("recommendations", result.recommendations)

            val modelBreakdownObj = JSObject()
            for ((key, value) in result.modelBreakdown) {
                modelBreakdownObj.put(key, value)
            }
            ret.put("modelBreakdown", modelBreakdownObj)

            val fileInfoObj = JSObject()
            for ((key, value) in result.fileInfo) {
                fileInfoObj.put(key, value)
            }
            ret.put("fileInfo", fileInfoObj)

            val remediationObj = JSObject()
            for ((key, value) in result.remediation) {
                remediationObj.put(key, value)
            }
            ret.put("remediation", remediationObj)

            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Scan failed: ${e.message}")
        }
    }

    @PluginMethod
    fun scanFilename(call: PluginCall) {
        val filename = call.getString("filename")

        if (filename.isNullOrEmpty()) {
            call.reject("Filename is required")
            return
        }

        try {
            val result = ElyzoridScanEngine.scanFilename(filename)
            val ret = JSObject()

            ret.put("score", result.score)
            ret.put("risk", result.risk)
            ret.put("verdict", result.verdict)
            ret.put("inputType", result.inputType)

            val xaiObj = JSObject()
            for ((key, value) in result.xai) {
                xaiObj.put(key, value)
            }
            ret.put("xai", xaiObj)

            val remediationObj = JSObject()
            for ((key, value) in result.remediation) {
                remediationObj.put(key, value)
            }
            ret.put("remediation", remediationObj)

            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Scan failed: ${e.message}")
        }
    }

    @PluginMethod
    fun scanApkBytes(call: PluginCall) {
        val base64Data = call.getString("apkBytes")
        val filename = call.getString("filename", "unknown.apk")

        if (base64Data.isNullOrEmpty()) {
            call.reject("APK bytes are required")
            return
        }

        try {
            val apkBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val result = ElyzoridScanEngine.scanApkBytes(apkBytes, filename)
            val ret = JSObject()

            ret.put("score", result.score)
            ret.put("risk", result.risk)
            ret.put("verdict", result.verdict)
            ret.put("inputType", result.inputType)

            val metaObj = JSObject()
            for ((key, value) in result.meta) {
                metaObj.put(key, value)
            }
            ret.put("meta", metaObj)

            val xaiObj = JSObject()
            for ((key, value) in result.xai) {
                xaiObj.put(key, value)
            }
            ret.put("xai", xaiObj)

            val fileInfoObj = JSObject()
            for ((key, value) in result.fileInfo) {
                fileInfoObj.put(key, value)
            }
            ret.put("fileInfo", fileInfoObj)

            ret.put("recommendations", result.recommendations)

            val remediationObj = JSObject()
            for ((key, value) in result.remediation) {
                remediationObj.put(key, value)
            }
            ret.put("remediation", remediationObj)

            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("APK scan failed: ${e.message}")
        }
    }
}
