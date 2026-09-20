import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './TransactionDetail.css';

export default function TransactionDetail({ transaction: txn, onClose }) {
  const { t } = useTheme();
  if (!txn) return null;

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
            <Field label="Sender" value={txn.senderName || '—'} />
            <Field label="Sender Account" value={txn.senderAccountId || '—'} mono />
            <Field label="Sender Bank" value={txn.senderBank || '—'} />
            <div className="txn-detail__divider" />
            <Field label="Receiver" value={txn.receiverName || '—'} />
            <Field label="Receiver Account" value={txn.receiverAccountId || '—'} mono />
            <Field label="Receiver Bank" value={txn.receiverBank || '—'} />
          </Section>

          <Section title={t('transactionDetail.locationSection')}>
            <Field label="Recorded Location" value={txn.location || (txn.city ? `${txn.city}${txn.state ? `, ${txn.state}` : ''}` : 'N/A')} />
            <Field label="Latitude" value={txn.lat != null && typeof txn.lat === 'number' ? txn.lat.toFixed(4) : (txn.lat != null ? String(txn.lat) : 'N/A')} mono />
            <Field label="Longitude" value={txn.lng != null && typeof txn.lng === 'number' ? txn.lng.toFixed(4) : (txn.lng != null ? String(txn.lng) : 'N/A')} mono />
            <p className="txn-detail__demo-note">📍 Cooperative Transaction Location</p>
          </Section>

          <Section title={t('transactionDetail.deviceSection')}>
            <Field label="Device" value={txn.device || 'Standard Channel'} />
          </Section>

          <Section title={t('transactionDetail.riskAnalysis')}>
            <div className="txn-detail__risk-badge">
              <span className={`badge badge-${txn.riskLevel?.toLowerCase() || 'low'}`}>{txn.riskLevel || 'Low'}</span>
              <span className="txn-detail__risk-score">{txn.riskScore || 0} / 100</span>
            </div>
            <div className="txn-detail__risk-bar">
              <div className="txn-detail__risk-fill" style={{ width: `${Math.min(100, Math.max(0, txn.riskScore || 0))}%`, background: (txn.riskScore || 0) >= 80 ? 'var(--risk-critical)' : (txn.riskScore || 0) >= 60 ? 'var(--risk-high)' : (txn.riskScore || 0) >= 35 ? 'var(--risk-medium)' : 'var(--risk-low)' }} />
            </div>
            {txn.anomalyFactors && txn.anomalyFactors.length > 0 && (
              <div className="txn-detail__anomalies">
                <span className="txn-detail__field-label">{t('transactionDetail.detectedAnomalies')}</span>
                {txn.anomalyFactors.map((f, i) => (
                  <div key={i} className="txn-detail__anomaly-item">⚠️ {f}</div>
                ))}
              </div>
            )}
          </Section>

          <Section title={t('transactionDetail.statusSection')}>
            <div className="txn-detail__status">
              <span className={`badge badge-${(txn.status || '').toLowerCase() === 'completed' ? 'success' : (txn.status || '').toLowerCase() === 'flagged' ? 'high' : 'medium'}`}>
                {txn.status ? txn.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Completed'}
              </span>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
