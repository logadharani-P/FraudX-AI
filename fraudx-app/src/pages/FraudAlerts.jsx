import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import AlertDetailPanel from '../components/AlertDetailPanel';

export default function FraudAlerts() {
  const { alerts, transactions, getTreatment } = useData();
  const { t } = useTheme();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);

  const filtered = useMemo(() => {
    return (alerts || []).filter(alert => {
      if (filter !== 'All' && alert.riskLevel !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          alert.id?.toLowerCase().includes(q) ||
          alert.reason?.toLowerCase().includes(q) ||
          alert.transactionId?.toLowerCase().includes(q) ||
          alert.senderName?.toLowerCase().includes(q) ||
          alert.receiverName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, filter, search]);

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert);
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">🚨 {t('nav.fraudAlerts')}</h1>
          <p className="text-secondary">{filtered.length} alerts detected by AI engine</p>
        </div>
      </div>

      <div className="filter-strip animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <input
          className="input"
          type="text"
          placeholder="Search alerts by ID, reason, or member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Low', 'Medium', 'High', 'Critical'].map(level => (
            <button
              key={level}
              className={`btn btn-sm ${filter === level ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="card-grid animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {filtered.map(alert => {
          const txn = transactions.find(t => t.id === alert.transactionId);
          const treatment = getTreatment(alert.id);
          let displayStatus = alert.status || 'Open';
          if (treatment) {
            if (treatment.id === 'block') displayStatus = 'Blocked';
            else if (treatment.id === 'whitelist') displayStatus = 'Whitelisted';
            else if (treatment.id === 'freeze') displayStatus = 'Frozen';
            else if (treatment.id === 'escalate') displayStatus = 'Escalated';
            else if (treatment.id === 'monitor') displayStatus = 'Monitoring';
          }

          const sender = alert.senderName || txn?.senderName || 'Member';
          const receiver = alert.receiverName || txn?.receiverName || 'Counterparty';
          const amountFormatted = txn?.amountFormatted || (alert.amount ? `₹${alert.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Amount unavailable');

          return (
            <div
              key={alert.id}
              className="glass-card glass-card--clickable"
              onClick={() => handleAlertClick(alert)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{alert.id}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {treatment && (
                    <span className={`badge ${displayStatus === 'Blocked' ? 'badge-critical' : displayStatus === 'Whitelisted' ? 'badge-low' : 'badge-info'}`}>
                      {displayStatus}
                    </span>
                  )}
                  <span className={`badge badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel}</span>
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ marginBottom: 8, lineHeight: 1.4 }}>{alert.reason}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs text-tertiary">TXN: {alert.transactionId}</span>
                <span className="text-xs text-tertiary">{alert.date}</span>
              </div>
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-secondary)' }}>
                <span className="text-xs text-secondary">{sender} → {receiver} • <strong>{amountFormatted}</strong></span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>✅</p>
            <p>No alerts match your current filters</p>
          </div>
        )}
      </div>

      {selectedAlert && (
        <AlertDetailPanel
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}
