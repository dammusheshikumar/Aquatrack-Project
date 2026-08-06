import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from '../hooks/useInView'

/* ─── Ripple Rings ────────────────────────────────────────────────────────── */
export function RippleRings({ size = 360, color = '#12A594', count = 3 }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="ripple-ring"
          style={{
            width: size,
            height: size,
            borderColor: `${color}55`,
            animationDelay: `${i * 1.13}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Floating water particles ────────────────────────────────────────────── */
const PARTICLES = [
  { x: 12, y: 72, s: 4,  d: 6.2, delay: 0 },
  { x: 28, y: 55, s: 3,  d: 8.4, delay: 1.1 },
  { x: 72, y: 20, s: 5,  d: 5.8, delay: 2.3 },
  { x: 85, y: 65, s: 3,  d: 7.6, delay: 0.7 },
  { x: 55, y: 82, s: 4,  d: 9.2, delay: 1.9 },
  { x: 40, y: 30, s: 2.5,d: 6.9, delay: 3.1 },
  { x: 90, y: 40, s: 3.5,d: 8.1, delay: 2.0 },
  { x: 18, y: 38, s: 2,  d: 7.3, delay: 0.4 },
]

export function WaterParticles({ color = '#12A594' }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.s,
            height: p.s,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: color,
            opacity: 0.4,
            animation: `drift ${p.d}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Animated count-up stat ──────────────────────────────────────────────── */
function CountUp({ target, duration = 1200 }) {
  const [n, setN] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const targetVal = Number(target) || 0
    const startVal = n
    if (startVal === targetVal) return

    const start = performance.now()
    let frameId

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setN(Math.round(startVal + ease * (targetVal - startVal)))
      if (t < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [target, duration])

  return <span ref={ref}>{n.toLocaleString()}</span>
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */
export function StatCard({ label, value, caption, unit = '', icon, accentColor = '#12A594', delay = 0 }) {
  const { ref, visible } = useInView()

  return (
    <div
      ref={ref}
      className="inview card-hover bg-white rounded-2xl p-5 relative overflow-hidden"
      style={{
        ...(visible ? { opacity: 1, transform: 'none', transitionDelay: `${delay}ms` } : {}),
        boxShadow: '0 2px 16px rgba(6,20,27,.07), 0 0 0 1px rgba(6,20,27,.05)',
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[.12em]" style={{ color: '#7A9097' }}>
          {label}
        </span>
        {icon && (
          <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
            {icon}
          </span>
        )}
      </div>
      <div className="font-display text-3xl font-bold leading-none" style={{ color: '#06141B' }}>
        {typeof value === 'number' ? <CountUp target={value} /> : value}
        {unit && <span className="text-base font-normal ml-1 font-sans" style={{ color: '#7A9097' }}>{unit}</span>}
      </div>
      {caption && <p className="text-[11px] mt-2 leading-snug" style={{ color: '#7A9097' }}>{caption}</p>}
    </div>
  )
}

/* ─── Badge ───────────────────────────────────────────────────────────────── */
const BADGE_MAP = {
  info:      { bg: 'rgba(18,165,148,.13)',  color: '#0B5040' },
  success:   { bg: 'rgba(34,197,94,.13)',   color: '#166534' },
  warning:   { bg: 'rgba(244,185,66,.18)',  color: '#78350f' },
  danger:    { bg: 'rgba(239,68,68,.12)',   color: '#991b1b' },
  critical:  { bg: 'rgba(239,68,68,.15)',   color: '#991b1b' },
  pending:   { bg: 'rgba(244,185,66,.18)',  color: '#78350f' },
  approved:  { bg: 'rgba(34,197,94,.13)',   color: '#166534' },
  rejected:  { bg: 'rgba(239,68,68,.12)',   color: '#991b1b' },
  unpaid:    { bg: 'rgba(239,68,68,.12)',   color: '#991b1b' },
  paid:      { bg: 'rgba(34,197,94,.13)',   color: '#166534' },
  waived:    { bg: 'rgba(75,95,99,.12)',    color: '#374151' },
  open:      { bg: 'rgba(18,165,148,.13)',  color: '#0B5040' },
  finalized: { bg: 'rgba(34,197,94,.13)',   color: '#166534' },
  archived:  { bg: 'rgba(75,95,99,.12)',    color: '#374151' },
  active:    { bg: 'rgba(34,197,94,.13)',   color: '#166534' },
  inactive:  { bg: 'rgba(75,95,99,.12)',    color: '#374151' },
}

export function Badge({ variant, label }) {
  const { t } = useTranslation()
  const s = BADGE_MAP[variant] || BADGE_MAP.info
  const fallback = variant ? t(`common.badges.${variant}`, variant.charAt(0).toUpperCase() + variant.slice(1)) : ''
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {label ?? fallback}
    </span>
  )
}

/* ─── Alert / Banner ──────────────────────────────────────────────────────── */
export function AlertBanner({ type = 'info', message, onDismiss, autoDismiss }) {
  const [visible, setVisible] = useState(true)
  const STYLE = {
    info:    { bg: 'rgba(18,165,148,.09)',  border: '#12A594', color: '#0B3D3F', dot: '#12A594', icon: 'ℹ' },
    success: { bg: 'rgba(34,197,94,.09)',   border: '#22c55e', color: '#14532d', dot: '#22c55e', icon: '✓' },
    warning: { bg: 'rgba(244,185,66,.14)',  border: '#F4B942', color: '#78350f', dot: '#F4B942', icon: '⚠' },
    danger:  { bg: 'rgba(239,68,68,.09)',   border: '#ef4444', color: '#7f1d1d', dot: '#ef4444', icon: '!' },
  }[type]

  useEffect(() => {
    if (!autoDismiss) return
    const t = setTimeout(() => { setVisible(false); onDismiss && onDismiss() }, autoDismiss)
    return () => clearTimeout(t)
  }, [autoDismiss, onDismiss])

  if (!visible) return null
  return (
    <div
      className="animate-slide-down flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
      style={{ background: STYLE.bg, border: `1px solid ${STYLE.border}35`, color: STYLE.color }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
        style={{ background: STYLE.dot }}
      >
        {STYLE.icon}
      </span>
      <span className="flex-1 leading-snug">{message}</span>
      {onDismiss && (
        <button
          onClick={() => { setVisible(false); onDismiss() }}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-base leading-none"
        >
          ×
        </button>
      )}
    </div>
  )
}

/* ─── Card ────────────────────────────────────────────────────────────────── */
export function Card({ children, className = '', style, hover = false }) {
  return (
    <div
      className={`bg-white rounded-2xl ${hover ? 'card-hover' : ''} ${className}`}
      style={{ boxShadow: '0 2px 16px rgba(6,20,27,.07), 0 0 0 1px rgba(6,20,27,.05)', ...style }}
    >
      {children}
    </div>
  )
}

/* ─── Button ──────────────────────────────────────────────────────────────── */
export function Btn({
  children, variant = 'primary', onClick, disabled, className = '',
  type = 'button', size = 'md', loading = false,
}) {
  const base = 'btn-press inline-flex items-center justify-center gap-2 font-semibold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none select-none'
  const sizes = {
    xs: 'px-2.5 py-1 text-[11px]', sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base',
  }
  const variants = {
    primary: 'bg-[#12A594] text-white hover:bg-[#0e8f81] focus-visible:ring-[#12A594] shadow-sm hover:shadow-[#12A594]/20 hover:shadow-lg',
    gold:    'bg-[#F4B942] text-[#06141B] hover:bg-[#e5a830] focus-visible:ring-[#F4B942] shadow-sm hover:shadow-[#F4B942]/25 hover:shadow-lg',
    outline: 'border border-[#12A594] text-[#12A594] hover:bg-[#12A594]/8 focus-visible:ring-[#12A594]',
    ghost:   'text-[#4B5F63] hover:bg-[#06141B]/6 focus-visible:ring-[#06141B]/20',
    danger:  'border border-red-400/60 text-red-600 hover:bg-red-50 focus-visible:ring-red-400',
  }
  return (
    <button
      type={type} onClick={onClick} disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading && (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin-slow" />
      )}
      {children}
    </button>
  )
}

/* ─── Form fields ─────────────────────────────────────────────────────────── */
export function Field({ label, type = 'text', value, onChange, placeholder, error, disabled, required, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className={`field-input w-full px-4 py-2.5 rounded-xl text-sm border bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          borderColor: error ? '#ef4444' : 'rgba(6,20,27,.13)',
          color: '#06141B',
        }}
      />
      {hint && !error && <p className="text-[11px] mt-1" style={{ color: '#7A9097' }}>{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}

export function SelectField({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[.1em] mb-1.5" style={{ color: '#4B5F63' }}>
        {label}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="field-input w-full px-4 py-2.5 rounded-xl text-sm border bg-white appearance-none disabled:opacity-50"
        style={{ borderColor: 'rgba(6,20,27,.13)', color: value ? '#06141B' : '#7A9097' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/* ─── Segment / Role toggle ───────────────────────────────────────────────── */
export function SegmentControl({ options, value, onChange }) {
  const idx = options.findIndex(o => o.value === value)
  return (
    <div className="relative flex rounded-xl p-1" style={{ background: 'rgba(6,20,27,.07)' }}>
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm"
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: `calc(${(idx / options.length) * 100}% + 4px)`,
          transition: 'left .24s cubic-bezier(.4,0,.2,1)',
          boxShadow: '0 1px 6px rgba(6,20,27,.14)',
        }}
      />
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="relative flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-200"
          style={{ color: value === o.value ? '#06141B' : '#7A9097' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Tab bar ─────────────────────────────────────────────────────────────── */
export function TabBar({ tabs, active, onChange }) {
  const containerRef = useRef(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const btn = c.querySelector(`[data-tab="${active}"]`)
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
  }, [active])

  return (
    <div className="relative overflow-x-auto" style={{ borderBottom: '1px solid rgba(6,20,27,.08)' }}>
      <div ref={containerRef} className="flex min-w-max">
        {tabs.map(tab => (
          <button
            key={tab.key}
            data-tab={tab.key}
            onClick={() => onChange(tab.key)}
            className="relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none"
            style={{ color: active === tab.key ? '#12A594' : '#4B5F63' }}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
                style={{ background: '#F4B942', animation: 'pulseGlow 2.4s ease infinite' }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="tab-indicator absolute bottom-0 h-[2.5px] rounded-full"
        style={{ left: indicator.left, width: indicator.width, background: 'linear-gradient(90deg,#12A594,#0e8f81)' }}
      />
    </div>
  )
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */
export function EmptyState({ icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-up">
      {icon && <div className="text-5xl mb-4 opacity-30">{icon}</div>}
      <div className="font-display font-semibold text-lg" style={{ color: '#4B5F63' }}>{title}</div>
      {message && <p className="text-sm mt-1.5 max-w-xs" style={{ color: '#7A9097' }}>{message}</p>}
    </div>
  )
}

/* ─── Expandable panel (smooth height) ───────────────────────────────────── */
export function Expandable({ open, children }) {
  return (
    <div className={`expand-wrap ${open ? 'open' : ''}`}>
      <div className="expand-inner">{children}</div>
    </div>
  )
}

/* ─── Confirmation dialog ─────────────────────────────────────────────────── */
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, danger = true }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-4"
      style={{ background: 'rgba(6,20,27,.6)', backdropFilter: 'blur(5px)', animation: 'scaleFadeIn .22s ease' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full animate-scale-in"
        style={{ boxShadow: '0 32px 96px rgba(6,20,27,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display font-semibold text-xl mb-2" style={{ color: '#06141B' }}>{title}</h3>
        <p className="text-sm leading-relaxed mb-7" style={{ color: '#4B5F63' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="ghost" onClick={onCancel}>{t('common.cancel')}</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</Btn>
        </div>
      </div>
    </div>
  )
}

/* ─── Skeleton loading row (new — for real async data loading states) ────── */
export function SkeletonRows({ rows = 3, height = 44 }) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton rounded-lg" style={{ height }} />
      ))}
    </div>
  )
}