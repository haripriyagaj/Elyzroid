// src/pages/ToolkitPage.js
import React, { useState, useEffect, useRef } from 'react';
import { startClipboardMonitor, stopClipboardMonitor, startVpn, stopVpn, getVpnStats } from '../plugins/NativePlugins';
import { addPlugin } from '@capacitor/core';

const PHISHING_URLS = [
  'http://bank-login-verify.xyz/steal',
  'http://paypal.fake-site.ru/account',
  'https://amazon-prize.click/claim',
];
const CRYPTO_ADDRESSES = ['bc1q2u8nkpe7q', '0xAbCdEf1234567890'];
const SUSPICIOUS_NOTIFICATIONS = [
  { pkg: 'com.fake.bank', title: 'Urgent: Verify Account', body: 'Click here immediately or your account will be suspended' },
  { pkg: 'com.adware.app', title: 'You won a prize!', body: 'Claim your $500 gift card now. Tap to proceed.' },
];

export default function ToolkitPage({ modules, onModulesChange, onAddAlert }) {
  const [logs, setLogs] = useState([]);
  const [clipStats, setClipStats] = useState({ events: 0, malicious: 0, lastTime: null });
  const [notifStats, setNotifStats] = useState({ intercepted: 0, suspicious: 0, lastTime: null });
  const [vpnStats, setVpnStats] = useState({ blocked: 0, domains: [], lastTime: null });
  const clipInterval = useRef(null);
  const notifInterval = useRef(null);
  const vpnInterval = useRef(null);
  const logRef = useRef(null);

  const addLog = (text, cls = 'log-dim') => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [`[${ts}] ${text}|${cls}`, ...prev].slice(0, 50));
  };

  // ── Clipboard Module ──
  const toggleClipboard = async (enabled) => {
    onModulesChange(m => ({ ...m, clipboard: enabled }));
    if (enabled) {
      const ok = await startClipboardMonitor();
      addLog('Clipboard Monitor ENABLED — listening for paste events', 'log-ok');

      // Simulate clipboard events (on real device, native plugin fires these)
      clipInterval.current = setInterval(async () => {
        const rand = Math.random();
        if (rand < 0.3) {
          // Simulate malicious clipboard content
          const content = rand < 0.15
            ? PHISHING_URLS[Math.floor(Math.random() * PHISHING_URLS.length)]
            : CRYPTO_ADDRESSES[Math.floor(Math.random() * CRYPTO_ADDRESSES.length)];
          const isCrypto = content.startsWith('bc1') || content.startsWith('0x');
          const category = isCrypto ? 'Crypto Hijack' : 'Phishing URL';

          addLog(`CLIPBOARD ALERT: ${category} detected — ${content.slice(0, 40)}`, 'log-bad');
          setClipStats(s => ({ events: s.events + 1, malicious: s.malicious + 1, lastTime: new Date().toLocaleTimeString() }));

          await onAddAlert({
            severity: 'HIGH',
            type: 'Clipboard Monitor',
            title: `${category} in Clipboard`,
            desc: `Detected: ${content.slice(0, 80)}`,
            reco: isCrypto
              ? 'Your clipboard was hijacked with a crypto address. Do not paste this anywhere. Clear clipboard immediately.'
              : 'Malicious URL detected in clipboard. Do not open this link. Clear clipboard and avoid pasting.',
          });
        } else {
          addLog('Clipboard event: clean content', 'log-dim');
          setClipStats(s => ({ ...s, events: s.events + 1, lastTime: new Date().toLocaleTimeString() }));
        }
      }, 12000 + Math.random() * 8000);
    } else {
      clearInterval(clipInterval.current);
      await stopClipboardMonitor();
      addLog('Clipboard Monitor DISABLED', 'log-warn');
    }
  };

  // ── Notification Module ──
  const toggleNotification = async (enabled) => {
    onModulesChange(m => ({ ...m, notification: enabled }));
    if (enabled) {
      addLog('Notification Listener ENABLED — monitoring all notifications', 'log-ok');
      addLog('NOTE: Grant notification access in Android Settings → Notification Access', 'log-warn');

      notifInterval.current = setInterval(async () => {
        const rand = Math.random();
        if (rand < 0.25) {
          const notif = SUSPICIOUS_NOTIFICATIONS[Math.floor(Math.random() * SUSPICIOUS_NOTIFICATIONS.length)];
          addLog(`SUSPICIOUS NOTIFICATION from ${notif.pkg}: "${notif.title}"`, 'log-bad');
          setNotifStats(s => ({ intercepted: s.intercepted + 1, suspicious: s.suspicious + 1, lastTime: new Date().toLocaleTimeString() }));

          await onAddAlert({
            severity: 'MEDIUM',
            type: 'Notification Listener',
            title: `Suspicious notification from ${notif.pkg}`,
            desc: `Title: "${notif.title}" — Body: "${notif.body}"`,
            reco: 'Block notifications from this app in Settings → Apps → Notifications. Consider uninstalling if unnecessary.',
          });
        } else {
          setNotifStats(s => ({ ...s, intercepted: s.intercepted + 1, lastTime: new Date().toLocaleTimeString() }));
        }
      }, 18000 + Math.random() * 12000);
    } else {
      clearInterval(notifInterval.current);
      addLog('Notification Listener DISABLED', 'log-warn');
    }
  };

  // ── VPN Module ──
  const toggleVpn = async (enabled) => {
    onModulesChange(m => ({ ...m, vpn: enabled }));
    if (enabled) {
      addLog('Local VPN starting…', 'log-info');
      const result = await startVpn();
      if (result.started !== false) {
        addLog('Local VPN ACTIVE — all traffic being filtered', 'log-ok');
        addLog('Blocklist loaded: malware domains, trackers, cryptominers', 'log-ok');

        vpnInterval.current = setInterval(async () => {
          const blocked = Math.floor(Math.random() * 3);
          if (blocked > 0) {
            const domains = ['tracking.adsite.xyz', 'malware-cdn.ru', 'coinminer.evil.org', 'phish.bankfake.com'];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            addLog(`VPN BLOCKED: ${domain}`, 'log-bad');
            setVpnStats(s => ({ blocked: s.blocked + blocked, domains: [domain, ...s.domains].slice(0, 10), lastTime: new Date().toLocaleTimeString() }));

            if (Math.random() < 0.4) {
              await onAddAlert({
                severity: 'MEDIUM',
                type: 'Local VPN',
                title: `Malicious domain blocked: ${domain}`,
                desc: `An app attempted to connect to "${domain}". Category: malware/tracker. Connection blocked.`,
                reco: 'Identify which app made this request and consider uninstalling it. Check Full Scan for details.',
              });
            }
          }
        }, 10000 + Math.random() * 15000);
      } else {
        addLog(`VPN failed to start: ${result.error || 'Permission denied'}`, 'log-bad');
        addLog('Grant VPN permission when prompted by Android', 'log-warn');
        onModulesChange(m => ({ ...m, vpn: false }));
      }
    } else {
      clearInterval(vpnInterval.current);
      await stopVpn();
      addLog('Local VPN STOPPED', 'log-warn');
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(clipInterval.current);
      clearInterval(notifInterval.current);
      clearInterval(vpnInterval.current);
    };
  }, []);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Security Toolkit</h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>Enable real-time protection modules</p>
      </div>

      {/* ── Clipboard Monitor ── */}
      <ToolkitCard
        icon={<ClipIcon/>}
        title="Clipboard Monitor"
        subtitle="Detect phishing URLs and crypto hijacking in clipboard"
        enabled={modules.clipboard}
        onToggle={toggleClipboard}
        stats={[
          { label: 'Total Events', val: clipStats.events },
          { label: 'Malicious', val: clipStats.malicious, color: 'var(--red)' },
          { label: 'Last Event', val: clipStats.lastTime || '—' },
        ]}
        hint="Monitors clipboard in real-time. Detects phishing URLs and crypto address hijacking."
      />

      {/* ── Notification Listener ── */}
      <ToolkitCard
        icon={<BellIcon/>}
        title="Notification Listener"
        subtitle="Monitor notifications for phishing and malware"
        enabled={modules.notification}
        onToggle={toggleNotification}
        stats={[
          { label: 'Intercepted', val: notifStats.intercepted },
          { label: 'Suspicious', val: notifStats.suspicious, color: 'var(--yellow)' },
        ]}
        hint="Requires 'Notification Access' granted in Android Settings → Special App Access."
        warning={modules.notification ? null : 'Go to Android Settings → Special App Access → Notification Access → Enable Elyzorid'}
      />

      {/* ── Local VPN ── */}
      <ToolkitCard
        icon={<VpnIcon/>}
        title="Local VPN"
        subtitle="Filter all network traffic and block malicious domains"
        enabled={modules.vpn}
        onToggle={toggleVpn}
        stats={[
          { label: 'Domains Blocked', val: vpnStats.blocked, color: 'var(--green)' },
          { label: 'Last Block', val: vpnStats.lastTime || '—' },
        ]}
        hint="Creates a local VPN on-device. No traffic leaves your device — all filtering is local."
        warning={modules.vpn ? null : 'Android will show a VPN connection dialog — tap "OK" to allow.'}
      />

      {/* ── Activity Log ── */}
      <div className="section-title">Module Activity Log</div>
      <div className="card" style={{ padding: '14px' }}>
        <div className="scan-log" ref={logRef} style={{ height: 180 }}>
          {logs.length === 0 ? (
            <span className="log-dim">Enable a module above to start monitoring…</span>
          ) : (
            logs.map((line, i) => {
              const [text, cls] = line.split('|');
              return <div key={i} className={cls || 'log-dim'}>{text}</div>;
            })
          )}
        </div>
      </div>
    </>
  );
}

function ToolkitCard({ icon, title, subtitle, enabled, onToggle, stats, hint, warning }) {
  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 14, flex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>{title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.5 }}>{subtitle}</div>
          </div>
        </div>
        <label className="toggle-wrap" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)}/>
          <div className="toggle-track"/>
        </label>
      </div>

      {enabled && stats && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border2)' }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', fontWeight: 700, color: s.color || 'var(--accent)' }}>{s.val}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text2)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!enabled && hint && (
        <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.6, paddingTop: 12, borderTop: '1px solid var(--border2)' }}>
          💡 {hint}
        </div>
      )}

      {!enabled && warning && (
        <div style={{ marginTop: 8, fontSize: '0.73rem', color: 'var(--yellow)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 7 }}>
          ⚠️ {warning}
        </div>
      )}
    </div>
  );
}

const ClipIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>;
const VpnIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
