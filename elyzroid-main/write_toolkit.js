const fs = require('fs');

const content = `import { useState, useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonButton, IonBadge, IonCard, IonCardContent } from '@ionic/react';
import { clipboard, notifications, shield, time } from 'ionicons/icons';
import {
  startNotificationMonitor,
  stopNotificationMonitor,
  getNotificationStats,
  openNotificationSettings,
  isNotificationAccessEnabled,
  startClipboardMonitor,
  getInstalledApps,
} from '../services/nativeBridge';

const Toolkit = ({ modules, onToggle, toolkitLogs }) => {
  const [apkScanResults, setApkScanResults] = useState(null);
  const [notifStats, setNotifStats] = useState({ totalIntercepted: 0, totalSuspicious: 0, lastThreatTitle: '' });
  const [notifAccessEnabled, setNotifAccessEnabled] = useState(false);

  const toolList = [
    { key: 'clipboard', icon: clipboard, title: 'Clipboard Monitor', sub: 'Intercept malicious clipboard activity', color: 'warning' },
    { key: 'notification', icon: notifications, title: 'Notification Listener', sub: 'Monitor notifications for phishing/malware', color: 'secondary' },
    { key: 'vpn', icon: shield, title: 'Local VPN', sub: 'Route traffic through local VPN for filtering', color: 'success' },
  ];

  const getStatusColor = (active) => active ? 'var(--ely-green)' : 'var(--ely-text2)';
  const getStatusText = (active) => active ? 'Active' : 'Disabled';

  useEffect(() => {
    let interval;
    if (modules.notification) {
      interval = setInterval(async () => {
        const stats = await getNotificationStats();
        setNotifStats(stats);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [modules.notification]);

  useEffect(() => {
    const checkAccess = async () => {
      const result = await isNotificationAccessEnabled();
      setNotifAccessEnabled(result.enabled);
    };
    checkAccess();
  }, []);

  const handleToggleNotification = async (enabled) => {
    onToggle('notification', enabled);
    if (enabled) {
      const result = await startNotificationMonitor();
      console.log('Notification monitor result:', result);
    } else {
      await stopNotificationMonitor();
    }
  };

  const handleOpenNotificationSettings = async () => {
    await openNotificationSettings();
  };

  const handleStartClipboard = async () => {
    await startClipboardMonitor();
  };

  const runApkRiskScan = async () => {
    try {
      const apps = await getInstalledApps();
      const scored = apps.map(app => {
        const permCount = app.permissions?.length || 0;
        const hasSms = app.permissions?.some(p => String(p).includes('SMS')) || false;
        const hasBoot = app.permissions?.some(p => String(p).includes('BOOT')) || false;
        const score = Math.min(1.0, (permCount * 0.05) + (hasSms ? 0.3 : 0) + (hasBoot ? 0.2 : 0));
        return { ...app, score, engine: 'heuristic' };
      });
      const sorted = scored.sort((a, b) => b.score - a.score).slice(0, 10);
      setApkScanResults({ totalCount: apps.length, topApps: sorted });
    } catch (err) {
      console.warn('APK risk scan failed', err);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>Security Toolkit</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen color="dark">
        <div style={{ padding: '16px' }}>
          <p style={{ color: 'var(--ely-text2)', fontSize: '0.8rem', marginBottom: '20px' }}>
            Enable real-time monitoring and protection modules
          </p>

          <h3 style={{ color: 'var(--ely-text2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            Monitoring Modules
          </h3>

          <IonCard color="dark" style={{ border: '1px solid var(--ely-border)', borderRadius: '14px' }}>
            <IonList lines="none" color="dark">
              {toolList.map((tool, index) => (
                <IonItem
                  key={tool.key}
                  color="dark"
                  style={{
                    padding: '12px 0',
                    borderBottom: index < toolList.length - 1 ? '1px solid var(--ely-border)' : 'none'
                  }}
                >
                  <div slot="start" style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '11px',
                    background: 'rgba(var(--ion-color-' + tool.color + '-rgb), 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '14px'
                  }}>
                    <IonIcon icon={tool.icon} color={tool.color} style={{ fontSize: '20px' }} />
                  </div>
                  <IonLabel>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px' }}>
                      {tool.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ely-text2)', marginBottom: '4px' }}>
                      {tool.sub}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: getStatusColor(modules[tool.key]),
                      fontFamily: 'var(--mono)'
                    }}>
                      Status: <span style={{ color: getStatusColor(modules[tool.key]) }}>{getStatusText(modules[tool.key])}</span>
                    </div>
                    {tool.key === 'notification' && modules.notification && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--ely-text2)', marginTop: '4px' }}>
                        Intercepted: {notifStats.totalIntercepted} | Suspicious: {notifStats.totalSuspicious}
                        {notifStats.lastThreatTitle && (
                          <div style={{ color: 'var(--ely-red)' }}>Last: {notifStats.lastThreatTitle}</div>
                        )}
                      </div>
                    )}
                  </IonLabel>
                  <IonToggle
                    slot="end"
                    checked={modules[tool.key]}
                    onIonChange={(e) => {
                      if (tool.key === 'notification') {
                        handleToggleNotification(e.detail.checked);
                      } else {
                        onToggle(tool.key, e.detail.checked);
                      }
                    }}
                    color="primary"
                  />
                </IonItem>
              ))}
            </IonList>
          </IonCard>

          {!notifAccessEnabled && (
            <IonButton expand="block" onClick={handleOpenNotificationSettings} style={{ marginTop: '16px' }} color="warning">
              Grant Notification Access
            </IonButton>
          )}

          <IonButton expand="block" onClick={handleStartClipboard} style={{ marginTop: '16px' }}>
            Start Clipboard Monitoring
          </IonButton>

          <h3 style={{ color: 'var(--ely-text2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '24px', marginBottom: '12px' }}>
            APK Risk Scan
          </h3>

          <IonCard color="dark" style={{ border: '1px solid var(--ely-border)', borderRadius: '14px', marginBottom: '16px' }}>
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ color: 'var(--ely-text2)', fontSize: '0.8rem' }}>
                  Run an on-device scan of installed apps and score them using Elyzorid's ML/rule engine.
                </div>
                <IonButton size="small" color="primary" onClick={runApkRiskScan}>
                  Run APK Risk Scan
                </IonButton>
              </div>

              {apkScanResults && (
                <div style={{ fontSize: '0.8rem', color: 'var(--ely-text2)' }}>
                  <div style={{ marginBottom: '8px' }}>
                    Analyzed <strong>{apkScanResults.totalCount}</strong> apps. Showing top {apkScanResults.topApps.length} by risk score.
                  </div>
                  <div style={{ maxHeight: '240px', overflow: 'auto' }}>
                    {apkScanResults.topApps.map((app) => (
                      <div
                        key={app.packageName}
                        style={{
                          padding: '8px 6px',
                          borderRadius: '6px',
                          background: 'var(--ely-surface2)',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600 }}>{app.label || app.packageName}</div>
                          <IonBadge color={app.score >= 0.9 ? 'danger' : app.score >= 0.75 ? 'warning' : 'success'}>
                            {Math.round((app.score || 0) * 100)}%
                          </IonBadge>
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{app.packageName}</div>
                        <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                          {app.isSystemApp ? 'System app · ' : ''}
                          APK size: {app.apkSizeMb?.toFixed(2)} MB · Engine: {app.engine}
                        </div>
                    ))}
                  </div>
              )}
            </IonCardContent>
          </IonCard>

          <h3 style={{ color: 'var(--ely-text2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '24px', marginBottom: '12px' }}>
            Module Activity Log
          </h3>

          <IonCard color="dark" style={{ border: '1px solid var(--ely-border)', borderRadius: '14px' }}>
            <IonCardContent>
              {toolkitLogs.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  color: 'var(--ely-text2)',
                  fontSize: '0.85rem'
                }}>
                  <IonIcon icon={time} style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }} />
                  <div>No activity yet. Enable a module above.</div>
              ) : (
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.75rem',
                  color: 'var(--ely-text2)',
                  lineHeight: 1.8,
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  {toolkitLogs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: '8px',
                        padding: '8px',
                        background: 'var(--ely-surface2)',
                        borderRadius: '6px'
                      }}
                      dangerouslySetInnerHTML={{ __html: log }}
                    />
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Toolkit;
`;

fs.writeFileSync('d:/app4/app3/my-react-app/src/pages/Toolkit.jsx', content, 'utf8');
console.log('Toolkit.jsx written successfully');
