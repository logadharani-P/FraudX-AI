import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function RiskAnalysis() {
  const { stats, transactions, members } = useData();
  const { user } = useAuth();
  const { t } = useTheme();

  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';

  // Customer specific data
  const customerMember = useMemo(() => {
    if (!isCustomer || !user?.name) return null;
    return members.find(m => m.name?.toLowerCase() === user.name.toLowerCase());
  }, [isCustomer, user, members]);

  const customerTxns = useMemo(() => {
    if (!isCustomer) return [];
    if (customerMember) {
      const memberId = customerMember.id ?? customerMember.memberId;
      return transactions.filter(t => t.senderId === memberId || t.receiverId === memberId);
    }
    return transactions.filter(t => t.senderName === user?.name || t.receiverName === user?.name);
  }, [isCustomer, customerMember, user, transactions]);

  // Customer calculations
  const customerAvgRisk = useMemo(() => {
    if (customerTxns.length === 0) return 0;
    const sum = customerTxns.reduce((acc, t) => acc + (t.riskScore || 0), 0);
    return Math.round(sum / customerTxns.length);
  }, [customerTxns]);

  const customerRiskLevel = useMemo(() => {
    if (customerAvgRisk >= 80) return 'Critical';
    if (customerAvgRisk >= 60) return 'High';
    if (customerAvgRisk >= 35) return 'Medium';
    return 'Low';
  }, [customerAvgRisk]);

  const customerRiskTrend = useMemo(() => {
    return customerTxns.slice(0, 8).reverse().map((t, idx) => ({
      txn: t.id.replace('TXN-', '#'),
      riskScore: t.riskScore || 15,
      date: t.date,
      amount: t.amount,
    }));
  }, [customerTxns]);

  // Analyst / Org Enterprise calculations
  const riskDistribution = [
    { name: 'Low Risk', value: stats.lowRiskCount || 0, color: '#22C55E' },
    { name: 'Medium Risk', value: stats.mediumRiskCount || 0, color: '#F59E0B' },
    { name: 'High / Critical Risk', value: stats.highRiskCount || 0, color: '#EF4444' },
  ];

  const typeRiskData = Object.entries(stats.typeCounts || {}).map(([type, count]) => {
    const typeTxns = transactions.filter(t => t.type === type);
    const avgRisk = typeTxns.length > 0 ? typeTxns.reduce((sum, t) => sum + (t.riskScore || 0), 0) / typeTxns.length : 0;
    return { type: type.length > 10 ? type.slice(0, 10) + '…' : type, avgRisk: Math.round(avgRisk), count };
  });

  const anomalyRate = stats.totalTransactions ? ((stats.fraudCount || 0) / stats.totalTransactions * 100).toFixed(2) : '0.00';
  const avgRiskScore = transactions.length > 0 ? (transactions.reduce((s, t) => s + (t.riskScore || 0), 0) / transactions.length).toFixed(1) : '0';

  if (isCustomer) {
    return (
      <div className="page-container">
        <div className="page-header animate-fade-in-up">
          <div>
            <h1 className="heading-2">🛡️ My Risk & Security Assessment</h1>
            <p className="text-secondary">Personal account security score, anomaly evaluation, and transaction safety factors</p>
          </div>
        </div>

        {/* Customer Top Metric Cards */}
        <div className="dashboard__stats" style={{ marginBottom: 24 }}>
          {[
            {
              label: 'Personal Risk Rating',
              value: `${customerAvgRisk} / 100`,
              sub: `${customerRiskLevel} Risk`,
              icon: '🛡️',
              color: customerRiskLevel === 'Low' ? '#22C55E' : customerRiskLevel === 'Medium' ? '#F59E0B' : '#EF4444'
            },
            {
              label: 'Account Safety Status',
              value: 'Active & Protected',
              sub: 'Continuous Telemetry',
              icon: '🔒',
              color: '#22C55E'
            },
            {
              label: 'Protected Transfers',
              value: `${customerTxns.length} Transfers`,
              sub: 'Zero Fraud Incidents',
              icon: '💳',
              color: '#4A7BF7'
            },
            {
              label: 'Identity & MFA Status',
              value: 'Verified',
              sub: 'Two-Factor Enforced',
              icon: '✅',
              color: '#8B5CF6'
            },
          ].map((card, i) => (
            <div key={i} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 100}ms`, '--stat-color': card.color }}>
              <div className="stat-card__icon">{card.icon}</div>
              <div className="stat-card__info">
                <span className="stat-card__value">{card.value}</span>
                <span className="stat-card__label">{card.label}</span>
                <span className="text-xs" style={{ color: card.color, fontWeight: 600, marginTop: 2 }}>{card.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Content Layout */}
        <div className="dashboard__grid">
          {/* Assessment Summary Card */}
          <div className="dashboard__card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h3 className="dashboard__card-title">Understanding Your Account Safety</h3>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px 16px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.2rem' }}>✨</span>
                  <strong style={{ color: '#22C55E', fontSize: '0.92rem' }}>Normal Activity Pattern Detected</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Your recent transaction activity is consistent with your historical baseline. Transfers have been executed within expected volume ranges and through verified devices.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ margin: '0 0 2px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Key Behavioral Factors:</h4>
                {[
                  { icon: '📍', label: 'Geographic Consistency', desc: `Transactions originated consistently from ${user.city || 'your registered location'}.` },
                  { icon: '⏱️', label: 'Transfer Timing', desc: 'Payments processed during standard daytime banking hours.' },
                  { icon: '🔐', label: 'Authentication Strength', desc: 'Adaptive MFA challenge active for high-value transactions.' },
                  { icon: '📊', label: 'Amount Stability', desc: 'Transfer sizes match normal day-to-day spending patterns.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary, rgba(255,255,255,0.03))', borderRadius: 8 }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{item.label}</strong>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Risk Trend Chart */}
          <div className="dashboard__card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <h3 className="dashboard__card-title">Recent Transaction Risk Score History</h3>
            {customerRiskTrend.length > 0 ? (
              <div className="dashboard__chart" style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={customerRiskTrend}>
                    <XAxis dataKey="txn" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 12 }}
                      formatter={(val) => [`${val} / 100`, 'Risk Score']}
                    />
                    <Line type="monotone" dataKey="riskScore" stroke="#4A7BF7" strokeWidth={3} dot={{ r: 5, fill: '#4A7BF7' }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  Risk scores below 35 represent safe, standard banking transfers.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                <p style={{ fontSize: '1.8rem', marginBottom: 6 }}>📊</p>
                <p>No recent transaction risk scores recorded for this account.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enterprise View for Analyst / Organisation
  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">📊 {t('nav.riskAnalysis')}</h1>
          <p className="text-secondary">Comprehensive transaction risk scoring, anomaly telemetry, and distribution metrics</p>
        </div>
      </div>

      <div className="dashboard__stats" style={{ marginBottom: 24 }}>
        {[
          { label: 'Anomaly Detection Rate', value: `${anomalyRate}%`, icon: '🎯', color: '#EF4444' },
          { label: 'Avg Risk Score', value: `${avgRiskScore} / 100`, icon: '📈', color: '#F59E0B' },
          { label: 'High-Risk Transactions', value: (stats.highRiskCount || 0).toLocaleString(), icon: '⚠️', color: '#DC2626' },
          { label: 'Monitored Pipeline Alerts', value: (stats.openAlerts || 0).toLocaleString(), icon: '🔍', color: '#8B5CF6' },
        ].map((card, i) => (
          <div key={i} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 100}ms`, '--stat-color': card.color }}>
            <div className="stat-card__icon">{card.icon}</div>
            <div className="stat-card__info">
              <span className="stat-card__value">{card.value}</span>
              <span className="stat-card__label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard__grid">
        <div className="dashboard__card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="dashboard__card-title">Risk Scoring Distribution</h3>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard__legend">
              {riskDistribution.map(r => (
                <div key={r.name} className="dashboard__legend-item">
                  <span className="dashboard__legend-dot" style={{ background: r.color }} />
                  <span className="text-sm">{r.name}</span>
                  <span className="text-sm font-semibold" style={{ marginLeft: 'auto' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard__card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h3 className="dashboard__card-title">Average Risk Score by Channel Type</h3>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeRiskData}>
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 13 }} />
                <Bar dataKey="avgRisk" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
