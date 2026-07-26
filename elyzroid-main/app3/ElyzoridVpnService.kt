// android/app/src/main/java/com/elyzorid/plugins/ElyzoridVpnService.kt
// ─────────────────────────────────────────────────────────────
// Local filtering VPN Service.
// Routes all device traffic through a local tunnel and blocks:
//   - Known malware domains
//   - Trackers
//   - Cryptominers
//   - DNS-based malware
// No traffic leaves the device — all filtering is 100% local.
// ─────────────────────────────────────────────────────────────

package com.elyzorid.plugins

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.system.OsConstants
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.ByteBuffer
import java.io.FileInputStream
import java.io.FileOutputStream

class ElyzoridVpnService : VpnService() {

    companion object {
        private var blockedCount = 0
        private val blockedDomainsList = mutableListOf<String>()

        // ── Blocklist — augment with real threat intelligence feeds ──
        val MALWARE_DOMAINS = setOf(
            // Malware C&C
            "malware-phishing.xyz", "botnet-cnc.ru", "evil-payload.org",
            // Trackers
            "tracking.adserver.com", "pixel.spy-tracker.net", "data-harvest.io",
            // Cryptominers
            "coinhive.com", "cryptominer.xyz", "coin-hive.net", "minero.cc",
            // Phishing
            "paypal-verify.fakesite.xyz", "banklogin.phish.ru",
            // Ad fraud
            "click-fraud.biz", "fake-impressions.net",
        )

        fun getStats(): Map<String, Any> = mapOf(
            "blockedCount" to blockedCount,
            "blockedDomains" to blockedDomainsList.toList(),
        )

        fun incrementBlocked(domain: String) {
            blockedCount++
            blockedDomainsList.add(0, domain)
            if (blockedDomainsList.size > 100) blockedDomainsList.removeLast()
        }
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private var running = false
    private var vpnThread: Thread? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        // Build VPN interface
        val builder = Builder()
            .setSession("Elyzorid Security VPN")
            .addAddress("10.0.0.1", 24)          // Virtual network address
            .addRoute("0.0.0.0", 0)               // Route ALL traffic through VPN
            .addDnsServer("8.8.8.8")              // Use Google DNS
            .addDnsServer("1.1.1.1")              // Cloudflare DNS fallback
            .setMtu(1500)
            .addDisallowedApplication(packageName) // Exclude Elyzorid itself from VPN

        try {
            vpnInterface = builder.establish()
        } catch (e: Exception) {
            stopSelf()
            return
        }

        running = true

        // ── Packet processing thread ──
        vpnThread = Thread {
            val vpnFd = vpnInterface?.fileDescriptor ?: return@Thread
            val inputStream = FileInputStream(vpnFd)
            val outputStream = FileOutputStream(vpnFd)
            val buffer = ByteBuffer.allocate(32767)

            while (running) {
                try {
                    buffer.clear()
                    val bytesRead = inputStream.read(buffer.array())
                    if (bytesRead <= 0) continue
                    buffer.limit(bytesRead)

                    // Parse IP packet
                    val packet = buffer.array().copyOf(bytesRead)
                    val action = processPacket(packet)

                    if (action == PacketAction.ALLOW) {
                        // Forward packet (simplified — in production use proper tunneling)
                        outputStream.write(packet)
                    }
                    // BLOCK: packet is dropped (not written back)

                } catch (e: Exception) {
                    if (running) e.printStackTrace()
                }
            }
        }.also { it.start() }
    }

    enum class PacketAction { ALLOW, BLOCK }

    private fun processPacket(packet: ByteArray): PacketAction {
        // ── Simple DNS interception ──
        // DNS queries are UDP port 53. Check if destination is known malware domain.
        try {
            if (packet.size < 20) return PacketAction.ALLOW

            // IP header version (first nibble)
            val version = (packet[0].toInt() and 0xF0) shr 4
            if (version != 4) return PacketAction.ALLOW // Only handle IPv4

            // Protocol (byte 9): 17 = UDP
            val protocol = packet[9].toInt() and 0xFF
            if (protocol != 17) return PacketAction.ALLOW

            val ipHeaderLen = (packet[0].toInt() and 0x0F) * 4
            if (packet.size < ipHeaderLen + 8) return PacketAction.ALLOW

            // Destination port (UDP header bytes 2-3)
            val destPort = ((packet[ipHeaderLen + 2].toInt() and 0xFF) shl 8) or
                    (packet[ipHeaderLen + 3].toInt() and 0xFF)

            if (destPort == 53) {
                // Parse DNS query to extract domain name
                val domain = extractDnsDomain(packet, ipHeaderLen + 8)
                if (domain != null && isDomainBlocked(domain)) {
                    incrementBlocked(domain)
                    broadcastBlockedEvent(domain)
                    return PacketAction.BLOCK
                }
            }
        } catch (e: Exception) { /* ignore parse errors */ }

        return PacketAction.ALLOW
    }

    private fun extractDnsDomain(packet: ByteArray, offset: Int): String? {
        return try {
            // DNS header is 12 bytes after UDP header
            val dnsOffset = offset + 8 // UDP payload
            if (packet.size <= dnsOffset + 12) return null

            var pos = dnsOffset + 12 // Start of DNS question section
            val domain = StringBuilder()

            while (pos < packet.size) {
                val len = packet[pos].toInt() and 0xFF
                if (len == 0) break
                if (domain.isNotEmpty()) domain.append('.')
                domain.append(String(packet, pos + 1, minOf(len, packet.size - pos - 1)))
                pos += len + 1
            }
            domain.toString().lowercase().ifEmpty { null }
        } catch (e: Exception) { null }
    }

    private fun isDomainBlocked(domain: String): Boolean {
        return MALWARE_DOMAINS.any { blocked ->
            domain == blocked || domain.endsWith(".$blocked")
        }
    }

    private fun broadcastBlockedEvent(domain: String) {
        // Broadcast to app via LocalBroadcastManager or Capacitor event
        val intent = Intent("com.elyzorid.VPN_BLOCKED")
        intent.putExtra("domain", domain)
        sendBroadcast(intent)
    }

    override fun onDestroy() {
        running = false
        vpnThread?.interrupt()
        vpnInterface?.close()
        super.onDestroy()
    }
}
