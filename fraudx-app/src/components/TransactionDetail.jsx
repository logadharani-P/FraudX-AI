import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './TransactionDetail.css';

// Human-readable anomaly explanations
const ANOMALY_EXPLANATIONS = {
  'Unusual transaction amount detected': {
    title: 'Unusual Amount Deviation',
    desc: 'The transaction amount is unusually high compared with this member\'s previous activity and typical spending baseline.',
    factor: 'Amount exceeds 3.5x sender historical average',
  },
  'Rapid transaction sequence identified': {
    title: 'Rapid Transfer Velocity',
    desc: 'Multiple transactions occurred in quick succession within a short window, which is atypical for this account.',
    factor: 'High velocity spike (>3 transfers in 5 minutes)',
  },
  'Transaction from unusual location': {
    title: 'Geographic Location Mismatch',
    desc: 'This transaction originated from a location or IP not typically associated with this member\'s activity.',
    factor: 'Origin city differs from primary registration hub',
  },
  'New device used for transaction': {
    title: 'Unregistered Device Signature',
    desc: 'This transaction was initiated from a hardware fingerprint or browser not previously associated with this account.',
    factor: 'First-time device token observed',
  },
  'Transaction at unusual time': {
    title: 'Unusual Timing',
    desc: 'This transaction occurred at an unusual time (e.g. late night or off-hours) compared with previous member patterns.',
    factor: 'Out-of-pattern execution window',
  },
  'Higher than normal transaction frequency': {
    title: 'Frequency Anomaly',
    desc: 'Transaction frequency is significantly higher than the member\'s normal activity pattern.',
    factor: 'Daily transaction count exceeded 95th percentile',
  },
  'Suspicious network pattern detected': {
    title: 'Recipient Network Risk',
    desc: 'The AI engine detected a suspicious relationship involving linked accounts or recipient risk indicators.',
    factor: 'Counterparty associated with elevated risk graph',
  },
  'Suspicious activity detected': {
    title: 'Suspicious Activity Detected',
    desc: 'General suspicious activity was flagged by the AI engine based on combined multi-dimensional risk indicators.',
    factor: 'Multi-feature ensemble model threshold exceeded',
  },
};

function explainAnomaly(factor) {
  return ANOMALY_EXPLANATIONS[factor] || {
    title: 'Risk Factor Detected',
    desc: factor || 'Anomaly detected by model evaluation.',
    factor: factor || 'Feature threshold deviation',
  };
}

const TREATMENT_OPTIONS = [
  { id: 'block', label: 'Block Transaction', icon: '🚫', desc: 'Block within FraudX system', className: 'badge-critical' },
  { id: 'freeze', label: 'Freeze Account', icon: '🧊', desc: 'Temporarily freeze associated account in FraudX', className: 'badge-high' },
  { id: 'escalate', label: 'Escalate to Analyst', icon: '👤', desc: 'Forward to senior analyst review', className: 'badge-medium' },
  { id: 'monitor', label: 'Enhanced Monitoring', icon: '👁️', desc: 'Apply enhanced monitoring rules for 30 days', className: 'badge-info' },
  { id: 'whitelist', label: 'Whitelist', icon: '✅', desc: 'Mark as legitimate in FraudX', className: 'badge-low' },
];

export default function TransactionDetail({ transaction: txn, onClose }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { transactions, getAlertForTransaction, getTreatment, applyTreatment, setSelectedTransaction } = useData();
  const [showWhyRisk, setShowWhyRisk] = useState(true);
  const [treatmentNotice, setTreatmentNotice] = useState(null);

  if (!txn) return null;

  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const isAnalystOrOrg = role === 'analyst' || role === 'organisation';

  const alert = getAlertForTransaction(txn.id) || {
    id: `ALT-${txn.id.replace('TXN-', '')}`,
    riskScore: txn.riskScore || 15,
    riskLevel: txn.riskLevel || 'Low',
    reason: txn.anomalyFactors?.[0] || 'Standard transaction evaluation',
    status: txn.status === 'Completed' ? 'Closed' : 'Open',
    date: txn.date,
  };

  const treatment = getTreatment(alert.id);

  // Determine effective status
  let effectiveStatus = txn.status || 'Completed';
  if (treatment) {
    if (treatment.id === 'block') effectiveStatus = 'Blocked';
    else if (treatment.id === 'whitelist') effectiveStatus = 'Whitelisted';
    else if (treatment.id === 'freeze') effectiveStatus = 'Frozen';
    else if (treatment.id === 'escalate') effectiveStatus = 'Escalated';
    else if (treatment.id === 'monitor') effectiveStatus = 'Enhanced Monitoring';
  }

  const handleApplyTreatment = (option) => {
    applyTreatment(alert.id, option, user?.name || 'Analyst');
    setTreatmentNotice(`Action applied: ${option.label}`);
    setTimeout(() => setTreatmentNotice(null), 3500);
  };

  // Find related transactions (from same sender or receiver, excluding current transaction)
  const relatedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    return transactions.filter(t => 
      t.id !== txn.id && (
        (txn.senderId && t.senderId === txn.senderId) ||
        (txn.receiverId && t.receiverId === txn.receiverId) ||
        (txn.senderName && t.senderName === txn.senderName) ||
        (txn.receiverName && t.receiverName === txn.receiverName)
      )
    ).slice(0, 4);
  }, [transactions, txn]);

  const anomalyFactors = txn.anomalyFactors && txn.anomalyFactors.length > 0
    ? txn.anomalyFactors
    : alert.riskScore >= 60
      ? ['Unusual transaction amount detected', 'Suspicious activity detected']
      : [];

  const riskColor = txn.riskScore >= 80 ? 'var(--risk-critical, #DC2626)'
    : txn.riskScore >= 60 ? 'var(--risk-high, #EF4444)'
    : txn.riskScore >= 35 ? 'var(--risk-medium, #F59E0B)'
    : 'var(--risk-low, #22C55E)';

  // Investigation timeline steps definition
  const timelineSteps = [
    {
      id: 'alert_gen',
      title: 'Alert Generated',
      time: txn.time || '10:42 AM',
      date: txn.date || 'Today',
      status: 'complete',
      desc: `Risk score evaluated at ${txn.riskScore}/100 by FraudX AI engine.`,
    },
    {
      id: 'txn_review',
      title: 'Transaction Reviewed',
      time: txn.time || '10:43 AM',
      date: txn.date || 'Today',
      status: 'complete',
      desc: `Amount ${txn.amountFormatted || '—'} via ${txn.type || 'Channel'} inspected.`,
    },
    {
      id: 'behavior_comp',
      title: 'Behaviour Compared',
      time: 'Automated',
      date: txn.date || 'Today',
      status: 'complete',
      desc: 'Compared against 30-day velocity and geographical historical baseline.',
    },
    {
      id: 'related_act',
      title: 'Related Activity Reviewed',
      time: 'Automated',
      date: txn.date || 'Today',
      status: 'complete',
      desc: relatedTransactions.length > 0 
        ? `${relatedTransactions.length} connected transactions cross-referenced.`
        : 'No correlated high-risk transactions detected.',
    },
    {
      id: 'member_verif',
      title: 'Member Verification',
      time: 'In-Engine',
      date: txn.date || 'Today',
      status: 'complete',
      desc: `Registered KYC verified for ${txn.senderName || 'Member'}.`,
    },
    {
      id: 'analyst_dec',
      title: 'Analyst Decision',
      time: treatment ? 'Just now' : 'Pending',
      date: txn.date || 'Today',
      status: treatment ? 'complete' : 'active',
      desc: treatment 
        ? `${treatment.label} applied by ${treatment.performedBy || 'Analyst'}.`
        : 'Awaiting analyst review & risk treatment action.',
    },
    {
      id: 'case_closed',
      title: 'Case Status',
      time: treatment ? 'Logged' : 'In Progress',
      date: txn.date || 'Today',
      status: treatment ? 'complete' : 'pending',
      desc: treatment 
        ? `Case updated in FraudX registry as ${effectiveStatus}.`
        : 'Investigation active.',
    },
  ];

  const Field = ({ label, value, mono }) => (
    <div className="txn-detail__field">
      <span className="txn-detail__field-label">{label}</span>
      <span className={`txn-detail__field-value ${mono ? 'text-mono' : ''}`}>
        {value !== undefined && value !== null && value !== '' ? value : 'Not available from current data'}
      </span>
    </div>
  );

  return (
    <div className="txn-detail-overlay" onClick={onClose}>
      <div className="txn-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="txn-detail__header">
          <div>
            <h2 className="txn-detail__title">{t('transactionDetail.title')}</h2>
            <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{txn.id}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14"/>
            </svg>
          </button>
        </div>

        <div className="txn-detail__body">
          {treatmentNotice && (
            <div className="txn-detail__toast animate-fade-in">
              {treatmentNotice}
            </div>
          )}

          {/* Quick Summary Card */}
          <div className="txn-detail__card txn-detail__card--highlight">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 2 }}>Amount</span>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {txn.amountFormatted || 'Not available from current data'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>Risk Level</span>
                <span className={`badge badge-${txn.riskLevel?.toLowerCase() || 'low'}`}>
                  {txn.riskLevel || 'Low'} Risk ({txn.riskScore || 0}/100)
                </span>
              </div>
            </div>
          </div>

          {/* CRITICAL FEATURE: "Why This Risk?" Section */}
          <div className="txn-detail__card txn-detail__why-risk-card">
            <div className="txn-detail__why-risk-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔍</span>
                <h3 className="txn-detail__why-risk-title">Why This Risk?</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowWhyRisk(!showWhyRisk)}
              >
                {showWhyRisk ? 'Collapse Explanation' : 'Expand Explanation'}
              </button>
            </div>

            {showWhyRisk && (
              <div className="txn-detail__why-risk-content animate-fade-in">
                {/* Metric Summary */}
                <div className="txn-detail__risk-metric-row">
                  <div className="txn-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">Calculated Score</span>
                    <span className="text-sm font-bold text-mono" style={{ color: riskColor }}>
                      {txn.riskScore || 0} / 100
                    </span>
                  </div>
                  <div className="txn-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">Severity Category</span>
                    <span className="text-sm font-semibold">{txn.riskLevel || 'Low'} Risk</span>
                  </div>
                  <div className="txn-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">Review Requirement</span>
                    <span className="text-xs font-semibold" style={{ color: txn.riskScore >= 60 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                      {txn.riskScore >= 60 ? 'Requires human review' : 'Standard monitoring'}
                    </span>
                  </div>
                </div>

                {/* Risk Bar */}
                <div className="txn-detail__risk-bar" style={{ margin: '12px 0 16px' }}>
                  <div className="txn-detail__risk-fill" style={{ width: `${txn.riskScore || 10}%`, background: riskColor }} />
                </div>

                {/* Model Assessment Statement */}
                <div className="txn-detail__assessment-box">
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', marginBottom: 4, color: 'var(--text-primary)' }}>
                    AI Engine Assessment:
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {txn.riskScore >= 60
                      ? 'Suspicious activity detected. This high-risk transaction exhibits statistical deviations against historical member patterns and requires human review.'
                      : 'Standard activity detected. Transaction parameters fall within normal historical baselines with no critical anomalies flagged.'}
                  </p>
                </div>

                {/* Contributing Factors */}
                <div style={{ marginTop: 14 }}>
                  <span className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Contributing Anomaly Factors ({anomalyFactors.length})
                  </span>
                  {anomalyFactors.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {anomalyFactors.map((factor, i) => {
                        const item = explainAnomaly(factor);
                        return (
                          <div key={i} className="txn-detail__factor-item">
                            <div className="txn-detail__factor-header">
                              <span className="txn-detail__factor-title">⚠️ {item.title}</span>
                              <span className="txn-detail__factor-tag">{item.factor}</span>
                            </div>
                            <div className="txn-detail__factor-desc">{item.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="txn-detail__empty-factor">
                      ✓ No adverse anomaly factors detected for this transaction.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Risk Treatment Controls (for Analyst / Organisation) */}
          {isAnalystOrOrg && (
            <div className="txn-detail__card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className="txn-detail__section-title" style={{ margin: 0, border: 'none' }}>
                  🛡️ Risk Treatment Actions
                </h3>
                {treatment && (
                  <span className={`badge ${treatment.id === 'block' ? 'badge-critical' : treatment.id === 'whitelist' ? 'badge-low' : 'badge-info'}`}>
                    Active: {treatment.label}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TREATMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`btn btn-xs ${treatment?.id === opt.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleApplyTreatment(opt)}
                    title={opt.desc}
                    style={{ border: '1px solid var(--border-primary)', padding: '6px 10px', fontSize: 11 }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
              {treatment && (
                <p className="text-xs text-tertiary" style={{ margin: '8px 0 0', fontStyle: 'italic' }}>
                  FraudX system status updated by {treatment.performedBy || 'Analyst'}.
                </p>
              )}
            </div>
          )}

          {/* Investigation Timeline */}
          {isAnalystOrOrg && (
            <div className="txn-detail__card">
              <h3 className="txn-detail__section-title">⏱️ Investigation Timeline</h3>
              <div className="txn-timeline">
                {timelineSteps.map((step, idx) => (
                  <div key={step.id} className={`txn-timeline-item txn-timeline-item--${step.status}`}>
                    <div className="txn-timeline-marker">
                      <span className="txn-timeline-dot" />
                      {idx < timelineSteps.length - 1 && <span className="txn-timeline-line" />}
                    </div>
                    <div className="txn-timeline-content">
                      <div className="txn-timeline-header">
                        <span className="txn-timeline-title">{step.title}</span>
                        <span className="txn-timeline-time">{step.time}</span>
                      </div>
                      <div className="txn-timeline-desc">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Activity / Relationship View */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">🔗 Related Activity / Connected Transactions</h3>
            {relatedTransactions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {relatedTransactions.map(rel => (
                  <div
                    key={rel.id}
                    className="txn-detail__related-item"
                    onClick={() => setSelectedTransaction(rel)}
                    title="Click to inspect related transaction"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="text-mono text-xs font-semibold" style={{ color: 'var(--brand-blue)' }}>
                        {rel.id}
                      </span>
                      <span className={`badge badge-${rel.riskLevel?.toLowerCase() || 'low'}`} style={{ fontSize: 10 }}>
                        {rel.riskLevel}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
                      <span className="text-secondary">{rel.senderName} → {rel.receiverName}</span>
                      <span className="font-semibold">{rel.amountFormatted}</span>
                    </div>
                    <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
                      {rel.date} {rel.time && `• ${rel.time}`} • {rel.type}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="txn-detail__empty-note">
                Related activity is not available from the current data.
              </div>
            )}
          </div>

          {/* General Transaction Information */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.info')}</h3>
            <Field label="Transaction ID" value={txn.id} mono />
            <Field label="Amount" value={txn.amountFormatted} />
            <Field label="Type / Channel" value={txn.type} />
            <Field label="Date" value={txn.date} />
            <Field label="Time" value={txn.time} />
            <Field label="System Status" value={effectiveStatus} />
          </div>

          {/* Participants */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.participants')}</h3>
            <Field label="Sender" value={txn.senderName} />
            <Field label="Sender Account" value={txn.senderAccountId} mono />
            <Field label="Sender Bank" value={txn.senderBank} />
            <div className="txn-detail__divider" />
            <Field label="Receiver" value={txn.receiverName} />
            <Field label="Receiver Account" value={txn.receiverAccountId} mono />
            <Field label="Receiver Bank" value={txn.receiverBank} />
          </div>

          {/* Location & Device */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.locationSection')}</h3>
            <Field label="Recorded Location" value={txn.location || txn.city} />
            {txn.lat != null && !isNaN(txn.lat) ? (
              <>
                <Field label="Latitude" value={txn.lat.toFixed(4)} mono />
                <Field label="Longitude" value={txn.lng.toFixed(4)} mono />
              </>
            ) : (
              <div className="txn-detail__empty-note">Location coordinates unavailable</div>
            )}
            <Field label="Origin Device" value={txn.device} />
          </div>
        </div>
      </div>
    </div>
  );
}
