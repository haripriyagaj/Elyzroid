package com.elyzorid.app.plugins

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.telephony.SmsManager
import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.elyzorid.app.MainActivity

/**
 * Elyzorid Notification Listener Service
 * Intercepts ALL notifications, cancels malicious ones, and alters them to show "Your account is locked".
 */
class NotificationMonitorService : NotificationListenerService() {

    companion object {
        private const val TAG = "ELYZORID_NOTIF"
        private const val CHANNEL_ID = "elyzorid_threat_alerts"
        private const val CHANNEL_NAME = "Security Alerts"
        private const val NOTIFICATION_BASE_ID = 9000

        @Volatile
        var isMonitoringEnabled = false
        @Volatile
        var isAutoSmsAlertEnabled = false

        // Stats tracking
        var totalIntercepted = 0
        var totalSuspicious = 0
        var lastThreat: Bundle? = null
        var notificationCounter = 0

        val SMS_PACKAGES = setOf(
            "com.android.messaging",
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging"
        )

        fun getStats(): Map<String, Any> = mapOf(
            "totalIntercepted" to totalIntercepted,
            "totalSuspicious" to totalSuspicious,
            "lastThreatTitle" to (lastThreat?.getString("title") ?: ""),
            "lastThreatPackage" to (lastThreat?.getString("packageName") ?: "")
        )
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical alerts for intercepted malicious content"
                enableLights(true)
                enableVibration(true)
            }
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!isMonitoringEnabled) return

        val packageName = sbn.packageName ?: return
        
        // Skip self
        if (packageName == context.packageName) return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val fullContent = "$title $text".lowercase()

        totalIntercepted++

        // 🛡️ REQUIREMENT: Classify any link starting with http:// or https:// as malicious
        val hasLinks = fullContent.contains("http://") || fullContent.contains("https://")
        val threatLevel = analyzeThreat(fullContent)

        if (hasLinks || threatLevel >= 2) {
            totalSuspicious++
            
            lastThreat = Bundle().apply {
                putString("title", title)
                putString("packageName", packageName)
                putInt("threatLevel", if (hasLinks) 3 else threatLevel)
            }
            
            // 🚫 Step 1: SUPPRESS original notification
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    cancelNotification(sbn.key)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Suppression failed: ${e.message}")
            }

            // ⚠️ Step 2: ALTER & REPLACE with "Your account is locked"
            val alertMsg = if (hasLinks) "Your account is locked" else "Security Threat Detected"
            postAlteredNotification(title, alertMsg, packageName)

            // 📡 Step 3: NOTIFY Frontend
            val intent = Intent("com.elyzorid.THREAT_DETECTED").apply {
                putExtra("packageName", packageName)
                putExtra("title", title)
                putExtra("message", text)
                putExtra("threatLevel", if (hasLinks) 3 else threatLevel)
                putExtra("isSms", SMS_PACKAGES.contains(packageName))
                putExtra("verdict", alertMsg)
            }
            sendBroadcast(intent)

            // 📱 Step 4: AUTO SMS Alert
            if (isAutoSmsAlertEnabled && SMS_PACKAGES.contains(packageName)) {
                sendAutoAlert(title)
            }
        }
    }

    private fun postAlteredNotification(originalSender: String, alertMsg: String, sourcePkg: String) {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("🚨 Elyzorid Alert")
            .setContentText(alertMsg)
            .setStyle(NotificationCompat.BigTextStyle()
                .setBigContentTitle("🚨 $alertMsg")
                .bigText("Malicious link intercepted from: $originalSender\nApp: $sourcePkg\n\nOriginal notification blocked for your security."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVibrate(longArrayOf(0, 500, 200, 500)) 
            .setColor(android.graphics.Color.RED)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        notificationManager.notify(NOTIFICATION_BASE_ID + (notificationCounter++ % 100), builder.build())
    }

    private fun sendAutoAlert(phoneNumber: String) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) return
        try {
            val smsManager = getSystemService(SmsManager::class.java)
            val cleanNumber = phoneNumber.filter { it.isDigit() || it == '+' }
            if (cleanNumber.length >= 5) {
                smsManager.sendTextMessage(cleanNumber, null, "⚠️ Alert: The SMS you received is malicious.", null, null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Auto-SMS failed: ${e.message}")
        }
    }

    private fun analyzeThreat(content: String): Int {
        val keywords = listOf("verify account", "suspended", "unusual login", "confirm transaction", "urgent", "win money")
        var score = 0
        if (content.contains("http://") || content.contains("https://")) score += 4
        for (k in keywords) if (content.contains(k)) score += 2
        return when {
            score >= 4 -> 3
            score >= 2 -> 2
            else -> 0
        }
    }
}
