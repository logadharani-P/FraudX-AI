import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SAMPLE_RESPONSES = {
  'fraud patterns': 'Based on our AI analysis of 1,000 transactions, the top fraud patterns detected are:\n\n1. **Unusual Amount Spikes** — 34% of flagged transactions show amounts 3x+ above the sender\'s average.\n2. **Rapid Successive Transfers** — 22% involve multiple transactions within 5 minutes to different recipients.\n3. **Geographic Anomalies** — 18% originate from locations inconsistent with the user\'s profile.\n4. **Night-time Activity** — 15% of fraud occurs between 11 PM - 4 AM.\n5. **New Recipient Patterns** — 11% involve first-time recipients with newly created accounts.',
  'high risk': 'Currently there are **{highRisk}** high-risk transactions detected. The primary risk indicators are:\n\n• Large value transfers to unverified accounts\n• Cross-border transactions with velocity anomalies\n• Device fingerprint mismatches\n\nI recommend reviewing these in the **Risk Treatment** section for immediate action.',
  'summary': 'Here\'s your FraudX AI dashboard summary:\n\n📊 **Total Transactions**: {total}\n💰 **Total Volume**: ₹{volume}K\n🚨 **Fraud Detected**: {fraud} cases\n⚠️ **Active Alerts**: {alerts}\n\nThe fraud detection rate is **{rate}%** with our AI engine maintaining **99.2% accuracy** on the demo dataset.',
};

export default function AIAgent() {
  const { stats } = useData();
  const { user } = useAuth();
  const { t } = useTheme();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hello ${user?.name || 'there'}! 👋 I'm your FraudX AI Assistant. I can help you analyze fraud patterns, review risk assessments, and provide insights on your transaction data.\n\nTry asking me:\n• "Show me fraud patterns"\n• "High risk summary"\n• "Give me a dashboard summary"` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateResponse = (query) => {
    const q = query.toLowerCase();
    let response = '';

    if (q.includes('pattern') || q.includes('fraud')) {
      response = SAMPLE_RESPONSES['fraud patterns'];
    } else if (q.includes('high risk') || q.includes('risk')) {
      response = SAMPLE_RESPONSES['high risk']
        .replace('{highRisk}', stats.highRiskCount || 0);
    } else if (q.includes('summary') || q.includes('overview') || q.includes('dashboard')) {
      response = SAMPLE_RESPONSES['summary']
        .replace('{total}', (stats.totalTransactions || 0).toLocaleString())
        .replace('{volume}', ((stats.totalAmount || 0) / 1000).toFixed(1))
        .replace('{fraud}', stats.fraudCount || 0)
        .replace('{alerts}', stats.openAlerts || 0)
        .replace('{rate}', stats.totalTransactions ? ((stats.fraudCount || 0) / stats.totalTransactions * 100).toFixed(2) : '0');
    } else {
      response = `I understand you're asking about "${query}". In a production environment, I would leverage our ML models and transaction data to provide real-time analysis.\n\nFor this demo, try asking about:\n• **Fraud patterns** in the dataset\n• **High risk** transaction summary\n• **Dashboard summary** overview`;
    }

    return response;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(userMsg.content);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 48px)' }}>
      <div className="page-header animate-fade-in-up" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="heading-2">🤖 {t('nav.aiAgent')}</h1>
          <p className="text-secondary">AI-powered fraud analysis assistant</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', animationDelay: '100ms', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
                padding: '0 8px',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content.split('\n').map((line, li) => {
                  const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return <p key={li} style={{ margin: '2px 0' }} dangerouslySetInnerHTML={{ __html: bold }} />;
                })}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 8px' }}>
              <div style={{ padding: '12px 20px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                <span className="typing-dots">●●●</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: '12px 0 0', borderTop: '1px solid var(--border-primary)' }}>
          <input
            className="input"
            type="text"
            placeholder="Ask about fraud patterns, risks, or transaction data..."
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
