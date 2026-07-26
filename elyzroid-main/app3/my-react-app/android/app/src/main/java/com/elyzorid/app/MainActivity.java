package com.elyzorid.app;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.BridgeActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;

// Import Elyzorid plugins
import com.elyzorid.app.plugins.NotificationControlPlugin;
import com.elyzorid.app.plugins.AppBlockerPlugin;
import com.elyzorid.app.plugins.ScanPlugin;

public class MainActivity extends BridgeActivity {
    private static final int SMS_PERMISSION_REQUEST_CODE = 101;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register Elyzorid plugins
        registerPlugin(NotificationControlPlugin.class);
        registerPlugin(AppBlockerPlugin.class);
        registerPlugin(ScanPlugin.class);

        requestRuntimePermissions();
    }

    private void requestRuntimePermissions() {
        String[] permissionsToRequest = new String[0];

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest = new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.SEND_SMS
            };
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            String[] temp = permissionsToRequest;
            permissionsToRequest = new String[temp.length + 1];
            System.arraycopy(temp, 0, permissionsToRequest, 0, temp.length);
            permissionsToRequest[temp.length] = Manifest.permission.POST_NOTIFICATIONS;
        }

        if (permissionsToRequest.length > 0) {
            ActivityCompat.requestPermissions(this, permissionsToRequest, SMS_PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQUEST_CODE) {
            // Log permission results
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    android.util.Log.d("MainActivity", permissions[i] + " granted");
                } else {
                    android.util.Log.w("MainActivity", permissions[i] + " denied");
                }
            }
        }
    }
}
