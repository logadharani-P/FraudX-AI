import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './LanguageSelector.css';

export default function LanguageSelector({ variant = 'header' }) {
  const { language, setLanguage, languages } = useTheme();

  return (
    <div className={`lang-selector lang-selector--${variant}`}>
      <span className="lang-selector__icon" aria-hidden="true">🌐</span>
      <select
        className="lang-selector__select"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Select Language"
      >
        {Object.entries(languages).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
