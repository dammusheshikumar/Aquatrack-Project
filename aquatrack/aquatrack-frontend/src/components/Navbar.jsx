import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

/* ─── Navbar ──────────────────────────────────────────────────────────────── */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const isLandingPage = location.pathname === '/'

  useEffect(() => {
    if (!isLandingPage) return

    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [isLandingPage])

  const loggedIn = !!user
  const userName = user?.fullName || ''
  const userRole = user?.role === 'ADMIN' ? t('navbar.adminRole') : t('navbar.residentRole')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Determine if constant dark navbar background should be active
  const isDarkNavbar = !isLandingPage || scrolled

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-400"
      style={{
        background: isDarkNavbar ? 'rgba(6,20,27,.93)' : 'transparent',
        backdropFilter: isDarkNavbar ? 'blur(14px) saturate(1.6)' : 'none',
        boxShadow: isDarkNavbar ? '0 1px 28px rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.04)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate(loggedIn ? (user.role === 'ADMIN' ? '/admin' : '/resident') : '/')} className="flex items-center gap-2.5 group focus:outline-none">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg,#12A594,#0B3D3F)' }}
          >
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M9 2C9 2 4 7.5 4 11.5C4 14.2 6.2 16.5 9 16.5C11.8 16.5 14 14.2 14 11.5C14 7.5 9 2 9 2Z" fill="white" fillOpacity=".95"/>
              <ellipse cx="6.8" cy="11.8" rx="1.4" ry="2" fill="rgba(255,255,255,.35)" transform="rotate(-22 6.8 11.8)"/>
            </svg>
          </div>
          <span className="font-display font-semibold text-xl text-white tracking-tight">
            Aqua<span style={{ color: '#12A594' }}>Track</span>
          </span>
        </button>

        {/* Right */}
        {loggedIn ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2"
                style={{ background: 'linear-gradient(135deg,#12A594,#0B3D3F)', ringColor: 'rgba(18,165,148,.3)' }}
              >
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-white text-sm font-medium leading-tight">{userName}</div>
                <div className="text-[11px]" style={{ color: '#12A594' }}>{userRole}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-press text-sm px-4 py-1.5 rounded-xl border font-medium"
              style={{ borderColor: 'rgba(255,255,255,.18)', color: 'rgba(255,255,255,.8)' }}
            >
              {t('common.logout')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-press text-sm px-4 py-2 rounded-xl font-medium"
              style={{ color: 'rgba(255,255,255,.8)' }}
            >
              {t('common.login')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-press text-sm px-5 py-2 rounded-xl font-semibold"
              style={{ background: '#F4B942', color: '#06141B', boxShadow: '0 2px 12px rgba(244,185,66,.3)' }}
            >
              {t('common.getStarted')}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}