import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RippleRings, WaterParticles, AlertBanner, SegmentControl, Expandable } from '../components/ui'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { useAuth } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login, googleLogin, googleRegister } = useAuth()

  const [role, setRole] = useState('resident')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Google sign-in flow state
  const [googleFlow, setGoogleFlow] = useState('idle') // idle | pending | new-account
  const [pendingGoogle, setPendingGoogle] = useState(null) // { idToken, email, fullName }
  const [apartments, setApartments] = useState([])
  const [newApt, setNewApt] = useState('')
  const [newFlat, setNewFlat] = useState('')
  const [googleError, setGoogleError] = useState('')
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  useEffect(() => {
    if (role === 'resident') {
      axiosClient.get('/public/apartments').then(res => setApartments(res.data)).catch(() => {})
    }
  }, [role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError(t('auth.enterCredentials', { defaultValue: 'Please enter your username and password.' }))
      return
    }
    setLoading(true)
    try {
      const data = await login(username, password)
      const expectedRole = role === 'admin' ? 'ADMIN' : 'RESIDENT'
      const targetPath = data.role === 'ADMIN' ? '/admin' : '/resident'

      if (data.role !== expectedRole) {
        const expectedRoleLabel = role === 'admin' ? 'Admin' : 'Resident'
        setError(
          t('auth.roleMismatch', {
            defaultValue: `This account is registered as ${data.role}, not ${expectedRoleLabel}. Redirecting to your dashboard...`,
            role: data.role,
            expectedRole: expectedRoleLabel
          })
        )
        setTimeout(() => navigate(targetPath), 2000)
      } else {
        navigate(targetPath)
      }
    } catch (err) {
      setError(err.response?.data?.message || t('auth.loginFailed', { defaultValue: 'Incorrect username or password. Please try again.' }))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (idToken) => {
    setGoogleError('')
    setPendingGoogle(null)
    try {
      const result = await googleLogin(idToken)
      if (result.accountExists && result.pendingApproval) {
        setGoogleFlow('pending')
      } else if (result.accountExists) {
        navigate('/resident')
      } else {
        setPendingGoogle({ idToken, email: result.googleEmail, fullName: result.googleFullName })
        setGoogleFlow('new-account')
      }
    } catch (err) {
      setGoogleError(err.response?.data?.message || t('auth.googleFailed', { defaultValue: 'Google sign-in failed. Please try again.' }))
    }
  }

  const submitNewAccount = async (e) => {
    if (e) e.preventDefault()
    if (!newApt || !newFlat) {
      setGoogleError(t('auth.selectAptAndFlat', { defaultValue: 'Select your apartment and enter your flat number.' }))
      return
    }
    setGoogleError('')
    setGoogleSubmitting(true)
    try {
      await googleRegister(pendingGoogle.idToken, newApt, newFlat)
      setGoogleFlow('pending')
    } catch (err) {
      setGoogleError(err.response?.data?.message || t('auth.regFailed', { defaultValue: 'Could not complete your registration.' }))
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#F4FAF9' }}>
      {/* ── Left branded panel ── */}
      <div
        className="relative flex flex-col justify-center items-start p-10 md:p-16 md:w-[46%] overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(160deg,#06141B 0%,#0B3D3F 100%)' }}
      >
        <RippleRings size={480} color="#12A594" count={4} />
        <WaterParticles color="#12A594" />

        <div className="relative z-10 animate-fade-left">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#12A594,#0B3D3F)', boxShadow: '0 4px 20px rgba(18,165,148,.4)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2C9 2 4 7.5 4 11.5C4 14.2 6.2 16.5 9 16.5C11.8 16.5 14 14.2 14 11.5C14 7.5 9 2 9 2Z" fill="white"/>
                <ellipse cx="6.8" cy="11.8" rx="1.4" ry="2" fill="rgba(255,255,255,.35)" transform="rotate(-22 6.8 11.8)"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-2xl text-white">Aqua<span style={{ color: '#12A594' }}>Track</span></span>
          </div>

          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white leading-[1.1] mb-6">
            {t('auth.welcomeBack', { defaultValue: 'Welcome back' })}<br />{t('auth.toClearer', { defaultValue: 'to clearer' })}<br />
            <span className="animate-float inline-block" style={{ color: '#12A594' }}>{t('auth.waterBills', { defaultValue: 'water bills.' })}</span>
          </h1>
          <p className="text-sm mb-12 leading-relaxed" style={{ color: 'rgba(244,250,249,.6)' }}>
            {t('auth.heroDescription', { defaultValue: 'Your dashboard, alerts, and invoice history — all in one place.' })}
          </p>

          <ul className="flex flex-col gap-5">
            {[
              { icon: '📊', text: t('auth.residentFeature1', { defaultValue: 'View your daily consumption trend' }) },
              { icon: '💧', text: t('auth.residentFeature2', { defaultValue: 'Track alerts and overuse notifications' }) },
              { icon: '🧾', text: t('auth.residentFeature3', { defaultValue: 'Download PDF invoices any time' }) },
            ].map((item, i) => (
              <li
                key={item.text}
                className="flex items-center gap-3 animate-fade-left"
                style={{ animationDelay: `${150 + i * 80}ms` }}
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                  style={{ background: 'rgba(18,165,148,.18)', border: '1px solid rgba(18,165,148,.25)' }}
                >
                  {item.icon}
                </span>
                <span className="text-sm" style={{ color: 'rgba(244,250,249,.72)' }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col justify-center items-center flex-1 p-8 md:p-16">
        <div className="w-full max-w-sm animate-fade-right">
          <h2 className="font-display font-bold text-3xl mb-1" style={{ color: '#06141B' }}>{t('auth.loginTitle', { defaultValue: 'Log in' })}</h2>
          <p className="text-sm mb-8" style={{ color: '#7A9097' }}>{t('auth.loginSubtitle', { defaultValue: 'Select your role and enter your credentials.' })}</p>

          <div className="mb-6">
            <SegmentControl
              value={role}
              onChange={v => { setRole(v); setError(''); setGoogleFlow('idle'); setPendingGoogle(null); setGoogleError('') }}
              options={[{ value: 'resident', label: t('auth.residentRole', { defaultValue: 'Resident' }) }, { value: 'admin', label: t('auth.adminRole', { defaultValue: 'Apartment Admin' }) }]}
            />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <AlertBanner type="danger" message={error} onDismiss={() => setError('')} />}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>{t('auth.username', { defaultValue: 'Username' })}</label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="priya_mehta"
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(6,20,27,.12)', color: '#06141B' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>{t('auth.password', { defaultValue: 'Password' })}</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(6,20,27,.12)', color: '#06141B' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-press w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mt-1"
              style={{ background: '#12A594', boxShadow: '0 4px 20px rgba(18,165,148,.28)' }}
            >
              {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin-slow" />}
              {loading ? t('auth.signingIn', { defaultValue: 'Signing in…' }) : (role === 'admin' ? t('auth.loginAsAdmin', { defaultValue: 'Log in as Admin' }) : t('auth.loginAsResident', { defaultValue: 'Log in as Resident' }))}
            </button>
          </form>

          {/* Google — resident only */}
          {role === 'resident' && (
            <div className="animate-fade-up">
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: 'rgba(6,20,27,.1)' }} />
                <span className="text-xs" style={{ color: '#7A9097' }}>{t('auth.or', { defaultValue: 'or' })}</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(6,20,27,.1)' }} />
              </div>

              {googleFlow === 'idle' && (
                <>
                  {googleError && <div className="mb-3"><AlertBanner type="danger" message={googleError} onDismiss={() => setGoogleError('')} /></div>}
                  <GoogleSignInButton onCredential={handleGoogleCredential} onError={setGoogleError} />
                </>
              )}

              {googleFlow === 'pending' && (
                <AlertBanner type="success" message={t('auth.pendingApprovalNotice', { defaultValue: "Your account is pending admin approval. You'll receive an email once approved." })} />
              )}

              <Expandable open={googleFlow === 'new-account'}>
                <div className="pt-3">
                  <form
                    onSubmit={submitNewAccount}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(18,165,148,.06)', border: '1px solid rgba(18,165,148,.2)' }}
                  >
                    <p className="text-sm mb-4 leading-snug" style={{ color: '#0B3D3F' }}>
                      {t('auth.noAccountFound', { defaultValue: 'No account found for' })} <strong>{pendingGoogle?.email}</strong>. {t('auth.completeRegistration', { defaultValue: 'Complete your registration:' })}
                    </p>
                    {googleError && <div className="mb-3"><AlertBanner type="danger" message={googleError} onDismiss={() => setGoogleError('')} /></div>}
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>{t('auth.apartment', { defaultValue: 'Apartment' })}</label>
                        <select
                          value={newApt}
                          onChange={e => setNewApt(e.target.value)}
                          className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
                          style={{ borderColor: 'rgba(6,20,27,.12)', color: newApt ? '#06141B' : '#7A9097' }}
                        >
                          <option value="">{t('auth.selectApartment', { defaultValue: 'Select apartment…' })}</option>
                          {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>{t('auth.flatNumber', { defaultValue: 'Flat number' })}</label>
                        <input
                          type="text"
                          value={newFlat}
                          onChange={e => setNewFlat(e.target.value)}
                          placeholder="e.g. 4B"
                          className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ borderColor: 'rgba(6,20,27,.12)', color: '#06141B' }}
                        />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="submit"
                          disabled={googleSubmitting}
                          className="btn-press flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                          style={{ background: '#12A594' }}
                        >
                          {googleSubmitting ? t('auth.submitting', { defaultValue: 'Submitting…' }) : t('auth.submitApproval', { defaultValue: 'Submit for approval' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setGoogleFlow('idle'); setPendingGoogle(null) }}
                          className="btn-press px-4 py-2.5 rounded-xl text-sm font-medium"
                          style={{ color: '#4B5F63' }}
                        >
                          {t('common.cancel', { defaultValue: 'Cancel' })}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </Expandable>
            </div>
          )}

          <p className="text-center text-sm mt-8" style={{ color: '#7A9097' }}>
            {t('auth.noAccount', { defaultValue: 'No account?' })}{' '}
            <button onClick={() => navigate('/register')} className="font-semibold hover:underline transition-all" style={{ color: '#12A594' }}>
              {t('auth.registerHere', { defaultValue: 'Register here →' })}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}