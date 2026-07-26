package com.elyzorid.app.plugins

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.text.TextUtils
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.content.Context
import android.util.Log

/**
 * Capacitor plugin to control the NotificationMonitorService.
 */
@CapacitorPlugin(name = "NotificationControl")
class NotificationControlPlugin : Plugin() {

    companion object {
        private const val TAG = "ElyzoridNotification"
    }

    private var threatReceiver: BroadcastReceiver? = null

    inner class ThreatReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val extras = intent?.extras ?: return
            val obj = JSObject()
            obj.put("packageName", extras.getString("packageName") ?: "")
            obj.put("title", extras.getString("title") ?: "")
            obj.put("message", extras.getString("message") ?: "")
            obj.put("threatLevel", extras.getInt("threatLevel", 0))
            obj.put("isSms", extras.getBoolean("isSms", false))
            obj.put("verdict", extras.getString("verdict") ?: "")
            obj.put("hasLinks", extras.getInt("threatLevel", 0) == 3)
            notifyListeners("threatDetected", obj)
            Log.d(TAG, "Threat event emitted to JS: ${obj.getString("title")}")
        }
    }

    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        if (!isNotificationServiceEnabled()) {
            val ret = JSObject()
            ret.put("started", false)
            ret.put("error", "Notification access not granted.")
            call.resolve(ret)
            return
        }

        NotificationMonitorService.isMonitoringEnabled = true
        val componentName = ComponentName(context, NotificationMonitorService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            NotificationListenerService.requestRebind(componentName)
        }

        // Register threat receiver
        if (threatReceiver == null) {
            threatReceiver = ThreatReceiver()
            context.registerReceiver(threatReceiver, IntentFilter("com.elyzorid.THREAT_DETECTED"))
            Log.d(TAG, "Threat receiver registered")
        }

        val ret = JSObject()
        ret.put("started", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun stopMonitoring(call: PluginCall) {
        NotificationMonitorService.isMonitoringEnabled = false

        threatReceiver?.let {
            try {
                context.unregisterReceiver(it)
                Log.d(TAG, "Threat receiver unregistered")
            } catch (e: IllegalArgumentException) {
                Log.w(TAG, "Receiver not registered: ${e.message}")
            }
            threatReceiver = null
        }

        val ret = JSObject()
        ret.put("stopped", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun setAutoSmsAlert(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        NotificationMonitorService.isAutoSmsAlertEnabled = enabled
        call.resolve(JSObject().put("success", true))
    }

    @PluginMethod
    fun getStats(call: PluginCall) {
        val stats = NotificationMonitorService.getStats()
        val ret = JSObject()
        ret.put("totalIntercepted", stats["totalIntercepted"] ?: 0)
        ret.put("totalSuspicious", stats["totalSuspicious"] ?: 0)
        call.resolve(ret)
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve(JSObject().put("opened", true))
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = context.packageName
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        if (!flat.isNullOrEmpty()) {
            val names = flat.split(":").toTypedArray()
            for (name in names) {
                val componentName = ComponentName.unflattenFromString(name)
                if (componentName != null && TextUtils.equals(pkgName, componentName.packageName)) {
                    return true
                }
            }
        }
        return false
    }
}
