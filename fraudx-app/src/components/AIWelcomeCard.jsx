import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './AIWelcomeCard.css';

const GREETINGS = {
  en: {
    nameGreeting: (name) => `Hello ${name}. Welcome to FraudX AI. How can I help you right now?`,
    genericGreeting: () => `Hello! Welcome to FraudX AI. How can I help you right now?`,
    heading: (name) => name ? `Hello, ${name}!` : `Hello!`,
    subtext: `Welcome to FraudX AI.`,
    prompt: `How can I help you right now?`,
    guideText: `Next Step: Review your live transaction stream or check your account risk assessment.`,
    nextBtn: `Take Me to Transactions →`,
    statusSpeaking: `AI is speaking...`,
    statusPaused: `Speech paused`,
    statusReady: `AI Assistant Ready`,
    tapToHear: `🔊 Tap to hear welcome`,
    replay: `🔊 Replay Welcome`,
    pause: `⏸ Pause`,
    resume: `▶️ Resume`,
    mute: `🔇 Mute`,
    navConfirmation: (page) => `Navigating to your ${page} now.`
  },
  hi: {
    nameGreeting: (name) => `नमस्ते ${name}. फ्रॉडएक्स एआई में आपका स्वागत है। मैं आपकी क्या मदद कर सकता हूँ?`,
    genericGreeting: () => `नमस्ते! फ्रॉडएक्स एआई में आपका स्वागत है। मैं आपकी क्या मदद कर सकता हूँ?`,
    heading: (name) => name ? `नमस्ते, ${name}!` : `नमस्ते!`,
    subtext: `फ्रॉडएक्स एआई में आपका स्वागत है।`,
    prompt: `मैं आपकी क्या मदद कर सकता हूँ?`,
    guideText: `अगला कदम: अपने लेन-देन की समीक्षा करें या जोखिम स्थिति जांचें।`,
    nextBtn: `लेन-देन देखें →`,
    statusSpeaking: `एआई बोल रहा है...`,
    statusPaused: `आवाज रुकी हुई है`,
    statusReady: `एआई सहायक तैयार है`,
    tapToHear: `🔊 स्वागत संदेश सुनें`,
    replay: `🔊 पुनः सुनें`,
    pause: `⏸ रोकें`,
    resume: `▶️ जारी रखें`,
    mute: `🔇 म्यूट`,
    navConfirmation: (page) => `अब ${page} पृष्ठ खोला जा रहा है।`
  },
  ta: {
    nameGreeting: (name) => `வணக்கம் ${name}. FraudX AI-க்கு நல்வரவு. இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`,
    genericGreeting: () => `வணக்கம்! FraudX AI-க்கு நல்வரவு. இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`,
    heading: (name) => name ? `வணக்கம், ${name}!` : `வணக்கம்!`,
    subtext: `FraudX AI-க்கு நல்வரவு.`,
    prompt: `இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`,
    guideText: `அடுத்த கட்டம்: உங்கள் பணப் பரிவர்த்தனைகள் அல்லது கணக்கு பாதுகாப்பை மதிப்பாய்வு செய்யவும்.`,
    nextBtn: `பரிவர்த்தனைகளை பார்க்க →`,
    statusSpeaking: `AI பேசுகிறது...`,
    statusPaused: `ஒலி இடைநிறுத்தப்பட்டது`,
    statusReady: `AI உதவியாளர் தயார்`,
    tapToHear: `🔊 குரல் வரவேற்பைக் கேளுங்கள்`,
    replay: `🔊 மீண்டும் கேள்`,
    pause: `⏸ இடைநிறுத்து`,
    resume: `▶️ தொடரவும்`,
    mute: `🔇 முடக்கு`,
    navConfirmation: (page) => `இப்போது ${page} பக்கத்திற்குச் செல்கிறது.`
  },
  te: {
    nameGreeting: (name) => `నమస్కారం ${name}. FraudX AI కి స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?`,
    genericGreeting: () => `నమస్కారం! FraudX AI కి స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?`,
    heading: (name) => name ? `నమస్కారం, ${name}!` : `నమస్కారం!`,
    subtext: `FraudX AI కి స్వాగతం.`,
    prompt: `ఈరోజు నేను మీకు ఎలా సహాయపడగలను?`,
    guideText: `తదుపరి దశ: మీ లావాదేవీలు లేదా ఖాతా రిస్క్ స్థాయిని సమీక్షించండి.`,
    nextBtn: `లావాదేవీలను చూడండి →`,
    statusSpeaking: `AI మాట్లాడుతోంది...`,
    statusPaused: `వాయిస్ పాజ్ చేయబడింది`,
    statusReady: `AI అసిస్టెంట్ సిద్ధంగా ఉంది`,
    tapToHear: `🔊 స్వాగతం వినండి`,
    replay: `🔊 మళ్ళీ వినండి`,
    pause: `⏸ పాజ్`,
    resume: `▶️ కొనసాగించు`,
    mute: `🔇 మ్యూట్`,
    navConfirmation: (page) => `ఇప్పుడు ${page} పేజీకి నావిగేట్ చేస్తోంది.`
  }
};

const PERSONA_CONFIGS = {
  female: {
    id: 'female',
    name: 'Aria (Female AI)',
    face: '👩‍💼',
    cssClass: 'ai-welcome-card__avatar--female',
    badge: 'Female Voice (Aria)',
    pitch: 1.08,
    rate: 0.96
  },
  male: {
    id: 'male',
    name: 'Alex (Male AI)',
    face: '👨‍💼',
    cssClass: 'ai-welcome-card__avatar--male',
    badge: 'Male Voice (Alex)',
    pitch: 0.92,
    rate: 0.95
  },
  cyber: {
    id: 'cyber',
    name: 'CyberX (Neural Bot)',
    face: '🤖',
    cssClass: 'ai-welcome-card__avatar--cyber',
    badge: 'Cyber Voice',
    pitch: 1.0,
    rate: 0.98
  }
};

export default function AIWelcomeCard() {
  const { user } = useAuth();
  const { language, setLanguage } = useTheme();
  const navigate = useNavigate();

  // Voice Persona state (female / male / cyber)
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

  // Spoken text and Visual text per selected language
  const spokenGreeting = customerName
    ? langTexts.nameGreeting(customerName)
    : langTexts.genericGreeting();

  const visualHeading = langTexts.heading(customerName);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  const voicesRef = useRef([]);

  // Load and cache voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        voicesRef.current = availableVoices;
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

  const getBestVoice = (langCode, targetPersona) => {
    const voices = voicesRef.current.length > 0 
      ? voicesRef.current 
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    
    if (!voices || voices.length === 0) return null;

    const isTargetFemale = targetPersona === 'female';
    const isTargetMale = targetPersona === 'male';

    // 1. Match selected language (e.g. 'hi', 'ta', 'te', 'en')
    const langVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(langCode));

    if (langVoices.length > 0) {
      // Find gender match within language
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

    // 2. Fallback to English voices with gender matching
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
  };

  const speakText = (text, onFinishCallback) => {
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
  };

  // Play main welcome greeting
  const playVoiceGreeting = () => {
    speakText(spokenGreeting);
  };

  // Initial session trigger
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
        }, 1200);

        return () => clearTimeout(checkTimer);
      }, 450);

      return () => {
        clearTimeout(timer);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [user]);

  // Handle persona change
  const handlePersonaChange = (newPersona) => {
    setPersona(newPersona);
    localStorage.setItem('fraudx_ai_persona', newPersona);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Replay greeting with the new voice persona
    setTimeout(() => {
      speakText(spokenGreeting);
    }, 150);
  };

  // Handle language change
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const targetTexts = GREETINGS[newLang] || GREETINGS.en;
    const newSpoken = customerName ? targetTexts.nameGreeting(customerName) : targetTexts.genericGreeting();
    setTimeout(() => {
      speakText(newSpoken);
    }, 150);
  };

  // Controls Handlers
  const handlePlayReplay = () => {
    if (isMuted) setIsMuted(false);
    playVoiceGreeting();
  };

  const handlePause = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  const handleResume = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    }
  };

  const handleMute = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setIsMuted(true);
  };

  // Voice-assisted navigation to next page
  const handleNavigateWithVoice = (path, pageName, promptText) => {
    const confirmationText = langTexts.navConfirmation(pageName);
    speakText(confirmationText, () => {
      if (promptText) {
        navigate(path, { state: { initialPrompt: promptText } });
      } else {
        navigate(path);
      }
    });
    // Ensure immediate or quick navigation fallback
    setTimeout(() => {
      if (promptText) {
        navigate(path, { state: { initialPrompt: promptText } });
      } else {
        navigate(path);
      }
    }, 400);
  };

  return (
    <div className="ai-welcome-card animate-fade-in-up">
      <div className="ai-welcome-card__ambient" />

      {/* Header with Persona & Language Switchers and Audio Controls */}
      <div className="ai-welcome-card__header">
        <div className="ai-welcome-card__brand">
          <span className="ai-welcome-card__brand-tag">
            {personaConfig.face} FraudX AI Assistant
          </span>
          <div className="ai-welcome-card__wave" title={isSpeaking ? 'AI Voice Active' : 'AI Voice Idle'}>
            <span className={`ai-wave-bar ${isSpeaking ? 'ai-wave-bar--active' : ''}`} />
            <span className={`ai-wave-bar ${isSpeaking ? 'ai-wave-bar--active' : ''}`} />
            <span className={`ai-wave-bar ${isSpeaking ? 'ai-wave-bar--active' : ''}`} />
            <span className={`ai-wave-bar ${isSpeaking ? 'ai-wave-bar--active' : ''}`} />
            <span className={`ai-wave-bar ${isSpeaking ? 'ai-wave-bar--active' : ''}`} />
          </div>
        </div>

        <div className="ai-welcome-card__toolbar">
          {/* Voice Persona Switcher (Girl / Boy / Cyber) */}
          <div className="ai-select-pill" title="Switch AI Voice Persona & Face">
            <span>🗣️ Voice:</span>
            <select
              value={persona}
              onChange={(e) => handlePersonaChange(e.target.value)}
              aria-label="Select AI Voice & Avatar Persona"
            >
              <option value="female">👩‍💼 Aria (Female Voice)</option>
              <option value="male">👨‍💼 Alex (Male Voice)</option>
              <option value="cyber">🤖 CyberX (Neural Bot)</option>
            </select>
          </div>

          {/* Language Switcher */}
          <div className="ai-select-pill" title="Switch AI Language">
            <span>🌐</span>
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              aria-label="Select AI Language"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>

          {/* Audio Controls */}
          {autoplayBlocked && !isSpeaking && (
            <button
              type="button"
              className="ai-control-btn ai-control-btn--highlight"
              onClick={handlePlayReplay}
              title="Click to play AI voice greeting"
            >
              {langTexts.tapToHear}
            </button>
          )}

          {isSpeaking && (
            <>
              <button
                type="button"
                className="ai-control-btn ai-control-btn--active"
                onClick={handlePause}
                title="Pause AI speech"
              >
                {langTexts.pause}
              </button>
              <button
                type="button"
                className="ai-control-btn"
                onClick={handleMute}
                title="Mute AI speech"
              >
                {langTexts.mute}
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                type="button"
                className="ai-control-btn ai-control-btn--highlight"
                onClick={handleResume}
                title="Resume AI speech"
              >
                {langTexts.resume}
              </button>
              <button
                type="button"
                className="ai-control-btn"
                onClick={handleMute}
                title="Stop AI speech"
              >
                {langTexts.mute}
              </button>
            </>
          )}

          {!isSpeaking && !isPaused && !autoplayBlocked && (
            <button
              type="button"
              className="ai-control-btn"
              onClick={handlePlayReplay}
              title="Replay AI voice welcome"
            >
              {langTexts.replay}
            </button>
          )}
        </div>
      </div>

      {/* Body with Dynamic Face Logo (Girl / Boy / Cyber) & Visual Greeting */}
      <div className="ai-welcome-card__body">
        <div className="ai-welcome-card__avatar-wrap">
          {isSpeaking && <div className="ai-avatar-glow" />}
          <div className={`ai-avatar-ring ${isSpeaking ? 'ai-avatar-ring--active' : ''}`} />
          <div className={`ai-welcome-card__avatar ${personaConfig.cssClass} ${isSpeaking ? 'ai-welcome-card__avatar--speaking' : ''}`}>
            <span className="ai-welcome-card__avatar-face">{personaConfig.face}</span>
          </div>
        </div>

        <div className="ai-welcome-card__content">
          <div className="ai-welcome-card__status-bar">
            <span className="ai-status-indicator">
              <span className={`ai-status-dot ${isSpeaking ? 'ai-status-dot--pulsing' : ''}`} />
              {isSpeaking ? langTexts.statusSpeaking : isPaused ? langTexts.statusPaused : langTexts.statusReady}
            </span>
            <span className="ai-persona-badge">
              {personaConfig.badge}
            </span>
          </div>

          <h2 className="ai-welcome-card__greeting">{visualHeading}</h2>
          <p className="ai-welcome-card__subtext">{langTexts.subtext}</p>
          <p className="ai-welcome-card__prompt">{langTexts.prompt}</p>

          {/* Page Assist Guide Row (Assists user to take and move to the next page) */}
          <div className="ai-welcome-card__guide-row">
            <span className="ai-guide-text">
              ✨ <strong>Assistant Guide:</strong> {langTexts.guideText}
            </span>
            <button
              type="button"
              className="ai-guide-next-btn"
              onClick={() => handleNavigateWithVoice('/transactions', 'Transactions')}
            >
              {langTexts.nextBtn}
            </button>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="ai-welcome-card__actions">
            <button
              type="button"
              className="ai-action-btn ai-action-btn--primary"
              onClick={() => handleNavigateWithVoice('/transactions', 'Transactions')}
            >
              📊 View My Transactions
            </button>
            <button
              type="button"
              className="ai-action-btn"
              onClick={() => handleNavigateWithVoice('/ai-agent', 'AI Agent', 'Explain my latest transaction')}
            >
              🔍 Explain a Transaction
            </button>
            <button
              type="button"
              className="ai-action-btn"
              onClick={() => handleNavigateWithVoice('/risk-analysis', 'Risk Analysis')}
            >
              🛡️ Explain My Risk
            </button>
            <button
              type="button"
              className="ai-action-btn"
              onClick={() => handleNavigateWithVoice('/ai-agent', 'AI Agent', 'What is MFA?')}
            >
              🔐 What is MFA?
            </button>
            <button
              type="button"
              className="ai-action-btn"
              onClick={() => handleNavigateWithVoice('/profile', 'Profile')}
            >
              👤 My Profile
            </button>
            <button
              type="button"
              className="ai-action-btn"
              onClick={() => handleNavigateWithVoice('/ai-agent', 'AI Agent')}
            >
              💬 Ask AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
