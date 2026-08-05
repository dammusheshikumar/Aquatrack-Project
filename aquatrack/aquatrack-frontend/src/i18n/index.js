import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import hi from "../locales/hi.json";
import te from "../locales/te.json";
import ta from "../locales/ta.json";
import ur from "../locales/ur.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      hi: {
        translation: hi
      },
      te: {
        translation: te
      },
      ta: {
        translation: ta
      },
      ur: {
        translation: ur
      }
    },
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "te", "ta", "ur"],
    detection: {
      caches: ["localStorage", "cookie"],
      lookupLocalStorage: "aquatrack_language"
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;