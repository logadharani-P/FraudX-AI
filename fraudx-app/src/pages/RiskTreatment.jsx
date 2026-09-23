import React, { useState, useMemo } from 'react';
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

// Error Boundary to prevent any unexpected rendering issue from creating a white screen
class RiskTreatmentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('RiskTreatment ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container">
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderColor: 'var(--risk-critical, #EF4444)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛡️</p>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Risk Treatment Registry Active</h3>
            <p className="text-secondary" style={{ maxWidth: 500, margin: '0 auto 20px' }}>
              A display anomaly was caught and isolated safely. All underlying security treatments and audit logs remain secured.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Reload Treatment Console
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RiskTreatmentContent() {
  const { alerts = [], transactions = [], applyTreatment, getTreatment, loading = false } = useData();
  const { user } = useAuth();
  const { t } = useTheme();

  const [notification, setNotification] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { alert, treatment }
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAlertId, setProcessingAlertId] = useState(null);

  const isCustomer = user?.role === 'customer';

  // Safely filter high-risk alerts with null-safety
  const highRiskAlerts = useMemo(() => {
    if (!Array.isArray(alerts)) return [];
    return alerts.filter(a => {
      if (!a) return false;
      const level = String(a.riskLevel || '').toLowerCase();
      return level === 'high' || level === 'critical';
    });
  }, [alerts]);

  const handleRequestTreatment = (alert, treatment) => {
    if (!alert || !treatment) return;
    setErrorMessage(null);
    setConfirmDialog({ alert, treatment });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog?.alert || !confirmDialog?.treatment) return;
    const { alert, treatment } = confirmDialog;
    
    setIsProcessing(true);
    setProcessingAlertId(alert.id);
    setErrorMessage(null);

    try {
      await applyTreatment(alert.id, treatment, user?.name || 'Authorized Operator');
      setIsProcessing(false);
      setProcessingAlertId(null);
      setConfirmDialog(null);
      setNotification(`✓ ${treatment.label || 'Action'} successfully applied to ${alert.id}. Registry updated.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Treatment application error:', err);
      setIsProcessing(false);
      setProcessingAlertId(null);
      setErrorMessage(`Action could not be completed: ${err?.message || 'Unknown error'}. Interface remains active.`);
    }
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

      {/* Non-blocking Success Toast */}
      {notification && (
        <div className="toast animate-fade-in-up" style={{ zIndex: 10000, background: 'var(--risk-low, #22C55E)', color: '#FFFFFF' }}>
          {notification}
        </div>
      )}

      {/* Non-blocking Error Banner */}
      {errorMessage && (
        <div
          className="animate-fade-in"
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--risk-critical, #EF4444)',
            borderRadius: 10,
            marginBottom: 18,
            fontSize: '0.85rem',
            color: '#F87171',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setErrorMessage(null)}
            style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div style={{ padding: '10px 14px', background: 'rgba(74, 123, 247, 0.08)', border: '1px solid rgba(74, 123, 247, 0.2)', borderRadius: 10, marginBottom: 20, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        ℹ️ <strong>Operator Notice:</strong> All treatment actions update the local FraudX system registry with immutable operator audit trails. Actions persist across sessions.
      </div>

      {loading && (
        <div className="glass-card" style={{ textAlign: 'center', padding: 40, marginBottom: 16 }}>
          <div className="login__access-spinner" style={{ margin: '0 auto 12px' }} />
          <p className="text-secondary text-sm">Loading security telemetry streams...</p>
        </div>
      )}

      <div className="treatment-list animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {!loading && highRiskAlerts.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</p>
            <p className="text-secondary">No high-risk alerts at this time. All telemetry streams are nominal!</p>
          </div>
        )}

        {highRiskAlerts.map((alert, idx) => {
          if (!alert || !alert.id) return null;

          const txn = Array.isArray(transactions) ? transactions.find(tx => tx?.id === alert.transactionId) : null;
          const applied = typeof getTreatment === 'function' ? getTreatment(alert.id) : null;
          const isThisAlertProcessing = isProcessing && processingAlertId === alert.id;

          const sender = txn?.senderName || alert.senderName || 'Member';
          const receiver = txn?.receiverName || alert.receiverName || 'Counterparty';
          const amountDisplay = txn?.amountFormatted || (alert.amount ? `₹${Number(alert.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹84,500.00');

          const riskLevelStr = alert.riskLevel || 'High';
          const riskLevelLower = riskLevelStr.toLowerCase();
          const riskScore = alert.riskScore ?? 85;

          let displayStatus = null;
          if (applied) {
            if (applied.id === 'block') displayStatus = { label: 'Blocked', icon: '🚫', className: 'badge-critical' };
            else if (applied.id === 'whitelist') displayStatus = { label: 'Whitelisted', icon: '✅', className: 'badge-low' };
            else if (applied.id === 'freeze') displayStatus = { label: 'Frozen', icon: '🧊', className: 'badge-info' };
            else if (applied.id === 'escalate') displayStatus = { label: 'Escalated', icon: '👤', className: 'badge-medium' };
            else if (applied.id === 'monitor') displayStatus = { label: 'Enhanced Monitoring', icon: '👁️', className: 'badge-info' };
            else displayStatus = { label: applied.label || 'Treated', icon: applied.icon || '✓', className: 'badge-low' };
          }

          return (
            <div key={alert.id} className="glass-card animate-fade-in-up" style={{ animationDelay: `${(idx + 1) * 80}ms`, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
                    <span className={`badge badge-${riskLevelLower}`}>
                      {riskLevelStr} Risk ({riskScore}/100)
                    </span>
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      • Txn: {alert.transactionId || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {alert.reason || 'High risk transaction pattern flagged for analyst mitigation'}
                  </p>
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

              {/* Action Buttons or Processing State */}
              {!applied && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border-primary, rgba(255,255,255,0.06))', alignItems: 'center' }}>
                  {isThisAlertProcessing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(74, 123, 247, 0.1)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--brand-blue)' }}>
                      <span className="login__access-spinner" style={{ width: 14, height: 14 }} />
                      <span>Applying security mitigation to registry...</span>
                    </div>
                  ) : (
                    TREATMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleRequestTreatment(alert, opt)}
                        title={opt.desc}
                        disabled={isProcessing}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))
                  )}
                </div>
              )}

              {applied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border-primary, rgba(255,255,255,0.06))', flexWrap: 'wrap', gap: 8 }}>
                  <p className="text-xs text-tertiary" style={{ margin: 0, fontStyle: 'italic' }}>
                    🔒 Status: <strong>{applied.label || 'Treated'}</strong> logged in FraudX system registry.
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleRequestTreatment(alert, TREATMENT_OPTIONS[0])}
                    disabled={isProcessing}
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
      {confirmDialog && confirmDialog.alert && confirmDialog.treatment && (
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
              • Operator: <strong>{user?.name || 'Analyst'}</strong> ({user?.role || 'analyst'})<br />
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
                {isProcessing ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className="login__access-spinner" style={{ width: 12, height: 12 }} />
                    Applying Action...
                  </span>
                ) : (
                  'Confirm & Apply'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiskTreatment() {
  return (
    <RiskTreatmentErrorBoundary>
      <RiskTreatmentContent />
    </RiskTreatmentErrorBoundary>
  );
}
