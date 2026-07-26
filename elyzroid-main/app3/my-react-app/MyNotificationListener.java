package com.secudroid.app;

import android.R;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/* JADX INFO: loaded from: C:\Users\kobik\Downloads\sms\app\MyNotificationListener.dex */
public class MyNotificationListener extends NotificationListenerService {
    private static final String CHANNEL_ID = "SECUDROID_ALERTS";
    private static final String TAG = "MyNotificationListener";

    @Override // android.service.notification.NotificationListenerService
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn.getPackageName().equals(getPackageName())) {
            return;
        }
        Bundle extras = sbn.getNotification().extras;
        String title = extras.getString("android.title");
        CharSequence text = extras.getCharSequence("android.text");
        if (text != null) {
            String messageBody = text.toString();
            Log.d(TAG, "Notification from " + sbn.getPackageName() + ": " + messageBody);
            if (isMalicious(messageBody)) {
                showAlert(true, "Malicious Message Detected from " + (title != null ? title : "unknown"));
            } else {
                showAlert(false, "Safe Message from " + (title != null ? title : "unknown"));
            }
        }
    }

    private boolean isMalicious(String text) {
        if (text == null) {
            return false;
        }
        String lowercaseText = text.toLowerCase();
        String[] keywords = {"win money", "click link", "free offer", "urgent", "prize"};
        for (String keyword : keywords) {
            if (lowercaseText.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private void showAlert(boolean z, String str) {
        NotificationManager notificationManager = (NotificationManager) getSystemService("notification");
        createNotificationChannel(notificationManager);
        notificationManager.notify((int) System.currentTimeMillis(), new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(R.drawable.ic_dialog_alert).setContentTitle(z ? "⚠️ Malicious Message Detected" : "✅ Safe Message").setContentText(str).setPriority(z ? 1 : 0).setAutoCancel(true).build());
    }

    private void createNotificationChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Security Alerts", 4);
            manager.createNotificationChannel(channel);
        }
    }
}
