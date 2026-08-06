import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import LanguageSelector from '../components/LanguageSelector'
import { RippleRings, WaterParticles, AlertBanner } from '../components/ui'
import { useInView } from '../hooks/useInView'

/* ── Scroll-triggered section wrapper ──────────────────────────────────── */
function Reveal({ children, delay = 0, direction = 'up' }) {
  const { ref, visible } = useInView(0.12)
  const cls = { up: 'animate-fade-up', left: 'animate-fade-left', right: 'animate-fade-right' }[direction]
  return (
    <div
      ref={ref}
      className={visible ? cls : 'opacity-0'}
      style={visible ? { animationDelay: `${delay}ms` } : {}}
    >
      {children}
    </div>
  )
}

/* ── Animated number for hero stat strip ────────────────────────────────── */
function StatBadge({ num, label }) {
  return (
    <div
      className="rounded-2xl px-5 py-5 text-center card-hover"
      style={{
        background: 'rgba(255,255,255,.06)',
        border: '1px solid rgba(255,255,255,.09)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="font-display font-bold text-2xl mb-1" style={{ color: '#F4B942' }}>{num}</div>
      <div className="text-xs leading-snug" style={{ color: 'rgba(244,250,249,.6)' }}>{label}</div>
    </div>
  )
}

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', queryType: '', message: '' })
  const [contactState, setContactState] = useState('idle')
  const [loading, setLoading] = useState(false)

  const heroRef = useRef(null)

  const FEATURES = [
    { icon: '⚖️', title: t('landing.features.tariff.title'), desc: t('landing.features.tariff.desc') },
    { icon: '🏢', title: t('landing.features.apportionment.title'), desc: t('landing.features.apportionment.desc') },
    { icon: '🔔', title: t('landing.features.alerts.title'), desc: t('landing.features.alerts.desc') },
    { icon: '📄', title: t('landing.features.invoices.title'), desc: t('landing.features.invoices.desc') },
  ]

  const CONTACT = [
    { icon: '✉️', label: t('landing.contact.emailLabel'), value: t('landing.contact.emailValue') },
    { icon: '⏱', label: t('landing.contact.responseLabel'), value: t('landing.contact.responseValue') },
    { icon: '🏗', label: t('landing.contact.adminsLabel'), value: t('landing.contact.adminsValue') },
  ]

  /* Parallax on mouse over hero */
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const onMove = (e) => {
      const { left, top, width, height } = hero.getBoundingClientRect()
      const x = (e.clientX - left) / width - 0.5
      const y = (e.clientY - top) / height - 0.5
      hero.style.setProperty('--mx', `${x * 18}px`)
      hero.style.setProperty('--my', `${y * 12}px`)
    }
    hero.addEventListener('mousemove', onMove)
    return () => hero.removeEventListener('mousemove', onMove)
  }, [])

  const submitContact = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { setContactState('error'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); setContactState('success'); setForm({ name: '', email: '', queryType: '', message: '' }) }, 900)
  }

  return (
    <div style={{ background: '#F4FAF9' }}>
      <Navbar />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden hero-mesh"
        style={{ '--mx': '0px', '--my': '0px' }}
      >
        <RippleRings size={520} color="#12A594" count={4} />
        <WaterParticles color="#12A594" />

        <div className="pointer-events-none absolute top-1/3 left-1/4 w-80 h-80 rounded-full blur-[100px] opacity-20" style={{ background: '#12A594' }} />
        <div className="pointer-events-none absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full blur-[80px] opacity-15" style={{ background: '#F4B942' }} />

        <div
          className="relative z-10 max-w-3xl mx-auto pt-28 pb-20"
          style={{ transform: 'translate(var(--mx), var(--my))', transition: 'transform .08s linear' }}
        >
          {/* Language selector — pick a language and the whole app follows */}
          <div className="animate-fade-up delay-0 mb-5 flex items-center justify-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'rgba(244,250,249,.55)' }}>{t('language.selectLabel')}:</span>
            <LanguageSelector variant="dark" />
          </div>

          <div className="animate-fade-up delay-0 mb-6 inline-flex items-center gap-2">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[.12em]"
              style={{ background: 'rgba(18,165,148,.18)', color: '#12A594', border: '1px solid rgba(18,165,148,.3)' }}
            >
              {t('landing.hero.badge')}
            </span>
          </div>

          <h1
            className="animate-fade-up delay-60 font-display text-5xl sm:text-6xl lg:text-[4.25rem] font-bold leading-[1.08] mb-6 text-white"
            style={{ textShadow: '0 2px 40px rgba(6,20,27,.4)' }}
          >
            {t('landing.hero.headlineLine1')}{' '}
            <span className="animate-float inline-block" style={{ color: '#12A594' }}>
              {t('landing.hero.headlineLine2')}
            </span>
            <br />
            <span style={{ color: 'rgba(255,255,255,.88)' }}>{t('landing.hero.headlineLine3')}</span>
          </h1>

          <p
            className="animate-fade-up delay-120 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ color: 'rgba(244,250,249,.68)' }}
          >
            {t('landing.hero.subtitle')}
          </p>

          <div className="animate-fade-up delay-180 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="btn-press px-9 py-4 rounded-2xl font-semibold text-base"
              style={{ background: '#F4B942', color: '#06141B', boxShadow: '0 6px 32px rgba(244,185,66,.35)' }}
            >
              {t('landing.hero.ctaPrimary')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-press px-9 py-4 rounded-2xl font-semibold text-base border"
              style={{ border: '1.5px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.85)', backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,.05)' }}
            >
              {t('landing.hero.ctaSecondary')}
            </button>
          </div>

          <div className="animate-fade-up delay-240 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-16">
            {[
              { num: t('landing.hero.stat1Num'), label: t('landing.hero.stat1Label') },
              { num: t('landing.hero.stat2Num'), label: t('landing.hero.stat2Label') },
              { num: t('landing.hero.stat3Num'), label: t('landing.hero.stat3Label') },
              { num: t('landing.hero.stat4Num'), label: t('landing.hero.stat4Label') },
            ].map(s => <StatBadge key={s.label} {...s} />)}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full" style={{ height: 80, display: 'block' }} fill="#F4FAF9">
            <path d="M0,40 C200,80 400,0 720,40 C1040,80 1240,0 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <Reveal>
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold uppercase tracking-[.14em]" style={{ color: '#12A594' }}>
              {t('landing.features.eyebrow')}
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold mt-3 leading-tight" style={{ color: '#06141B' }}>
              {t('landing.features.headlineLine1')}<br />{t('landing.features.headlineLine2')}
            </h2>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80} direction={i % 2 === 0 ? 'left' : 'right'}>
              <div
                className="bg-white rounded-2xl p-8 card-hover group"
                style={{ boxShadow: '0 2px 16px rgba(6,20,27,.07), 0 0 0 1px rgba(6,20,27,.05)' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(18,165,148,.1)' }}
                >
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-xl mb-2.5" style={{ color: '#06141B' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4B5F63' }}>{f.desc}</p>
                <div
                  className="mt-5 h-0.5 w-0 rounded-full group-hover:w-16 transition-all duration-500"
                  style={{ background: '#12A594' }}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ MID-PAGE CTA ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-6 py-24 text-center"
        style={{ background: 'linear-gradient(135deg,#0B3D3F,#06141B)' }}
      >
        <RippleRings size={320} color="#F4B942" count={3} />
        <WaterParticles color="#F4B942" />
        <Reveal>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
              {t('landing.midCta.headlineLine1')}<br />{t('landing.midCta.headlineLine2')}
            </h2>
            <p className="text-base mb-10" style={{ color: 'rgba(244,250,249,.65)' }}>
              {t('landing.midCta.subtitle')}
            </p>
            <button
              onClick={() => navigate('/register')}
              className="btn-press inline-flex px-10 py-4 rounded-2xl font-semibold text-base"
              style={{ background: '#F4B942', color: '#06141B', boxShadow: '0 8px 36px rgba(244,185,66,.35)' }}
            >
              {t('landing.midCta.button')}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ══ CONTACT ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-28" style={{ background: '#06141B' }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-start">
          <Reveal direction="left">
            <span className="text-[11px] font-semibold uppercase tracking-[.14em]" style={{ color: '#12A594' }}>{t('landing.contact.eyebrow')}</span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
              {t('landing.contact.headlineLine1')}<br />{t('landing.contact.headlineLine2')}
            </h2>
            <p className="text-sm leading-relaxed mb-12" style={{ color: 'rgba(244,250,249,.55)' }}>
              {t('landing.contact.subtitle')}
            </p>
            <div className="flex flex-col gap-7">
              {CONTACT.map((c, i) => (
                <Reveal key={c.label} delay={i * 80}>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: 'rgba(18,165,148,.14)', border: '1px solid rgba(18,165,148,.2)' }}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[.1em] mb-0.5" style={{ color: '#7A9097' }}>{c.label}</div>
                      <div className="text-sm font-medium text-white">{c.value}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal direction="right">
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(8px)' }}
            >
              {contactState === 'success' ? (
                <div className="animate-scale-in text-center py-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl" style={{ background: 'rgba(34,197,94,.15)' }}>✓</div>
                  <h3 className="font-display font-semibold text-xl text-white mb-2">{t('landing.contact.successTitle')}</h3>
                  <p className="text-sm" style={{ color: 'rgba(244,250,249,.6)' }}>{t('landing.contact.successMessage')}</p>
                  <button onClick={() => setContactState('idle')} className="mt-6 text-sm" style={{ color: '#12A594' }}>{t('landing.contact.sendAnother')}</button>
                </div>
              ) : (
                <form onSubmit={submitContact} className="flex flex-col gap-5">
                  {contactState === 'error' && (
                    <AlertBanner type="danger" message={t('landing.contact.errorMessage')} onDismiss={() => setContactState('idle')} />
                  )}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#7A9097' }}>{t('landing.contact.nameLabel')}</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder={t('landing.contact.namePlaceholder')}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#7A9097' }}>{t('landing.contact.emailFieldLabel')}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder={t('landing.contact.emailPlaceholder')}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#7A9097' }}>{t('landing.contact.queryTypeLabel')}</label>
                    <select
                      value={form.queryType}
                      onChange={e => setForm(p => ({ ...p, queryType: e.target.value }))}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm appearance-none"
                      style={{ background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.1)', color: form.queryType ? '#fff' : '#7A9097' }}
                    >
                      <option value="">{t('landing.contact.queryTypeSelect')}</option>
                      <option value="billing">{t('landing.contact.queryTypeBilling')}</option>
                      <option value="technical">{t('landing.contact.queryTypeTechnical')}</option>
                      <option value="onboarding">{t('landing.contact.queryTypeOnboarding')}</option>
                      <option value="other">{t('landing.contact.queryTypeOther')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#7A9097' }}>{t('landing.contact.messageLabel')}</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder={t('landing.contact.messagePlaceholder')}
                      rows={4}
                      className="field-input w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                      style={{ background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.1)', color: '#fff' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-press w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: '#12A594', boxShadow: '0 4px 20px rgba(18,165,148,.3)' }}
                  >
                    {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin-slow" />}
                    {loading ? t('landing.contact.sending') : t('landing.contact.raiseQuery')}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#04101A', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-12 mb-14">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#12A594,#0B3D3F)' }}>
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2C9 2 4 7.5 4 11.5C4 14.2 6.2 16.5 9 16.5C11.8 16.5 14 14.2 14 11.5C14 7.5 9 2 9 2Z" fill="white"/>
                  </svg>
                </div>
                <span className="font-display font-semibold text-lg text-white">
                  Aqua<span style={{ color: '#12A594' }}>Track</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(244,250,249,.38)' }}>
                {t('landing.footer.tagline')}
              </p>
            </div>
            {[
              { heading: t('landing.footer.productHeading'), links: t('landing.footer.productLinks', { returnObjects: true }) },
              { heading: t('landing.footer.rolesHeading'), links: t('landing.footer.rolesLinks', { returnObjects: true }) },
              { heading: t('landing.footer.supportHeading'), links: t('landing.footer.supportLinks', { returnObjects: true }) },
            ].map(col => (
              <div key={col.heading}>
                <div className="text-[11px] font-semibold uppercase tracking-[.12em] mb-4" style={{ color: '#7A9097' }}>{col.heading}</div>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm transition-colors duration-200 hover:text-white" style={{ color: 'rgba(244,250,249,.45)' }}>{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-7 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,.05)', color: 'rgba(244,250,249,.3)' }}
          >
            <span>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</span>
            <span>{t('landing.footer.bottomTagline')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}