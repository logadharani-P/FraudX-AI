import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import demoRawData from '../data/demoTransactions.json';
import { enrichDataset } from '../data/enrichDataset';

const DataContext = createContext(null);

// Load treatments from localStorage
function loadTreatments() {
  try {
    const saved = localStorage.getItem('fraudx-treatments');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState(null);
  const [treatments, setTreatments] = useState(loadTreatments);

  useEffect(() => {
    try {
      const enriched = enrichDataset(demoRawData);
      setData(enriched);
    } catch (err) {
      console.error('Failed to enrich dataset:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist treatments to localStorage
  useEffect(() => {
    localStorage.setItem('fraudx-treatments', JSON.stringify(treatments));
  }, [treatments]);

  const applyTreatment = useCallback(async (alertId, treatment, performedBy) => {
    const timestamp = new Date().toISOString();
    const actor = performedBy || 'System';

    // 1. Immediately update local state & registry (guaranteed & non-blocking)
    setTreatments(prev => {
      const next = {
        ...prev,
        [alertId]: {
          ...treatment,
          performedBy: actor,
          appliedAt: timestamp,
        },
      };
      try {
        localStorage.setItem('fraudx-treatments', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save treatment to localStorage:', e);
      }
      return next;
    });

    // 2. Resilient background sync with backend if available
    try {
      const { default: api } = await import('../lib/api').catch(() => ({ default: null }));
      if (api?.alerts?.update) {
        const actionMap = {
          block: 'blocked',
          whitelist: 'whitelisted',
          freeze: 'frozen',
          escalate: 'escalated',
          monitor: 'in_progress',
        };
        const targetStatus = actionMap[treatment.id] || 'resolved';
        await api.alerts.update(alertId, {
          status: targetStatus,
          resolution_note: `${treatment.label} applied by ${actor}`,
        }).catch(() => null);
      }
    } catch {
      // Non-blocking: local state is already persisted
    }
  }, []);

  const getTreatment = useCallback((alertId) => {
    return treatments[alertId] || null;
  }, [treatments]);

  const value = useMemo(() => ({
    transactions: data?.transactions || [],
    members: data?.members || [],
    alerts: data?.alerts || [],
    stats: data?.stats || {},
    people: data?.people || [],
    loading,
    selectedTransaction,
    setSelectedTransaction,
    selectedMember,
    setSelectedMember,
    highlightedTransactionId,
    setHighlightedTransactionId,
    treatments,
    applyTreatment,
    getTreatment,
    getTransactionById: (id) => data?.transactions?.find(t => t.id === id),
    getMemberById: (id) => data?.members?.find(m => m.id === id || m.memberId === id),
    getTransactionsForMember: (memberId) => data?.transactions?.filter(
      t => t.senderId === memberId || t.receiverId === memberId
    ) || [],
    getAlertForTransaction: (txnId) => data?.alerts?.find(a => a.transactionId === txnId),
    getMemberByName: (name) => data?.members?.find(m => m.name?.toLowerCase() === name?.toLowerCase()),
  }), [data, loading, selectedTransaction, selectedMember, highlightedTransactionId, treatments, applyTreatment, getTreatment]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export default DataContext;
