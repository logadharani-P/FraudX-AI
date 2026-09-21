import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './AIAgent.css';

export default function AIAgent() {
  const { stats, transactions, alerts } = useData();
  const { user } = useAuth();
  const { t } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const isAnalyst = role === 'analyst';
  const isOrg = role === 'organisation';

  // Speech state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState('');

  // Customer-specific transactions
  const customerTxns = useMemo(() => {
    if (!isCustomer || !user?.name) return [];
    return transactions.filter(t => t.senderName === user.name || t.receiverName === user.name);
  }, [isCustomer, user, transactions]);

  const openAlertsCount = useMemo(() => {
    return alerts.filter(a => a.status === 'Open').length;
  }, [alerts]);

  const highRiskCount = useMemo(() => {
    return transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length;
  }, [transactions]);

  // Initial welcome
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
      const totalVol = ((stats.totalAmount || 0) / 1000).toFixed(1);
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

  const generateResponse = useCallback((query) => {
    const q = query.toLowerCase().trim();

    // Direct Navigation Triggers
    if (q.includes('open') || q.includes('take me to') || q.includes('go to') || q.includes('navigate to')) {
      if (q.includes('transaction')) {
        setTimeout(() => navigate('/transactions'), 900);
        return `Navigating to **Transactions** console now... 🚀`;
      }
      if (q.includes('risk analysis') || q.includes('risk assessment')) {
        setTimeout(() => navigate('/risk-analysis'), 900);
        return `Opening your **Risk Analysis** dashboard now... 📊`;
      }
      if (q.includes('fraud alert') || q.includes('alert')) {
        if (isCustomer) {
          return `🔒 Fraud alert investigation consoles are restricted to authorized fraud analysts and administrators.`;
        }
        setTimeout(() => navigate('/fraud-alerts'), 900);
        return `Navigating to **Fraud Alerts** investigation pipeline... ⚠️`;
      }
      if (q.includes('treatment') || q.includes('risk treatment')) {
        if (isCustomer) {
          return `🔒 Risk treatment controls are restricted to authorized fraud analysts.`;
        }
        setTimeout(() => navigate('/risk-treatment'), 900);
        return `Opening **Risk Treatment** module... 🛡️`;
      }
      if (q.includes('report')) {
        if (isCustomer) {
          return `🔒 Enterprise reporting centers are restricted to analyst and organisation portals.`;
        }
        setTimeout(() => navigate('/reports'), 900);
        return `Opening **Reports** center... 📋`;
      }
      if (q.includes('profile')) {
        setTimeout(() => navigate('/profile'), 900);
        return `Opening your **Profile** page now... 👤`;
      }
      if (q.includes('setting')) {
        setTimeout(() => navigate('/settings'), 900);
        return `Opening **Settings** panel... ⚙️`;
      }
    }

    // 1. Transaction Lookups (e.g. TXN-100005)
    const txnMatch = q.match(/txn-(\d+)/i);
    if (txnMatch) {
      const txnId = `TXN-${txnMatch[1]}`;
      const txn = transactions.find(t => t.id === txnId);

      if (txn) {
        // Customer authorization boundary check
        if (isCustomer && txn.senderName !== user?.name && txn.receiverName !== user?.name) {
          return `🔒 **Access Restricted**\n\nFor privacy and security, you can only inspect transactions associated with your own account (${user?.name || 'Customer'}). \`${txnId}\` belongs to another account.`;
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

        return response;
      }
      return `I couldn't find a transaction with ID \`${txnId}\` in the available dataset. Please verify the identifier and try again.`;
    }

    // 2. Customer: "Show my latest transaction"
    if (q.includes('latest transaction') || q.includes('recent transaction') || (q.includes('my') && q.includes('transaction'))) {
      if (isCustomer) {
        if (customerTxns.length === 0) {
          return `You currently have **0 recorded transactions** on your account (${user?.name || 'Customer'}).`;
        }
        const latest = customerTxns[0];
        let res = `**Your Latest Transaction Record (${latest.id})**:\n\n`;
        res += `• **Amount:** ${latest.amountFormatted}\n`;
        res += `• **Recipient:** ${latest.receiverName} via ${latest.type}\n`;
        res += `• **Risk Rating:** **${latest.riskLevel} Risk** (${latest.riskScore}/100)\n`;
        res += `• **Timestamp:** ${latest.date} at ${latest.time}\n`;
        res += `• **Status:** ${latest.status}\n\n`;
        res += `Would you like me to open the full **Transactions** page?`;
        return res;
      }
    }

    // 3. "What is MFA?"
    if (q.includes('mfa') || q.includes('multi-factor') || q.includes('two-factor') || q.includes('2fa')) {
      return `**What is Multi-Factor Authentication (MFA)?**\n\nMulti-Factor Authentication requires two or more independent verification factors:\n\n1. **Something You Know** — Your password or secure PIN.\n2. **Something You Have** — A 6-digit verification token sent to your registered phone or hardware authenticator.\n3. **Something You Are** — Biometric telemetry validation.\n\n**Why it matters:** Even if an unauthorized entity learns your password, they cannot initiate transfers without your second physical factor.`;
    }

    // 4. "What does my risk score mean?" / "Explain risk score"
    if (q.includes('risk score') || (q.includes('explain') && q.includes('risk')) || q.includes('scoring')) {
      return `**Understanding Risk Scores (0 to 100)**\n\nEvery transfer is scored in real-time by the FraudX AI engine:\n\n• **0–34 (Low Risk):** Normal baseline activity. Approved automatically.\n• **35–59 (Medium Risk):** Slight variation detected (e.g. new merchant). Monitored under standard rules.\n• **60–79 (High Risk):** Significant anomaly indicators (e.g. sudden amount spike). Flagged for review.\n• **80–100 (Critical Risk):** Strong anomaly indicators requiring immediate analyst triage.`;
    }

    // 5. Analyst / Org: "Why was TXN-XXXXXX flagged?" or "What are the current high-risk transactions?"
    if (isAnalyst || isOrg) {
      if (q.includes('high-risk') || q.includes('high risk') || q.includes('overview')) {
        const topHigh = transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').slice(0, 4);
        let res = `**Current Monitored High-Risk Transactions (${highRiskCount} Total)**:\n\n`;
        topHigh.forEach(t => {
          res += `• **${t.id}**: ${t.amountFormatted} (${t.senderName} → ${t.receiverName}) — *Score: ${t.riskScore}/100 (${t.riskLevel})*\n`;
        });
        res += `\nYou can review all open cases in **Fraud Alerts** or apply mitigations in **Risk Treatment**.`;
        return res;
      }

      if (q.includes('anomal') || q.includes('pattern')) {
        return `**Detected Anomaly Factors in Active Pipeline**:\n\n1. **Unusual Transaction Amount:** High deviation from member baseline.\n2. **Rapid Velocity Sequence:** Multiple transfers in compressed timeframe.\n3. **Geographic Inconsistency:** Origin location inconsistent with user profile.\n4. **Unusual Timing:** Out-of-pattern off-hours execution.`;
      }
    }

    // Default response
    if (isCustomer) {
      return `I can help with your account security and transfers! Try asking:\n\n• *"Show my latest transaction"*\n• *"Open my transactions"*\n• *"Show my risk analysis"*\n• *"What is MFA?"*\n• *"What does my risk score mean?"*`;
    }

    return `I'm ready to assist your investigation! Try asking:\n\n• *"Why was TXN-100005 flagged?"*\n• *"Take me to fraud alerts"*\n• *"What are the current high-risk transactions?"*\n• *"Open risk treatment"*\n• *"Show reports"*`;
  }, [isCustomer, isAnalyst, isOrg, user, transactions, customerTxns, highRiskCount, navigate]);

  const handleSend = useCallback((textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim()) return;

    const userMsg = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAgentState('thinking');

    setTimeout(() => {
      const response = generateResponse(userMsg.content);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setAgentState('ready');
      if (voiceEnabled) {
        speakText(response);
      }
    }, 450 + Math.random() * 250);
  }, [input, generateResponse, voiceEnabled, speakText]);

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
              <div className={`ai-message-bubble ${msg.role === 'user' ? 'ai-message-bubble--user' : 'ai-message-bubble--assistant'}`}>
                {formatContent(msg.content)}
                {msg.role === 'assistant' && voiceEnabled && (
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
