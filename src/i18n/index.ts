import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';

// Always start in French so server and browser render the same HTML;
// the saved language is applied right after the app loads (see Providers).
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
