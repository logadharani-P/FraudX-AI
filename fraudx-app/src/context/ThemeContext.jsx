import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import en from '../data/translations/en.json';
import ta from '../data/translations/ta.json';
import hi from '../data/translations/hi.json';
import te from '../data/translations/te.json';

const ThemeContext = createContext(null);

const TRANSLATIONS = { en, ta, hi, te };
const LANGUAGE_NAMES = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  te: 'తెలుగు',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('fraudx-theme') || 'luminous');
  const [language, setLanguage] = useState(() => localStorage.getItem('fraudx-lang') || 'en');

  useEffect(() => {
    const themeMap = {
      luminous: '',
      midnight: 'midnight',
      aurora: 'aurora',
      'secure-light': 'secure-light',
    };
    document.documentElement.setAttribute('data-theme', themeMap[theme] || '');
    localStorage.setItem('fraudx-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('fraudx-lang', language);
  }, [language]);

  const t = useMemo(() => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS.en;
    const fallback = TRANSLATIONS.en;

    // Deep merge with fallback
    const get = (path) => {
      const keys = path.split('.');
      let val = translations;
      let fb = fallback;
      for (const key of keys) {
        val = val?.[key];
        fb = fb?.[key];
      }
      return val || fb || path;
    };

    // Template replacement: t('dashboard.greeting', { name: 'Arjun', timeOfDay: 'morning' })
    const translate = (path, params) => {
      let text = get(path);
      if (params && typeof text === 'string') {
        Object.entries(params).forEach(([key, value]) => {
          text = text.replace(`{${key}}`, value);
        });
      }
      return text;
    };

    return translate;
  }, [language]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    language,
    setLanguage,
    t,
    languages: LANGUAGE_NAMES,
  }), [theme, language, t]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
