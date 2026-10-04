import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import TransactionDetail from '../components/TransactionDetail';
import MapView from '../components/MapView';
import './Transactions.css';

export default function Transactions() {
  const { transactions, members, highlightedTransactionId, setHighlightedTransactionId, setSelectedTransaction, selectedTransaction } = useData();
  const { user } = useAuth();
  const { t } = useTheme();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showMap, setShowMap] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const isCustomer = user?.role === 'customer';

  // Find customer's member entry
  const customerMember = useMemo(() => {
    if (!isCustomer) return null;
    const targetId = user?.memberId || user?.id;
    return (members || []).find(m =>
      (targetId && (m.id === targetId || m.memberId === targetId)) ||
      (user?.name && m.name?.toLowerCase() === user.name.toLowerCase())
    );
  }, [isCustomer, user, members]);

  // Filter transactions for customer role strictly
  const baseTransactions = useMemo(() => {
    if (!isCustomer) return transactions || [];
    const memberId = customerMember?.id ?? customerMember?.memberId ?? user?.memberId ?? user?.id;
    if (memberId) {
      return (transactions || []).filter(t =>
        t.senderId === memberId || t.receiverId === memberId ||
        t.senderMemberId === memberId || t.receiverMemberId === memberId
      );
    }
    if (user?.name) {
      return (transactions || []).filter(t => t.senderName === user.name || t.receiverName === user.name);
    }
    return [];
  }, [isCustomer, customerMember, user, transactions]);

  const types = ['All', ...new Set(baseTransactions.map(t => t.type || 'Transfer'))];
  const risks = ['All', 'Low', 'Medium', 'High', 'Critical'];
  const statuses = ['All', 'Completed', 'Under Review', 'Flagged', 'Monitoring'];

  const filtered = useMemo(() => {
    return baseTransactions.filter(txn => {
      if (typeFilter !== 'All' && txn.type !== typeFilter) return false;
      if (riskFilter !== 'All' && txn.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'All' && txn.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          String(txn.id || '').toLowerCase().includes(q) ||
          String(txn.senderName || '').toLowerCase().includes(q) ||
          String(txn.receiverName || '').toLowerCase().includes(q) ||
          String(txn.location || txn.city || '').toLowerCase().includes(q) ||
          String(txn.amount || '').includes(q)
        );
      }
      return true;
    });
  }, [baseTransactions, search, typeFilter, riskFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleRowClick = (txn) => {
    setSelectedTransaction(txn);
    setHighlightedTransactionId(txn.id);
  };

  const handleMapMarkerClick = (txnId) => {
    const txn = baseTransactions.find(t => t.id === txnId);
    if (txn) {
      setSelectedTransaction(txn);
      setHighlightedTransactionId(txnId);
    }
  };

  const pageTitle = isCustomer ? t('transactions.myTransactionsTitle') : t('transactions.title');
  const pageSubtitle = isCustomer
    ? t('transactions.customerSubtitle', { count: baseTransactions.length })
    : t('transactions.subtitle');

  return (
    <div className="transactions-page">
      <div className="transactions-page__header animate-fade-in-up">
        <div>
          <h1 className="heading-2">{pageTitle}</h1>
          <p className="text-secondary">{pageSubtitle}</p>
        </div>
        <div className="transactions-page__actions">
          <button className={`btn ${showMap ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setShowMap(!showMap)}>
            {showMap ? t('transactions.hideMap') : t('transactions.showMap')}
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
            {types.map(tp => <option key={tp} value={tp}>{tp === 'All' ? t('transactions.all') : tp}</option>)}
          </select>
          <select className="input filter-bar__select" value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }} aria-label="Filter by risk">
            {risks.map(r => <option key={r} value={r}>{r === 'All' ? t('transactions.all') : t('common.' + r.toLowerCase(), r)}</option>)}
          </select>
          <select className="input filter-bar__select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
            {statuses.map(s => <option key={s} value={s}>{s === 'All' ? t('transactions.all') : t('common.' + (s === 'Under Review' ? 'underReview' : s.toLowerCase()), s)}</option>)}
          </select>
        </div>
        <span className="text-xs text-tertiary">{t('transactions.showing', { count: paginated.length, total: filtered.length })}</span>
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
                <td><span className="text-sm">{txn.senderName}</span></td>
                <td><span className="text-sm">{txn.receiverName}</span></td>
                <td><span className="badge badge-info">{txn.type}</span></td>
                <td><span className="text-sm font-semibold">{txn.amountFormatted}</span></td>
                <td><span className="text-sm">{txn.city}</span></td>
                <td><span className={`badge badge-${(txn.riskLevel || 'low').toLowerCase()}`}>{t('common.' + (txn.riskLevel || 'low').toLowerCase(), txn.riskLevel || 'Low')}</span></td>
                <td><span className="text-sm">{t('common.' + ((txn.status === 'Under Review' ? 'underReview' : txn.status) || 'completed').toLowerCase(), txn.status || 'Completed')}</span></td>
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
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('transactions.previous')}</button>
          <span className="text-sm text-secondary">{t('transactions.pageOf', { page, totalPages })}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('transactions.next')}</button>
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
