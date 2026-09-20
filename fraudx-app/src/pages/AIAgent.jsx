import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

export default function AIAgent() {
  const { user } = useAuth();
  const { t } = useTheme();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}! 👋 I am the **FraudX Intelligence Agent**.\n\nI provide grounded, evidence-backed insights directly from the PostgreSQL transaction ledger, Isolation Forest anomaly models, and NetworkX transaction graphs.\n\n**Try asking me:**\n• "Analyze transaction TXN-100001"\n• "Show me the top open fraud alerts"\n• "What are the details for member MBR-400001?"\n• "Explain the network laundering patterns detected"`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMsg = { role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const data = await api.agent.chat(userText);
      let replyText = data.reply || 'No analysis available for this query.';

      if (data.evidence && data.evidence.length > 0) {
        replyText += '\n\n**📋 Grounded Evidence:**\n' + data.evidence.map(e => `• *[${e.type.toUpperCase()}]* ${e.title}: ${e.description}`).join('\n');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: replyText }]);
    } catch (err) {
      console.error('Agent chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to reach the FraudX Intelligence Agent service. Error: ${err.message || 'Network error'}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 48px)' }}>
      <div className="page-header animate-fade-in-up" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="heading-2">🤖 {t('nav.aiAgent')}</h1>
          <p className="text-secondary">AI-powered fraud analysis assistant (Connected to FastAPI backend)</p>
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
                  maxWidth: '85%',
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
                  return <p key={li} style={{ margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: bold }} />;
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
            placeholder="Ask about transaction TXN-100001, member MBR-400001, or open alerts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1 }}
            disabled={isTyping}
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || isTyping}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
