import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n/config'

/**
 * Language dropdown. Selecting a language persists it to localStorage
 * (via i18next-browser-languagedetector's `caches` option) so every
 * subsequent page — and every future visit — loads in that language,
 * not just the page the selector was used on.
 */
export default function LanguageSelector({ variant = 'light' }) {
  const { i18n } = useTranslation()

  const change = (code) => {
    i18n.changeLanguage(code)
  }

  const isDark = variant === 'dark'

  return (
    <div className="relative inline-flex items-center">
      <select
        value={i18n.language?.split('-')[0] || 'en'}
        onChange={e => change(e.target.value)}
        aria-label="Select language"
        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12A594]"
        style={
          isDark
            ? { background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.85)', border: '1px solid rgba(255,255,255,.15)' }
            : { background: '#fff', color: '#06141B', border: '1.5px solid rgba(6,20,27,.12)' }
        }
      >
        {SUPPORTED_LANGUAGES.map(l => (
          <option key={l.code} value={l.code} style={{ color: '#06141B' }}>
            {l.nativeLabel}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 w-3 h-3"
        viewBox="0 0 12 12" fill="none"
        style={{ color: isDark ? 'rgba(255,255,255,.6)' : '#7A9097' }}
      >
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}