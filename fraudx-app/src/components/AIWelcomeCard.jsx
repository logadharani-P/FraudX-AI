import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './AIWelcomeCard.css';

const GREETINGS = {
  en: {
    nameGreeting: (name) => `Hello ${name}. Welcome to FraudX AI. How can I help you right now?`,
    genericGreeting: () => `Hello! Welcome to FraudX AI. How can I help you right now?`,
    welcomeHeading: (name, timeOfDay) => name ? `Good ${timeOfDay}, ${name}` : `Welcome to FraudX AI`,
    speechQuote: `Welcome to FraudX AI. How can I help you right now?`,
    statusSpeaking: `AI is speaking...`,
    statusPaused: `Speech paused`,
    statusReady: `Ready to help`,
    statusListening: `Listening for question...`,
    tapToEnable: `Voice is ready — tap anywhere to enable audio`,
    replay: `Replay Greeting`,
    pause: `Pause`,
    resume: `Resume`,
    mute: `Mute Voice`,
    unmute: `Unmute Voice`,
  },
  hi: {
    nameGreeting: (name) => `नमस्ते ${name}. फ्रॉडएक्स एआई में आपका स्वागत है। मैं आपकी क्या मदद कर सकता हूँ?`,
    genericGreeting: () => `नमस्ते! फ्रॉडएक्स एआई में आपका स्वागत है। मैं आपकी क्या मदद कर सकता हूँ?`,
    welcomeHeading: (name) => name ? `नमस्ते, ${name}` : `फ्रॉडएक्स एआई में स्वागत है`,
    speechQuote: `फ्रॉडएक्स एआई में आपका स्वागत है। मैं आपकी क्या मदद कर सकता हूँ?`,
    statusSpeaking: `एआई बोल रहा है...`,
    statusPaused: `आवाज रुकी हुई है`,
    statusReady: `सहायता के लिए तैयार`,
    statusListening: `सुन रहा हूँ...`,
    tapToEnable: `ऑडियो सक्षम करने के लिए कहीं भी टैप करें`,
    replay: `पुनः सुनें`,
    pause: `रोकें`,
    resume: `जारी रखें`,
    mute: `म्यूट`,
    unmute: `अनम्यूट`,
  },
  ta: {
    nameGreeting: (name) => `வணக்கம் ${name}. FraudX AI-க்கு நல்வரவு. இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`,
    genericGreeting: () => `வணக்கம்! FraudX AI-க்கு நல்வரவு. இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`,
    welcomeHeading: (name) => name ? `வணக்கம், ${name}` : `FraudX AI-க்கு நல்வரவு`,
    speechQuote: `FraudX AI-க்கு நல்வரவு. இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`,
    statusSpeaking: `AI பேசுகிறது...`,
    statusPaused: `ஒலி இடைநிறுத்தப்பட்டது`,
    statusReady: `உதவ தயார்`,
    statusListening: `கேட்கிறது...`,
    tapToEnable: `ஆடியோவை இயக்க எங்கு வேண்டுமானாலும் தட்டவும்`,
    replay: `மீண்டும் கேள்`,
    pause: `இடைநிறுத்து`,
    resume: `தொடரவும்`,
    mute: `முடக்கு`,
    unmute: `ஒலி இயக்கு`,
  },
  te: {
    nameGreeting: (name) => `నమస్కారం ${name}. FraudX AI కి స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?`,
    genericGreeting: () => `నమస్కారం! FraudX AI కి స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?`,
    welcomeHeading: (name) => name ? `నమస్కారం, ${name}` : `FraudX AI కి స్వాగతం`,
    speechQuote: `FraudX AI కి స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?`,
    statusSpeaking: `AI మాట్లాడుతోంది...`,
    statusPaused: `వాయిస్ పాజ్ చేయబడింది`,
    statusReady: `సహాయం చేయడానికి సిద్ధంగా ఉంది`,
    statusListening: `వింటోంది...`,
    tapToEnable: `ఆడియోని ప్రారంభించడానికి ఎక్కడైనా నొక్కండి`,
    replay: `మళ్ళీ వినండి`,
    pause: `పాజ్`,
    resume: `కొనసాగించు`,
    mute: `మ్యూట్`,
    unmute: `అన్‌మ్యూట్`,
  }
};

const PERSONA_CONFIGS = {
  female: {
    id: 'female',
    name: 'Aria (Female Voice)',
    pitch: 1.06,
    rate: 0.95,
  },
  male: {
    id: 'male',
    name: 'Alex (Male Voice)',
    pitch: 0.92,
    rate: 0.95,
  },
  cyber: {
    id: 'cyber',
    name: 'CyberX (Neural Voice)',
    pitch: 1.0,
    rate: 0.98,
  }
};

export default function AIWelcomeCard() {
  const { user } = useAuth();
  const { language, setLanguage } = useTheme();
  const navigate = useNavigate();

  // Voice Persona
  const [persona, setPersona] = useState(() => localStorage.getItem('fraudx_ai_persona') || 'female');

  // Customer Name resolution
  const rawName = user?.name ? String(user.name).trim() : '';
  const isInvalidName = !rawName || 
    rawName.toLowerCase() === 'undefined' || 
    rawName.toLowerCase() === 'null' || 
    rawName.toLowerCase() === 'user';
  
  const customerName = isInvalidName ? '' : rawName;

  const currentLang = GREETINGS[language] ? language : 'en';
  const langTexts = GREETINGS[currentLang];
  const personaConfig = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.female;

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const welcomeHeading = langTexts.welcomeHeading(customerName, timeOfDay);
  const spokenGreeting = customerName
    ? langTexts.nameGreeting(customerName)
    : langTexts.genericGreeting();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  const voicesRef = useRef([]);

  // Load and cache voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      try {
        voicesRef.current = window.speechSynthesis.getVoices();
      } catch (err) {
        console.warn('Speech synthesis getVoices error:', err);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getBestVoice = useCallback((langCode, targetPersona) => {
    const voices = voicesRef.current.length > 0 
      ? voicesRef.current 
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    
    if (!voices || voices.length === 0) return null;

    const isTargetFemale = targetPersona === 'female';
    const isTargetMale = targetPersona === 'male';

    const langVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(langCode));

    if (langVoices.length > 0) {
      if (isTargetFemale) {
        const femaleVoice = langVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('female') || name.includes('zira') || name.includes('jenny') || 
                 name.includes('aria') || name.includes('samantha') || name.includes('karen') || name.includes('swara');
        });
        if (femaleVoice) return femaleVoice;
      } else if (isTargetMale) {
        const maleVoice = langVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('male') || name.includes('david') || name.includes('guy') || 
                 name.includes('george') || name.includes('rishi') || name.includes('madhav');
        });
        if (maleVoice) return maleVoice;
      }
      return langVoices[0];
    }

    const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (englishVoices.length > 0) {
      if (isTargetFemale) {
        const femaleVoice = englishVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('female') || name.includes('zira') || name.includes('jenny') || 
                 name.includes('aria') || name.includes('samantha') || name.includes('karen') || name.includes('natural');
        });
        if (femaleVoice) return femaleVoice;
      } else if (isTargetMale) {
        const maleVoice = englishVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('male') || name.includes('david') || name.includes('guy') || name.includes('george');
        });
        if (maleVoice) return maleVoice;
      }
      return englishVoices[0];
    }

    return voices[0];
  }, []);

  const speakText = useCallback((text, onFinishCallback) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onFinishCallback) onFinishCallback();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getBestVoice(currentLang, persona);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = personaConfig.rate;
      utterance.pitch = personaConfig.pitch;
      utterance.volume = isMuted ? 0 : 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setAutoplayBlocked(false);
        setHasPlayedOnce(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        if (onFinishCallback) onFinishCallback();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setIsPaused(false);
        if (event.error === 'not-allowed' || event.error === 'audio-busy') {
          setAutoplayBlocked(true);
        }
        if (onFinishCallback) onFinishCallback();
      };

      utterance.onpause = () => {
        setIsPaused(true);
        setIsSpeaking(false);
      };

      utterance.onresume = () => {
        setIsPaused(false);
        setIsSpeaking(true);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Voice playback failed:', err);
      setAutoplayBlocked(true);
      if (onFinishCallback) onFinishCallback();
    }
  }, [currentLang, persona, isMuted, personaConfig, getBestVoice]);

  const playVoiceGreeting = useCallback(() => {
    speakText(spokenGreeting);
  }, [speakText, spokenGreeting]);

  // Automatic speech trigger on initial customer session mount
  useEffect(() => {
    if (user?.role !== 'customer') return;

    const sessionKey = `fraudx_welcomed_${user?.id || 'customer'}`;
    const alreadyWelcomed = sessionStorage.getItem(sessionKey);

    if (!alreadyWelcomed) {
      sessionStorage.setItem(sessionKey, 'true');

      const timer = setTimeout(() => {
        playVoiceGreeting();

        const checkTimer = setTimeout(() => {
          if (!window.speechSynthesis?.speaking && !hasPlayedOnce) {
            setAutoplayBlocked(true);
          }
        }, 1100);

        return () => clearTimeout(checkTimer);
      }, 400);

      return () => {
        clearTimeout(timer);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [user, playVoiceGreeting, hasPlayedOnce]);

  // Global first-interaction fallback listener for browser autoplay restriction
  useEffect(() => {
    if (!autoplayBlocked) return;

    const handleFirstUserInteraction = () => {
      setAutoplayBlocked(false);
      playVoiceGreeting();
    };

    window.addEventListener('click', handleFirstUserInteraction, { once: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };
  }, [autoplayBlocked, playVoiceGreeting]);

  // Controls Handlers
  const handleReplay = () => {
    if (isMuted) setIsMuted(false);
    playVoiceGreeting();
  };

  const handlePauseResume = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else {
      playVoiceGreeting();
    }
  };

  const handleToggleMute = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (!isMuted) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        setIsMuted(true);
      } else {
        setIsMuted(false);
        playVoiceGreeting();
      }
    }
  };

  const handlePersonaChange = (newPersona) => {
    setPersona(newPersona);
    localStorage.setItem('fraudx_ai_persona', newPersona);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setTimeout(() => {
      speakText(spokenGreeting);
    }, 150);
  };

  return (
    <div className="ai-radiant-card animate-fade-in-up">
      {/* Radiant ambient glow & particle beams */}
      <div className="ai-radiant-ambient" />
      <div className="ai-radiant-shimmer" />

      {/* Subtle Autoplay Fallback Notice */}
      {autoplayBlocked && !isSpeaking && (
        <div className="ai-autoplay-bar animate-fade-in" onClick={handleReplay}>
          <span>🔊 {langTexts.tapToEnable}</span>
        </div>
      )}

      {/* Top Header Row with Persona & Controls */}
      <div className="ai-radiant-card__top">
        <div className="ai-live-badge">
          <span className={`ai-pulse-dot ${isSpeaking ? 'ai-pulse-dot--active' : ''}`} />
          <span className="ai-live-text">
            {isSpeaking ? langTexts.statusSpeaking : isPaused ? langTexts.statusPaused : langTexts.statusReady}
          </span>
        </div>

        <div className="ai-controls-cluster">
          {/* Persona selector */}
          <select
            className="ai-compact-select"
            value={persona}
            onChange={(e) => handlePersonaChange(e.target.value)}
            aria-label="Select AI Voice"
          >
            <option value="female">Aria (Female)</option>
            <option value="male">Alex (Male)</option>
            <option value="cyber">CyberX (Neural)</option>
          </select>

          {/* Language selector */}
          <select
            className="ai-compact-select"
            value={currentLang}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select AI Language"
          >
            <option value="en">EN</option>
            <option value="hi">हिन्दी</option>
            <option value="ta">தமிழ்</option>
            <option value="te">తెలుగు</option>
          </select>

          {/* Compact Icon Action Controls */}
          <button
            type="button"
            className={`ai-icon-btn ${isSpeaking ? 'ai-icon-btn--active' : ''}`}
            onClick={handleReplay}
            title={langTexts.replay}
            aria-label={langTexts.replay}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            type="button"
            className={`ai-icon-btn ${isSpeaking ? 'ai-icon-btn--active' : ''}`}
            onClick={handlePauseResume}
            title={isSpeaking ? langTexts.pause : langTexts.resume}
            aria-label="Pause or Resume"
          >
            {isSpeaking ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`ai-icon-btn ${isMuted ? 'ai-icon-btn--muted' : ''}`}
            onClick={handleToggleMute}
            title={isMuted ? langTexts.unmute : langTexts.mute}
            aria-label="Mute or Unmute"
          >
            {isMuted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main Center Area with Radiant AI Orb & Spoken Message */}
      <div className="ai-radiant-card__center">
        {/* Glowing Neural AI Orb */}
        <div className={`ai-radiant-orb-wrap ${isSpeaking ? 'ai-radiant-orb-wrap--speaking' : ''}`}>
          <div className="ai-orb-ring-outer" />
          <div className="ai-orb-ring-inner" />
          <div className="ai-orb-core">
            <span className="ai-orb-sparkle">✦</span>
          </div>

          {/* Dynamic Waveform Visualizer */}
          <div className={`ai-mini-wave ${isSpeaking ? 'ai-mini-wave--active' : ''}`}>
            <span className="ai-wave-bar" />
            <span className="ai-wave-bar" />
            <span className="ai-wave-bar" />
            <span className="ai-wave-bar" />
            <span className="ai-wave-bar" />
          </div>
        </div>

        {/* Greeting Text */}
        <div className="ai-radiant-text-wrap">
          <h2 className="ai-radiant-heading">{welcomeHeading}</h2>
          <p className="ai-radiant-quote">
            "{langTexts.speechQuote}"
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="ai-radiant-card__actions">
        <button
          type="button"
          className="ai-chip-btn ai-chip-btn--primary"
          onClick={() => navigate('/transactions')}
        >
          📊 View My Transactions
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => navigate('/ai-agent', { state: { initialPrompt: 'How can I understand my transactions?' } })}
        >
          🔍 Understand My Account
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => navigate('/ai-agent', { state: { initialPrompt: 'What does my risk score mean?' } })}
        >
          🛡️ Explain My Risk
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => navigate('/ai-agent', { state: { initialPrompt: 'What is MFA?' } })}
        >
          🔐 What is MFA?
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => navigate('/ai-agent')}
        >
          💬 Ask AI Assistant
        </button>
      </div>
    </div>
  );
}
