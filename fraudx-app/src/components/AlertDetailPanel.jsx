import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import './AlertDetailPanel.css';

function getAnomalyExplanation(factor, t) {
  const map = {
    'Unusual transaction amount detected': {
      title: t('anomalies.amountDevTitle'),
      explanation: t('anomalies.amountDevDesc'),
      factor: t('anomalies.amountDevFactor'),
    },
    'Rapid transaction sequence identified': {
      title: t('anomalies.velocityTitle'),
      explanation: t('anomalies.velocityDesc'),
      factor: t('anomalies.velocityFactor'),
    },
    'Transaction from unusual location': {
      title: t('anomalies.locationTitle'),
      explanation: t('anomalies.locationDesc'),
      factor: t('anomalies.locationFactor'),
    },
    'New device used for transaction': {
      title: t('anomalies.deviceTitle'),
      explanation: t('anomalies.deviceDesc'),
      factor: t('anomalies.deviceFactor'),
    },
    'Transaction at unusual time': {
      title: t('anomalies.timeTitle'),
      explanation: t('anomalies.timeDesc'),
      factor: t('anomalies.timeFactor'),
    },
    'Higher than normal transaction frequency': {
      title: t('anomalies.freqTitle'),
      explanation: t('anomalies.freqDesc'),
      factor: t('anomalies.freqFactor'),
    },
    'Suspicious network pattern detected': {
      title: t('anomalies.networkTitle'),
      explanation: t('anomalies.networkDesc'),
      factor: t('anomalies.networkFactor'),
    },
    'Suspicious activity detected': {
      title: t('anomalies.generalTitle'),
      explanation: t('anomalies.generalDesc'),
      factor: t('anomalies.generalFactor'),
    },
  };
  return map[factor] || {
    title: t('anomalies.riskFactorDetected', 'Risk Factor Detected'),
    explanation: factor || t('anomalies.generalDesc'),
    factor: factor || t('anomalies.generalFactor'),
  };
}

const Field = ({ label, value, mono, fallback = '—' }) => (
  <div className="alert-detail__field">
    <span className="alert-detail__field-label">{label}</span>
    <span className={`alert-detail__field-value ${mono ? 'text-mono' : ''}`}>
      {value !== undefined && value !== null && value !== '' ? value : fallback}
    </span>
  </div>
);

export default function AlertDetailPanel({ alert, onClose }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { transactions, getTreatment, applyTreatment, setSelectedTransaction } = useData();
  const [showWhyRisk, setShowWhyRisk] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const txn = transactions?.find(tItem => tItem.id === alert?.transactionId);
  const treatment = alert ? getTreatment(alert.id) : null;

  // Find related transactions
  const relatedTransactions = useMemo(() => {
    if (!txn || !transactions) return [];
    return transactions.filter(tItem =>
      tItem.id !== txn.id && (
        (txn.senderId && tItem.senderId === txn.senderId) ||
        (txn.receiverId && tItem.receiverId === txn.receiverId) ||
        (txn.senderName && tItem.senderName === txn.senderName) ||
        (txn.receiverName && tItem.receiverName === txn.receiverName)
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

  const treatmentOptions = [
    { id: 'block', label: t('treatments.blockTxn'), icon: '🚫', desc: t('treatments.blockDesc'), className: 'badge-critical' },
    { id: 'freeze', label: t('treatments.freezeAccount'), icon: '🧊', desc: t('treatments.freezeDesc'), className: 'badge-high' },
    { id: 'escalate', label: t('treatments.escalateAnalyst'), icon: '👤', desc: t('treatments.escalateDesc'), className: 'badge-medium' },
    { id: 'monitor', label: t('treatments.enhancedMonitoring'), icon: '👁️', desc: t('treatments.monitorDesc'), className: 'badge-info' },
    { id: 'whitelist', label: t('treatments.whitelist'), icon: '✅', desc: t('treatments.whitelistDesc'), className: 'badge-low' },
  ];

  const handleApplyTreatment = (option) => {
    applyTreatment(alert.id, option, user?.name || 'Analyst');
    setToastMessage(t('transactionDetail.actionApplied', { label: option.label }));
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
      desc: `${t('transactionDetail.riskScore')} ${alert.riskScore}/100.`,
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
        ? `${relatedTransactions.length} connected transactions cross-referenced.`
        : t('transactionDetail.noRelatedTxns'),
    },
    {
      id: 'analyst_dec',
      title: 'Analyst Decision',
      time: treatment ? 'Just now' : 'Pending',
      date: alert.date || 'Today',
      status: treatment ? 'complete' : 'active',
      desc: treatment
        ? `${treatment.label} applied by ${treatment.performedBy || 'Analyst'}.`
        : 'Awaiting analyst review & risk treatment action.',
    },
    {
      id: 'case_closed',
      title: 'Case Status',
      time: treatment ? 'Logged' : 'In Progress',
      date: alert.date || 'Today',
      status: treatment ? 'complete' : 'pending',
      desc: treatment
        ? `Case updated in FraudX registry as ${effectiveStatus}.`
        : 'Investigation active.',
    },
  ];

  return (
    <div className="alert-detail-overlay" onClick={onClose}>
      <div className="alert-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="alert-detail__header">
          <div>
            <h2 className="alert-detail__title">{t('alerts.alertDetails')}</h2>
            <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
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
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 2 }}>{t('alerts.alertStatus')}</span>
                <span className={`badge ${statusBadgeClass}`}>
                  {t('common.' + (effectiveStatus === 'Under Review' ? 'underReview' : effectiveStatus.toLowerCase()), effectiveStatus)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 2 }}>{t('alerts.riskAssessment')}</span>
                <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>
                  {t('common.' + alert.riskLevel.toLowerCase(), alert.riskLevel)} ({alert.riskScore}/100)
                </span>
              </div>
            </div>
          </div>

          {/* CRITICAL FEATURE: "Why This Risk?" Section */}
          <div className="alert-detail__section alert-detail__card alert-detail__why-risk-card">
            <div className="alert-detail__why-risk-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔍</span>
                <h3 className="alert-detail__why-risk-title">{t('transactionDetail.whyThisRisk')}</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowWhyRisk(!showWhyRisk)}
              >
                {showWhyRisk ? t('transactionDetail.collapseExplanation') : t('transactionDetail.expandExplanation')}
              </button>
            </div>

            {showWhyRisk && (
              <div className="alert-detail__why-risk-content animate-fade-in">
                {/* Metric Summary */}
                <div className="alert-detail__risk-metric-row">
                  <div className="alert-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">{t('transactionDetail.calculatedScore')}</span>
                    <span className="text-sm font-bold text-mono" style={{ color: riskColor }}>
                      {alert.riskScore} / 100
                    </span>
                  </div>
                  <div className="alert-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">{t('transactionDetail.severityCategory')}</span>
                    <span className="text-sm font-semibold">{t('common.' + alert.riskLevel.toLowerCase(), alert.riskLevel)}</span>
                  </div>
                  <div className="alert-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">{t('transactionDetail.reviewRequirement')}</span>
                    <span className="text-xs font-semibold" style={{ color: alert.riskScore >= 60 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                      {alert.riskScore >= 60 ? t('transactionDetail.requiresHumanReview') : t('transactionDetail.standardMonitoring')}
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
                    {t('transactionDetail.aiAssessment')}
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {alert.riskScore >= 60
                      ? t('transactionDetail.suspiciousDetected')
                      : t('transactionDetail.standardDetected')}
                  </p>
                </div>

                {/* Contributing Factors */}
                <div style={{ marginTop: 14 }}>
                  <span className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {t('transactionDetail.contributingFactors', { count: anomalyFactors.length })}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {anomalyFactors.map((factor, i) => {
                      const info = getAnomalyExplanation(factor, t);
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
                  {t('transactionDetail.riskTreatmentActions')}
                </h3>
                {treatment && (
                  <span className={`badge ${treatment.id === 'block' ? 'badge-critical' : treatment.id === 'whitelist' ? 'badge-low' : 'badge-info'}`}>
                    {t('transactionDetail.activeAction', { label: treatment.label })}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {treatmentOptions.map(opt => (
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
            </div>
          )}

          {/* Investigation Timeline */}
          {isAnalystOrOrg && (
            <div className="alert-detail__section alert-detail__card">
              <h3 className="alert-detail__section-title">⏱️ {t('transactionDetail.investigationTimeline')}</h3>
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
            <h3 className="alert-detail__section-title">🔗 {t('transactionDetail.relatedTransactions')}</h3>
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
                        {t('common.' + (rel.riskLevel?.toLowerCase() || 'low'), rel.riskLevel)}
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
                {t('transactionDetail.noRelatedTxns')}
              </div>
            )}
          </div>

          {/* Alert & Transaction Metadata */}
          <div className="alert-detail__section alert-detail__card">
            <h3 className="alert-detail__section-title">{t('alerts.alertDetails')}</h3>
            <Field label={t('alerts.alertId')} value={alert.id} mono />
            <Field label={t('transactions.transactionId')} value={alert.transactionId} mono />
            <Field label={t('alerts.category')} value={alert.category || 'Fraud Detection'} />
            <Field label={t('transactions.dateTime')} value={`${alert.date || 'Today'} ${alert.time ? `• ${alert.time}` : ''}`} />
            {txn && (
              <>
                <Field label={t('transactions.amount')} value={txn.amountFormatted} />
                <Field label={t('transactions.type')} value={txn.type} />
                <Field label={t('transactions.sender')} value={txn.senderName} />
                <Field label={t('transactions.receiver')} value={txn.receiverName} />
                <Field label={t('transactions.location')} value={txn.location || txn.city} />
                <Field label={t('transactionDetail.deviceSection')} value={txn.device} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
