import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { playNotificationSound, playCriticalAlertSound } from '../utils/soundEffects';

const NotificationContext = createContext(null);

const INITIAL_SECURITY_EVENTS = [
  {
    id: 'SEC-EVT-90041',
    type: 'authentication',
    action: 'Analyst Authentication Succeeded',
    severity: 'Low',
    timestamp: '10:42:15 AM',
    date: '2026-09-20',
    user: 'Priya Iyer (ANL-200001)',
    role: 'analyst',
    sourceIp: '192.168.1.104',
    sourceDevice: 'Chrome 128 / macOS Sequoia',
    status: 'Verified',
    description: 'Successful primary credential verification and Level-3 session initiation.',
    reviewAction: 'No action required. Standard session initiation.'
  },
  {
    id: 'SEC-EVT-90042',
    type: 'mfa',
    action: 'MFA Code Verified',
    severity: 'Low',
    timestamp: '10:42:30 AM',
    date: '2026-09-20',
    user: 'Priya Iyer (ANL-200001)',
    role: 'analyst',
    sourceIp: '192.168.1.104',
    sourceDevice: 'Authenticator Multi-Factor',
    status: 'Verified',
    description: 'Time-based one-time password matched registered credentials.',
    reviewAction: 'Session token granted with 8-hour expiry.'
  },
  {
    id: 'SEC-EVT-90043',
    type: 'security_alert',
    action: 'Suspicious Authentication Velocity',
    severity: 'High',
    timestamp: '10:48:12 AM',
    date: '2026-09-20',
    user: 'System Monitor',
    role: 'system',
    sourceIp: '103.24.88.19',
    sourceDevice: 'Automated Client / Unknown User Agent',
    status: 'Pending Review',
    description: 'Multiple failed credential attempts detected from foreign IP block in a 60-second window.',
    reviewAction: 'Verify IP blocklist rules and confirm target account lockout status.'
  },
  {
    id: 'SEC-EVT-90044',
    type: 'session',
    action: 'Organisation Admin Session Active',
    severity: 'Low',
    timestamp: '11:15:00 AM',
    date: '2026-09-20',
    user: 'Vikram Mehta (ORG-300001)',
    role: 'organisation',
    sourceIp: '172.16.0.45',
    sourceDevice: 'Firefox 130 / Windows 11 Enterprise',
    status: 'Verified',
    description: 'Organisation administration session active with elevated compliance permissions.',
    reviewAction: 'Normal administrative monitoring.'
  },
  {
    id: 'SEC-EVT-90045',
    type: 'mfa',
    action: 'MFA Verification Failed (Invalid Code)',
    severity: 'Medium',
    timestamp: '11:30:22 AM',
    date: '2026-09-20',
    user: 'Unknown / Demo Check',
    role: 'unknown',
    sourceIp: '49.207.180.12',
    sourceDevice: 'Mobile Safari / iOS 18',
    status: 'Flagged',
    description: 'Single incorrect MFA attempt recorded before correct token submission.',
    reviewAction: 'Monitor for sequential failure spikes on this endpoint.'
  }
];

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { alerts, transactions } = useData();

  // Audio settings
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('fraudx-sound-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [criticalSoundEnabled, setCriticalSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('fraudx-critical-sound-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('fraudx-sound-muted') === 'true');

  // Notification preferences
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem('fraudx-notif-channels');
    return saved ? JSON.parse(saved) : {
      inApp: true,
      email: false,
      sms: false,
      push: false,
      securityAlerts: true,
    };
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('fraudx-notif-categories');
    return saved ? JSON.parse(saved) : {
      criticalFraud: true,
      highRiskTxn: true,
      securityAlerts: true,
      loginAlerts: true,
      mfaAlerts: true,
      systemNotifications: false,
      investigationUpdates: true,
    };
  });

  // Read state mapping: notificationId -> boolean
  const [readMap, setReadMap] = useState(() => {
    try {
      const saved = localStorage.getItem('fraudx-read-notifications');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Security Events state
  const [securityEvents, setSecurityEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('fraudx-security-events');
      return saved ? JSON.parse(saved) : INITIAL_SECURITY_EVENTS;
    } catch {
      return INITIAL_SECURITY_EVENTS;
    }
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('fraudx-sound-enabled', soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('fraudx-critical-sound-enabled', criticalSoundEnabled.toString());
  }, [criticalSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('fraudx-sound-muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('fraudx-notif-channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('fraudx-notif-categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('fraudx-read-notifications', JSON.stringify(readMap));
  }, [readMap]);

  useEffect(() => {
    localStorage.setItem('fraudx-security-events', JSON.stringify(securityEvents));
  }, [securityEvents]);

  // Combine fraud alerts and security events into unified notification feed
  const notifications = useMemo(() => {
    const isCustomer = user?.role === 'customer';
    const items = [];

    // 1. Fraud alerts from DataContext
    if (alerts && alerts.length > 0) {
      alerts.forEach(alert => {
        const txn = transactions?.find(t => t.id === alert.transactionId);
        
        // If customer, only show if transaction belongs to this customer
        if (isCustomer) {
          if (!txn || (txn.senderName !== user?.name && txn.receiverName !== user?.name)) {
            return;
          }
        }

        const isCritical = alert.riskLevel === 'Critical' || alert.riskScore >= 80;
        const isHigh = alert.riskLevel === 'High';

        // Check category filtering
        if (isCritical && !categories.criticalFraud) return;
        if (isHigh && !categories.highRiskTxn) return;

        items.push({
          id: alert.id,
          type: 'fraud',
          title: `High-Risk Transaction Detected`,
          subtitle: `${alert.transactionId} • ${txn?.amountFormatted || ''}`,
          reason: alert.reason,
          riskScore: alert.riskScore,
          riskLevel: alert.riskLevel,
          timestamp: alert.date || 'Recent',
          date: alert.date,
          transactionId: alert.transactionId,
          isCritical,
          read: !!readMap[alert.id],
          raw: alert,
        });
      });
    }

    // 2. Security alerts (Only for Analyst & Organisation roles)
    if (!isCustomer && categories.securityAlerts) {
      securityEvents.forEach(evt => {
        const isCritical = evt.severity === 'Critical';
        items.push({
          id: evt.id,
          type: 'security',
          title: evt.action,
          subtitle: `${evt.user} • ${evt.sourceIp}`,
          reason: evt.description,
          riskScore: evt.severity === 'Critical' ? 95 : evt.severity === 'High' ? 75 : evt.severity === 'Medium' ? 45 : 15,
          riskLevel: evt.severity,
          timestamp: evt.timestamp,
          date: evt.date,
          status: evt.status,
          isCritical,
          read: !!readMap[evt.id],
          raw: evt,
        });
      });
    }

    return items;
  }, [alerts, transactions, securityEvents, user, categories, readMap]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markAsRead = useCallback((id) => {
    setReadMap(prev => ({ ...prev, [id]: true }));
  }, []);

  const markAllAsRead = useCallback(() => {
    const updated = {};
    notifications.forEach(n => {
      updated[n.id] = true;
    });
    setReadMap(prev => ({ ...prev, ...updated }));
  }, [notifications]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const logSecurityEvent = useCallback((eventData) => {
    const newEvent = {
      id: `SEC-EVT-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      status: 'Verified',
      ...eventData,
    };
    setSecurityEvents(prev => [newEvent, ...prev]);

    // Audio cue if enabled and not muted
    if (!isMuted) {
      if ((newEvent.severity === 'High' || newEvent.severity === 'Critical') && criticalSoundEnabled) {
        playCriticalAlertSound();
      } else if (soundEnabled) {
        playNotificationSound();
      }
    }
  }, [isMuted, criticalSoundEnabled, soundEnabled]);

  const updateSecurityEventStatus = useCallback((eventId, newStatus) => {
    setSecurityEvents(prev => prev.map(evt => evt.id === eventId ? { ...evt, status: newStatus } : evt));
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    soundEnabled,
    setSoundEnabled,
    criticalSoundEnabled,
    setCriticalSoundEnabled,
    isMuted,
    toggleMute,
    channels,
    setChannels,
    categories,
    setCategories,
    securityEvents,
    logSecurityEvent,
    updateSecurityEventStatus,
    playNotificationSound: () => {
      if (!isMuted && soundEnabled) playNotificationSound();
    },
    playCriticalAlertSound: () => {
      if (!isMuted && criticalSoundEnabled) playCriticalAlertSound();
    },
  }), [
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    soundEnabled,
    criticalSoundEnabled,
    isMuted,
    toggleMute,
    channels,
    categories,
    securityEvents,
    logSecurityEvent,
    updateSecurityEventStatus
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export default NotificationContext;
