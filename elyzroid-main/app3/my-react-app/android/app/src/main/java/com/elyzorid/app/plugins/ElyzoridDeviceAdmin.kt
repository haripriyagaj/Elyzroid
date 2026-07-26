package com.elyzorid.app.plugins

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Device Admin Receiver for Elyzorid
 * Required for DevicePolicyManager operations like app blocking.
 */
class ElyzoridDeviceAdmin : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        android.util.Log.d("ELYZORID_ADMIN", "Device admin enabled")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        android.util.Log.d("ELYZORID_ADMIN", "Device admin disabled")
    }
}
