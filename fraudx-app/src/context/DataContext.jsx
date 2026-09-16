import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import demoRawData from '../data/demoTransactions.json';
import { enrichDataset } from '../data/enrichDataset';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState(null);

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
    getTransactionById: (id) => data?.transactions?.find(t => t.id === id),
    getMemberById: (id) => data?.members?.find(m => m.id === id || m.memberId === id),
    getTransactionsForMember: (memberId) => data?.transactions?.filter(
      t => t.senderId === memberId || t.receiverId === memberId
    ) || [],
    getAlertForTransaction: (txnId) => data?.alerts?.find(a => a.transactionId === txnId),
  }), [data, loading, selectedTransaction, selectedMember, highlightedTransactionId]);

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
