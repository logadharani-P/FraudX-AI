import React, { useState, useRef, useEffect, useMemo, useCallback, Component } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModuleTransition } from '../context/TransitionContext';
import api from '../lib/api';
import './AIAgent.css';

// Safety Error Boundary to ensure the AI Agent never crashes to a blank screen
class AIAgentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AIAgent caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container ai-agent-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ maxWidth: 500, padding: 32, textAlign: 'center' }}>
            <span style={{ fontSize: 36 }}>🛡️</span>
            <h2 className="heading-3" style={{ marginTop: 12, marginBottom: 8 }}>AI Assistant Recovery</h2>
            <p className="text-secondary text-sm" style={{ marginBottom: 16 }}>
              The AI Agent encountered an unexpected initialization state.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              🔄 Reload AI Agent
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AIAgentInner() {
  const { stats = {}, transactions = [], alerts = [] } = useData() || {};
  const { user } = useAuth() || {};
  const { t } = useTheme();
  const location = useLocation();
  const { navigateWithTransition } = useModuleTransition();

  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const isAnalyst = role === 'analyst';
  const isOrg = role === 'organisation';

  // Speech state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [, setActiveSpeechText] = useState('');

  // Customer-specific transactions
  const customerTxns = useMemo(() => {
    if (!isCustomer || !user?.name || !Array.isArray(transactions)) return [];
    return transactions.filter(t => t.senderName === user.name || t.receiverName === user.name);
  }, [isCustomer, user, transactions]);

  const openAlertsCount = useMemo(() => {
    if (!Array.isArray(alerts)) return 0;
    return alerts.filter(a => a.status === 'Open').length;
  }, [alerts]);

  const highRiskCount = useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length;
  }, [transactions]);

  // Initial welcome message
  const initialWelcome = useMemo(() => {
    if (isCustomer) {
      return `Welcome to FraudX AI Assistant 👋\n\nI can help you review your transactions, understand your personal risk scoring, explain MFA security, or navigate directly to any page.\n\nTry asking me to *"Show my latest transaction"* or *"Open my transactions"*.`;
    }
    if (isAnalyst) {
      if (openAlertsCount > 0) {
        return `Welcome back, ${user?.name || 'Analyst'}.\n\nThere are **${openAlertsCount} active alerts** and **${highRiskCount} high-risk transactions** requiring review in the pipeline today.\n\nYou can ask me to analyze specific transactions (e.g. \`TXN-100005\`), explain anomaly factors, or navigate to **Fraud Alerts** or **Risk Treatment**.`;
      }
      return `Welcome back, ${user?.name || 'Analyst'}.\n\nAll real-time streams are currently operating within nominal risk thresholds. You can query any transaction or audit log.`;
    }
    if (isOrg) {
      const totalVol = (((stats?.totalAmount || 0)) / 1000).toFixed(1);
      return `Welcome back, ${user?.name || 'Admin'}.\n\nHere is your current enterprise overview:\n• Total Volume Monitored: **₹${totalVol}K**\n• High-Risk Monitored Transactions: **${highRiskCount}**\n• Flagged Alerts Requiring Review: **${openAlertsCount}**\n• Telemetry Status: **Active & Compliant**`;
    }
    return `Welcome back. What would you like to review today?`;
  }, [isCustomer, isAnalyst, isOrg, user, openAlertsCount, highRiskCount, stats]);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialWelcome }
  ]);
  const [input, setInput] = useState('');
  const [agentState, setAgentState] = useState('ready'); // ready, thinking, speaking
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentState]);

  // Speech helper
  const speakText = useCallback((text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    // Clean markdown syntax for speech
    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/•/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick English natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setActiveSpeechText(text);
      setAgentState('speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setAgentState('ready');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setAgentState('ready');
    };

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const handlePauseResume = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else if (isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setAgentState('ready');
    }
  };

  const handleReplay = (text) => {
    speakText(text);
  };

  // Quick Action Chips per Role
  const quickActions = useMemo(() => {
    if (isCustomer) {
      return [
        'Show my latest transaction',
        'Open my transactions',
        'Show my risk analysis',
        'What is MFA?',
        'What does my risk score mean?',
        'Open my profile',
      ];
    }
    if (isAnalyst) {
      return [
        'Why was TXN-100005 flagged?',
        'Take me to fraud alerts',
        'What are the current high-risk transactions?',
        'Open risk treatment',
        'Show reports',
        'Explain this risk score',
      ];
    }
    return [
      'Show the current risk overview',
      'Open reports',
      'How many high-risk transactions are currently monitored?',
      'Take me to fraud alerts',
      'MFA compliance status',
    ];
  }, [isCustomer, isAnalyst]);

  // Client-side grounded queries: Navigation & local dataset retrieval
  const checkClientHandled = useCallback((query) => {
    const q = query.toLowerCase().trim();

    // 1. Direct Navigation Triggers
    if (q.includes('open') || q.includes('take me to') || q.includes('go to') || q.includes('navigate to')) {
      if (q.includes('transaction')) {
        setTimeout(() => navigateWithTransition('/transactions'), 600);
        return { handled: true, response: `Navigating to **Transactions** console now... 🚀` };
      }
      if (q.includes('risk analysis') || q.includes('risk assessment')) {
        setTimeout(() => navigateWithTransition('/risk-analysis'), 600);
        return { handled: true, response: `Opening your **Risk Analysis** dashboard now... 📊` };
      }
      if (q.includes('fraud alert') || q.includes('alert')) {
        if (isCustomer) {
          return { handled: true, response: `🔒 Fraud alert investigation consoles are restricted to authorized fraud analysts and administrators.` };
        }
        setTimeout(() => navigateWithTransition('/fraud-alerts'), 600);
        return { handled: true, response: `Navigating to **Fraud Alerts** investigation pipeline... ⚠️` };
      }
      if (q.includes('treatment') || q.includes('risk treatment')) {
        if (isCustomer) {
          return { handled: true, response: `🔒 Risk treatment controls are restricted to authorized fraud analysts.` };
        }
        setTimeout(() => navigateWithTransition('/risk-treatment'), 600);
        return { handled: true, response: `Opening **Risk Treatment** module... 🛡️` };
      }
      if (q.includes('report')) {
        if (isCustomer) {
          return { handled: true, response: `🔒 Enterprise reporting centers are restricted to analyst and organisation portals.` };
        }
        setTimeout(() => navigateWithTransition('/reports'), 600);
        return { handled: true, response: `Opening **Reports** center... 📋` };
      }
      if (q.includes('profile')) {
        setTimeout(() => navigateWithTransition('/profile'), 600);
        return { handled: true, response: `Opening your **Profile** page now... 👤` };
      }
      if (q.includes('setting')) {
        setTimeout(() => navigateWithTransition('/settings'), 600);
        return { handled: true, response: `Opening **Settings** panel... ⚙️` };
      }
    }

    // 2. Transaction Lookups (e.g. TXN-100005)
    const txnMatch = q.match(/txn-(\d+)/i);
    if (txnMatch) {
      const txnId = `TXN-${txnMatch[1]}`;
      const txn = transactions.find(t => t.id === txnId);

      if (txn) {
        // Customer authorization boundary check
        if (isCustomer && txn.senderName !== user?.name && txn.receiverName !== user?.name) {
          return {
            handled: true,
            response: `🔒 **Access Restricted**\n\nFor privacy and security, you can only inspect transactions associated with your own account (${user?.name || 'Customer'}). \`${txnId}\` belongs to another account.`
          };
        }

        let response = `**Transaction Analysis for \`${txnId}\`**\n\n`;
        response += `• **Amount:** ${txn.amountFormatted || 'Not available'}\n`;
        response += `• **Channel / Type:** ${txn.type || 'Standard'}\n`;
        response += `• **Participants:** ${txn.senderName} → ${txn.receiverName}\n`;
        response += `• **Origin:** ${txn.location || 'Location unavailable'}\n`;
        response += `• **Risk Assessment:** **${txn.riskLevel || 'Low'} Risk** (${txn.riskScore || 0}/100)\n`;
        response += `• **Status:** ${txn.status || 'Completed'} on ${txn.date} (${txn.time})\n`;

        if (txn.anomalyFactors && txn.anomalyFactors.length > 0) {
          response += `\n**Contributing Anomaly Factors:**\n`;
          txn.anomalyFactors.forEach(f => {
            response += `• ⚠️ ${f}\n`;
          });
        }

        return { handled: true, response };
      }
      return { handled: true, response: `I couldn't find a transaction with ID \`${txnId}\` in the available dataset. Please verify the identifier and try again.` };
    }

    // 3. Customer: "Show my latest transaction"
    if (q.includes('latest transaction') || q.includes('recent transaction') || (q.includes('my') && q.includes('transaction'))) {
      if (isCustomer) {
        if (customerTxns.length === 0) {
          return { handled: true, response: `You currently have **0 recorded transactions** on your account (${user?.name || 'Customer'}).` };
        }
        const latest = customerTxns[0];
        let res = `**Your Latest Transaction Record (${latest.id})**:\n\n`;
        res += `• **Amount:** ${latest.amountFormatted}\n`;
        res += `• **Recipient:** ${latest.receiverName} via ${latest.type}\n`;
        res += `• **Risk Rating:** **${latest.riskLevel} Risk** (${latest.riskScore}/100)\n`;
        res += `• **Timestamp:** ${latest.date} at ${latest.time}\n`;
        res += `• **Status:** ${latest.status}\n\n`;
        res += `Would you like me to open the full **Transactions** page?`;
        return { handled: true, response: res };
      }
    }

    // 4. "What is MFA?"
    if (q.includes('what is mfa') || q.includes('mfa code') || q.includes('multi-factor') || q.includes('2fa')) {
      return {
        handled: true,
        response: `**What is Multi-Factor Authentication (MFA)?**\n\nMulti-Factor Authentication requires two or more independent verification factors:\n\n1. **Something You Know** — Your password or secure PIN.\n2. **Something You Have** — A 6-digit verification token sent to your registered phone or hardware authenticator.\n3. **Something You Are** — Biometric telemetry validation.\n\n**Why it matters:** Even if an unauthorized entity learns your password, they cannot initiate transfers without your second physical factor.`
      };
    }

    // 5. "What does my risk score mean?"
    if (q.includes('risk score') || (q.includes('explain') && q.includes('risk')) || q.includes('scoring')) {
      return {
        handled: true,
        response: `**Understanding Risk Scores (0 to 100)**\n\nEvery transfer is scored in real-time by the FraudX AI engine:\n\n• **0–34 (Low Risk):** Normal baseline activity. Approved automatically.\n• **35–59 (Medium Risk):** Slight variation detected (e.g. new merchant). Monitored under standard rules.\n• **60–79 (High Risk):** Significant anomaly indicators (e.g. sudden amount spike). Flagged for review.\n• **80–100 (Critical Risk):** Strong anomaly indicators requiring immediate analyst triage.`
      };
    }

    // 6. Analyst / Org: "What are the current high-risk transactions?"
    if ((isAnalyst || isOrg) && (q.includes('high-risk') || q.includes('high risk') || q.includes('overview'))) {
      const topHigh = transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').slice(0, 4);
      let res = `**Current Monitored High-Risk Transactions (${highRiskCount} Total)**:\n\n`;
      topHigh.forEach(t => {
        res += `• **${t.id}**: ${t.amountFormatted} (${t.senderName} → ${t.receiverName}) — *Score: ${t.riskScore}/100 (${t.riskLevel})*\n`;
      });
      res += `\nYou can review all open cases in **Fraud Alerts** or apply mitigations in **Risk Treatment**.`;
      return { handled: true, response: res };
    }

    return { handled: false, response: null };
  }, [isCustomer, isAnalyst, isOrg, user, transactions, customerTxns, highRiskCount, navigateWithTransition]);

  // Main message sending handler
  const handleSend = useCallback(async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim()) return;

    const userMsg = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAgentState('thinking');

    // Check if query is locally handled (navigation or local dataset lookup)
    const clientResult = checkClientHandled(userMsg.content);
    if (clientResult.handled) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: clientResult.response }]);
        setAgentState('ready');
        if (voiceEnabled) {
          speakText(clientResult.response);
        }
      }, 350 + Math.random() * 200);
      return;
    }

    // Attempt backend AI service call with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await Promise.race([
        api.agent.chat(userMsg.content),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), 4500)
        )
      ]);
      clearTimeout(timeoutId);

      if (res && res.reply) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply,
            evidence: res.evidence || [],
            sources: res.sources || []
          }
        ]);
        setAgentState('ready');
        if (voiceEnabled) {
          speakText(res.reply);
        }
        return;
      }
      throw new Error('Empty response from AI service');
    } catch (err) {
      console.warn('AI service request failed:', err?.message || err);
      // DO NOT fabricate response: Show clear professional error state with retry option
      const errorMsg = {
        role: 'assistant',
        content: 'AI service is currently unavailable. Please try again.',
        isError: true,
        retryQuery: userMsg.content,
      };
      setMessages(prev => [...prev, errorMsg]);
      setAgentState('ready');
    }
  }, [input, checkClientHandled, voiceEnabled, speakText]);

  // Handle retry
  const handleRetry = useCallback((retryText) => {
    if (retryText) {
      handleSend(retryText);
    }
  }, [handleSend]);

  const handledPromptRef = useRef(false);
  useEffect(() => {
    if (location.state?.initialPrompt && !handledPromptRef.current) {
      handledPromptRef.current = true;
      const promptText = location.state.initialPrompt;
      const timer = setTimeout(() => {
        handleSend(promptText);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [location.state, handleSend]);

  const formatContent = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, li) => {
      let processed = line.replace(/^#{1,6}\s+/, '');
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
      
      if (processed.startsWith('• ')) {
        return <p key={li} style={{ margin: '3px 0', paddingLeft: 8 }} dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      return <p key={li} style={{ margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <div className="page-container ai-agent-page">
      {/* Header with Smart AI Indicator & Voice Controls */}
      <div className="page-header animate-fade-in-up" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="heading-2">🤖 {t('nav.aiAgent')}</h1>
          <p className="text-secondary text-xs">
            {isCustomer ? 'Personal financial security & conversational voice assistant' : 'Enterprise risk intelligence & automated telemetry assistant'}
          </p>
        </div>

        {/* Voice Control & Neural State Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              if (isSpeaking) handleStopSpeech();
              setVoiceEnabled(!voiceEnabled);
            }}
            title={voiceEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span>{voiceEnabled ? '🔊 Voice On' : '🔇 Muted'}</span>
          </button>

          {isSpeaking && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handlePauseResume}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleStopSpeech}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                ⏹️ Stop
              </button>
            </div>
          )}

          <div className="ai-agent-state-pill">
            <span className={`ai-state-dot ai-state-dot--${agentState}`} />
            <span className="text-xs font-semibold" style={{ textTransform: 'capitalize' }}>
              {agentState === 'thinking' ? 'Thinking...' : agentState === 'speaking' ? 'Speaking...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Glass Chat Card */}
      <div className="glass-card ai-chat-container animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Messages Feed */}
        <div className="ai-chat-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`ai-message-row ${msg.role === 'user' ? 'ai-message-row--user' : 'ai-message-row--assistant'}`}
            >
              {msg.role === 'assistant' && (
                <div className="ai-message-avatar">
                  <span>✦</span>
                </div>
              )}
              <div
                className={`ai-message-bubble ${
                  msg.role === 'user'
                    ? 'ai-message-bubble--user'
                    : msg.isError
                    ? 'ai-message-bubble--assistant ai-message-bubble--error'
                    : 'ai-message-bubble--assistant'
                }`}
              >
                {formatContent(msg.content)}

                {/* Evidence badges if returned by backend agent */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="ai-evidence-list">
                    {msg.evidence.map((ev, ei) => (
                      <div key={ei} className={`ai-evidence-card ai-evidence-card--${ev.severity || 'info'}`}>
                        <strong>{ev.title}:</strong> {ev.description}
                      </div>
                    ))}
                  </div>
                )}

                {/* Error Retry Option */}
                {msg.isError && msg.retryQuery && (
                  <div>
                    <button
                      type="button"
                      className="ai-retry-btn"
                      onClick={() => handleRetry(msg.retryQuery)}
                    >
                      🔄 Retry
                    </button>
                  </div>
                )}

                {/* Voice Replay */}
                {msg.role === 'assistant' && !msg.isError && voiceEnabled && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => handleReplay(msg.content)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Replay Voice"
                    >
                      <span>🔊 Replay</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {agentState === 'thinking' && (
            <div className="ai-message-row ai-message-row--assistant">
              <div className="ai-message-avatar">
                <span>✦</span>
              </div>
              <div className="ai-message-bubble ai-message-bubble--assistant ai-thinking-bubble">
                <span className="ai-thinking-dot" />
                <span className="ai-thinking-dot" />
                <span className="ai-thinking-dot" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="ai-quick-chips-row">
          {quickActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="ai-quick-chip"
              onClick={() => handleSend(action)}
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            className="input ai-input-field"
            type="text"
            placeholder={
              isCustomer
                ? "Ask about your transactions, risk ratings, MFA, or ask to open a page..."
                : "Ask about TXN-XXXXXX, anomaly patterns, or high-risk transactions..."
            }
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm ai-send-btn"
            disabled={!input.trim() || agentState === 'thinking'}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AIAgent() {
  return (
    <AIAgentErrorBoundary>
      <AIAgentInner />
    </AIAgentErrorBoundary>
  );
}
