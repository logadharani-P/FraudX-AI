import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './TransactionDetail.css';

// Human-readable anomaly explanations
const ANOMALY_EXPLANATIONS = {
  'Unusual transaction amount detected': 'The transaction amount is unusually high compared with this member\'s previous activity.',
  'Rapid transaction sequence identified': 'Multiple transactions were made in quick succession, which is atypical for this account.',
  'Transaction from unusual location': 'This transaction originated from a location not typically associated with this member\'s activity.',
  'New device used for transaction': 'This transaction was initiated from a device not previously used with this account.',
  'Transaction at unusual time': 'This transaction occurred at an unusual time when the member does not typically transact.',
  'Higher than normal transaction frequency': 'Transaction frequency is significantly higher than the member\'s normal activity pattern.',
  'Suspicious network pattern detected': 'The AI engine detected a suspicious pattern involving linked accounts or recipients.',
  'Suspicious activity detected': 'General suspicious activity flagged by the AI engine based on multiple risk indicators.',
};

function explainAnomaly(factor) {
  return ANOMALY_EXPLANATIONS[factor] || factor;
}

export default function TransactionDetail({ transaction: txn, onClose }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { getAlertForTransaction, getTreatment } = useData();
  if (!txn) return null;

  const isCustomer = user?.role === 'customer';
  const alert = getAlertForTransaction(txn.id);
  const treatment = alert ? getTreatment(alert.id) : null;

  // Determine effective status
  let effectiveStatus = txn.status;
  if (treatment) {
    if (treatment.id === 'block') effectiveStatus = 'Blocked';
    else if (treatment.id === 'whitelist') effectiveStatus = 'Whitelisted';
    else if (treatment.id === 'freeze') effectiveStatus = 'Frozen';
    else if (treatment.id === 'escalate') effectiveStatus = 'Escalated';
    else if (treatment.id === 'monitor') effectiveStatus = 'Enhanced Monitoring';
  }

  const Section = ({ title, children }) => (
    <div className="txn-detail__section">
      <h3 className="txn-detail__section-title">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value, mono }) => (
    <div className="txn-detail__field">
      <span className="txn-detail__field-label">{label}</span>
      <span className={`txn-detail__field-value ${mono ? 'text-mono' : ''}`}>{value}</span>
    </div>
  );

  return (
    <div className="txn-detail-overlay" onClick={onClose}>
      <div className="txn-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        <div className="txn-detail__header">
          <h2 className="txn-detail__title">{t('transactionDetail.title')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>
          </button>
        </div>

        <div className="txn-detail__body">
          <Section title={t('transactionDetail.info')}>
            <Field label="Transaction ID" value={txn.id} mono />
            <Field label="Amount" value={txn.amountFormatted} />
            <Field label="Type" value={txn.type} />
            <Field label="Date" value={txn.date} />
            <Field label="Time" value={txn.time} />
          </Section>

          <Section title={t('transactionDetail.participants')}>
            <Field label="Sender" value={txn.senderName} />
            <Field label="Sender Account" value={txn.senderAccountId} mono />
            <Field label="Sender Bank" value={txn.senderBank} />
            <div className="txn-detail__divider" />
            <Field label="Receiver" value={txn.receiverName} />
            <Field label="Receiver Account" value={txn.receiverAccountId} mono />
            <Field label="Receiver Bank" value={txn.receiverBank} />
          </Section>

          <Section title={t('transactionDetail.locationSection')}>
            <Field label="Recorded Location" value={txn.location} />
            {txn.lat && <Field label="Latitude" value={txn.lat.toFixed(4)} mono />}
            {txn.lng && <Field label="Longitude" value={txn.lng.toFixed(4)} mono />}
            <p className="txn-detail__demo-note">📍 {t('transactionDetail.demoLocation')}</p>
          </Section>

          <Section title={t('transactionDetail.deviceSection')}>
            <Field label="Device" value={txn.device} />
          </Section>

          <Section title={t('transactionDetail.riskAnalysis')}>
            <div className="txn-detail__risk-badge">
              <span className={`badge badge-${txn.riskLevel.toLowerCase()}`}>{txn.riskLevel}</span>
              <span className="txn-detail__risk-score">{txn.riskScore} / 100</span>
            </div>
            <div className="txn-detail__risk-bar">
              <div className="txn-detail__risk-fill" style={{ width: `${txn.riskScore}%`, background: txn.riskScore >= 80 ? 'var(--risk-critical)' : txn.riskScore >= 60 ? 'var(--risk-high)' : txn.riskScore >= 35 ? 'var(--risk-medium)' : 'var(--risk-low)' }} />
            </div>
            {txn.anomalyFactors.length > 0 && (
              <div className="txn-detail__anomalies">
                <span className="txn-detail__field-label">{t('transactionDetail.detectedAnomalies')}</span>
                {txn.anomalyFactors.map((f, i) => (
                  <div key={i} className="txn-detail__anomaly-item" style={{ borderLeft: '3px solid var(--risk-medium, #F59E0B)', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md, 8px)', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 2 }}>⚠️ {f}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>{explainAnomaly(f)}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={t('transactionDetail.statusSection')}>
            <div className="txn-detail__status">
              <span className={`badge badge-${
                effectiveStatus === 'Completed' ? 'success'
                : effectiveStatus === 'Blocked' ? 'critical'
                : effectiveStatus === 'Whitelisted' ? 'low'
                : effectiveStatus === 'Flagged' ? 'high'
                : 'medium'
              }`}>
                {effectiveStatus}
              </span>
            </div>
            {treatment && (
              <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                {treatment.icon} {treatment.label} by {treatment.performedBy || 'System'}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
