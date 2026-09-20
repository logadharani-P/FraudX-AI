import React from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

export default function Reports() {
  const { stats } = useData();
  const { t } = useTheme();

  const reportCards = [
    {
      id: 'transaction-summary',
      title: 'Transaction Summary Report',
      desc: `Complete overview of all ${stats.totalTransactions?.toLocaleString() || 0} transactions processed`,
      icon: '📄',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Ready',
    },
    {
      id: 'fraud-detection',
      title: 'Fraud Detection Report',
      desc: `${stats.fraudCount || 0} fraud cases detected with AI-powered analysis`,
      icon: '🔍',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Ready',
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment Report',
      desc: 'Comprehensive risk scoring and categorization across all transaction types',
      icon: '📊',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Ready',
    },
    {
      id: 'audit-trail',
      title: 'Compliance Audit Trail',
      desc: 'Full audit trail of all system actions and compliance checks',
      icon: '✅',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Ready',
    },
    {
      id: 'anomaly-summary',
      title: 'Anomaly Detection Summary',
      desc: 'Detailed breakdown of anomalies flagged by the ML engine',
      icon: '⚡',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Ready',
    },
    {
      id: 'executive-summary',
      title: 'Monthly Executive Summary',
      desc: 'High-level metrics and trends for executive stakeholders',
      icon: '📈',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Ready',
    },
  ];

  const handleDownload = async (reportId) => {
    try {
      const downloadUrl = api.reports.getDownloadUrl(reportId, 'csv');
      const token = localStorage.getItem('fraudx_token');

      // Fetch file with auth token
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.headers.get('content-type')?.includes('text/csv')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportId}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportId}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">📋 {t('nav.reports')}</h1>
          <p className="text-secondary">Generate and download live fraud analysis reports</p>
        </div>
      </div>

      <div className="card-grid card-grid--2col animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {reportCards.map((report, idx) => (
          <div key={idx} className="glass-card animate-fade-in-up" style={{ animationDelay: `${(idx + 1) * 80}ms` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: '1.5rem' }}>{report.icon}</span>
              <div style={{ flex: 1 }}>
                <h3 className="text-sm font-semibold" style={{ margin: '0 0 4px' }}>{report.title}</h3>
                <p className="text-xs text-tertiary" style={{ margin: 0, lineHeight: 1.4 }}>{report.desc}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-tertiary">{report.date}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${report.status === 'Ready' ? 'badge-low' : 'badge-medium'}`}>
                  {report.status}
                </span>
                {report.status === 'Ready' && (
                  <button className="btn btn-sm btn-primary" onClick={() => handleDownload(report.id)}>
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
