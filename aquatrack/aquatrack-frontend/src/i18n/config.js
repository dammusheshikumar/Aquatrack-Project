import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import hi from './locales/hi.json'
import te from './locales/te.json'
import ta from './locales/ta.json'
import ur from './locales/ur.json'
import ka from './locales/ka.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
  { code: 'ka', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
      ur: { translation: ur },
      ka: { translation: ka },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    detection: {
      // The landing page's language selector writes to localStorage under
      // this key; every subsequent page load (any route) picks it up from
      // there first, so the whole app stays in the selected language.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'aquatrack_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n