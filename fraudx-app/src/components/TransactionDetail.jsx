import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './TransactionDetail.css';

function explainAnomaly(factor, t) {
  const map = {
    'Unusual transaction amount detected': {
      title: t('anomalies.amountDevTitle'),
      desc: t('anomalies.amountDevDesc'),
      factor: t('anomalies.amountDevFactor'),
    },
    'Rapid transaction sequence identified': {
      title: t('anomalies.velocityTitle'),
      desc: t('anomalies.velocityDesc'),
      factor: t('anomalies.velocityFactor'),
    },
    'Transaction from unusual location': {
      title: t('anomalies.locationTitle'),
      desc: t('anomalies.locationDesc'),
      factor: t('anomalies.locationFactor'),
    },
    'New device used for transaction': {
      title: t('anomalies.deviceTitle'),
      desc: t('anomalies.deviceDesc'),
      factor: t('anomalies.deviceFactor'),
    },
    'Transaction at unusual time': {
      title: t('anomalies.timeTitle'),
      desc: t('anomalies.timeDesc'),
      factor: t('anomalies.timeFactor'),
    },
    'Higher than normal transaction frequency': {
      title: t('anomalies.freqTitle'),
      desc: t('anomalies.freqDesc'),
      factor: t('anomalies.freqFactor'),
    },
    'Suspicious network pattern detected': {
      title: t('anomalies.networkTitle'),
      desc: t('anomalies.networkDesc'),
      factor: t('anomalies.networkFactor'),
    },
    'Suspicious activity detected': {
      title: t('anomalies.generalTitle'),
      desc: t('anomalies.generalDesc'),
      factor: t('anomalies.generalFactor'),
    },
  };
  return map[factor] || {
    title: t('anomalies.riskFactorDetected', 'Risk Factor Detected'),
    desc: factor || t('anomalies.generalDesc'),
    factor: factor || t('anomalies.generalFactor'),
  };
}

const Field = ({ label, value, mono, fallback = '—' }) => (
  <div className="txn-detail__field">
    <span className="txn-detail__field-label">{label}</span>
    <span className={`txn-detail__field-value ${mono ? 'text-mono' : ''}`}>
      {value !== undefined && value !== null && value !== '' ? value : fallback}
    </span>
  </div>
);

export default function TransactionDetail({ transaction: txn, onClose }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { transactions, getAlertForTransaction, getTreatment, applyTreatment, setSelectedTransaction } = useData();
  const [showWhyRisk, setShowWhyRisk] = useState(true);
  const [treatmentNotice, setTreatmentNotice] = useState(null);

  const role = user?.role || 'customer';
  const isAnalystOrOrg = role === 'analyst' || role === 'organisation';

  const alert = (txn && getAlertForTransaction(txn.id)) || {
    id: txn ? `ALT-${txn.id.replace('TXN-', '')}` : '',
    riskScore: txn?.riskScore || 15,
    riskLevel: txn?.riskLevel || 'Low',
    reason: txn?.anomalyFactors?.[0] || 'Standard transaction evaluation',
    status: txn?.status === 'Completed' ? 'Closed' : 'Open',
    date: txn?.date,
  };

  const treatment = alert?.id ? getTreatment(alert.id) : null;

  // Determine effective status
  let effectiveStatus = txn?.status || 'Completed';
  if (treatment) {
    if (treatment.id === 'block') effectiveStatus = 'Blocked';
    else if (treatment.id === 'whitelist') effectiveStatus = 'Whitelisted';
    else if (treatment.id === 'freeze') effectiveStatus = 'Frozen';
    else if (treatment.id === 'escalate') effectiveStatus = 'Escalated';
    else if (treatment.id === 'monitor') effectiveStatus = 'Enhanced Monitoring';
  }

  const treatmentOptions = [
    { id: 'block', label: t('treatments.blockTxn'), icon: '🚫', desc: t('treatments.blockDesc'), className: 'badge-critical' },
    { id: 'freeze', label: t('treatments.freezeAccount'), icon: '🧊', desc: t('treatments.freezeDesc'), className: 'badge-high' },
    { id: 'escalate', label: t('treatments.escalateAnalyst'), icon: '👤', desc: t('treatments.escalateDesc'), className: 'badge-medium' },
    { id: 'monitor', label: t('treatments.enhancedMonitoring'), icon: '👁️', desc: t('treatments.monitorDesc'), className: 'badge-info' },
    { id: 'whitelist', label: t('treatments.whitelist'), icon: '✅', desc: t('treatments.whitelistDesc'), className: 'badge-low' },
  ];

  const handleApplyTreatment = (option) => {
    if (!alert?.id) return;
    applyTreatment(alert.id, option, user?.name || 'Analyst');
    setTreatmentNotice(t('transactionDetail.actionApplied', { label: option.label }));
    setTimeout(() => setTreatmentNotice(null), 3500);
  };

  // Find related transactions (from same sender or receiver, excluding current transaction)
  const relatedTransactions = useMemo(() => {
    if (!txn || !transactions || transactions.length === 0) return [];
    return transactions.filter(tItem => 
      tItem.id !== txn.id && (
        (txn.senderId && tItem.senderId === txn.senderId) ||
        (txn.receiverId && tItem.receiverId === txn.receiverId) ||
        (txn.senderName && tItem.senderName === txn.senderName) ||
        (txn.receiverName && tItem.receiverName === txn.receiverName)
      )
    ).slice(0, 4);
  }, [transactions, txn]);

  if (!txn) return null;

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
      desc: `${t('transactionDetail.riskScore')} ${txn.riskScore}/100.`,
    },
    {
      id: 'txn_review',
      title: 'Transaction Reviewed',
      time: txn.time || '10:43 AM',
      date: txn.date || 'Today',
      status: 'complete',
      desc: `${t('transactions.amount')} ${txn.amountFormatted || '—'} (${txn.type || 'Channel'}).`,
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
        : t('transactionDetail.noRelatedTxns'),
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

  return (
    <div className="txn-detail-overlay" onClick={onClose}>
      <div className="txn-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="txn-detail__header">
          <div>
            <h2 className="txn-detail__title">{t('transactionDetail.title')}</h2>
            <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{txn.id}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
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
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 2 }}>{t('transactions.amount')}</span>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {txn.amountFormatted || t('transactionDetail.notAvailable')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>{t('transactionDetail.riskLevel')}</span>
                <span className={`badge badge-${txn.riskLevel?.toLowerCase() || 'low'}`}>
                  {t('common.' + (txn.riskLevel?.toLowerCase() || 'low'), txn.riskLevel || 'Low')} ({txn.riskScore || 0}/100)
                </span>
              </div>
            </div>
          </div>

          {/* CRITICAL FEATURE: "Why This Risk?" Section */}
          <div className="txn-detail__card txn-detail__why-risk-card">
            <div className="txn-detail__why-risk-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔍</span>
                <h3 className="txn-detail__why-risk-title">{t('transactionDetail.whyThisRisk')}</h3>
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
              <div className="txn-detail__why-risk-content animate-fade-in">
                {/* Metric Summary */}
                <div className="txn-detail__risk-metric-row">
                  <div className="txn-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">{t('transactionDetail.calculatedScore')}</span>
                    <span className="text-sm font-bold text-mono" style={{ color: riskColor }}>
                      {txn.riskScore || 0} / 100
                    </span>
                  </div>
                  <div className="txn-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">{t('transactionDetail.severityCategory')}</span>
                    <span className="text-sm font-semibold">{t('common.' + (txn.riskLevel?.toLowerCase() || 'low'), txn.riskLevel || 'Low')}</span>
                  </div>
                  <div className="txn-detail__risk-metric-pill">
                    <span className="text-xs text-tertiary">{t('transactionDetail.reviewRequirement')}</span>
                    <span className="text-xs font-semibold" style={{ color: txn.riskScore >= 60 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                      {txn.riskScore >= 60 ? t('transactionDetail.requiresHumanReview') : t('transactionDetail.standardMonitoring')}
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
                    {t('transactionDetail.aiAssessment')}
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {txn.riskScore >= 60
                      ? t('transactionDetail.suspiciousDetected')
                      : t('transactionDetail.standardDetected')}
                  </p>
                </div>

                {/* Contributing Factors */}
                <div style={{ marginTop: 14 }}>
                  <span className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {t('transactionDetail.contributingFactors', { count: anomalyFactors.length })}
                  </span>
                  {anomalyFactors.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {anomalyFactors.map((factor, i) => {
                        const item = explainAnomaly(factor, t);
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
                      {t('transactionDetail.noAnomalyFactors')}
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
            <div className="txn-detail__card">
              <h3 className="txn-detail__section-title">⏱️ {t('transactionDetail.investigationTimeline')}</h3>
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
            <h3 className="txn-detail__section-title">🔗 {t('transactionDetail.relatedTransactions')}</h3>
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
              <div className="txn-detail__empty-note">
                {t('transactionDetail.noRelatedTxns')}
              </div>
            )}
          </div>

          {/* General Transaction Information */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.info')}</h3>
            <Field label={t('transactions.transactionId')} value={txn.id} mono />
            <Field label={t('transactions.amount')} value={txn.amountFormatted} />
            <Field label={t('transactions.type')} value={txn.type} />
            <Field label={t('transactionDetail.purpose')} value={txn.purpose} />
            {txn.loanRef && <Field label={t('transactionDetail.loanRef')} value={txn.loanRef} mono />}
            <Field label={t('transactionDetail.date')} value={txn.date} />
            <Field label={t('transactionDetail.time')} value={txn.time} />
            <Field label={t('transactionDetail.systemStatus')} value={t('common.' + (effectiveStatus === 'Under Review' ? 'underReview' : effectiveStatus.toLowerCase()), effectiveStatus)} />
          </div>

          {/* Account Balances & Simulation */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.balanceSection')}</h3>
            <Field label={t('transactionDetail.senderBalanceBefore')} value={`₹${(txn.oldBalanceOrig || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            <Field label={t('transactionDetail.senderBalanceAfter')} value={`₹${(txn.newBalanceOrig || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            <div className="txn-detail__divider" />
            <Field label={t('transactionDetail.receiverBalanceBefore')} value={`₹${(txn.oldBalanceDest || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            <Field label={t('transactionDetail.receiverBalanceAfter')} value={`₹${(txn.newBalanceDest || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            {txn.amlsimType && (
              <>
                <div className="txn-detail__divider" />
                <Field label={t('transactionDetail.simulationTypology')} value={`${txn.amlsimType} (Step ${txn.amlsimStep || 1})`} mono />
              </>
            )}
          </div>

          {/* Participants */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.participants')}</h3>
            <Field label={t('transactions.sender')} value={txn.senderName} />
            <Field label={t('transactionDetail.senderMemberId')} value={txn.senderMemberId} mono />
            <Field label={t('transactionDetail.senderAccount')} value={txn.senderAccountId} mono />
            <Field label={t('transactionDetail.senderBank')} value={txn.senderBank} />
            <div className="txn-detail__divider" />
            <Field label={t('transactions.receiver')} value={txn.receiverName} />
            <Field label={t('transactionDetail.receiverMemberId')} value={txn.receiverMemberId} mono />
            <Field label={t('transactionDetail.receiverAccount')} value={txn.receiverAccountId} mono />
            <Field label={t('transactionDetail.receiverBank')} value={txn.receiverBank} />
          </div>

          {/* Location & Device */}
          <div className="txn-detail__card">
            <h3 className="txn-detail__section-title">{t('transactionDetail.locationSection')}</h3>
            <Field label={t('transactionDetail.recordedLocation')} value={txn.location || txn.city} />
            {txn.lat != null && !isNaN(txn.lat) ? (
              <>
                <Field label={t('transactionDetail.latitude')} value={txn.lat.toFixed(4)} mono />
                <Field label={t('transactionDetail.longitude')} value={txn.lng.toFixed(4)} mono />
              </>
            ) : (
              <div className="txn-detail__empty-note">{t('transactionDetail.locationUnavailable')}</div>
            )}
            <Field label={t('transactionDetail.originDevice')} value={txn.device} />
          </div>
        </div>
      </div>
    </div>
  );
}
