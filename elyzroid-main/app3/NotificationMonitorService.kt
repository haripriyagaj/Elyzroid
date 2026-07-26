
package com.elyzorid.app.plugins

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.os.Bundle
import android.util.Log

class NotificationMonitorService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {

        val extras: Bundle = sbn.notification.extras

        val title = extras.getString("android.title")
        val text = extras.getString("android.text")

        if (text != null) {
            analyzeMessage(text)
        }
    }

    private fun analyzeMessage(message: String) {

        if (message.contains("click here", true) ||
            message.contains("verify account", true) ||
            message.contains("urgent action", true)
        ) {

            Log.d("ELYZORID", "⚠ Suspicious notification detected: $message")

            // TODO: send alert to React side
        }
    }
}
