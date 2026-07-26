package com.secudroid.app;

import android.R;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import androidx.core.app.NotificationCompat;

/* JADX INFO: loaded from: C:\Users\kobik\Downloads\sms\app\SmsReceiver.dex */
public class SmsReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "SECUDROID_ALERTS";

    @Override // android.content.BroadcastReceiver
    public void onReceive(Context context, Intent intent) {
        Object[] pdus;
        Bundle bundle = intent.getExtras();
        if (bundle != null && (pdus = (Object[]) bundle.get("pdus")) != null) {
            for (Object pdu : pdus) {
                SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                String messageBody = smsMessage.getMessageBody();
                String sender = smsMessage.getDisplayOriginatingAddress();
                if (isMalicious(messageBody)) {
                    showAlert(context, true, "From: " + sender + " - " + messageBody);
                } else {
                    showAlert(context, false, "From: " + sender + " - " + messageBody);
                }
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

    private void showAlert(Context context, boolean z, String str) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService("notification");
        createNotificationChannel(notificationManager);
        notificationManager.notify((int) System.currentTimeMillis(), new NotificationCompat.Builder(context, CHANNEL_ID).setSmallIcon(R.drawable.ic_dialog_alert).setContentTitle(z ? "⚠️ Malicious Message Detected" : "✅ Safe Message").setContentText(str).setPriority(z ? 1 : 0).setAutoCancel(true).build());
    }

    private void createNotificationChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Security Alerts", 4);
            manager.createNotificationChannel(channel);
        }
    }
}
