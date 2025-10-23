/**
 * LanguageToggle Component
 *
 * Allows users to switch between English and Chinese languages.
 * The selection is persisted in localStorage via i18next.
 */

import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language || 'en';
  const displayText = currentLang === 'en' ? 'EN' : '中文';

  return (
    <button
      onClick={toggleLanguage}
      className="language-toggle"
      data-testid="language-toggle"
      aria-label={`Switch to ${currentLang === 'en' ? 'Chinese' : 'English'}`}
      title={`Current: ${displayText}. Click to switch.`}
    >
      <span className="globe-icon">🌐</span>
      <span className="lang-text">{displayText}</span>
    </button>
  );
}
