import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './AlertDetailPanel.css';

// Human-readable explanations for technical anomaly phrases
const ANOMALY_EXPLANATIONS = {
  'Unusual transaction amount detected': {
    title: 'Unusual Amount Deviation',
    explanation: 'The transaction amount is unusually high compared with this member\'s previous activity and typical spending baseline.',
    factor: 'Amount exceeds 3.5x sender historical average',
  },
  'Rapid transaction sequence identified': {
    title: 'Rapid Transfer Velocity',
    explanation: 'Multiple transactions occurred in quick succession within a short window, which is atypical for this account.',
    factor: 'High velocity spike (>3 transfers in 5 minutes)',
  },
  'Transaction from unusual location': {
    title: 'Geographic Location Mismatch',
    explanation: 'This transaction originated from a location or IP not typically associated with this member\'s activity.',
    factor: 'Origin city differs from primary registration hub',
  },
  'New device used for transaction': {
    title: 'Unregistered Device Signature',
    explanation: 'This transaction was initiated from a hardware fingerprint or browser not previously associated with this account.',
    factor: 'First-time device token observed',
  },
  'Transaction at unusual time': {
    title: 'Unusual Timing',
    explanation: 'This transaction occurred at an unusual time (e.g. late night or off-hours) compared with previous member patterns.',
    factor: 'Out-of-pattern execution window',
  },
  'Higher than normal transaction frequency': {
    title: 'Frequency Anomaly',
    explanation: 'The number of transactions from this account within a short period is significantly higher than the member\'s normal activity pattern.',
    factor: 'Daily transaction count exceeded 95th percentile',
  },
  'Suspicious network pattern detected': {
    title: 'Recipient Network Risk',
    explanation: 'The AI engine detected a suspicious relationship involving linked accounts or recipients associated with elevated risk profiles.',
    factor: 'Counterparty associated with elevated risk graph',
  },
  'Suspicious activity detected': {
    title: 'Suspicious Activity Detected',
    explanation: 'General suspicious activity was flagged by the AI engine based on combined multi-dimensional risk indicators.',
    factor: 'Multi-feature ensemble model threshold exceeded',
  },
};

function getAnomalyExplanation(factor) {
  return ANOMALY_EXPLANATIONS[factor] || {
    title: 'Risk Factor Detected',
    explanation: factor || 'Anomaly detected by model evaluation.',
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

export default function AlertDetailPanel({ alert, onClose }) {
  const { user } = useAuth();
  const { transactions, getTreatment, applyTreatment, setSelectedTransaction } = useData();
  const [showWhyRisk, setShowWhyRisk] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const txn = transactions?.find(t => t.id === alert?.transactionId);
  const treatment = alert ? getTreatment(alert.id) : null;

  // Find related transactions
  const relatedTransactions = useMemo(() => {
    if (!txn || !transactions) return [];
    return transactions.filter(t =>
      t.id !== txn.id && (
        (txn.senderId && t.senderId === txn.senderId) ||
        (txn.receiverId && t.receiverId === txn.receiverId) ||
        (txn.senderName && t.senderName === txn.senderName) ||
        (txn.receiverName && t.receiverName === txn.receiverName)
      )
    ).slice(0, 4);
  }, [transactions, txn]);

  if (!alert) return null;

  const isCustomer = user?.role === 'customer';
  const isAnalystOrOrg = user?.role === 'analyst' || user?.role === 'organisation';

  const riskColor = alert.riskScore >= 80 ? 'var(--risk-critical, #DC2626)'
    : alert.riskScore >= 60 ? 'var(--risk-high, #EF4444)'
    : alert.riskScore >= 35 ? 'var(--risk-medium, #F59E0B)'
    : 'var(--risk-low, #22C55E)';

  const anomalyFactors = (txn?.anomalyFactors && txn.anomalyFactors.length > 0)
    ? txn.anomalyFactors
    : alert.reason
      ? [alert.reason]
      : ['Suspicious activity detected'];

  // Determine effective status
  let effectiveStatus = alert.status || 'Open';
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

  const handleApplyTreatment = (option) => {
    applyTreatment(alert.id, option, user?.name || 'Analyst');
    setToastMessage(`Action applied: ${option.label}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Timeline steps
  const timelineSteps = [
    {
      id: 'alert_gen',
      title: 'Alert Generated',
      time: alert.time || '10:42 AM',
      date: alert.date || 'Today',
      status: 'complete',
      desc: `Risk score evaluated at ${alert.riskScore}/100 by FraudX AI engine.`,
    },
    {
      id: 'txn_review',
      title: 'Transaction Reviewed',
      time: alert.time || '10:43 AM',
      date: alert.date || 'Today',
      status: 'complete',
      desc: `Transaction ${alert.transactionId} evaluated across feature vectors.`,
    },
    {
      id: 'behavior_comp',
      title: 'Behaviour Compared',
      time: 'Automated',
      date: alert.date || 'Today',
      status: 'complete',
      desc: 'Compared against 30-day velocity and geographic historical profile.',
    },
    {
      id: 'related_act',
      title: 'Related Activity Reviewed',
      time: 'Automated',
      date: alert.date || 'Today',
      status: 'complete',
      desc: relatedTransactions.length > 0
        ? `${relatedTransactions.length} correlated account transactions cross-referenced.`
        : 'No correlated high-risk transactions detected.',
    },
    {
      id: 'member_verif',
      title: 'Member Verification',
      time: 'In-Engine',
      date: alert.date || 'Today',
      status: 'complete',
      desc: `Identity profile verified for ${txn?.senderName || alert.senderName || 'Member'}.`,
    },
    {
      id: 'analyst_dec',
      title: 'Analyst Decision',
      time: treatment ? 'Just now' : 'Pending',
      date: alert.date || 'Today',
      status: treatment ? 'complete' : 'active',
      desc: treatment 
        ? `${treatment.label} applied by ${treatment.performedBy || 'Analyst'}.`
        : 'Awaiting analyst review and risk treatment action.',
    },
    {
      id: 'case_closed',
      title: 'Case Status',
      time: treatment ? 'Logged' : 'In Progress',
      date: alert.date || 'Today',
      status: treatment ? 'complete' : 'pending',
      desc: treatment 
        ? `Alert updated in FraudX registry as ${effectiveStatus}.`
        : 'Investigation active.',
    },
  ];

  const Field = ({ label, value, mono }) => (
    <div className="alert-detail__field">
      <span className="alert-detail__field-label">{label}</span>
      <span className={`alert-detail__field-value ${mono ? 'text-mono' : ''}`}>
        {value !== undefined && value !== null && value !== '' ? value : 'Not available from current data'}
      </span>
    </div>
  );

  return (
    <div className="alert-detail-overlay" onClick={onClose}>
      <div className="alert-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="alert-detail__header">
          <div>
            <h2 className="alert-detail__title">Alert Details</h2>
            <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14"/>
            </svg>
          </button>
        </div>

        <div className="alert-detail__body">
          {toastMessage && (
            <div className="alert-detail__toast animate-fade-in">
              {toastMessage}
            </div>
          )}

          {/* Quick Status Banner */}
          <div className="alert-detail__section alert-detail__card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 2 }}>Alert Status</span>
                <span className={`badge ${statusBadgeClass}`}>{effectiveStatus}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 2 }}>Risk Assessment</span>
                <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>
                  {alert.riskLevel} Risk ({alert.riskScore}/100)
                </span>
              </div>
            </div>
          </div>

          {/* CRITICAL FEATURE: "Why This Risk?" Section */}
          <div className="alert-detail__section alert-detail__card alert-detail__why-risk-card">
            <div className="alert-detail__why-risk-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔍</span>
                <h3 className="alert-detail__why-risk-title">Why This Risk?</h3>
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
              <div className="alert-detail__why-risk-content animate-fade-in">
                {/* Metric Summary */}
                <div className="alert-detail__risk-metric-row">
                  <div className="alert-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">Calculated Score</span>
                    <span className="text-sm font-bold text-mono" style={{ color: riskColor }}>
                      {alert.riskScore} / 100
                    </span>
                  </div>
                  <div className="alert-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">Severity Category</span>
                    <span className="text-sm font-semibold">{alert.riskLevel} Risk</span>
                  </div>
                  <div className="alert-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">Review Status</span>
                    <span className="text-xs font-semibold" style={{ color: alert.riskScore >= 60 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                      {alert.riskScore >= 60 ? 'Requires human review' : 'Standard monitoring'}
                    </span>
                  </div>
                </div>

                {/* Risk Bar */}
                <div className="alert-detail__risk-bar">
                  <div className="alert-detail__risk-fill" style={{ width: `${alert.riskScore}%`, background: riskColor }} />
                </div>

                {/* Model Assessment Box */}
                <div className="alert-detail__assessment-box">
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', marginBottom: 4, color: 'var(--text-primary)' }}>
                    AI Engine Assessment:
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {alert.riskScore >= 60
                      ? 'Suspicious activity detected. High-risk transaction. Requires human review before automated clearance.'
                      : 'Moderate anomaly indicator detected. Transaction parameters are monitored under standard fraud threshold rules.'}
                  </p>
                </div>

                {/* Contributing Factors */}
                <div style={{ marginTop: 14 }}>
                  <span className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Contributing Anomaly Factors ({anomalyFactors.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {anomalyFactors.map((factor, i) => {
                      const info = getAnomalyExplanation(factor);
                      return (
                        <div key={i} className="alert-detail__factor-item">
                          <div className="alert-detail__factor-header">
                            <span className="alert-detail__factor-title">⚠️ {info.title}</span>
                            <span className="alert-detail__factor-tag">{info.factor}</span>
                          </div>
                          <div className="alert-detail__factor-desc">{info.explanation}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Risk Treatment Controls (for Analyst / Organisation) */}
          {isAnalystOrOrg && (
            <div className="alert-detail__section alert-detail__card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className="alert-detail__section-title" style={{ margin: 0, border: 'none' }}>
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
            <div className="alert-detail__section alert-detail__card">
              <h3 className="alert-detail__section-title">⏱️ Investigation Timeline</h3>
              <div className="alert-timeline">
                {timelineSteps.map((step, idx) => (
                  <div key={step.id} className={`alert-timeline-item alert-timeline-item--${step.status}`}>
                    <div className="alert-timeline-marker">
                      <span className="alert-timeline-dot" />
                      {idx < timelineSteps.length - 1 && <span className="alert-timeline-line" />}
                    </div>
                    <div className="alert-timeline-content">
                      <div className="alert-timeline-header">
                        <span className="alert-timeline-title">{step.title}</span>
                        <span className="alert-timeline-time">{step.time}</span>
                      </div>
                      <div className="alert-timeline-desc">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Activity / Connected Transactions */}
          <div className="alert-detail__section alert-detail__card">
            <h3 className="alert-detail__section-title">🔗 Related Activity / Connected Transactions</h3>
            {relatedTransactions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {relatedTransactions.map(rel => (
                  <div
                    key={rel.id}
                    className="alert-detail__related-item"
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
              <div className="alert-detail__empty-note">
                Related activity is not available from the current data.
              </div>
            )}
          </div>

          {/* Alert & Transaction Metadata */}
          <div className="alert-detail__section alert-detail__card">
            <h3 className="alert-detail__section-title">Alert & Transaction Metadata</h3>
            <Field label="Alert ID" value={alert.id} mono />
            <Field label="Transaction ID" value={alert.transactionId} mono />
            <Field label="Category" value={alert.category || 'Fraud Detection'} />
            <Field label="Date & Time" value={`${alert.date || 'Today'} ${alert.time ? `• ${alert.time}` : ''}`} />
            {txn && (
              <>
                <Field label="Amount" value={txn.amountFormatted} />
                <Field label="Type / Channel" value={txn.type} />
                <Field label="Sender" value={txn.senderName} />
                <Field label="Receiver" value={txn.receiverName} />
                <Field label="Location" value={txn.location || txn.city} />
                <Field label="Device" value={txn.device} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
