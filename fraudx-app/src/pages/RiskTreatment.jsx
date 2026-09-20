import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TREATMENT_OPTIONS = [
  { id: 'block', label: 'Block Transaction', icon: '🚫', desc: 'Block and flag the transaction within FraudX system', severity: 'critical' },
  { id: 'freeze', label: 'Freeze Account', icon: '🧊', desc: 'Temporarily freeze all activity on the associated account in FraudX', severity: 'high' },
  { id: 'escalate', label: 'Escalate to Analyst', icon: '👤', desc: 'Forward to a senior analyst for manual review', severity: 'medium' },
  { id: 'monitor', label: 'Enhanced Monitoring', icon: '👁️', desc: 'Apply enhanced monitoring rules for 30 days', severity: 'low' },
  { id: 'whitelist', label: 'Whitelist', icon: '✅', desc: 'Mark as legitimate and add to trusted patterns', severity: 'info' },
];

export default function RiskTreatment() {
  const { alerts, transactions, applyTreatment, getTreatment } = useData();
  const { user } = useAuth();
  const { t } = useTheme();
  const [notification, setNotification] = useState(null);
  const isCustomer = user?.role === 'customer';

  const highRiskAlerts = (alerts || []).filter(a => a.riskLevel === 'High' || a.riskLevel === 'Critical');

  const handleApplyTreatment = (alertId, treatment) => {
    applyTreatment(alertId, treatment, user?.name || 'System');
    setNotification(`${treatment.label} applied to ${alertId}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Customer should not see this page (route guard handles it), but fallback just in case
  if (isCustomer) {
    return (
      <div className="page-container">
        <div className="page-header animate-fade-in-up">
          <div>
            <h1 className="heading-2">🛡️ {t('nav.riskTreatment')}</h1>
            <p className="text-secondary">You do not have permission to access treatment controls.</p>
          </div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</p>
          <p className="text-secondary">Treatment actions are restricted to analysts and organisation administrators.</p>
        </div>
      </div>
    );
  }

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
          const applied = getTreatment(alert.id);

          // Determine display status
          let displayStatus = null;
          if (applied) {
            if (applied.id === 'block') displayStatus = { label: 'Blocked', icon: '🚫', className: 'badge-critical' };
            else if (applied.id === 'whitelist') displayStatus = { label: 'Whitelisted', icon: '✅', className: 'badge-low' };
            else if (applied.id === 'freeze') displayStatus = { label: 'Frozen', icon: '🧊', className: 'badge-info' };
            else if (applied.id === 'escalate') displayStatus = { label: 'Escalated', icon: '👤', className: 'badge-medium' };
            else if (applied.id === 'monitor') displayStatus = { label: 'Enhanced Monitoring', icon: '👁️', className: 'badge-info' };
            else displayStatus = { label: applied.label, icon: applied.icon, className: 'badge-low' };
          }

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
                {displayStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge ${displayStatus.className}`}>
                      {displayStatus.icon} {displayStatus.label}
                    </span>
                    {applied?.performedBy && (
                      <span className="text-xs text-tertiary">by {applied.performedBy}</span>
                    )}
                  </div>
                )}
              </div>
              {!applied && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TREATMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleApplyTreatment(alert.id, opt)}
                      title={opt.desc}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {applied && (
                <p className="text-xs text-tertiary" style={{ margin: '8px 0 0', fontStyle: 'italic' }}>
                  FraudX system status updated. {applied.id === 'block' ? 'Transaction blocked within FraudX system.' : applied.id === 'whitelist' ? 'Transaction marked as legitimate.' : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
