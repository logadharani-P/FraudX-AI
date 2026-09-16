import React from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const RISK_COLORS = { Low: '#22C55E', Medium: '#F59E0B', High: '#EF4444', Critical: '#DC2626' };

export default function RiskAnalysis() {
  const { stats, transactions } = useData();
  const { t } = useTheme();

  const riskDistribution = [
    { name: 'Low', value: stats.lowRiskCount || 0, color: '#22C55E' },
    { name: 'Medium', value: stats.mediumRiskCount || 0, color: '#F59E0B' },
    { name: 'High', value: stats.highRiskCount || 0, color: '#EF4444' },
  ];

  const typeRiskData = Object.entries(stats.typeCounts || {}).map(([type, count]) => {
    const typeTxns = transactions.filter(t => t.type === type);
    const avgRisk = typeTxns.length > 0 ? typeTxns.reduce((sum, t) => sum + (t.riskScore || 0), 0) / typeTxns.length : 0;
    return { type: type.length > 10 ? type.slice(0, 10) + '…' : type, avgRisk: Math.round(avgRisk), count };
  });

  const radarData = [
    { metric: 'Volume', value: Math.min(100, (stats.totalTransactions || 0) / 10) },
    { metric: 'Fraud Rate', value: stats.totalTransactions ? ((stats.fraudCount || 0) / stats.totalTransactions * 100) : 0 },
    { metric: 'Avg Amount', value: Math.min(100, (stats.avgAmount || 0) / 50) },
    { metric: 'High Risk %', value: stats.totalTransactions ? ((stats.highRiskCount || 0) / stats.totalTransactions * 100) : 0 },
    { metric: 'Alert Rate', value: stats.totalTransactions ? ((stats.openAlerts || 0) / stats.totalTransactions * 100 * 10) : 0 },
  ];

  const fraudRate = stats.totalTransactions ? ((stats.fraudCount || 0) / stats.totalTransactions * 100).toFixed(2) : '0.00';
  const avgRiskScore = transactions.length > 0 ? (transactions.reduce((s, t) => s + (t.riskScore || 0), 0) / transactions.length).toFixed(1) : '0';

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">📊 {t('nav.riskAnalysis')}</h1>
          <p className="text-secondary">Comprehensive risk metrics and insights</p>
        </div>
      </div>

      <div className="dashboard__stats" style={{ marginBottom: 24 }}>
        {[
          { label: 'Fraud Rate', value: `${fraudRate}%`, icon: '🎯', color: '#EF4444' },
          { label: 'Avg Risk Score', value: avgRiskScore, icon: '📈', color: '#F59E0B' },
          { label: 'High Risk Txns', value: stats.highRiskCount || 0, icon: '⚠️', color: '#DC2626' },
          { label: 'Monitored', value: stats.openAlerts || 0, icon: '🔍', color: '#8B5CF6' },
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
          <h3 className="dashboard__card-title">Risk Distribution</h3>
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
          <h3 className="dashboard__card-title">Avg Risk by Transaction Type</h3>
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
