import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RippleRings, WaterParticles, SegmentControl, Expandable, AlertBanner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { register, googleRegister } = useAuth()

  const [role, setRole] = useState('resident')
  const [apartments, setApartments] = useState([])
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', apartment: '', flat: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pendingMessage, setPendingMessage] = useState('')
  const [googleError, setGoogleError] = useState('')
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  // Placed INSIDE component so t() is evaluated dynamically on language changes
  const PANEL_COPY = {
    resident: {
      headline: t('auth.register.residentHeadline', { defaultValue: 'Join your community on AquaTrack.' }),
      bullets: [
        { icon: '💧', text: t('auth.register.residentBullet1', { defaultValue: 'See your real daily water use' }) },
        { icon: '🧾', text: t('auth.register.residentBullet2', { defaultValue: 'Get itemised PDF bills every month' }) },
        { icon: '🔔', text: t('auth.register.residentBullet3', { defaultValue: 'Receive alerts before usage spikes' }) },
      ],
    },
    admin: {
      headline: t('auth.register.adminHeadline', { defaultValue: 'Manage your apartment with precision.' }),
      bullets: [
        { icon: '🏢', text: t('auth.register.adminBullet1', { defaultValue: 'Manage households, meters, and tariffs' }) },
        { icon: '🧾', text: t('auth.register.adminBullet2', { defaultValue: 'Generate monthly bills and collect fines' }) },
        { icon: '🔔', text: t('auth.register.adminBullet3', { defaultValue: 'Approve residents and monitor water usage' }) },
      ],
    },
    super_admin: {
      headline: t('auth.register.superAdminHeadline', { defaultValue: 'System-wide control across all apartments.' }),
      bullets: [
        { icon: '🏙️', text: t('auth.register.superAdminBullet1', { defaultValue: 'Create and manage all apartment communities' }) },
        { icon: '👑', text: t('auth.register.superAdminBullet2', { defaultValue: 'Approve apartment admins and view global status' }) },
        { icon: '📊', text: t('auth.register.superAdminBullet3', { defaultValue: 'Full multi-apartment oversight' }) },
      ],
    },
  }

  useEffect(() => {
    axiosClient.get('/public/apartments').then(res => setApartments(res.data)).catch(() => {})
  }, [])

  const set = (k) => (v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name) e.name = t('auth.register.errRequired', { defaultValue: 'Required' })
    if (!form.username || form.username.length < 4) e.username = t('auth.register.errUsernameMin', { defaultValue: 'Min 4 characters' })
    if (!form.email || !form.email.includes('@')) e.email = t('auth.register.errEmailValid', { defaultValue: 'Valid email required' })
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=~\[\]{}:;<>,.?/|\\])[A-Za-z\d@$!%*?&#^()_\-+=~\[\]{}:;<>,.?/|\\]{8,}$/
    if (!form.password || !pwdRegex.test(form.password)) {
      e.password = t('auth.register.errPasswordStrict', { defaultValue: 'Must be at least 8 characters long and contain letters, numbers, and a special character.' })
    }
    if (role === 'admin' && !form.apartment) e.apartment = t('auth.register.errApartmentRequired', { defaultValue: 'Please select your apartment' })
    if (role === 'resident' && !form.apartment) e.apartment = t('auth.register.errApartmentRequired', { defaultValue: 'Please select your apartment' })
    if (role === 'resident' && !form.flat) e.flat = t('auth.register.errRequired', { defaultValue: 'Required' })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setLoading(true)
    try {
      let payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        fullName: form.name,
        role: role === 'super_admin' ? 'SUPER_ADMIN' : (role === 'admin' ? 'ADMIN' : 'RESIDENT'),
      }

      if (role === 'admin') {
        payload.apartmentId = form.apartment
      } else if (role === 'resident') {
        const lookup = await axiosClient.get(
          `/public/apartments/${form.apartment}/households/lookup`,
          { params: { flatNumber: form.flat } }
        )
        payload.householdId = lookup.data.id
      }

      const data = await register(payload)
      if (data.pendingApproval) {
        setPendingMessage(data.message)
        setSubmitted(true)
      } else if (data.auth) {
        setSubmitted(true)
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || t('auth.register.errGenericFailure', { defaultValue: 'Registration failed. Please check your details.' }))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (idToken) => {
    setGoogleError('')

    if (!form.apartment) {
      setGoogleError(t('auth.register.errApartmentRequired', { defaultValue: 'Please select your apartment.' }))
      return
    }

    if (!form.flat) {
      setGoogleError(t('auth.login.googleSelectFirst', { defaultValue: 'Select your apartment and enter your flat number.' }))
      return
    }

    setGoogleSubmitting(true)

    try {
      await googleRegister(idToken, form.apartment, form.flat)

      setPendingMessage(
        t('auth.login.googlePending', {
          defaultValue: "Your account is pending admin approval. You'll receive an email once approved.",
        })
      )

      setSubmitted(true)
    } catch (err) {
      setGoogleError(
        err.response?.data?.message ||
        t('auth.login.googleFailed', { defaultValue: 'Google sign-in failed. Please try again.' })
      )
    } finally {
      setGoogleSubmitting(false)
    }
  }

  const copy = PANEL_COPY[role]

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#F4FAF9' }}>
      {/* ── Left branded panel ── */}
      <div
        className="relative flex flex-col justify-center items-start p-10 md:p-16 md:w-[46%] overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(160deg,#06141B 0%,#0B3D3F 100%)' }}
      >
        <RippleRings size={440} color="#F4B942" count={3} />
        <WaterParticles color="#F4B942" />

        <div className="relative z-10 animate-fade-left">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#12A594,#0B3D3F)', boxShadow: '0 4px 20px rgba(18,165,148,.4)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2C9 2 4 7.5 4 11.5C4 14.2 6.2 16.5 9 16.5C11.8 16.5 14 14.2 14 11.5C14 7.5 9 2 9 2Z" fill="white"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-2xl text-white">Aqua<span style={{ color: '#12A594' }}>Track</span></span>
          </div>

          <h1
            className="font-display text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.12] mb-8 transition-all duration-500"
            key={role}
          >
            {copy.headline.split(' ').map((word, i) => (
              <span
                key={i}
                className="inline-block animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {word}&nbsp;
              </span>
            ))}
          </h1>

          <ul className="flex flex-col gap-5">
            {copy.bullets.map((b, i) => (
              <li
                key={b.text}
                className="flex items-center gap-3 animate-fade-left"
                style={{ animationDelay: `${180 + i * 80}ms` }}
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                  style={{ background: 'rgba(18,165,148,.18)', border: '1px solid rgba(18,165,148,.25)' }}
                >
                  {b.icon}
                </span>
                <span className="text-sm" style={{ color: 'rgba(244,250,249,.72)' }}>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col justify-center items-center flex-1 p-8 md:p-16 overflow-y-auto">
        <div className="w-full max-w-sm animate-fade-right">
          {submitted ? (
            /* Success state */
            <div className="animate-scale-in text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
                style={{ background: 'rgba(18,165,148,.12)', border: '2px solid rgba(18,165,148,.3)' }}
              >
                ✓
              </div>
              <h2 className="font-display font-bold text-2xl mb-3" style={{ color: '#06141B' }}>
                {role === 'super_admin'
                  ? t('auth.register.successTitleSuperAdmin', { defaultValue: 'Super Admin Registered!' })
                  : t('auth.register.successTitlePending', { defaultValue: 'Registration Submitted!' })}
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: '#4B5F63' }}>
                {pendingMessage || (
                  role === 'admin'
                    ? t('auth.register.successMessageAdmin', { defaultValue: 'Your Apartment Admin registration has been submitted successfully! Your account is pending approval from the Super Admin. You will be able to log in once approved.' })
                    : role === 'resident'
                    ? t('auth.register.successMessageResident', { defaultValue: 'Your registration has been submitted successfully! Your account is pending approval from your Apartment Admin. You will be able to log in once approved.' })
                    : t('auth.register.successMessageSuperAdmin', { defaultValue: 'Super Admin account created successfully. You can log in immediately.' })
                )}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-press w-full py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: '#12A594', boxShadow: '0 4px 20px rgba(18,165,148,.28)' }}
              >
                {t('auth.register.goToLogin', { defaultValue: 'Go to login →' })}
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display font-bold text-3xl mb-1" style={{ color: '#06141B' }}>{t('auth.register.title', { defaultValue: 'Create account' })}</h2>
              <p className="text-sm mb-6" style={{ color: '#7A9097' }}>{t('auth.register.subtitle', { defaultValue: 'Choose your role and fill in the details below.' })}</p>

              <div className="mb-6">
                <SegmentControl
                  value={role}
                  onChange={v => { setRole(v); setErrors({}); setSubmitError('') }}
                  options={[
                    { value: 'resident', label: t('auth.roleResident', { defaultValue: 'Resident' }) },
                    { value: 'admin', label: t('auth.roleAdmin', { defaultValue: 'Apartment Admin' }) },
                    { value: 'super_admin', label: t('auth.roleSuperAdmin', { defaultValue: 'Super Admin' }) },
                  ]}
                />
              </div>

              {submitError && (
                <div className="mb-4">
                  <AlertBanner type="danger" message={submitError} onDismiss={() => setSubmitError('')} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {[
                  { key: 'name', label: t('auth.register.fullNameLabel', { defaultValue: 'Full name' }), placeholder: t('auth.register.fullNamePlaceholder', { defaultValue: 'Priya Mehta' }), autoComplete: 'name' },
                  { key: 'username', label: t('auth.register.usernameLabel', { defaultValue: 'Username' }), placeholder: t('auth.register.usernamePlaceholder', { defaultValue: 'priya_mehta' }), autoComplete: 'username' },
                  { key: 'email', label: t('auth.register.emailLabel', { defaultValue: 'Email' }), placeholder: t('auth.register.emailPlaceholder', { defaultValue: 'priya@example.com' }), type: 'email', autoComplete: 'email' },
                  { key: 'password', label: t('auth.register.passwordLabel', { defaultValue: 'Password' }), placeholder: '••••••••', type: 'password', autoComplete: 'new-password' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      autoComplete={f.autoComplete}
                      value={form[f.key]}
                      onChange={e => set(f.key)(e.target.value)}
                      placeholder={f.placeholder}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                      style={{ borderColor: errors[f.key] ? '#ef4444' : 'rgba(6,20,27,.12)', color: '#06141B' }}
                    />
                    {errors[f.key] && (
                      <p className="text-[11px] text-red-500 mt-1">⚠ {errors[f.key]}</p>
                    )}
                  </div>
                ))}

                {/* Apartment */}
                {(role === 'resident' || role === 'admin') && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>
                      {t('auth.register.apartmentLabel', { defaultValue: 'Apartment' })}
                    </label>
                    <select
                      value={form.apartment}
                      onChange={e => set('apartment')(e.target.value)}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
                      style={{ borderColor: errors.apartment ? '#ef4444' : 'rgba(6,20,27,.12)', color: form.apartment ? '#06141B' : '#7A9097' }}
                    >
                      <option value="">{t('auth.register.selectApartment', { defaultValue: 'Select apartment…' })}</option>
                      {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {errors.apartment && <p className="text-[11px] text-red-500 mt-1">⚠ {errors.apartment}</p>}
                  </div>
                )}

                {/* Flat — resident only */}
                <Expandable open={role === 'resident'}>
                  <div className="pt-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>{t('auth.register.flatLabel', { defaultValue: 'Flat number' })}</label>
                    <input
                      type="text"
                      value={form.flat}
                      onChange={e => set('flat')(e.target.value)}
                      placeholder={t('auth.register.flatPlaceholder', { defaultValue: 'e.g. 3C' })}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                      style={{ borderColor: errors.flat ? '#ef4444' : 'rgba(6,20,27,.12)', color: '#06141B' }}
                    />
                    {errors.flat && <p className="text-[11px] text-red-500 mt-1">⚠ {errors.flat}</p>}
                    <p className="text-[11px] mt-1" style={{ color: '#7A9097' }}>{t('auth.register.flatHint', { defaultValue: 'Your flat must already be registered by your admin.' })}</p>
                  </div>
                </Expandable>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-press w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mt-1"
                  style={{ background: '#12A594', boxShadow: '0 4px 20px rgba(18,165,148,.28)' }}
                >
                  {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin-slow" />}
                  {loading ? t('auth.register.creatingAccount', { defaultValue: 'Creating account…' }) : t('auth.register.submit', { defaultValue: 'Register' })}
                </button>
              </form>
              
              {role === 'resident' && (
                <>
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px" style={{ background: 'rgba(6,20,27,.1)' }} />
                    <span className="text-xs" style={{ color: '#7A9097' }}>{t('auth.login.or', { defaultValue: 'or' })}</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(6,20,27,.1)' }} />
                  </div>

                  {googleError && (
                    <div className="mb-4">
                      <AlertBanner
                        type="danger"
                        message={googleError}
                        onDismiss={() => setGoogleError('')}
                      />
                    </div>
                  )}

                  <GoogleSignInButton
                    onCredential={handleGoogleCredential}
                    onError={setGoogleError}
                  />

                  {googleSubmitting && (
                    <p className="text-center text-sm mt-3" style={{ color: '#7A9097' }}>
                      {t('auth.login.googleSubmitting', { defaultValue: 'Submitting…' })}
                    </p>
                  )}
                </>
              )}

              <p className="text-center text-sm mt-6" style={{ color: '#7A9097' }}>
                {t('auth.register.alreadyHaveAccount', { defaultValue: 'Already have an account?' })}{' '}
                <button onClick={() => navigate('/login')} className="font-semibold hover:underline" style={{ color: '#12A594' }}>
                  {t('auth.register.logIn', { defaultValue: 'Log in →' })}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}