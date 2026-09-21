import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TREATMENT_OPTIONS = [
  { id: 'block', label: 'Block Transaction', icon: '🚫', desc: 'Block within FraudX system', severity: 'critical' },
  { id: 'freeze', label: 'Freeze Account', icon: '🧊', desc: 'Temporarily freeze associated account in FraudX', severity: 'high' },
  { id: 'escalate', label: 'Escalate to Senior Analyst', icon: '👤', desc: 'Forward to senior analyst review', severity: 'medium' },
  { id: 'monitor', label: 'Enhanced Monitoring', icon: '👁️', desc: 'Apply enhanced monitoring rules for 30 days', severity: 'low' },
  { id: 'whitelist', label: 'Whitelist Counterparty', icon: '✅', desc: 'Mark as legitimate in FraudX', severity: 'info' },
];

export default function RiskTreatment() {
  const { alerts, transactions, applyTreatment, getTreatment } = useData();
  const { user } = useAuth();
  const { t } = useTheme();

  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { alertId, treatment, alert }
  const [isProcessing, setIsProcessing] = useState(false);

  const isCustomer = user?.role === 'customer';
  const highRiskAlerts = (alerts || []).filter(a => a.riskLevel === 'High' || a.riskLevel === 'Critical');

  const handleRequestTreatment = (alert, treatment) => {
    setConfirmDialog({ alert, treatment });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    const { alert, treatment } = confirmDialog;
    setIsProcessing(true);

    setTimeout(() => {
      applyTreatment(alert.id, treatment, user?.name || 'Authorized Operator');
      setIsProcessing(false);
      setConfirmDialog(null);
      setNotification(`✓ ${treatment.label} applied to ${alert.id}. System registry updated.`);
      setTimeout(() => setNotification(null), 3500);
    }, 400);
  };

  // Customer protection fallback
  if (isCustomer) {
    return (
      <div className="page-container">
        <div className="page-header animate-fade-in-up">
          <div>
            <h1 className="heading-2">🛡️ {t('nav.riskTreatment')}</h1>
            <p className="text-secondary">Risk treatment controls are restricted to authorized fraud analysts.</p>
          </div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</p>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>Access Restricted</h3>
          <p className="text-secondary" style={{ maxWidth: 400, margin: '0 auto' }}>
            Direct mitigation actions (Block Transaction, Freeze Account) require verified Level-2 or Level-3 analyst clearance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">🛡️ {t('nav.riskTreatment')}</h1>
          <p className="text-secondary">Apply system-level risk mitigations, transaction flags, and account holds</p>
        </div>
      </div>

      {notification && (
        <div className="toast animate-fade-in-up" style={{ zIndex: 10000 }}>{notification}</div>
      )}

      {/* Info Banner */}
      <div style={{ padding: '10px 14px', background: 'rgba(74, 123, 247, 0.08)', border: '1px solid rgba(74, 123, 247, 0.2)', borderRadius: 10, marginBottom: 20, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        ℹ️ <strong>Operator Notice:</strong> All treatment actions update the local FraudX system registry with immutable operator audit trails. Actions persist across sessions.
      </div>

      <div className="treatment-list animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {highRiskAlerts.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</p>
            <p className="text-secondary">No high-risk alerts at this time. All telemetry streams are nominal!</p>
          </div>
        )}

        {highRiskAlerts.map((alert, idx) => {
          const txn = transactions.find(tx => tx.id === alert.transactionId);
          const applied = getTreatment(alert.id);

          const sender = txn?.senderName || alert.senderName || 'Member';
          const receiver = txn?.receiverName || alert.receiverName || 'Counterparty';
          const amountDisplay = txn?.amountFormatted || (alert.amount ? `₹${alert.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Amount unavailable');

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
                    <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel} Risk ({alert.riskScore || 85}/100)</span>
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>• Txn: {alert.transactionId}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ margin: 0, color: 'var(--text-primary)' }}>{alert.reason}</p>
                  <p className="text-xs text-tertiary" style={{ marginTop: 4 }}>
                    {sender} → {receiver} • <strong>{amountDisplay}</strong> • Origin: {txn?.location || txn?.city || 'India'}
                  </p>
                </div>

                {displayStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge ${displayStatus.className}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                      {displayStatus.icon} {displayStatus.label}
                    </span>
                    {applied?.performedBy && (
                      <span className="text-xs text-tertiary">by {applied.performedBy}</span>
                    )}
                  </div>
                )}
              </div>

              {!applied && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border-primary, rgba(255,255,255,0.06))' }}>
                  {TREATMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleRequestTreatment(alert, opt)}
                      title={opt.desc}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {applied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border-primary, rgba(255,255,255,0.06))' }}>
                  <p className="text-xs text-tertiary" style={{ margin: 0, fontStyle: 'italic' }}>
                    🔒 Status: <strong>{applied.label}</strong> logged in FraudX system registry.
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleRequestTreatment(alert, TREATMENT_OPTIONS[0])}
                    style={{ fontSize: '0.72rem' }}
                  >
                    Change Treatment ✎
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 20, 0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div className="glass-card animate-fade-in-scale" style={{
            maxWidth: 480,
            width: '100%',
            background: 'var(--bg-card, #121826)',
            border: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
            borderRadius: 'var(--border-radius-xl, 16px)',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>{confirmDialog.treatment.icon}</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Confirm {confirmDialog.treatment.label}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Are you sure you want to apply <strong>{confirmDialog.treatment.label}</strong> to alert <code>{confirmDialog.alert.id}</code> (Transaction <code>{confirmDialog.alert.transactionId}</code>)?
              </p>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary, rgba(255,255,255,0.03))', borderRadius: 8, marginBottom: 20, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              • Operator: <strong>{user?.name}</strong> ({user?.role})<br />
              • Action: {confirmDialog.treatment.desc}<br />
              • Audit Scope: Logged in FraudX security incident registry.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmDialog(null)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmAction}
                disabled={isProcessing}
              >
                {isProcessing ? 'Applying Action...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
