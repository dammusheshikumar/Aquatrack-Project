import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import i18n from '../i18n/config'

const LanguageContext = createContext(null)

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'ur', label: 'اردو' },
  { code: 'ka', label: 'ಕನ್ನಡ' }, 
]

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => i18n.resolvedLanguage || 'en')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('aquatrack_language')
    if (savedLanguage && SUPPORTED_LANGUAGES.some((item) => item.code === savedLanguage)) {
      i18n.changeLanguage(savedLanguage)
      setLanguage(savedLanguage)
    }
  }, [])

  const changeLanguage = async (nextLanguage) => {
    if (!nextLanguage) return
    localStorage.setItem('aquatrack_language', nextLanguage)
    await i18n.changeLanguage(nextLanguage)
    setLanguage(nextLanguage)
  }

  const value = useMemo(
    () => ({ language, changeLanguage, languages: SUPPORTED_LANGUAGES }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
