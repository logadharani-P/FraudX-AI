import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useModuleTransition } from '../context/TransitionContext';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AIWelcomeCard from '../components/AIWelcomeCard';
import './Dashboard.css';

const CHART_COLORS = ['#4A7BF7', '#2ECC87', '#8B5CF6', '#F59E0B', '#22D3EE', '#EF4444'];

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, transactions, alerts, members } = useData();
  const { t } = useTheme();
  const { navigateWithTransition } = useModuleTransition();
  const isCustomer = user?.role === 'customer';

  // Find customer's member entry by matching name
  const customerMember = useMemo(() => {
    if (!isCustomer || !user?.name) return null;
    return members.find(m => m.name?.toLowerCase() === user.name.toLowerCase());
  }, [isCustomer, user, members]);

  // Filter transactions for customer role
  const roleTransactions = useMemo(() => {
    if (!isCustomer || !customerMember) return transactions;
    const memberId = customerMember.id ?? customerMember.memberId;
    return transactions.filter(t => t.senderId === memberId || t.receiverId === memberId);
  }, [isCustomer, customerMember, transactions]);

  const roleAlerts = useMemo(() => {
    if (!isCustomer) return alerts;
    const txnIds = new Set(roleTransactions.map(t => t.id));
    return (alerts || []).filter(a => txnIds.has(a.transactionId));
  }, [isCustomer, alerts, roleTransactions]);

  // Compute stats for role
  const roleStats = useMemo(() => {
    if (!isCustomer) return stats;
    const rt = roleTransactions;
    const ra = roleAlerts;
    return {
      ...stats,
      totalTransactions: rt.length,
      totalAmount: rt.reduce((sum, t) => sum + t.amount, 0),
      fraudCount: rt.filter(t => t.isFraud).length,
      openAlerts: ra.filter(a => a.status === 'Open').length,
      highRiskCount: rt.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length,
      mediumRiskCount: rt.filter(t => t.riskLevel === 'Medium').length,
      lowRiskCount: rt.filter(t => t.riskLevel === 'Low').length,
      typeCounts: rt.reduce((acc, t) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {}),
    };
  }, [isCustomer, stats, roleTransactions, roleAlerts]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? t('common.morning') : hour < 17 ? t('common.afternoon') : t('common.evening');
    return t('dashboard.greeting', { timeOfDay, name: user?.name || 'User' });
  };

  // Charts data from real stats
  const typeData = Object.entries(roleStats.typeCounts || {}).map(([name, value]) => ({ name: name.length > 8 ? name.slice(0,8)+'…' : name, value, fullName: name }));
  const riskData = [
    { name: 'Low', value: roleStats.lowRiskCount || 0, color: '#22C55E' },
    { name: 'Medium', value: roleStats.mediumRiskCount || 0, color: '#F59E0B' },
    { name: 'High', value: roleStats.highRiskCount || 0, color: '#EF4444' },
  ];

  // Activity timeline (group by hours)
  const activityData = [];
  if (roleTransactions.length > 0) {
    const maxTime = Math.max(...roleTransactions.map(t => t.timeSeconds));
    const bucketSize = maxTime / 24;
    for (let i = 0; i < 24; i++) {
      const start = i * bucketSize;
      const end = (i + 1) * bucketSize;
      const bucket = roleTransactions.filter(t => t.timeSeconds >= start && t.timeSeconds < end);
      activityData.push({
        hour: `${String(i).padStart(2, '0')}:00`,
        transactions: bucket.length,
        flagged: bucket.filter(t => t.isFraud).length,
      });
    }
  }

  const recentAlerts = (roleAlerts || []).slice(0, 5);

  const statCards = isCustomer
    ? [
        { label: 'My Transactions', value: roleStats.totalTransactions?.toLocaleString() || '0', icon: '📊', color: '#4A7BF7' },
        { label: 'Total Amount', value: `₹${((roleStats.totalAmount || 0) / 1000).toFixed(1)}K`, icon: '💰', color: '#2ECC87' },
        { label: 'Flagged', value: roleStats.fraudCount || 0, icon: '⚠️', color: '#EF4444' },
        { label: 'Risk Alerts', value: roleStats.openAlerts || 0, icon: '🔔', color: '#F59E0B' },
      ]
    : [
        { label: t('dashboard.totalTransactions'), value: stats.totalTransactions?.toLocaleString() || '0', icon: '📊', color: '#4A7BF7' },
        { label: t('dashboard.totalAmount'), value: `₹${((stats.totalAmount || 0) / 1000).toFixed(1)}K`, icon: '💰', color: '#2ECC87' },
        { label: t('dashboard.fraudDetected'), value: stats.fraudCount || 0, icon: '🚨', color: '#EF4444' },
        { label: t('dashboard.activeAlerts'), value: stats.openAlerts || 0, icon: '⚠️', color: '#F59E0B' },
      ];

  const subtitle = isCustomer
    ? 'Your personal account overview'
    : t('dashboard.subtitle');

  return (
    <div className="dashboard">
      <div className="dashboard__header animate-fade-in-up">
        <h1 className="heading-2">{getGreeting()}</h1>
        <p className="text-secondary">{subtitle}</p>
      </div>

      {/* Customer AI Voice Welcome Experience */}
      {isCustomer && <AIWelcomeCard />}

      <div className="dashboard__stats">
        {statCards.map((card, i) => (
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
        <div className="dashboard__card dashboard__card--wide animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="dashboard__card-title">{isCustomer ? 'My Transaction Activity' : t('dashboard.transactionActivity')}</h3>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="gradTxn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A7BF7" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4A7BF7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradFlag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval={3}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 13 }}/>
                <Area type="monotone" dataKey="transactions" stroke="#4A7BF7" fill="url(#gradTxn)" strokeWidth={2}/>
                <Area type="monotone" dataKey="flagged" stroke="#EF4444" fill="url(#gradFlag)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard__card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h3 className="dashboard__card-title">{isCustomer ? 'My Risk Overview' : t('dashboard.riskOverview')}</h3>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 13 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard__legend">
              {riskData.map(r => (
                <div key={r.name} className="dashboard__legend-item">
                  <span className="dashboard__legend-dot" style={{ background: r.color }} />
                  <span className="text-sm">{r.name}</span>
                  <span className="text-sm font-semibold" style={{ marginLeft: 'auto' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard__card animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <h3 className="dashboard__card-title">{isCustomer ? 'My Transaction Types' : t('dashboard.transactionActivity')}</h3>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 13 }} labelFormatter={(v, payload) => payload?.[0]?.payload?.fullName || v}/>
                <Bar dataKey="value" fill="#4A7BF7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts section: hide for customers or show customer's own alerts */}
        {!isCustomer && (
          <div className="dashboard__card dashboard__card--wide animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="dashboard__card-header">
              <h3 className="dashboard__card-title">{t('dashboard.fraudAlerts')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigateWithTransition('/fraud-alerts')}>View All</button>
            </div>
            <div className="dashboard__alerts">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="dashboard__alert-row" onClick={() => navigateWithTransition('/fraud-alerts')}>
                  <div className="dashboard__alert-info">
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
                    <span className="text-sm font-medium">{alert.reason}</span>
                  </div>
                  <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel}</span>
                  <span className="text-xs text-tertiary">{alert.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer: show recent transactions instead of alerts */}
        {isCustomer && (
          <div className="dashboard__card dashboard__card--wide animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="dashboard__card-header">
              <h3 className="dashboard__card-title">Recent Transactions</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigateWithTransition('/transactions')}>View All</button>
            </div>
            <div className="dashboard__alerts">
              {roleTransactions.slice(0, 5).map(txn => (
                <div key={txn.id} className="dashboard__alert-row" onClick={() => navigateWithTransition('/transactions')}>
                  <div className="dashboard__alert-info">
                    <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{txn.id}</span>
                    <span className="text-sm font-medium">{txn.senderName} → {txn.receiverName}</span>
                  </div>
                  <span className="text-sm font-semibold">{txn.amountFormatted}</span>
                  <span className={`badge badge-${txn.riskLevel.toLowerCase()}`}>{txn.riskLevel}</span>
                </div>
              ))}
              {roleTransactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
                  <p>No transactions found for your account</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
