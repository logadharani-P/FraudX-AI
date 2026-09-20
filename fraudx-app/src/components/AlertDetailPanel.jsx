import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './AlertDetailPanel.css';

// Human-readable explanations for technical anomaly phrases
const ANOMALY_EXPLANATIONS = {
  'Unusual transaction amount detected': {
    title: 'Unusual Amount',
    explanation: 'The transaction amount is unusually high compared with this member\'s previous activity and typical patterns.',
  },
  'Rapid transaction sequence identified': {
    title: 'Rapid Successive Transfers',
    explanation: 'Multiple transactions were made in quick succession, which is atypical for this account and may indicate automated or unauthorized activity.',
  },
  'Transaction from unusual location': {
    title: 'Geographic Anomaly',
    explanation: 'This transaction originated from a location not typically associated with this member\'s activity, suggesting potential unauthorized access.',
  },
  'New device used for transaction': {
    title: 'New Device Detected',
    explanation: 'This transaction was initiated from a device that has not been previously associated with this account.',
  },
  'Transaction at unusual time': {
    title: 'Unusual Timing',
    explanation: 'This transaction occurred at an unusual time (e.g., late night or early morning) when the member does not typically transact.',
  },
  'Higher than normal transaction frequency': {
    title: 'Frequency Anomaly',
    explanation: 'The number of transactions from this account within a short period is significantly higher than the member\'s normal activity.',
  },
  'Suspicious network pattern detected': {
    title: 'Network Pattern',
    explanation: 'The AI engine detected a suspicious pattern involving linked accounts or recipients associated with known fraudulent networks.',
  },
  'Suspicious activity detected': {
    title: 'Suspicious Activity',
    explanation: 'General suspicious activity was flagged by the AI engine based on multiple risk indicators.',
  },
};

function getAnomalyExplanation(factor) {
  const entry = ANOMALY_EXPLANATIONS[factor];
  if (entry) return entry;
  // Fallback for unrecognized factors
  return {
    title: 'Detected Anomaly',
    explanation: factor,
  };
}

export default function AlertDetailPanel({ alert, onClose }) {
  const { user } = useAuth();
  const { transactions, getTreatment } = useData();
  if (!alert) return null;

  const txn = transactions.find(t => t.id === alert.transactionId);
  const treatment = getTreatment(alert.id);
  const isCustomer = user?.role === 'customer';

  const riskColor = alert.riskScore >= 80 ? 'var(--risk-critical, #DC2626)'
    : alert.riskScore >= 60 ? 'var(--risk-high, #EF4444)'
    : alert.riskScore >= 35 ? 'var(--risk-medium, #F59E0B)'
    : 'var(--risk-low, #22C55E)';

  const anomalyFactors = txn?.anomalyFactors || [];

  // Determine effective status
  let effectiveStatus = alert.status;
  if (treatment) {
    if (treatment.id === 'block') effectiveStatus = 'Blocked';
    else if (treatment.id === 'whitelist') effectiveStatus = 'Whitelisted';
    else if (treatment.id === 'freeze') effectiveStatus = 'Frozen';
    else if (treatment.id === 'escalate') effectiveStatus = 'Escalated';
    else if (treatment.id === 'monitor') effectiveStatus = 'Enhanced Monitoring';
  }

  const statusBadgeClass = effectiveStatus === 'Blocked' ? 'badge-critical'
    : effectiveStatus === 'Whitelisted' ? 'badge-low'
    : effectiveStatus === 'Frozen' ? 'badge-info'
    : effectiveStatus === 'Escalated' ? 'badge-medium'
    : effectiveStatus === 'Enhanced Monitoring' ? 'badge-info'
    : effectiveStatus === 'Open' ? 'badge-high'
    : 'badge-medium';

  return (
    <div className="alert-detail-overlay" onClick={onClose}>
      <div className="alert-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        <div className="alert-detail__header">
          <h2 className="alert-detail__title">Alert Details</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>
          </button>
        </div>

        <div className="alert-detail__body">
          {/* Alert Information */}
          <div className="alert-detail__section">
            <h3 className="alert-detail__section-title">Alert Information</h3>
            <div className="alert-detail__field">
              <span className="alert-detail__field-label">Alert ID</span>
              <span className="alert-detail__field-value text-mono">{alert.id}</span>
            </div>
            <div className="alert-detail__field">
              <span className="alert-detail__field-label">Category</span>
              <span className="alert-detail__field-value">{alert.category || 'Fraud Detection'}</span>
            </div>
            <div className="alert-detail__field">
              <span className="alert-detail__field-label">Date / Time</span>
              <span className="alert-detail__field-value">{alert.date} {alert.time && `• ${alert.time}`}</span>
            </div>
            <div className="alert-detail__field">
              <span className="alert-detail__field-label">Status</span>
              <span className={`badge ${statusBadgeClass}`}>{effectiveStatus}</span>
            </div>
          </div>

          {/* Transaction Details */}
          {txn && (
            <div className="alert-detail__section">
              <h3 className="alert-detail__section-title">Transaction Details</h3>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Transaction ID</span>
                <span className="alert-detail__field-value text-mono">{txn.id}</span>
              </div>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Amount</span>
                <span className="alert-detail__field-value font-semibold">{txn.amountFormatted}</span>
              </div>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Type / Channel</span>
                <span className="alert-detail__field-value">{txn.type}</span>
              </div>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Sender</span>
                <span className="alert-detail__field-value">{txn.senderName}</span>
              </div>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Receiver</span>
                <span className="alert-detail__field-value">{txn.receiverName}</span>
              </div>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Location</span>
                <span className="alert-detail__field-value">{txn.location}</span>
              </div>
              <div className="alert-detail__field">
                <span className="alert-detail__field-label">Device</span>
                <span className="alert-detail__field-value">{txn.device}</span>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div className="alert-detail__section">
            <h3 className="alert-detail__section-title">Risk Assessment</h3>
            <div className="alert-detail__risk-badge">
              <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel}</span>
              <span className="alert-detail__risk-score">{alert.riskScore} / 100</span>
            </div>
            <div className="alert-detail__risk-bar">
              <div className="alert-detail__risk-fill" style={{ width: `${alert.riskScore}%`, background: riskColor }} />
            </div>
          </div>

          {/* Detected Anomalies with Explanations */}
          {anomalyFactors.length > 0 && (
            <div className="alert-detail__section">
              <h3 className="alert-detail__section-title">Detected Anomalies</h3>
              {anomalyFactors.map((factor, i) => {
                const info = getAnomalyExplanation(factor);
                const severityClass = alert.riskScore >= 80 ? 'alert-detail__anomaly-item--critical'
                  : alert.riskScore >= 60 ? 'alert-detail__anomaly-item--high'
                  : '';
                return (
                  <div key={i} className={`alert-detail__anomaly-item ${severityClass}`}>
                    <span className="alert-detail__anomaly-title">⚠️ {info.title}</span>
                    <span className="alert-detail__anomaly-explain">{info.explanation}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Why This Alert Was Generated */}
          <div className="alert-detail__section">
            <h3 className="alert-detail__section-title">Why This Alert Was Generated</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {alert.description || `The FraudX AI engine flagged this transaction for review based on ${anomalyFactors.length} risk indicator${anomalyFactors.length !== 1 ? 's' : ''}.`}
            </div>
          </div>

          {/* Treatment Status */}
          {treatment && (
            <div className="alert-detail__section">
              <h3 className="alert-detail__section-title">Treatment Applied</h3>
              <div className="alert-detail__treatment-applied">
                <span>{treatment.icon}</span>
                <span>{treatment.label}</span>
                {treatment.performedBy && (
                  <span className="alert-detail__treatment-by">by {treatment.performedBy}</span>
                )}
              </div>
            </div>
          )}

          {/* Evidence */}
          {txn && (
            <div className="alert-detail__section">
              <h3 className="alert-detail__section-title">Evidence Summary</h3>
              <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <p style={{ margin: '0 0 8px' }}>
                  Transaction <strong>{txn.id}</strong> of <strong>{txn.amountFormatted}</strong> was initiated 
                  by <strong>{txn.senderName}</strong> to <strong>{txn.receiverName}</strong> via <strong>{txn.type}</strong> from <strong>{txn.location}</strong>.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  The AI risk engine assigned a score of <strong>{alert.riskScore}/100</strong> ({alert.riskLevel} risk) based on {anomalyFactors.length} detected anomal{anomalyFactors.length !== 1 ? 'ies' : 'y'}.
                </p>
                {txn.isFraud && (
                  <p style={{ margin: 0, color: 'var(--risk-high, #EF4444)' }}>
                    ⚠️ This transaction has been classified as fraudulent by the detection model.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
