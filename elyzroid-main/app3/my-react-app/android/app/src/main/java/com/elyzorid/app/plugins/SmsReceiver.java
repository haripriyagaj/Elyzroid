package com.elyzorid.app.plugins;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;

import androidx.core.app.NotificationCompat;

public class SmsReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "elyzorid_threat_alerts";

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        for (Object pdu : pdus) {
            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
            String messageBody = smsMessage.getMessageBody();
            String sender = smsMessage.getDisplayOriginatingAddress();

            if (messageBody == null || messageBody.trim().isEmpty()) continue;

            boolean malicious = isMalicious(messageBody);
            if (malicious) {
                Intent threatIntent = new Intent("com.elyzorid.THREAT_DETECTED");
                threatIntent.putExtra("packageName", "sms.receiver");
                threatIntent.putExtra("title", "SMS from " + (sender == null ? "unknown" : sender));
                threatIntent.putExtra("message", messageBody);
                threatIntent.putExtra("fullContent", messageBody);
                threatIntent.putExtra("threatLevel", 3);
                threatIntent.putExtra("isSms", true);
                threatIntent.putExtra("timestamp", System.currentTimeMillis());
                context.sendBroadcast(threatIntent);
            }

            showAlert(context, malicious, "From: " + sender + " - " + messageBody);
        }
    }

    private boolean isMalicious(String text) {
        String lowercaseText = text.toLowerCase();
        String[] keywords = {"win money", "click link", "free offer", "urgent", "prize", "verify account", "gift card"};
        for (String keyword : keywords) {
            if (lowercaseText.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private void showAlert(Context context, boolean malicious, String message) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;
        createNotificationChannel(notificationManager);
        notificationManager.notify(
                (int) System.currentTimeMillis(),
                new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_alert)
                        .setContentTitle(malicious ? "Malicious SMS Detected" : "SMS Scanned")
                        .setContentText(message)
                        .setPriority(malicious ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT)
                        .setAutoCancel(true)
                        .build()
        );
    }

    private void createNotificationChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Elyzorid Threat Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            manager.createNotificationChannel(channel);
        }
    }
}
