import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import TransactionDetail from '../components/TransactionDetail';
import MapView from '../components/MapView';
import './Transactions.css';

export default function Transactions() {
  const { transactions, highlightedTransactionId, setHighlightedTransactionId, setSelectedTransaction, selectedTransaction } = useData();
  const { t } = useTheme();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showMap, setShowMap] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const types = ['All', ...new Set(transactions.map(t => t.type).filter(Boolean))];
  const risks = ['All', 'Low', 'Medium', 'High', 'Critical'];
  const statuses = ['All', 'Completed', 'Under Review', 'Flagged', 'Monitoring'];

  const filtered = useMemo(() => {
    return transactions.filter(txn => {
      if (typeFilter !== 'All' && txn.type !== typeFilter) return false;
      if (riskFilter !== 'All' && txn.riskLevel?.toLowerCase() !== riskFilter.toLowerCase()) return false;
      if (statusFilter !== 'All') {
        const normTxnStatus = (txn.status || '').toLowerCase().replace(/[\s_-]+/g, '');
        const normFilterStatus = statusFilter.toLowerCase().replace(/[\s_-]+/g, '');
        if (normTxnStatus !== normFilterStatus) return false;
      }
      if (search) {
        const q = search.toLowerCase().trim();
        const matchesId = txn.id?.toLowerCase().includes(q);
        const matchesSender = txn.senderName?.toLowerCase().includes(q);
        const matchesReceiver = txn.receiverName?.toLowerCase().includes(q);
        const matchesLocation = (txn.location || txn.city || '')?.toLowerCase().includes(q);
        const matchesAmount = String(txn.amount || '').includes(q) || String(txn.amountFormatted || '').toLowerCase().includes(q);
        const matchesType = txn.type?.toLowerCase().includes(q);
        if (!matchesId && !matchesSender && !matchesReceiver && !matchesLocation && !matchesAmount && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, search, typeFilter, riskFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleRowClick = (txn) => {
    setSelectedTransaction(txn);
    setHighlightedTransactionId(txn.id);
  };

  const handleMapMarkerClick = (txnId) => {
    const txn = transactions.find(t => t.id === txnId);
    if (txn) {
      setSelectedTransaction(txn);
      setHighlightedTransactionId(txnId);
    }
  };

  const formatStatus = (st) => {
    if (!st) return '—';
    return st.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="transactions-page">
      <div className="transactions-page__header animate-fade-in-up">
        <div>
          <h1 className="heading-2">{t('transactions.title')}</h1>
          <p className="text-secondary">{t('transactions.subtitle')}</p>
        </div>
        <div className="transactions-page__actions">
          <button className={`btn ${showMap ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setShowMap(!showMap)}>
            {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
          </button>
        </div>
      </div>

      {showMap && (
        <div className="transactions-page__map animate-fade-in">
          <MapView
            transactions={filtered}
            highlightedId={highlightedTransactionId}
            onMarkerClick={handleMapMarkerClick}
          />
        </div>
      )}

      <div className="transactions-page__filters animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="filter-bar">
          <input className="input filter-bar__search" type="text" placeholder={t('transactions.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} aria-label="Search transactions" />
          <select className="input filter-bar__select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} aria-label="Filter by type">
            {types.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
          <select className="input filter-bar__select" value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }} aria-label="Filter by risk">
            {risks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input filter-bar__select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span className="text-xs text-tertiary">Showing {paginated.length} of {filtered.length} transactions</span>
      </div>

      <div className="transactions-page__table-wrap animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('transactions.dateTime')}</th>
              <th>{t('transactions.transactionId')}</th>
              <th>{t('transactions.sender')}</th>
              <th>{t('transactions.receiver')}</th>
              <th>{t('transactions.type')}</th>
              <th>{t('transactions.amount')}</th>
              <th>{t('transactions.location')}</th>
              <th>{t('transactions.risk')}</th>
              <th>{t('transactions.status')}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(txn => (
              <tr key={txn.id} className={highlightedTransactionId === txn.id ? 'active' : ''} onClick={() => handleRowClick(txn)}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="text-sm">{txn.date}</span>
                    <span className="text-xs text-tertiary">{txn.time}</span>
                  </div>
                </td>
                <td><span className="text-mono text-xs">{txn.id}</span></td>
                <td><span className="text-sm">{txn.senderName || '—'}</span></td>
                <td><span className="text-sm">{txn.receiverName || '—'}</span></td>
                <td><span className="badge badge-info">{txn.type}</span></td>
                <td><span className="text-sm font-semibold">{txn.amountFormatted}</span></td>
                <td><span className="text-sm">{txn.city || txn.location || '—'}</span></td>
                <td><span className={`badge badge-${txn.riskLevel?.toLowerCase() || 'low'}`}>{txn.riskLevel}</span></td>
                <td><span className="text-sm">{formatStatus(txn.status)}</span></td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>{t('transactions.noResults')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="transactions-page__pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span className="text-sm text-secondary">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {selectedTransaction && (
        <TransactionDetail
          transaction={selectedTransaction}
          onClose={() => { setSelectedTransaction(null); setHighlightedTransactionId(null); }}
        />
      )}
    </div>
  );
}
