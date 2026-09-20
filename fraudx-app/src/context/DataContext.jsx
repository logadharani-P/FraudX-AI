import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';

const DataContext = createContext(null);

function formatDate(isoStr) {
  if (!isoStr) return { date: '', time: '', dateTime: '' };
  try {
    const d = new Date(isoStr);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return {
      date,
      time,
      dateTime: `${date}, ${time}`,
      dateObj: d,
    };
  } catch {
    return { date: '', time: '', dateTime: '', dateObj: new Date() };
  }
}

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, txnsRes, alertsRes, membersRes, activityRes] = await Promise.all([
        api.dashboard.getStats().catch(() => ({})),
        api.transactions.list({ limit: 200 }).catch(() => ({ items: [] })),
        api.alerts.list({ limit: 100 }).catch(() => ({ items: [] })),
        api.members.list({ limit: 100 }).catch(() => ({ items: [] })),
        api.dashboard.getActivity().catch(() => []),
      ]);

      // Normalize Transactions
      const normalizedTxns = (txnsRes.items || []).map((t) => {
        const timeMeta = formatDate(t.timestamp);
        return {
          id: t.transaction_id,
          rawId: t.id,
          transaction_id: t.transaction_id,
          amount: t.amount,
          amountFormatted: t.amount_formatted || `₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          date: timeMeta.date,
          time: timeMeta.time,
          dateTime: timeMeta.dateTime,
          dateObj: timeMeta.dateObj,
          timeSeconds: Math.floor((timeMeta.dateObj?.getTime() || 0) / 1000),
          timestamp: t.timestamp,
          type: t.transaction_type,
          transaction_type: t.transaction_type,
          status: t.status,
          riskScore: t.risk_score || 0,
          riskLevel: t.risk_level || 'Low',
          anomalyScore: t.anomaly_score,
          anomalyFactors: t.anomaly_factors || [],
          location: `${t.location_city || ''}, ${t.location_state || ''}`,
          city: t.location_city,
          state: t.location_state,
          lat: t.lat,
          lng: t.lng,
          device: t.device,
          purpose: t.purpose,
          loanRef: t.loan_ref,
          senderId: t.sender_id,
          senderName: t.sender_name,
          senderMemberId: t.sender_member_id,
          senderAccountId: t.sender_account_id,
          senderBank: t.sender_bank,
          senderCity: t.sender_city,
          receiverId: t.receiver_id,
          receiverName: t.receiver_name,
          receiverMemberId: t.receiver_member_id,
          receiverAccountId: t.receiver_account_id,
          receiverBank: t.receiver_bank,
          receiverCity: t.receiver_city,
          isFraud: (t.risk_score || 0) >= 60,
        };
      });

      // Normalize Alerts
      const normalizedAlerts = (alertsRes.items || []).map((a) => {
        const timeMeta = formatDate(a.created_at);
        return {
          id: a.alert_id,
          alertId: a.alert_id,
          transactionId: a.transaction_ref_id,
          category: a.category,
          riskLevel: a.risk_level,
          riskScore: a.risk_score,
          reason: a.reason,
          description: a.description,
          status: a.status,
          date: timeMeta.date,
          time: timeMeta.time,
          timestamp: timeMeta.dateTime,
          amount: a.amount,
          amountFormatted: a.amount_formatted,
          senderName: a.sender_name,
          receiverName: a.receiver_name,
          locationCity: a.location_city,
          transactionType: a.transaction_type,
          resolvedAt: a.resolved_at,
          resolvedBy: a.resolved_by_name,
          resolutionNote: a.resolution_note,
        };
      });

      // Normalize Members
      const normalizedMembers = (membersRes.items || []).map((m) => ({
        id: m.id,
        memberId: m.member_id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        city: m.city,
        state: m.state,
        lat: m.lat,
        lng: m.lng,
        bank: m.bank,
        accountId: m.account_id,
        accountType: m.account_type,
        joinDate: m.join_date,
        verified: m.verified,
        shareCapital: m.share_capital,
        savingsBalance: m.savings_balance,
        loanOutstanding: m.loan_outstanding,
        riskStatus: m.risk_status,
        totalAmount: m.total_amount,
        transactionCount: m.transaction_count,
        fraudCount: m.fraud_count,
      }));

      setStats(statsRes || {});
      setActivity(Array.isArray(activityRes) ? activityRes : []);
      setTransactions(normalizedTxns);
      setAlerts(normalizedAlerts);
      setMembers(normalizedMembers);
      setError(null);
    } catch (err) {
      console.error('Failed to load data from backend:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateAlertStatus = useCallback(async (alertId, status, resolutionNote) => {
    try {
      const updated = await api.alerts.update(alertId, { status, resolution_note: resolutionNote });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: updated.status, resolutionNote: updated.resolution_note } : a))
      );
      return updated;
    } catch (err) {
      console.error('Failed to update alert status:', err);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      members,
      alerts,
      stats,
      activity,
      people: members,
      loading,
      error,
      refreshData: loadData,
      updateAlertStatus,
      selectedTransaction,
      setSelectedTransaction,
      selectedMember,
      setSelectedMember,
      highlightedTransactionId,
      setHighlightedTransactionId,
      getTransactionById: (id) => transactions.find((t) => t.id === id || t.rawId === id),
      getMemberById: (id) => members.find((m) => m.id === id || m.memberId === id),
      getTransactionsForMember: (memberId) =>
        transactions.filter(
          (t) =>
            t.senderMemberId === memberId ||
            t.receiverMemberId === memberId ||
            t.senderId === memberId ||
            t.receiverId === memberId
        ),
      getAlertForTransaction: (txnId) => alerts.find((a) => a.transactionId === txnId),
    }),
    [
      transactions,
      members,
      alerts,
      stats,
      activity,
      loading,
      error,
      loadData,
      updateAlertStatus,
      selectedTransaction,
      selectedMember,
      highlightedTransactionId,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export default DataContext;
