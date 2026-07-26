/**
 * NotificationAlertManager.ts
 * React/TypeScript component to manage notification alerts in Elyzorid
 *
 * Usage:
 * const manager = new NotificationAlertManager();
 * manager.initialize();
 */

import { Capacitor } from '@capacitor/core';
import React from 'react';

// const { NotificationControl } = Plugins;
import { NotificationControlPlugin } from '../services/nativeBridge';

interface ThreatEvent {
  packageName: string;
  title: string;
  message: string;
  threatLevel: 0 | 2 | 3;
  isSms: boolean;
  hasLinks: boolean;  // NEW: Indicates if message contained http/https links
}

interface AlertNotification {
  id: string;
  timestamp: number;
  threat: ThreatEvent;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class NotificationAlertManager {
  private alertHistory: AlertNotification[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private monitoringActive = false;

  /**
   * Initialize the notification alert system
   */
  async initialize(): Promise<void> {
    try {
      // Start monitoring
      const result = await NotificationControlPlugin.startMonitoring();

      if (result.started) {
        this.monitoringActive = true;
        console.log('[Elyzorid] Notification monitoring started');

        // Set up listener for incoming threats
        this.setupThreatListener();
      } else {
        console.warn('[Elyzorid] Notification monitoring failed:', result.error);
      }
    } catch (error) {
      console.error('[Elyzorid] Failed to initialize monitoring:', error);
    }
  }

  /**
   * Listen for threat events from native service
   */
  private setupThreatListener(): void {
    // Listen for native threat events via Capacitor
    const removeListener = Capacitor.addListener('threatDetected', (event: any) => {
      const threat: ThreatEvent = {
        packageName: event.packageName || '',
        title: event.title || '',
        message: event.message || '',
        threatLevel: event.threatLevel || 0,
        isSms: event.isSms || false,
        hasLinks: event.hasLinks || false
      };
      this.handleThreatDetected(threat);
    });

    // Store for cleanup
    (this as any).removeThreatListener = removeListener;
  }

  /**
   * Handle detected threat (when http/https links found)
   */
  private handleThreatDetected(threat: ThreatEvent): void {
    const severity = this.calculateSeverity(threat);

    const alert: AlertNotification = {
      id: `alert_${Date.now()}`,
      timestamp: Date.now(),
      threat,
      severity,
    };

    this.alertHistory.push(alert);

    // Log the threat
    console.log('[Elyzorid Threat Alert]', {
      hasLinks: threat.hasLinks,
      threatLevel: threat.threatLevel,
      from: threat.packageName,
      message: threat.message,
      severity,
    });

    // Emit event to listeners
    this.emit('threat_detected', alert);

    // Handle based on link presence
    if (threat.hasLinks) {
      this.handleSuspiciousLinkAlert(alert);
    }
  }

  /**
   * Handle suspicious link alert
   */
  private handleSuspiciousLinkAlert(alert: AlertNotification): void {
    const { threat } = alert;

    // Show UI alert
    console.warn('[SUSPICIOUS MESSAGE WITH LINKS]', {
      from: threat.packageName,
      title: threat.title,
      message: threat.message,
      timestamp: new Date(alert.timestamp).toLocaleString(),
    });

    // You can show a modal or toast:
    // showToast(`🔗 Suspicious message detected: ${threat.title}`);

    // Or show detailed modal:
    // showSuspiciousMessageModal({
    //   title: threat.title,
    //   message: threat.message,
    //   isSms: threat.isSms,
    //   packageName: threat.packageName,
    // });
  }

  /**
   * Calculate severity based on threat level
   */
  private calculateSeverity(threat: ThreatEvent): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (threat.threatLevel === 3 || (threat.hasLinks && threat.threatLevel >= 2)) {
      return 'HIGH';
    }
    if (threat.threatLevel === 2 || threat.hasLinks) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Enable auto SMS alerts (send warning to sender)
   */
  async enableAutoSmsAlert(): Promise<boolean> {
    try {
      const result = await NotificationControlPlugin.setAutoSmsAlert({ enabled: true });
      return result.success;
    } catch (error) {
      console.error('[Elyzorid] Failed to enable auto SMS alert:', error);
      return false;
    }
  }

  /**
   * Disable auto SMS alerts
   */
  async disableAutoSmsAlert(): Promise<boolean> {
    try {
      const result = await NotificationControlPlugin.setAutoSmsAlert({ enabled: false });
      return result.success;
    } catch (error) {
      console.error('[Elyzorid] Failed to disable auto SMS alert:', error);
      return false;
    }
  }

  /**
   * Get monitoring statistics
   */
  async getStats(): Promise<{
    totalIntercepted: number;
    totalSuspicious: number;
  }> {
    try {
      const result = await NotificationControlPlugin.getStats();
      return {
        totalIntercepted: result.totalIntercepted || 0,
        totalSuspicious: result.totalSuspicious || 0,
      };
    } catch (error) {
      console.error('[Elyzorid] Failed to get stats:', error);
      return { totalIntercepted: 0, totalSuspicious: 0 };
    }
  }

  /**
   * Get all alerts in history
   */
  getAlertHistory(): AlertNotification[] {
    return [...this.alertHistory];
  }

  /**
   * Filter alerts by type
   */
  getAlerts(filter?: {
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    hasLinks?: boolean;
    isSms?: boolean;
  }): AlertNotification[] {
    return this.alertHistory.filter((alert) => {
      if (filter?.severity && alert.severity !== filter.severity) return false;
      if (filter?.hasLinks !== undefined && alert.threat.hasLinks !== filter.hasLinks) return false;
      if (filter?.isSms !== undefined && alert.threat.isSms !== filter.isSms) return false;
      return true;
    });
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(): void {
    this.alertHistory = [];
    console.log('[Elyzorid] Alert history cleared');
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    try {
      const result = await NotificationControlPlugin.stopMonitoring();
      if (result.stopped) {
        this.monitoringActive = false;
        console.log('[Elyzorid] Notification monitoring stopped');
      }
      // Cleanup listener
      (this as any).removeThreatListener?.();
    } catch (error) {
      console.error('[Elyzorid] Failed to stop monitoring:', error);
    }
  }

  /**
   * Event emitter methods
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.monitoringActive;
  }
}

// Export singleton instance
export const notificationAlertManager = new NotificationAlertManager();

/**
 * React Hook for using notification alerts
 *
 * Usage:
 * const { alerts, stats } = useNotificationAlerts();
 */
export function useNotificationAlerts() {
  const [alerts, setAlerts] = React.useState<AlertNotification[]>([]);
  const [stats, setStats] = React.useState({ totalIntercepted: 0, totalSuspicious: 0 });
  const [monitoring, setMonitoring] = React.useState(false);

  React.useEffect(() => {
    // Initialize on mount
    const init = async () => {
      await notificationAlertManager.initialize();
      setMonitoring(notificationAlertManager.isMonitoring());

      // Refresh stats
      const newStats = await notificationAlertManager.getStats();
      setStats(newStats);
    };

    init();

    // Listen for new threats
    const threatListener = (alert: AlertNotification) => {
      setAlerts((prev) => [alert, ...prev]);

      // Also update stats
      notificationAlertManager.getStats().then(setStats);
    };

    notificationAlertManager.on('threat_detected', threatListener);

    return () => {
      notificationAlertManager.off('threat_detected', threatListener);
    };
  }, []);

  return {
    alerts,
    stats,
    monitoring,
    clearHistory: () => {
      notificationAlertManager.clearAlertHistory();
      setAlerts([]);
    },
    suspiciousAlertsOnly: () => alerts.filter((a) => a.threat.hasLinks),
  };
}

/**
 * React Component for displaying alerts
 *
 * Usage:
 * <SuspiciousMessageAlert alert={alert} />
 */
// export const SuspiciousMessageAlert: React.FC<{ alert: AlertNotification }> = ({ alert }) => {
//   return (
//     <div className="alert-card" style={{ borderColor: getSeverityColor(alert.severity) }}>
//       <div className="alert-header">
//         <span className="severity-badge" style={{ backgroundColor: getSeverityColor(alert.severity) }}>
//           {alert.severity}
//         </span>
//         {alert.threat.hasLinks && <span className="link-indicator">🔗 Contains Links</span>}
//       </div>
//
//       <div className="alert-body">
//         <h3>{alert.threat.title}</h3>
//         <p className="message">{alert.threat.message}</p>
//         <p className="meta">
//           From: {alert.threat.packageName} ({alert.threat.isSms ? 'SMS' : 'App'})
//         </p>
//         <p className="timestamp">{new Date(alert.timestamp).toLocaleString()}</p>
//       </div>
//
//       {alert.threat.hasLinks && (
//         <div className="alert-warning">
//           ⚠️ This message is suspicious - Contains links (http/https)
//         </div>
//       )}
//     </div>
//   );
// };

function getSeverityColor(severity: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  const colors = {
    LOW: '#4CAF50',      // Green
    MEDIUM: '#FF9800',   // Orange
    HIGH: '#F44336',     // Red
  };
  return colors[severity];
}

export default NotificationAlertManager;

