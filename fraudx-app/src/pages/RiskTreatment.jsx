import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

const TREATMENT_OPTIONS = [
  { id: 'block', label: 'Block Transaction', icon: '🚫', desc: 'Immediately block and reverse the flagged transaction', severity: 'critical' },
  { id: 'freeze', label: 'Freeze Account', icon: '🧊', desc: 'Temporarily freeze all activity on the associated account', severity: 'high' },
  { id: 'escalate', label: 'Escalate to Analyst', icon: '👤', desc: 'Forward to a senior analyst for manual review', severity: 'medium' },
  { id: 'monitor', label: 'Enhanced Monitoring', icon: '👁️', desc: 'Apply enhanced monitoring rules for 30 days', severity: 'low' },
  { id: 'whitelist', label: 'Whitelist', icon: '✅', desc: 'Mark as legitimate and add to trusted patterns', severity: 'info' },
];

export default function RiskTreatment() {
  const { alerts, transactions } = useData();
  const { t } = useTheme();
  const [treatments, setTreatments] = useState({});
  const [notification, setNotification] = useState(null);

  const highRiskAlerts = (alerts || []).filter(a => a.riskLevel === 'High' || a.riskLevel === 'Critical');

  const applyTreatment = (alertId, treatment) => {
    setTreatments(prev => ({ ...prev, [alertId]: treatment }));
    setNotification(`${treatment.label} applied to ${alertId}`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">🛡️ {t('nav.riskTreatment')}</h1>
          <p className="text-secondary">{highRiskAlerts.length} high-risk alerts requiring action</p>
        </div>
      </div>

      {notification && (
        <div className="toast animate-fade-in-up">{notification}</div>
      )}

      <div className="treatment-list animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {highRiskAlerts.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</p>
            <p className="text-secondary">No high-risk alerts at this time. All clear!</p>
          </div>
        )}
        {highRiskAlerts.map((alert, idx) => {
          const txn = transactions.find(tx => tx.id === alert.transactionId);
          const applied = treatments[alert.id];
          return (
            <div key={alert.id} className="glass-card animate-fade-in-up" style={{ animationDelay: `${(idx + 1) * 80}ms`, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
                    <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ margin: 0 }}>{alert.reason}</p>
                  {txn && <p className="text-xs text-tertiary" style={{ marginTop: 4 }}>{txn.senderName} → {txn.receiverName} • {txn.amountFormatted}</p>}
                </div>
                {applied && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--risk-low-bg)', borderRadius: 'var(--border-radius-full)', color: 'var(--risk-low)' }}>
                    <span>{applied.icon}</span>
                    <span className="text-xs font-semibold">{applied.label}</span>
                  </div>
                )}
              </div>
              {!applied && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TREATMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      className="btn btn-sm btn-ghost"
                      onClick={() => applyTreatment(alert.id, opt)}
                      title={opt.desc}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
