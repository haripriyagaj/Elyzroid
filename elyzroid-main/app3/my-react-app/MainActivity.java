package com.secudroid.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

/* JADX INFO: loaded from: C:\Users\kobik\Downloads\sms\app\MainActivity.dex */
public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 101;

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        openNotificationSettings();
        requestAppPermissions();
    }

    public void onResume() {
        super.onResume();
        openNotificationSettings();
    }

    /* JADX WARN: Multi-variable type inference failed */
    private void openNotificationSettings() {
        Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        intent.addFlags(268435456);
        startActivity(intent);
        Toast.makeText((Context) this, (CharSequence) "Opening Notification Access Settings...", 0).show();
    }

    /* JADX WARN: Multi-variable type inference failed */
    private void requestAppPermissions() {
        if (ContextCompat.checkSelfPermission(this, "android.permission.RECEIVE_SMS") != 0 || ContextCompat.checkSelfPermission(this, "android.permission.READ_SMS") != 0) {
            ActivityCompat.requestPermissions(this, new String[]{"android.permission.RECEIVE_SMS", "android.permission.READ_SMS"}, PERMISSION_REQUEST_CODE);
        }
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != 0) {
            ActivityCompat.requestPermissions(this, new String[]{"android.permission.POST_NOTIFICATIONS"}, 102);
        }
    }
}
