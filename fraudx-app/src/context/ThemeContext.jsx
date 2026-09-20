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
  const [accent, setAccent] = useState(() => localStorage.getItem('fraudx-accent') || 'blue');
  const [animations, setAnimations] = useState(() => localStorage.getItem('fraudx-animations') || 'full');
  const [density, setDensity] = useState(() => localStorage.getItem('fraudx-density') || 'comfortable');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fraudx-font-size') || 'default');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('fraudx-high-contrast') === 'true');
  const [language, setLanguage] = useState(() => localStorage.getItem('fraudx-lang') || 'en');

  // Handle system theme detection
  useEffect(() => {
    let effectiveTheme = theme;
    if (highContrast) {
      effectiveTheme = 'high-contrast';
    } else if (theme === 'system') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = isDark ? 'midnight' : 'luminous';
    }

    const themeMap = {
      luminous: '',
      midnight: 'midnight',
      aurora: 'aurora',
      'secure-light': 'secure-light',
      'high-contrast': 'high-contrast',
    };

    document.documentElement.setAttribute('data-theme', themeMap[effectiveTheme] || '');
    localStorage.setItem('fraudx-theme', theme);
  }, [theme, highContrast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('fraudx-accent', accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.setAttribute('data-animations', animations);
    localStorage.setItem('fraudx-animations', animations);
  }, [animations]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('fraudx-density', density);
  }, [density]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem('fraudx-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('fraudx-high-contrast', highContrast.toString());
  }, [highContrast]);

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
    accent,
    setAccent,
    animations,
    setAnimations,
    density,
    setDensity,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    language,
    setLanguage,
    t,
    languages: LANGUAGE_NAMES,
  }), [theme, accent, animations, density, fontSize, highContrast, language, t]);

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
