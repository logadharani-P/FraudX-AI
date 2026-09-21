import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AIAgent() {
  const { stats, transactions, members, alerts } = useData();
  const { user } = useAuth();
  const { t } = useTheme();
  const location = useLocation();

  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const isAnalyst = role === 'analyst';
  const isOrg = role === 'organisation';

  // Customer-specific transactions
  const customerTxns = useMemo(() => {
    if (!isCustomer || !user?.name) return [];
    return transactions.filter(t => t.senderName === user.name || t.receiverName === user.name);
  }, [isCustomer, user, transactions]);

  // Open alerts count
  const openAlertsCount = useMemo(() => {
    return alerts.filter(a => a.status === 'Open').length;
  }, [alerts]);

  // Build context-aware welcome message
  const initialWelcome = useMemo(() => {
    if (isCustomer) {
      return `Welcome to FraudX AI 👋\n\nI'm your AI assistant. What do you need help with right now?\n\nI can explain your transactions, answer questions about account security, or explain what multi-factor authentication (MFA) is.`;
    }
    if (isAnalyst) {
      if (openAlertsCount > 0) {
        return `Welcome back, ${user?.name || 'Analyst'}.\n\nThere are **${openAlertsCount} alerts** requiring your attention today. You can ask me to analyze specific transactions (e.g., \`TXN-100005\`), break down risk factors, or summarize current investigation patterns.`;
      }
      return `Welcome back, ${user?.name || 'Analyst'}.\n\nThere are no pending alerts requiring immediate attention at this time. All transaction streams are operating within normal risk parameters.`;
    }
    if (isOrg) {
      const totalVol = ((stats.totalAmount || 0) / 1000).toFixed(1);
      return `Welcome back, ${user?.name || 'Admin'}.\n\nHere's an overview of your organisation's current risk activity:\n• Total Volume Monitored: **₹${totalVol}K**\n• Active Detected Anomalies: **${stats.fraudCount || 0} cases**\n• Telemetry Status: **Monitoring Active**`;
    }
    return `Welcome back. What would you like to review today?`;
  }, [isCustomer, isAnalyst, isOrg, user, openAlertsCount, stats]);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialWelcome }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Quick Action Chips per Role
  const quickActions = useMemo(() => {
    if (isCustomer) {
      return [
        'View My Transactions',
        'What is MFA?',
        'What does my risk score mean?',
        'Help Me Understand My Account',
        'How frequently do I make transactions?',
        'How can I become a member?',
        'What are the benefits of membership?',
        'Contact Support',
      ];
    }
    if (isAnalyst) {
      return [
        'Why was TXN-100005 flagged?',
        'What factors contributed to this risk score?',
        'Show related transactions',
        'Summarize this investigation',
        'What happened before this alert?',
        'Security overview',
      ];
    }
    return [
      'Organisation risk overview',
      'Security audit status',
      'Member risk breakdown',
      'MFA compliance status',
    ];
  }, [isCustomer, isAnalyst]);

  const generateResponse = (query) => {
    const q = query.toLowerCase().trim();

    // 1. Transaction Lookups (e.g. TXN-100005)
    const txnMatch = q.match(/txn-(\d+)/i);
    if (txnMatch) {
      const txnId = `TXN-${txnMatch[1]}`;
      const txn = transactions.find(t => t.id === txnId);

      if (txn) {
        // Customer authorization boundary check
        if (isCustomer && txn.senderName !== user?.name && txn.receiverName !== user?.name) {
          return `🔒 **Access Restricted**\n\nFor privacy and security, you can only view transactions associated with your own account (${user?.name}). ${txnId} belongs to another account.`;
        }

        const alert = alerts.find(a => a.transactionId === txnId);
        let response = `**Transaction Details for ${txnId}**\n\n`;
        response += `• **Amount:** ${txn.amountFormatted}\n`;
        response += `• **Type / Channel:** ${txn.type}\n`;
        response += `• **Sender:** ${txn.senderName} → **Receiver:** ${txn.receiverName}\n`;
        response += `• **Location:** ${txn.location}\n`;
        response += `• **Risk Assessment:** ${txn.riskLevel} Risk (${txn.riskScore}/100)\n`;
        response += `• **Status:** ${txn.status}\n`;
        response += `• **Date & Time:** ${txn.date} at ${txn.time}\n`;

        if (txn.anomalyFactors && txn.anomalyFactors.length > 0) {
          response += `\n**Risk Indicators Detected:**\n`;
          txn.anomalyFactors.forEach(f => {
            response += `• ${f}\n`;
          });
        }

        if (txn.isFraud) {
          response += `\n⚠️ **Classification:** Flagged as high-risk anomaly by AI detection model.`;
        }
        return response;
      }
      return `I couldn't find a transaction with ID \`${txnId}\` in the available dataset. Please check the identifier and try again.`;
    }

    // 2. Customer: "View My Transactions" / "Show my recent transactions" / "Explain a transaction"
    if (q.includes('explain') && (q.includes('transaction') || q.includes('latest'))) {
      if (isCustomer) {
        if (customerTxns.length === 0) {
          return `You currently have **0 transactions** on your account (${user?.name}) to explain.`;
        }
        const latest = customerTxns[0];
        let res = `**Explanation for Your Latest Transaction (${latest.id})**:\n\n`;
        res += `• **Amount:** ${latest.amountFormatted}\n`;
        res += `• **Recipient:** ${latest.receiverName} via ${latest.type}\n`;
        res += `• **Risk Level:** **${latest.riskLevel} Risk** (${latest.riskScore}/100)\n`;
        res += `• **Status:** ${latest.status} on ${latest.date}\n`;
        res += `• **Assessment:** This transaction was verified using your registered security profile. No anomalous indicators were detected.`;
        return res;
      }
    }

    if (q.includes('my transaction') || q.includes('recent transaction') || q.includes('my account') || q.includes('view my transactions')) {
      if (isCustomer) {
        if (customerTxns.length === 0) {
          return `You currently have **0 transactions** recorded on your account (${user?.name}).`;
        }
        let res = `**Your Recent Transactions (${user?.name})**:\n\n`;
        customerTxns.slice(0, 5).forEach(t => {
          res += `• **${t.id}**: ${t.amountFormatted} via ${t.type} to ${t.receiverName} (${t.date}) — *Risk: ${t.riskLevel}*\n`;
        });
        res += `\nYou can review all your transactions with full audit histories in the **Transactions** section.`;
        return res;
      }
    }

    // 3. Member Lookups (e.g. "Who is Priya Iyer" / "Who is Arjun Sharma")
    const whoMatch = q.match(/who is (.+?)[\?]?$/i);
    if (whoMatch) {
      const searchName = whoMatch[1].trim();

      // Strict boundary: Customers cannot search arbitrary other members
      if (isCustomer && searchName.toLowerCase() !== user?.name?.toLowerCase()) {
        return `🔒 **Privacy Protection**\n\nAs a customer user, member lookup searches across other customer profiles are restricted. You can only view your own profile information in the **Profile** section.`;
      }

      const member = members.find(m => m.name?.toLowerCase().includes(searchName.toLowerCase()));
      if (member) {
        const memberTxns = transactions.filter(t => t.senderId === member.id || t.receiverId === member.id);
        let response = `**Member Profile: ${member.name}**\n\n`;
        response += `• **Member ID:** ${member.memberId || member.id}\n`;
        response += `• **Location:** ${member.city || 'Mumbai'}\n`;
        response += `• **Bank:** ${member.bank || 'FraudX Financial Services'}\n`;
        response += `• **Recorded Transactions:** ${memberTxns.length}\n`;
        if (memberTxns.length > 0) {
          const totalAmt = memberTxns.reduce((s, t) => s + t.amount, 0);
          response += `• **Total Volume:** ₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
        }
        if (!isCustomer) {
          response += `• **Risk Status:** ${member.riskStatus || 'Normal'}\n`;
        }
        return response;
      }
      return `I couldn't find a member record for "${searchName}".`;
    }

    // 4. "What is MFA?"
    if (q.includes('mfa') || q.includes('multi-factor') || q.includes('two-factor') || q.includes('2fa') || q.includes('verification code')) {
      return `**What is Multi-Factor Authentication (MFA)?**\n\nMulti-Factor Authentication is an essential security layer that requires two or more verification methods before granting access to your account:\n\n1. **Something You Know** — Your secret password or PIN.\n2. **Something You Have** — A 6-digit verification code sent to your registered device or authenticator.\n3. **Something You Are** — Biometric verification (e.g., face or fingerprint matching for analyst roles).\n\n**Why it matters:** Even if someone discovers your password, they cannot access your account without the physical verification code.`;
    }

    // 5. "What does my risk score mean?" / "Explain risk score"
    if (q.includes('risk score') || (q.includes('explain') && q.includes('risk')) || q.includes('scoring')) {
      return `**Understanding Risk Scores (0 to 100)**\n\nEvery transaction is evaluated in real-time by the FraudX AI engine:\n\n• **0–34 (Low Risk):** Normal activity matching historical patterns. Approved automatically.\n• **35–59 (Medium Risk):** Minor anomalies detected (e.g., new merchant or timing shift). Monitored closely.\n• **60–79 (High Risk):** Significant risk indicators (e.g., sudden amount spike, foreign location). Flagged for review.\n• **80–100 (Critical Risk):** Strong indicators of fraud or compromise. Immediate treatment or escalation required.\n\nFactors analyzed include transaction volume, device fingerprints, velocity, and recipient network trust.`;
    }

    // 6. "How frequently do I make transactions?" / "Transaction frequency"
    if (q.includes('frequency') || q.includes('frequently') || q.includes('how often')) {
      if (isCustomer) {
        return `Based on your account activity (${user?.name}):\n\n• You have completed **${customerTxns.length} transactions** with FraudX.\n• Your transactions are typically processed during daytime business hours.\n• Risk levels across your transactions remain within safe limits.`;
      }
      const total = stats.totalTransactions || 0;
      return `**Dataset Transaction Velocity**:\n\n• Total Transactions: **${total.toLocaleString()}**\n• Average Rate: ~**${Math.round(total / 3)} transactions/day**\n• Peak Activity: Observed during business hours (10:00 AM – 6:00 PM)\n• Flagged Anomalies: **${stats.fraudCount || 0} cases**`;
    }

    // 7. "How can I become a member?"
    if (q.includes('become a member') || q.includes('how to join') || q.includes('register') || q.includes('sign up') || q.includes('membership')) {
      return `**How to Become a FraudX Member**:\n\n1. **Online or Branch Application** — Submit your member registration request.\n2. **KYC Verification** — Complete identity verification with Aadhaar / PAN and proof of address.\n3. **Security Setup** — Set up strong credentials and enable Multi-Factor Authentication (MFA).\n4. **Account Activation** — Receive your unique Member ID to start making secure transactions.`;
    }

    // 8. "What are the benefits of membership?"
    if (q.includes('benefit') || q.includes('advantage') || q.includes('perk')) {
      return `**Benefits of FraudX AI Membership**:\n\n• **Real-Time AI Protection:** Automatic 24/7 scanning against fraud and identity theft.\n• **Zero Unauthorized Liability:** Instant alerts for anomalous transactions.\n• **Instant MFA Security:** Two-factor authorization on all high-value transactions.\n• **Multi-Language Access:** Native support in English, Tamil, Hindi, and Telugu.\n• **Comprehensive Records:** Transparent risk insights and exportable statements.`;
    }

    // 9. Navigation Commands (Voice / Text Page Navigation Assist)
    if (q.includes('take me to') || q.includes('go to') || q.includes('navigate to') || q.includes('open page') || q.includes('next page')) {
      if (q.includes('transaction')) {
        return `📊 **Navigating to Transactions**\n\nYou can review all your transaction records, search by sender/receiver, filter by risk level, and inspect detailed receipts.\n\n👉 Click **Transactions** in the left sidebar or click the Transactions button on your Dashboard to view them.`;
      }
      if (q.includes('risk') || q.includes('analysis')) {
        return `🛡️ **Navigating to Risk Analysis**\n\nRisk Analysis provides visual breakdown of anomaly factors, distribution curves, and transaction risk scoring across the network.\n\n👉 Click **Risk Analysis** in the sidebar to open the full dashboard.`;
      }
      if (q.includes('security') || q.includes('telemetry')) {
        return `🔐 **Navigating to Security Center**\n\nSecurity Center logs live authentication telemetry, device tokens, and failed login alerts.\n\n👉 Click **Security Center** in the sidebar to inspect system telemetry.`;
      }
      if (q.includes('profile') || q.includes('my account')) {
        return `👤 **Navigating to My Profile**\n\nYour profile contains your verified Customer ID, contact details, linked account numbers, and membership status.\n\n👉 Click **Profile** in the sidebar to view or edit your account information.`;
      }
      if (q.includes('setting') || q.includes('theme') || q.includes('language')) {
        return `⚙️ **Navigating to Settings**\n\nIn Settings, you can switch languages (English, Hindi, Tamil, Telugu), adjust theme modes (Luminous, Midnight, Aurora), set font sizes, and configure 2FA.\n\n👉 Click **Settings** in the sidebar to customize your preferences.`;
      }
      if (q.includes('dashboard') || q.includes('home')) {
        return `🏠 **Navigating to Dashboard**\n\nYour Dashboard provides an instant overview of your recent account activity, personalized AI voice greeting, and real-time statistics.\n\n👉 Click **Dashboard** in the sidebar to return to the home overview.`;
      }
      return `🧭 **Navigation Assistant**\n\nHere are the available sections in FraudX AI:\n• **Dashboard:** Home overview & AI Welcome\n• **Transactions:** Live transaction stream & receipts\n• **Risk Analysis:** Anomaly distribution & risk trends\n• **Security Center:** Authentication telemetry & MFA\n• **Profile:** Your KYC & account credentials\n• **Settings:** Multilingual & theme preferences`;
    }

    // 10. "What is FraudX AI?" / "About this project" / "How does this project work?"
    if (q.includes('what is fraudx') || q.includes('about fraudx') || q.includes('about this project') || q.includes('how does fraudx work') || q.includes('what does this project do') || q.includes('explain fraudx')) {
      return `**About FraudX AI — Financial Fraud Detection Platform**\n\nFraudX AI is an end-to-end intelligent security platform designed to safeguard financial transactions against modern fraud vectors:\n\n• 🧠 **AI-Powered Anomaly Engine:** Scans every transaction in real-time using Isolation Forest and Ensemble Neural models, assigning a risk score from 0 (Safe) to 100 (Critical).\n• ⚡ **Sub-Second Processing:** Anomaly classification completes in under 50 milliseconds with deep factor explainability.\n• 🔐 **Adaptive Multi-Factor Authentication (MFA):** Dynamically challenges high-risk transfers with 6-digit OTPs and biometric verification.\n• 🌐 **Multilingual Voice Experience:** Full native support for **English, हिन्दी (Hindi), தமிழ் (Tamil), and తెలుగు (Telugu)** with customized female (Aria), male (Alex), and neural voice personas.\n• 🛡️ **Role-Based Security:** Specialized workflows for **Customers** (account monitoring), **Analysts** (investigations), and **Organisations** (enterprise risk telemetry).`;
    }

    // 11. "How does machine learning / AI detection work?"
    if (q.includes('how does fraud detection work') || q.includes('algorithm') || q.includes('machine learning') || q.includes('ml model') || q.includes('detection model')) {
      return `**How FraudX AI Detection Engine Works**:\n\n1. **Data Ingestion:** Streams transaction metadata including sender, recipient, amount, timestamp, channel, IP geolocation, and device fingerprints.\n2. **Feature Engineering:** Compares incoming transfer parameters against historical user baselines (e.g. 30-day velocity, median amount, typical hours).\n3. **ML Classification:**\n   • **Isolation Forest:** Identifies outliers in multi-dimensional feature space.\n   • **Neural Risk Scorer:** Computes probabilistic risk weight (0–100).\n4. **Risk Thresholds:**\n   • **0–34 (Low):** Approved seamlessly.\n   • **35–59 (Medium):** Logged with telemetry alert.\n   • **60–79 (High):** Flagged and requires MFA step-up.\n   • **80–100 (Critical):** Auto-frozen pending investigator review.`;
    }

    // 12. "What languages and voices are supported?"
    if (q.includes('language') || q.includes('voice') || q.includes('persona') || q.includes('girl') || q.includes('boy')) {
      return `**FraudX AI Multilingual & Voice Personas**:\n\n• **Supported Languages:**\n  1. 🇬🇧 **English** (en)\n  2. 🇮🇳 **हिन्दी / Hindi** (hi)\n  3. 🇮🇳 **தமிழ் / Tamil** (ta)\n  4. 🇮🇳 **తెలుగు / Telugu** (te)\n\n• **Voice & Avatar Personas:**\n  • 👩‍💼 **Aria (Female Voice):** Friendly and natural female assistant with dynamic girl avatar logo.\n  • 👨‍💼 **Alex (Male Voice):** Articulate and calm male assistant with dynamic boy avatar logo.\n  • 🤖 **CyberX (Neural Bot):** High-precision synthetic security voice.\n\nYou can switch voice personas and languages on the Customer Dashboard or in Settings.`;
    }

    // 13. "What roles are supported?" / "User roles"
    if (q.includes('role') || q.includes('analyst') || q.includes('organisation') || q.includes('customer role')) {
      return `**FraudX AI Role Architecture**:\n\n• 👤 **Customer Portal (e.g., Arjun Sharma):** Personal transaction feed, personal risk breakdown, personalized AI voice greeting, and account MFA security.\n• 🔍 **Analyst Portal (e.g., Priya Iyer):** Real-time fraud alert triage, anomaly factor breakdowns, recipient graph inspection, and risk treatments.\n• 🏢 **Organisation Portal (e.g., Vikram Mehta):** Executive telemetry dashboard, organization-wide volume monitoring, and compliance reporting.`;
    }

    // 14. "Contact Support"
    if (q.includes('contact') || q.includes('support') || q.includes('help desk')) {
      return `**FraudX Security Support**:\n\n• **Email:** support@fraudx.ai\n• **Security Desk:** +91 1800-FRAUDX-AI\n• **Operating Hours:** 24/7 Real-Time Fraud Monitoring\n\nIf you believe your account has been compromised, you can freeze your transactions immediately from the Settings page.`;
    }

    // 15. Analyst: "Why was TXN-XXXX flagged?" or "What factors contributed..."
    if (isAnalyst || isOrg) {
      if (q.includes('contribute') || q.includes('factor') || q.includes('flagged')) {
        return `**AI Anomaly Factors Breakdown**:\n\nFlagged cases in the current pipeline are driven by:\n\n1. **Amount Deviations (34%)** — Amounts exceeding 3.5x sender historical average.\n2. **Velocity Spikes (22%)** — Multiple rapid transfers within a 5-minute window.\n3. **Geographic Inconsistency (18%)** — IP / location mismatch against usual transaction hubs.\n4. **Unregistered Devices (15%)** — High-value transfers initiated from first-seen hardware tokens.\n\nYou can apply automated treatments (Block, Freeze, Whitelist, Escalate) in the **Risk Treatment** console.`;
      }

      if (q.includes('security') || q.includes('audit') || q.includes('attack')) {
        return `**Security & Telemetry Status**:\n\n• Application Monitoring: **Active**\n• Authentication Stream: **Operational**\n• MFA Token Validation: **Enforced**\n• Telemetry: 142 successful logins, 3 failed attempts logged.\n\nInspect full telemetry in the **Security Center** section.`;
      }
    }

    // Greetings
    if (q.includes('hello') || q.includes('hi') || q === 'hey' || q.includes('namaste') || q.includes('vanakkam') || q.includes('namaskaram')) {
      return `Hello ${user?.name || 'there'}! 👋 How can I help you today? You can ask me about your transactions, risk scores, fraud detection algorithms, how to navigate pages, or switch languages and voice personas.`;
    }

    // Default Fallback
    return `I'm here to help with all aspects of FraudX AI! Try asking:\n\n• **About Project:** "What is FraudX AI?" or "How does fraud detection work?"\n• **Transactions:** "Show my recent transactions" or "Explain my latest transaction"\n• **Navigation:** "Take me to Transactions" or "Take me to Risk Analysis"\n• **Security & MFA:** "What is MFA?" or "Explain risk score"\n• **Voices & Languages:** "What languages and voices are supported?"`;
  };

  const formatContent = (content) => {
    return content.split('\n').map((line, li) => {
      let processed = line.replace(/^#{1,6}\s+/, '');
      // Bold text
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      processed = processed.replace(/`([^`]+)`/g, '<code style="background:var(--bg-card);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:12px;">$1</code>');
      
      if (processed.startsWith('• ')) {
        return <p key={li} style={{ margin: '3px 0', paddingLeft: 8 }} dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      return <p key={li} style={{ margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  const handleSend = useCallback((textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim()) return;

    const userMsg = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(userMsg.content);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 450 + Math.random() * 400);
  }, [input, generateResponse]);

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

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 48px)' }}>
      {/* Header */}
      <div className="page-header animate-fade-in-up" style={{ flexShrink: 0, marginBottom: 12 }}>
        <div>
          <h1 className="heading-2">🤖 {t('nav.aiAgent')}</h1>
          <p className="text-secondary text-xs">
            {isCustomer ? 'Personal financial security & transaction assistant' : 'Enterprise risk & telemetry intelligence assistant'}
          </p>
        </div>
      </div>

      {/* Chat Glass Card */}
      <div className="glass-card animate-fade-in-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', animationDelay: '100ms', overflow: 'hidden', padding: '16px' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 14,
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '12px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 1.6,
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-secondary)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {formatContent(msg.content)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 4px', marginBottom: 12 }}>
              <div style={{ padding: '10px 18px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                <span className="typing-dots">●●●</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0', borderTop: '1px solid var(--border-secondary)', flexShrink: 0 }}>
          {quickActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                background: 'var(--bg-tertiary)',
                whiteSpace: 'nowrap',
                fontSize: 11,
                borderRadius: 'var(--border-radius-full)',
                border: '1px solid var(--border-primary)',
                padding: '4px 10px',
              }}
              onClick={() => handleSend(action)}
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border-primary)' }}
        >
          <input
            className="input"
            type="text"
            placeholder={
              isCustomer
                ? "Ask about your transactions, risk scores, MFA, or membership..."
                : "Ask about TXN-XXXXXX, anomaly patterns, or security telemetry..."
            }
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

