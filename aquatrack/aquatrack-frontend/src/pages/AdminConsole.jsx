import { useCallback, useEffect, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { StatCard, Badge, AlertBanner, Card, TabBar, EmptyState, Btn, ConfirmDialog, SkeletonRows } from '../components/ui'
import axiosClient from '../api/axiosClient'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const severityVariant = (s) => {
  const sev = String(s || '').toUpperCase()
  return (sev === 'CRITICAL' || sev === 'DANGER') ? 'danger' : (sev === 'WARNING' || sev === 'MEDIUM') ? 'warning' : 'info'
}

/* ── Helper: Safe Array Extractor ──────────────────────────────────────────── */
const extractArray = (resData) => {
  if (Array.isArray(resData)) return resData
  if (resData && typeof resData === 'object') {
    if (Array.isArray(resData.content)) return resData.content
    if (Array.isArray(resData.data)) return resData.data
    if (Array.isArray(resData.households)) return resData.households
    if (Array.isArray(resData.alerts)) return resData.alerts
  }
  return []
}

/* ── Overview ──────────────────────────────────────────────────────────────── */
/* ── Overview ──────────────────────────────────────────────────────────────── */
function OverviewTab({ apartmentId }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [householdsCount, setHouseholdsCount] = useState(0)
  const [alerts, setAlerts] = useState([])
  const [comparison, setComparison] = useState([])
  const [pending, setPending] = useState(0)

  // Safe array extractor helper
  const toArray = (resData) => {
    if (Array.isArray(resData)) return resData
    if (resData && typeof resData === 'object') {
      if (Array.isArray(resData.content)) return resData.content
      if (Array.isArray(resData.data)) return resData.data
    }
    return []
  }

  useEffect(() => {
    if (!apartmentId) return

    setLoading(true)
    Promise.all([
      // Fetch /households/detail (uses HouseholdDetailResponse which serializes cleanly)
      axiosClient.get(`/admin/apartments/${apartmentId}/households/detail`).catch(() => ({ data: [] })),
      axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).catch(() => ({ data: [] })),
      axiosClient.get(`/admin/apartments/${apartmentId}/usage-comparison`).catch(() => ({ data: [] })),
      axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`).catch(() => ({ data: [] })),
    ]).then(([hDetail, a, c, p]) => {
      const detailList = toArray(hDetail.data)
      const alertList = toArray(a.data)
      const compList = toArray(c.data)
      const pendingList = toArray(p.data)

      // Set households count from detailList length, or fallback to chart items
      setHouseholdsCount(detailList.length > 0 ? detailList.length : compList.length)
      setAlerts(alertList)
      setComparison(compList)
      setPending(pendingList.length)
    }).finally(() => setLoading(false))
  }, [apartmentId])

  // Safely extract consumption value from any property key variation
  const getConsumption = (c) => Number(c.totalConsumptionKl ?? c.consumptionKl ?? c.totalConsumption ?? 0)

  // Average Daily Usage in Liters
  const avgUsageL = comparison.length
    ? Math.round((comparison.reduce((s, c) => s + getConsumption(c), 0) / comparison.length) * 1000)
    : 0

  // Count critical alerts case-insensitively
  const criticalAlertsCount = alerts.filter(a => {
    const sev = String(a.severity || '').toUpperCase()
    return sev === 'CRITICAL' || sev === 'DANGER' || sev === 'HIGH'
  }).length

  return (
    <div className="py-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: t('admin.overview.statHouseholds', { defaultValue: 'Households' }), 
            value: householdsCount, 
            caption: t('admin.overview.statHouseholdsCaption', { defaultValue: 'Registered flats' }), 
            accentColor: '#12A594', 
            delay: 0 
          },
          { 
            label: t('admin.overview.statActiveAlerts', { defaultValue: 'Active Alerts' }), 
            value: alerts.length, 
            caption: t('admin.overview.statActiveAlertsCaption', { defaultValue: '{{count}} critical', count: criticalAlertsCount }), 
            accentColor: '#ef4444', 
            delay: 80 
          },
          { 
            label: t('admin.overview.statAvgUsage', { defaultValue: 'Avg. Daily Usage' }), 
            value: avgUsageL >= 1000000 ? `${(avgUsageL / 1000000).toFixed(1)}M` : avgUsageL.toLocaleString(), 
            unit: 'L', 
            caption: t('admin.overview.statAvgUsageCaption', { defaultValue: 'Per household · recent' }), 
            accentColor: '#F4B942', 
            delay: 160 
          },
          { 
            label: t('admin.overview.statPending', { defaultValue: 'Pending Approvals' }), 
            value: pending, 
            caption: t('admin.overview.statPendingCaption', { defaultValue: 'Residents awaiting review' }), 
            accentColor: '#F4B942', 
            delay: 240 
          },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-1" style={{ color: '#06141B' }}>{t('admin.overview.chartTitle', { defaultValue: 'Consumption by Household' })}</h3>
        <p className="text-xs mb-4" style={{ color: '#7A9097' }}>{t('admin.overview.chartSubtitle', { defaultValue: 'Recent readings · kL / flat' })}</p>
        {loading ? <SkeletonRows rows={1} height={220} /> : comparison.length === 0 ? (
          <EmptyState icon="📊" title={t('admin.overview.chartEmpty', { defaultValue: 'No usage data yet' })} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparison.map(c => ({ flat: c.flatNumber, kL: getConsumption(c) }))} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,20,27,0.06)" vertical={false} />
              <XAxis dataKey="flat" tick={{ fontSize: 11, fill: '#7A9097' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7A9097' }} tickLine={false} axisLine={false} unit=" kL" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(6,20,27,0.12)', fontSize: 12 }}
                formatter={(v) => [`${v} kL`, 'Usage']}
              />
              <Bar dataKey="kL" fill="#12A594" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.overview.alertsTitle', { defaultValue: 'Active Alerts' })}</h3>
        </div>
        {loading ? <SkeletonRows rows={2} /> : alerts.length === 0 ? (
          <EmptyState icon="✅" title={t('admin.overview.alertsEmptyTitle', { defaultValue: 'All clear' })} message={t('admin.overview.alertsEmptyMessage', { defaultValue: 'No active alerts right now.' })} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                {[t('common.flat', { defaultValue: 'Flat' }), t('admin.overview.tableType', { defaultValue: 'Type' }), t('admin.overview.tableSeverity', { defaultValue: 'Severity' }), t('admin.overview.tableMessage', { defaultValue: 'Message' })].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                  <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>{a.household?.flatNumber || a.flatNumber}</td>
                  <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{a.alertType}</td>
                  <td className="px-6 py-3.5"><Badge variant={a.severity === 'CRITICAL' ? 'danger' : 'info'} /></td>
                  <td className="px-6 py-3.5 text-sm" style={{ color: '#4B5F63' }}>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

/* ── Households ────────────────────────────────────────────────────────────── */
function HouseholdsTab({ apartmentId }) {
  const { t } = useTranslation()
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedFine, setExpandedFine] = useState(null)
  const [fineAmount, setFineAmount] = useState('')
  const [fineReason, setFineReason] = useState('')
  const [fineSubmitting, setFineSubmitting] = useState(false)
  const [hhForm, setHhForm] = useState({ flat: '', size: '', occupancy: '', meter: '', limit: '' })
  const [hhSubmitting, setHhSubmitting] = useState(false)
  const [banner, setBanner] = useState(null)

  const load = useCallback(() => {
    if (!apartmentId) return
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/households/detail`)
      .then(res => setHouseholds(extractArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const registerHousehold = async () => {
    if (!hhForm.flat || !hhForm.size || !hhForm.occupancy) return
    setHhSubmitting(true)
    try {
      await axiosClient.post('/admin/households', {
        apartmentId,
        flatNumber: hhForm.flat,
        flatSizeSqft: Number(hhForm.size),
        occupancy: Number(hhForm.occupancy),
        meterSerialNumber: hhForm.meter || null,
        dailyLimitKl: hhForm.limit === '' ? null : Number(hhForm.limit),
      })
      setBanner({ type: 'success', msg: t('admin.households.registerSuccess', { defaultValue: 'Flat {{flat}} registered.', flat: hhForm.flat }) })
      setHhForm({ flat: '', size: '', occupancy: '', meter: '', limit: '' })
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.households.registerError', { defaultValue: 'Could not register household.' }) })
    } finally {
      setHhSubmitting(false)
    }
  }

  const submitFine = async (householdId) => {
    if (!fineAmount || !fineReason) return
    setFineSubmitting(true)
    try {
      await axiosClient.post('/admin/fines', { householdId, amount: Number(fineAmount), reason: fineReason })
      setBanner({ type: 'success', msg: t('admin.households.fineSuccess', { defaultValue: 'Fine imposed and the resident has been notified by email.' }) })
      setExpandedFine(null); setFineAmount(''); setFineReason('')
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.households.fineError', { defaultValue: 'Could not impose fine.' }) })
    } finally {
      setFineSubmitting(false)
    }
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      {/* Register form */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.households.registerTitle', { defaultValue: 'Register Household' })}</h3>
        {banner && <div className="mb-4"><AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} /></div>}
        <div className="flex flex-col gap-4">
          {[
            { key: 'flat', label: t('admin.households.flatLabel', { defaultValue: 'Flat number' }), placeholder: t('admin.households.flatPlaceholder', { defaultValue: 'e.g. 5A' }) },
            { key: 'size', label: t('admin.households.sizeLabel', { defaultValue: 'Flat size (sqft)' }), placeholder: t('admin.households.sizePlaceholder', { defaultValue: '850' }) },
            { key: 'occupancy', label: t('admin.households.occupancyLabel', { defaultValue: 'Occupancy' }), placeholder: t('admin.households.occupancyPlaceholder', { defaultValue: '2' }) },
            { key: 'meter', label: t('admin.households.meterLabel', { defaultValue: 'Meter serial no. (optional)' }), placeholder: t('admin.households.meterPlaceholder', { defaultValue: 'MT-00421' }) },
            { key: 'limit', label: t('admin.households.limitLabel', { defaultValue: 'Daily usage limit (kL, optional)' }), placeholder: t('admin.households.limitPlaceholder', { defaultValue: '0.5' }) },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{f.label}</label>
              <input
                value={hhForm[f.key]}
                onChange={e => setHhForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
              />
            </div>
          ))}
          <Btn variant="primary" className="mt-1" onClick={registerHousehold} loading={hhSubmitting}>{t('admin.households.registerButton', { defaultValue: 'Register Household' })}</Btn>
        </div>
      </Card>

      {/* Household cards */}
      <div className="flex flex-col gap-4">
        <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.households.listTitle', { defaultValue: 'Households & Residents' })}</h3>
        {loading ? <SkeletonRows rows={3} height={120} /> : households.length === 0 ? (
          <EmptyState icon="🏠" title={t('admin.households.emptyTitle', { defaultValue: 'No households yet' })} message={t('admin.households.emptyMessage', { defaultValue: 'Register your first flat using the form.' })} />
        ) : households.map(hh => (
          <Card key={hh.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.households.flatHeading', { defaultValue: 'Flat {{flat}}', flat: hh.flatNumber })}</span>
                <Badge variant={hh.meterActive ? 'active' : 'inactive'} label={hh.meterActive ? t('admin.households.meterActive', { defaultValue: 'Meter Active' }) : t('admin.households.meterInactive', { defaultValue: 'Meter Inactive' })} />
                {hh.unpaidFineCount > 0 && <Badge variant="unpaid" label={t('admin.households.unpaidBadge', { defaultValue: '{{count}} unpaid · ₹{{amount}}', count: hh.unpaidFineCount, amount: hh.unpaidFineTotal })} />}
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: '#7A9097' }}>
              {hh.flatSizeSqft} sqft · {t('admin.households.occupants', { defaultValue: '{{count}} occupant(s)', count: hh.occupancy })}{hh.dailyLimitKl ? ` · ${t('admin.households.limitSuffix', { defaultValue: 'Limit: {{limit}} kL/day', limit: hh.dailyLimitKl })}` : ''}
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {(!hh.residents || hh.residents.length === 0) ? (
                <p className="text-xs italic" style={{ color: '#7A9097' }}>{t('admin.households.noResidents', { defaultValue: 'No resident account registered for this flat yet.' })}</p>
              ) : hh.residents.map(r => (
                <div key={r.userId} className="flex items-center gap-2 justify-between flex-wrap">
                  <div>
                    <span className="text-sm font-medium" style={{ color: '#06141B' }}>{r.fullName}</span>
                    <span className="text-xs ml-2" style={{ color: '#7A9097' }}>{r.email}</span>
                  </div>
                  <Badge variant={String(r.approvalStatus || '').toLowerCase()} />
                </div>
              ))}
            </div>

            {/* Impose fine */}
            {expandedFine !== hh.id ? (
              <button
                onClick={() => { setExpandedFine(hh.id); setFineAmount(''); setFineReason('') }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c' }}
              >
                {t('admin.households.imposeFine', { defaultValue: 'Impose Fine' })}
              </button>
            ) : (
              <div className="animate-slide-down p-4 rounded-xl mt-1 flex flex-col gap-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#4B5F63' }}>{t('admin.households.fineAmountLabel', { defaultValue: 'Amount (₹)' })}</label>
                  <input
                    value={fineAmount}
                    onChange={e => setFineAmount(e.target.value)}
                    placeholder={t('admin.households.fineAmountPlaceholder', { defaultValue: '500' })}
                    className="field-input w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ border: '1.5px solid rgba(239,68,68,0.25)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#4B5F63' }}>{t('admin.households.fineReasonLabel', { defaultValue: 'Reason' })}</label>
                  <input
                    value={fineReason}
                    onChange={e => setFineReason(e.target.value)}
                    placeholder={t('admin.households.fineReasonPlaceholder', { defaultValue: 'Overuse penalty' })}
                    className="field-input w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ border: '1.5px solid rgba(239,68,68,0.25)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <Btn variant="danger" size="sm" onClick={() => submitFine(hh.id)} loading={fineSubmitting}>{t('admin.households.confirmFine', { defaultValue: 'Confirm Fine' })}</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setExpandedFine(null)}>{t('common.cancel', { defaultValue: 'Cancel' })}</Btn>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ── Pending Approvals ─────────────────────────────────────────────────────── */
function PendingTab({ apartmentId, onChanged }) {
  const { t } = useTranslation()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    if (!apartmentId) return
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`)
      .then(res => setApprovals(extractArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const approve = async (userId, name) => {
    setBusyId(userId)
    try {
      await axiosClient.post(`/admin/residents/${userId}/approve`)
      setBanner({ type: 'success', msg: t('admin.pending.approveSuccess', { defaultValue: '{{name}} has been approved and notified.', name }) })
      load(); onChanged && onChanged()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.pending.approveError', { defaultValue: 'Could not approve this registration.' }) })
    } finally {
      setBusyId(null)
    }
  }
  const reject = async (userId, name) => {
    setBusyId(userId)
    try {
      await axiosClient.post(`/admin/residents/${userId}/reject`)
      setBanner({ type: 'danger', msg: t('admin.pending.rejectSuccess', { defaultValue: '{{name}} has been rejected.', name }) })
      load(); onChanged && onChanged()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.pending.rejectError', { defaultValue: 'Could not reject this registration.' }) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="py-6 flex flex-col gap-4">
      <p className="text-sm" style={{ color: '#4B5F63' }}>
        {t('admin.pending.description', { defaultValue: 'Review residents who registered and are awaiting your approval. Approved residents can log in immediately.' })}
      </p>
      {banner && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} />}

      {loading ? <SkeletonRows rows={3} /> : approvals.length === 0 ? (
        <EmptyState icon="✅" title={t('admin.pending.emptyTitle', { defaultValue: 'All caught up' })} message={t('admin.pending.emptyMessage', { defaultValue: 'No pending registrations to review.' })} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {[
                    t('admin.pending.tableName', { defaultValue: 'Name' }),
                    t('admin.pending.tableUsername', { defaultValue: 'Username' }),
                    t('admin.pending.tableEmail', { defaultValue: 'Email' }),
                    t('admin.pending.tableFlat', { defaultValue: 'Flat' }),
                    t('admin.pending.tableSignup', { defaultValue: 'Sign-up' }),
                    t('common.actions', { defaultValue: 'Actions' })
                  ].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                    <td className="px-6 py-3.5 font-medium" style={{ color: '#06141B' }}>{a.fullName}</td>
                    <td className="px-6 py-3.5 text-xs font-mono" style={{ color: '#4B5F63' }}>{a.username}</td>
                    <td className="px-6 py-3.5 text-xs" style={{ color: '#7A9097' }}>{a.email}</td>
                    <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>{a.household?.flatNumber}</td>
                    <td className="px-6 py-3.5">
                      {a.authProvider === 'GOOGLE' ? (
                        <span className="text-xs font-medium" style={{ color: '#4285F4' }}>{t('admin.pending.signupGoogle', { defaultValue: 'Google' })}</span>
                      ) : (
                        <span className="text-xs" style={{ color: '#7A9097' }}>{t('admin.pending.signupPassword', { defaultValue: 'Password' })}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        <Btn variant="primary" size="sm" onClick={() => approve(a.id, a.fullName)} loading={busyId === a.id}>{t('common.approve', { defaultValue: 'Approve' })}</Btn>
                        <Btn variant="danger" size="sm" onClick={() => reject(a.id, a.fullName)} loading={busyId === a.id}>{t('common.reject', { defaultValue: 'Reject' })}</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── Meter Uploads ─────────────────────────────────────────────────────────── */
function MeterUploadsTab({ apartmentId }) {
  const { t } = useTranslation()
  const [households, setHouseholds] = useState([])
  const [manualForm, setManualForm] = useState({ household: '', date: '', value: '' })
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [manualBanner, setManualBanner] = useState(null)
  const [manualError, setManualError] = useState(null)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [file, setFile] = useState(null)

  useEffect(() => {
    if (!apartmentId) return
    axiosClient.get(`/admin/apartments/${apartmentId}/households`)
      .then(res => setHouseholds(extractArray(res.data)))
      .catch(() => {})
  }, [apartmentId])

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setUploading(true)
    setUploadResult(null); setUploadError(null)
    const formData = new FormData()
    formData.append('apartmentId', apartmentId)
    formData.append('file', f)
    axiosClient.post('/admin/usage-logs/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(res => {
        const r = res.data
        if (r.errors?.length) {
          setUploadResult(t('admin.meters.csvSuccessWithErrors', {
            defaultValue: '✅ {{total}} rows processed · {{inserted}} inserted · {{duplicates}} duplicate(s) skipped · {{errors}} error(s)',
            total: r.totalRows, inserted: r.inserted, duplicates: r.duplicatesSkipped, errors: r.errors.length
          }))
        } else {
          setUploadResult(t('admin.meters.csvSuccess', {
            defaultValue: '✅ {{total}} rows processed · {{inserted}} inserted · {{duplicates}} duplicate(s) skipped',
            total: r.totalRows, inserted: r.inserted, duplicates: r.duplicatesSkipped
          }))
        }
      })
      .catch(err => setUploadError(err.response?.data?.message || t('admin.meters.csvError', { defaultValue: 'Upload failed.' })))
      .finally(() => setUploading(false))
  }

  const submitManual = async () => {
    if (!manualForm.household || !manualForm.date || manualForm.value === '') return
    setManualSubmitting(true)
    setManualBanner(null); setManualError(null)
    try {
      await axiosClient.post('/admin/usage-logs', {
        householdId: manualForm.household,
        readingDate: manualForm.date,
        readingValue: Number(manualForm.value),
      })
      setManualBanner(t('admin.meters.manualSuccess', { defaultValue: 'Reading recorded successfully.' }))
      setManualForm(p => ({ ...p, date: '', value: '' }))
    } catch (err) {
      setManualError(err.response?.data?.message || t('admin.meters.manualError', { defaultValue: 'Could not log reading.' }))
    } finally {
      setManualSubmitting(false)
    }
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      {/* CSV upload */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-2" style={{ color: '#06141B' }}>{t('admin.meters.csvTitle', { defaultValue: 'Bulk Meter Reading Upload (CSV)' })}</h3>
        <p className="text-xs mb-5" style={{ color: '#7A9097' }}>
          {t('admin.meters.csvFormatNote', { defaultValue: 'CSV format: flat_number,reading_date,reading_value' })}
        </p>
        <label className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: 'rgba(6,20,27,0.15)' }}>
          <span className="text-2xl">📁</span>
          <span className="text-sm font-medium" style={{ color: '#4B5F63' }}>
            {uploading ? t('admin.meters.csvUploading', { defaultValue: 'Uploading…' }) : file ? file.name : t('admin.meters.csvPrompt', { defaultValue: 'Click to upload CSV file' })}
          </span>
          <input type="file" accept=".csv" className="sr-only" onChange={handleFile} />
        </label>
        {uploadResult && (
          <div className="mt-4"><AlertBanner type="success" message={uploadResult} onDismiss={() => setUploadResult(null)} /></div>
        )}
        {uploadError && (
          <div className="mt-4"><AlertBanner type="danger" message={uploadError} onDismiss={() => setUploadError(null)} /></div>
        )}
      </Card>

      {/* Manual entry */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.meters.manualTitle', { defaultValue: 'Manual Reading Entry' })}</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.meters.householdLabel', { defaultValue: 'Household' })}</label>
            <select
              value={manualForm.household}
              onChange={e => setManualForm(p => ({ ...p, household: e.target.value }))}
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: manualForm.household ? '#06141B' : '#7A9097' }}
            >
              <option value="">{t('admin.meters.householdSelect', { defaultValue: 'Select flat…' })}</option>
              {households.map(h => <option key={h.id} value={h.id}>{t('admin.meters.flatOption', { defaultValue: 'Flat {{flat}}', flat: h.flatNumber })}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.meters.dateLabel', { defaultValue: 'Reading Date' })}</label>
            <input
              type="date"
              value={manualForm.date}
              onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))}
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.meters.readingLabel', { defaultValue: 'Reading (cumulative kL)' })}</label>
            <input
              type="number"
              value={manualForm.value}
              onChange={e => setManualForm(p => ({ ...p, value: e.target.value }))}
              placeholder={t('admin.meters.readingPlaceholder', { defaultValue: '0.380' })}
              step="0.001"
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
            />
          </div>
          {manualBanner && <AlertBanner type="success" message={manualBanner} onDismiss={() => setManualBanner(null)} />}
          {manualError && <AlertBanner type="danger" message={manualError} onDismiss={() => setManualError(null)} />}
          <Btn variant="primary" onClick={submitManual} loading={manualSubmitting}>{t('admin.meters.submitButton', { defaultValue: 'Submit Reading' })}</Btn>
        </div>
      </Card>
    </div>
  )
}

/* ── Tariff Plans ──────────────────────────────────────────────────────────── */
function TariffTab({ apartmentId }) {
  const { t } = useTranslation()
  const [tiers, setTiers] = useState([
    { upTo: '10', rate: '20' },
    { upTo: '25', rate: '35' },
    { upTo: '', rate: '50' },
  ])
  const [planName, setPlanName] = useState('')
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState(null)

  const load = useCallback(() => {
    if (!apartmentId) return
    setLoading(true)
    axiosClient.get(`/admin/tariff-plans/apartment/${apartmentId}`)
      .then(res => setPlans(extractArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const addTier = () => setTiers(p => [...p, { upTo: '', rate: '' }])
  const removeTier = (i) => setTiers(p => p.filter((_, idx) => idx !== i))

  const savePlan = async () => {
    if (!planName || tiers.some((t, i) => !t.rate || (i < tiers.length - 1 && !t.upTo))) return
    setSubmitting(true)
    setBanner(null)
    try {
      await axiosClient.post('/admin/tariff-plans', {
        apartmentId,
        planName,
        tiers: tiers.map((t, i) => ({
          upToKl: i === tiers.length - 1 && t.upTo === '' ? null : Number(t.upTo),
          rate: Number(t.rate),
        })),
      })
      setBanner({ type: 'success', msg: t('admin.tariff.saveSuccess', { defaultValue: 'Tariff plan created and set as active.' }) })
      setPlanName('')
      setTiers([{ upTo: '10', rate: '20' }, { upTo: '25', rate: '35' }, { upTo: '', rate: '50' }])
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.tariff.saveError', { defaultValue: 'Could not save tariff plan.' }) })
    } finally {
      setSubmitting(false)
    }
  }

  const describeTiers = (planTiers) => {
    let lower = 0
    return planTiers.map((tr, i) => {
      const label = t('admin.tariff.tierDescription', {
        defaultValue: '{{lower}}–{{upper}} kL @ ₹{{rate}}/kL',
        lower,
        upper: tr.upToKl ?? '∞',
        rate: tr.rate
      })
      if (tr.upToKl != null) lower = tr.upToKl
      return <li key={i} className="text-xs" style={{ color: '#4B5F63' }}>{label}</li>
    })
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.tariff.newPlanTitle', { defaultValue: 'New Tariff Plan' })}</h3>
        {banner && <div className="mb-4"><AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} /></div>}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.tariff.planNameLabel', { defaultValue: 'Plan name' })}</label>
            <input
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              placeholder={t('admin.tariff.planNamePlaceholder', { defaultValue: 'Monsoon 2025' })}
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
            />
          </div>
          <div className="flex flex-col gap-2">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={tier.upTo}
                  onChange={e => setTiers(p => p.map((tr, idx) => idx === i ? { ...tr, upTo: e.target.value } : tr))}
                  placeholder={i === tiers.length - 1 ? t('admin.tariff.tierUnlimitedPlaceholder', { defaultValue: 'unlimited' }) : t('admin.tariff.tierUpToPlaceholder', { defaultValue: 'Up to (kL)' })}
                  className="field-input flex-1 px-3 py-2 rounded-lg text-sm border"
                  style={{ border: '1.5px solid rgba(6,20,27,0.12)' }}
                />
                <input
                  value={tier.rate}
                  onChange={e => setTiers(p => p.map((tr, idx) => idx === i ? { ...tr, rate: e.target.value } : tr))}
                  placeholder={t('admin.tariff.tierRatePlaceholder', { defaultValue: 'Rate ₹/kL' })}
                  className="field-input flex-1 px-3 py-2 rounded-lg text-sm border"
                  style={{ border: '1.5px solid rgba(6,20,27,0.12)' }}
                />
                {tiers.length > 1 && (
                  <button onClick={() => removeTier(i)} className="w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addTier}
            className="text-sm font-medium flex items-center gap-1 hover:underline"
            style={{ color: '#12A594' }}
          >
            {t('admin.tariff.addTier', { defaultValue: '+ Add Tier' })}
          </button>
          <Btn variant="primary" onClick={savePlan} loading={submitting}>{t('admin.tariff.saveButton', { defaultValue: 'Save Tariff Plan' })}</Btn>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.tariff.historyTitle', { defaultValue: 'Tariff History' })}</h3>
        {loading ? <SkeletonRows rows={2} height={90} /> : plans.length === 0 ? (
          <EmptyState icon="⚖️" title={t('admin.tariff.historyEmpty', { defaultValue: 'No tariff plans yet' })} />
        ) : plans.map(plan => (
          <Card key={plan.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold" style={{ color: '#06141B' }}>{plan.planName}</span>
              {plan.active && <Badge variant="active" />}
            </div>
            <ul className="flex flex-col gap-1.5">
              {describeTiers(plan.tiers || [])}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ── Billing Cycles ────────────────────────────────────────────────────────── */
const PURCHASE_TYPE_OPTIONS = [
  { value: 'TANKER' },
  { value: 'MUNICIPAL' },
  { value: 'OTHER' },
]

function BillingTab({ apartmentId }) {
  const { t } = useTranslation()
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [purchasesByCycle, setPurchasesByCycle] = useState({})
  const [invoicesByCycle, setInvoicesByCycle] = useState({})
  const [banner, setBanner] = useState(null)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [openSubmitting, setOpenSubmitting] = useState(false)

  const [purchaseForm, setPurchaseForm] = useState({ billingCycleId: '', purchaseDate: '', purchaseType: 'TANKER', volumeKl: '', unitCost: '', notes: '' })
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)

  const [adjustFor, setAdjustFor] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  const load = useCallback(() => {
    if (!apartmentId) return
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/billing-cycles`)
      .then(res => setCycles(extractArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const openCycle = async () => {
    if (!startDate || !endDate) return
    setOpenSubmitting(true)
    setBanner(null)
    try {
      await axiosClient.post('/admin/billing-cycles', { apartmentId, startDate, endDate })
      setBanner({ type: 'success', msg: t('admin.billing.openSuccess', { defaultValue: 'Billing cycle opened.' }) })
      setStartDate(''); setEndDate('')
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.billing.openError', { defaultValue: 'Could not open billing cycle.' }) })
    } finally {
      setOpenSubmitting(false)
    }
  }

  const recordPurchase = async () => {
    const f = purchaseForm
    if (!f.billingCycleId || !f.purchaseDate || !f.volumeKl || !f.unitCost) return
    setPurchaseSubmitting(true)
    setBanner(null)
    try {
      await axiosClient.post('/admin/billing-cycles/purchases', {
        ...f, volumeKl: Number(f.volumeKl), unitCost: Number(f.unitCost),
      })
      setBanner({ type: 'success', msg: t('admin.billing.purchaseSuccess', { defaultValue: 'Purchase recorded.' }) })
      setPurchaseForm(p => ({ ...p, volumeKl: '', unitCost: '', notes: '' }))
      load()
      if (expanded === f.billingCycleId) loadDetail(f.billingCycleId)
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.billing.purchaseError', { defaultValue: 'Could not record purchase.' }) })
    } finally {
      setPurchaseSubmitting(false)
    }
  }

  const loadDetail = async (cycleId) => {
    const [purchases, invoices] = await Promise.all([
      axiosClient.get(`/admin/billing-cycles/${cycleId}/purchases`).catch(() => ({ data: [] })),
      axiosClient.get(`/admin/billing-cycles/${cycleId}/invoices`).catch(() => ({ data: [] })),
    ])
    setPurchasesByCycle(p => ({ ...p, [cycleId]: extractArray(purchases.data) }))
    setInvoicesByCycle(p => ({ ...p, [cycleId]: extractArray(invoices.data) }))
  }

  const toggleExpand = (cycleId) => {
    if (expanded === cycleId) { setExpanded(null); return }
    setExpanded(cycleId)
    loadDetail(cycleId)
  }

  const finalize = async (id) => {
    setBanner(null)
    try {
      await axiosClient.post(`/admin/billing-cycles/${id}/finalize`)
      setBanner({ type: 'success', msg: t('admin.billing.finalizeSuccess', { defaultValue: 'Billing cycle finalized — invoices generated and emailed (with PDF attached) to residents.' }) })
      load()
      if (expanded === id) loadDetail(id)
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.billing.finalizeError', { defaultValue: 'Could not finalize cycle.' }) })
    }
  }

  const archive = async (id) => {
    try {
      await axiosClient.post(`/admin/billing-cycles/${id}/archive`)
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.billing.archiveError', { defaultValue: 'Could not archive cycle.' }) })
    }
  }

  const submitAdjustment = async (invoiceId) => {
    if (!adjustAmount || !adjustReason) return
    try {
      await axiosClient.post(`/admin/invoices/${invoiceId}/adjustments`, { amount: Number(adjustAmount), reason: adjustReason })
      setAdjustFor(null); setAdjustAmount(''); setAdjustReason('')
      setBanner({ type: 'success', msg: t('admin.billing.adjustSuccess', { defaultValue: 'Adjustment applied.' }) })
      if (expanded) loadDetail(expanded)
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.billing.adjustError', { defaultValue: 'Could not apply adjustment.' }) })
    }
  }

  return (
    <div className="py-6 flex flex-col gap-6">
      {banner && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} />}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Open cycle */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.billing.openTitle', { defaultValue: 'Open Billing Cycle' })}</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.startDateLabel', { defaultValue: 'Start date' })}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.endDateLabel', { defaultValue: 'End date' })}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)' }} />
            </div>
            <Btn variant="primary" onClick={openCycle} loading={openSubmitting}>{t('admin.billing.openButton', { defaultValue: 'Open Cycle' })}</Btn>
          </div>
        </Card>

        {/* Bulk water purchase */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.billing.purchaseTitle', { defaultValue: 'Record Bulk Water Purchase' })}</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.cycleLabel', { defaultValue: 'Billing Cycle' })}</label>
              <select
                value={purchaseForm.billingCycleId}
                onChange={e => setPurchaseForm(p => ({ ...p, billingCycleId: e.target.value }))}
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
                style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
              >
                <option value="">{t('admin.billing.cycleSelect', { defaultValue: 'Select…' })}</option>
                {cycles.filter(c => c.status === 'OPEN').map(c => <option key={c.id} value={c.id}>{c.startDate} to {c.endDate}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.purchaseDateLabel', { defaultValue: 'Purchase Date' })}</label>
              <input type="date" value={purchaseForm.purchaseDate} onChange={e => setPurchaseForm(p => ({ ...p, purchaseDate: e.target.value }))} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.sourceLabel', { defaultValue: 'Source' })}</label>
              <select
                value={purchaseForm.purchaseType}
                onChange={e => setPurchaseForm(p => ({ ...p, purchaseType: e.target.value }))}
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
                style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
              >
                {PURCHASE_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.value === 'TANKER' ? t('admin.billing.sourceTanker', { defaultValue: 'Tanker' }) :
                     o.value === 'MUNICIPAL' ? t('admin.billing.sourceMunicipal', { defaultValue: 'Municipal' }) :
                     t('admin.billing.sourceOther', { defaultValue: 'Other' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.volumeLabel', { defaultValue: 'Volume (kL)' })}</label>
              <input type="number" value={purchaseForm.volumeKl} onChange={e => setPurchaseForm(p => ({ ...p, volumeKl: e.target.value }))} placeholder={t('admin.billing.volumePlaceholder', { defaultValue: '120' })} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.unitCostLabel', { defaultValue: 'Unit Cost (₹/kL)' })}</label>
              <input type="number" value={purchaseForm.unitCost} onChange={e => setPurchaseForm(p => ({ ...p, unitCost: e.target.value }))} placeholder={t('admin.billing.unitCostPlaceholder', { defaultValue: '42' })} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billing.notesLabel', { defaultValue: 'Notes (optional)' })}</label>
              <input type="text" value={purchaseForm.notes} onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('admin.billing.notesPlaceholder', { defaultValue: 'Rainy season tanker' })} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <Btn variant="primary" onClick={recordPurchase} loading={purchaseSubmitting}>{t('admin.billing.purchaseButton', { defaultValue: 'Record Purchase' })}</Btn>
          </div>
        </Card>
      </div>

      {/* Cycles table */}
      <Card className="overflow-hidden">
        {loading ? <SkeletonRows rows={3} /> : cycles.length === 0 ? (
          <EmptyState icon="🧾" title={t('admin.billing.emptyTitle', { defaultValue: 'No billing cycles yet' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {[
                    t('admin.billing.tablePeriod', { defaultValue: 'Period' }),
                    t('common.status', { defaultValue: 'Status' }),
                    t('admin.billing.tablePurchased', { defaultValue: 'Purchased' }),
                    t('admin.billing.tableAvgCost', { defaultValue: 'Avg Cost' }),
                    t('common.actions', { defaultValue: 'Actions' })
                  ].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cycles.map(c => (
                  <Fragment key={c.id}>
                    <tr className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                      <td className="px-6 py-3.5 font-medium" style={{ color: '#06141B' }}>{c.startDate} – {c.endDate}</td>
                      <td className="px-6 py-3.5"><Badge variant={String(c.status || '').toLowerCase()} /></td>
                      <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{c.totalPurchasedVolumeKl} kL</td>
                      <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>₹{c.unitCost}/kL</td>
                      <td className="px-6 py-3.5">
                        <div className="flex gap-2">
                          <Btn variant="ghost" size="sm" onClick={() => toggleExpand(c.id)}>{expanded === c.id ? t('common.hide', { defaultValue: 'Hide' }) : t('common.details', { defaultValue: 'Details' })}</Btn>
                          {c.status === 'OPEN' && <Btn variant="outline" size="sm" onClick={() => finalize(c.id)}>{t('admin.billing.finalize', { defaultValue: 'Finalize' })}</Btn>}
                          {c.status === 'FINALIZED' && <Btn variant="ghost" size="sm" onClick={() => archive(c.id)}>{t('admin.billing.archive', { defaultValue: 'Archive' })}</Btn>}
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={5} className="px-6 pb-4">
                          <div className="animate-slide-down rounded-xl p-4" style={{ background: 'rgba(18,165,148,0.04)', border: '1px solid rgba(18,165,148,0.12)' }}>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7A9097' }}>{t('admin.billing.purchasesHeading', { defaultValue: 'Purchases' })}</p>
                            {!purchasesByCycle[c.id] || purchasesByCycle[c.id].length === 0 ? (
                              <p className="text-xs mb-4" style={{ color: '#7A9097' }}>{t('admin.billing.purchasesEmpty', { defaultValue: 'No purchases recorded yet.' })}</p>
                            ) : (
                              <table className="w-full text-xs mb-4">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                                    {[
                                      t('admin.billing.purchaseTableDate', { defaultValue: 'Date' }),
                                      t('admin.billing.purchaseTableType', { defaultValue: 'Type' }),
                                      t('admin.billing.purchaseTableVolume', { defaultValue: 'Volume' }),
                                      t('admin.billing.purchaseTableUnitCost', { defaultValue: 'Unit Cost' }),
                                      t('admin.billing.purchaseTableTotal', { defaultValue: 'Total' }),
                                      t('admin.billing.purchaseTableNotes', { defaultValue: 'Notes' })
                                    ].map(h => <th key={h} className="pb-2 text-left font-semibold" style={{ color: '#7A9097' }}>{h}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchasesByCycle[c.id].map(p => (
                                    <tr key={p.id}>
                                      <td className="py-1.5" style={{ color: '#4B5F63' }}>{p.purchaseDate}</td>
                                      <td>{p.purchaseType}</td><td>{p.volumeKl} kL</td>
                                      <td>₹{p.unitCost}/kL</td><td>₹{p.totalCost}</td><td>{p.notes || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {c.status !== 'OPEN' && (
                              <>
                                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7A9097' }}>{t('admin.billing.invoicesHeading', { defaultValue: 'Invoices' })}</p>
                                {!invoicesByCycle[c.id] || invoicesByCycle[c.id].length === 0 ? (
                                  <p className="text-xs" style={{ color: '#7A9097' }}>{t('admin.billing.invoicesEmpty', { defaultValue: 'No invoices yet.' })}</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                                        {[
                                          t('admin.billing.invoiceTableFlat', { defaultValue: 'Flat' }),
                                          t('admin.billing.invoiceTableConsumption', { defaultValue: 'Consumption' }),
                                          t('admin.billing.invoiceTableBase', { defaultValue: 'Base' }),
                                          t('admin.billing.invoiceTableShared', { defaultValue: 'Shared' }),
                                          t('admin.billing.invoiceTableAdjustments', { defaultValue: 'Adjustments' }),
                                          t('admin.billing.invoiceTableTotal', { defaultValue: 'Total' }),
                                          ''
                                        ].map(h => <th key={h} className="pb-2 text-left font-semibold" style={{ color: '#7A9097' }}>{h}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {invoicesByCycle[c.id].map(inv => (
                                        <Fragment key={inv.id}>
                                          <tr>
                                            <td className="py-1.5 font-semibold" style={{ color: '#06141B' }}>{inv.household?.flatNumber}</td>
                                            <td>{inv.consumptionKl} kL</td><td>₹{inv.baseCharge}</td><td>₹{inv.sharedAllocation}</td>
                                            <td>{Number(inv.adjustments) === 0 ? '—' : `₹${inv.adjustments}`}</td><td>₹{inv.total}</td>
                                            <td><Btn size="sm" variant="ghost" onClick={() => setAdjustFor(adjustFor === inv.id ? null : inv.id)}>{t('admin.billing.adjust', { defaultValue: 'Adjust' })}</Btn></td>
                                          </tr>
                                          {adjustFor === inv.id && (
                                            <tr>
                                              <td colSpan={7} className="py-2">
                                                <div className="flex gap-2 flex-wrap items-center">
                                                  <input value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder={t('admin.billing.adjustAmountPlaceholder', { defaultValue: 'Amount +/- ₹' })} className="field-input px-2 py-1.5 rounded-lg text-xs border" style={{ width: 120, border: '1.5px solid rgba(6,20,27,0.12)' }} />
                                                  <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder={t('admin.billing.adjustReasonPlaceholder', { defaultValue: 'Reason' })} className="field-input px-2 py-1.5 rounded-lg text-xs border flex-1" style={{ minWidth: 140, border: '1.5px solid rgba(6,20,27,0.12)' }} />
                                                  <Btn size="xs" variant="primary" onClick={() => submitAdjustment(inv.id)}>{t('admin.billing.apply', { defaultValue: 'Apply' })}</Btn>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </Fragment>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Fines ─────────────────────────────────────────────────────────────────── */
function FinesTab({ apartmentId }) {
  const { t } = useTranslation()
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [banner, setBanner] = useState(null)

  const load = useCallback(() => {
    if (!apartmentId) return
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/fines`)
      .then(res => setFines(extractArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const outstanding = fines.filter(f => f.status === 'UNPAID').reduce((s, f) => s + Number(f.amount), 0)

  const setStatus = async (id, status) => {
    setBusyId(id)
    try {
      await axiosClient.post(`/admin/fines/${id}/status`, { status })
      setBanner({ type: 'success', msg: t('admin.fines.statusSuccess', { defaultValue: 'Fine marked as {{status}}.', status: status.toLowerCase() }) })
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.fines.statusError', { defaultValue: 'Could not update fine.' }) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.fines.title', { defaultValue: 'Fines' })}</h3>
        <Badge variant="danger" label={t('admin.fines.outstanding', { defaultValue: '₹{{amount}} outstanding', amount: outstanding })} />
      </div>
      {banner && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} />}
      <Card className="overflow-hidden">
        {loading ? <SkeletonRows rows={3} /> : fines.length === 0 ? (
          <EmptyState icon="🧾" title={t('admin.fines.emptyTitle', { defaultValue: 'No fines yet' })} message={t('admin.fines.emptyMessage', { defaultValue: 'Use the Households tab to impose one directly on a flat.' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {[
                    t('common.flat', { defaultValue: 'Flat' }),
                    t('common.amount', { defaultValue: 'Amount' }),
                    t('common.reason', { defaultValue: 'Reason' }),
                    t('common.status', { defaultValue: 'Status' }),
                    t('common.date', { defaultValue: 'Date' }),
                    t('common.actions', { defaultValue: 'Actions' })
                  ].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                    <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>{f.household?.flatNumber}</td>
                    <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>₹{f.amount}</td>
                    <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{f.reason}</td>
                    <td className="px-6 py-3.5"><Badge variant={String(f.status || '').toLowerCase()} /></td>
                    <td className="px-6 py-3.5 text-xs" style={{ color: '#7A9097' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5">
                      {f.status === 'UNPAID' && (
                        <div className="flex gap-2">
                          <Btn variant="primary" size="sm" onClick={() => setStatus(f.id, 'PAID')} loading={busyId === f.id}>{t('admin.fines.markPaid', { defaultValue: 'Mark Paid' })}</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => setStatus(f.id, 'WAIVED')} loading={busyId === f.id}>{t('admin.fines.waive', { defaultValue: 'Waive' })}</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Alerts ────────────────────────────────────────────────────────────────── */
function AlertsTab({ apartmentId, onChanged }) {
  const { t } = useTranslation()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [ranMsg, setRanMsg] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    if (!apartmentId) return
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`)
      .then(res => setAlerts(extractArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const runCheck = async () => {
    setRunning(true)
    try {
      await axiosClient.post('/admin/alerts/run-check')
      load(); onChanged && onChanged()
      setRanMsg(t('admin.alerts.runComplete', { defaultValue: 'Check complete. Any new alerts now appear below.' }))
    } catch (err) {
      setRanMsg(err.response?.data?.message || t('admin.alerts.runError', { defaultValue: 'Could not run the check.' }))
    } finally {
      setRunning(false)
    }
  }

  const resolve = async (id) => {
    setBusyId(id)
    try {
      await axiosClient.post(`/admin/alerts/${id}/resolve`)
      load(); onChanged && onChanged()
    } catch (err) {
      // ignore
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: '#4B5F63' }}>
          {t('admin.alerts.description', { defaultValue: 'AquaTrack checks every household for daily-limit breaches, relative overuse, and 2σ statistical leak anomalies. Run a check to catch any new issues.' })}
        </p>
        <Btn variant="primary" onClick={runCheck} loading={running}>{t('admin.alerts.runCheck', { defaultValue: 'Run Check Now' })}</Btn>
      </div>
      {ranMsg && <AlertBanner type="success" message={ranMsg} onDismiss={() => setRanMsg(null)} />}
      <Card className="overflow-hidden">
        {loading ? <SkeletonRows rows={3} /> : alerts.length === 0 ? (
          <EmptyState icon="✅" title={t('admin.alerts.emptyTitle', { defaultValue: 'No active alerts' })} message={t('admin.alerts.emptyMessage', { defaultValue: 'Every household looks normal.' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {[
                    t('common.flat', { defaultValue: 'Flat' }),
                    t('admin.overview.tableType', { defaultValue: 'Type' }),
                    t('admin.overview.tableSeverity', { defaultValue: 'Severity' }),
                    t('admin.overview.tableMessage', { defaultValue: 'Message' }),
                    t('common.actions', { defaultValue: 'Actions' })
                  ].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                    <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>{a.household?.flatNumber || a.flatNumber}</td>
                    <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{a.alertType}</td>
                    <td className="px-6 py-3.5"><Badge variant={severityVariant(a.severity || a.alertSeverity)} /></td>
                    <td className="px-6 py-3.5 text-sm" style={{ color: '#4B5F63' }}>{a.message}</td>
                    <td className="px-6 py-3.5">
                      <Btn variant="ghost" size="sm" onClick={() => resolve(a.id)} loading={busyId === a.id}>{t('common.resolve', { defaultValue: 'Resolve' })}</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Apartment Settings ────────────────────────────────────────────────────── */
function SettingsTab({ apartment, onUpdated, onDeleted }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: apartment?.name || '', address: apartment?.address || '' })
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [banner, setBanner] = useState(null)

  useEffect(() => { setForm({ name: apartment?.name || '', address: apartment?.address || '' }) }, [apartment])

  if (!apartment) return <div className="py-6"><EmptyState icon="🏢" title={t('admin.settings.selectPrompt', { defaultValue: 'Select an apartment' })} message={t('admin.settings.selectMessage', { defaultValue: 'Choose an apartment above to manage its details.' })} /></div>

  const save = async () => {
    setSaving(true)
    setBanner(null)
    try {
      const res = await axiosClient.put(`/admin/apartments/${apartment.id}`, form)
      onUpdated(res.data)
      setBanner({ type: 'success', msg: t('admin.settings.saveSuccess', { defaultValue: 'Apartment details saved.' }) })
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.settings.saveError', { defaultValue: 'Could not update apartment.' }) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await axiosClient.delete(`/admin/apartments/${apartment.id}`)
      setShowConfirm(false)
      onDeleted()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || t('admin.settings.deleteError', { defaultValue: 'Could not delete apartment.' }) })
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.settings.editTitle', { defaultValue: 'Edit Apartment Details' })}</h3>
        {banner && <div className="mb-4"><AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} /></div>}
        <div className="flex flex-col gap-4">
          {[
            { key: 'name', label: t('admin.settings.nameLabel', { defaultValue: 'Apartment name' }), placeholder: t('admin.settings.namePlaceholder', { defaultValue: 'Greenview Heights' }) },
            { key: 'address', label: t('admin.settings.addressLabel', { defaultValue: 'Address' }), placeholder: t('admin.settings.addressPlaceholder', { defaultValue: '14, Lake View Road…' }) },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{f.label}</label>
              <input
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
              />
            </div>
          ))}
          <Btn variant="primary" onClick={save} loading={saving}>{t('common.save', { defaultValue: 'Save' })}</Btn>
        </div>
      </Card>

      <Card className="p-6" style={{ border: '1.5px solid rgba(239,68,68,0.2)' }}>
        <h3 className="font-display font-semibold text-lg mb-2" style={{ color: '#b91c1c' }}>{t('admin.settings.dangerTitle', { defaultValue: 'Danger Zone' })}</h3>
        <p className="text-sm mb-5" style={{ color: '#4B5F63' }}>
          {t('admin.settings.dangerMessage', { defaultValue: 'Deleting this apartment will permanently remove all associated households, meter readings, billing cycles, invoices, fines, and resident accounts. This action cannot be undone.' })}
        </p>
        <Btn variant="danger" onClick={() => setShowConfirm(true)}>{t('admin.settings.deleteButton', { defaultValue: 'Delete Apartment' })}</Btn>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        title={t('admin.settings.confirmTitle', { defaultValue: 'Delete {{name}}?', name: apartment.name })}
        message={t('admin.settings.confirmMessage', { defaultValue: 'This will permanently delete all households, readings, invoices, fines, and resident accounts. This action cannot be undone.' })}
        confirmLabel={deleting ? t('admin.settings.deleting', { defaultValue: 'Deleting…' }) : t('admin.settings.confirmButton', { defaultValue: 'Yes, delete apartment' })}
        onConfirm={remove}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}

/* ── Main Admin Console ───────────────────────────────────────────────────── */
export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState('overview')
  const { t } = useTranslation()
  const [apartments, setApartments] = useState([])
  
  // Persist selected apartmentId across reloads
  const [apartmentId, setApartmentId] = useState(() => localStorage.getItem('selectedApartmentId') || '')
  
  const [pendingCount, setPendingCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)
  const [creatingName, setCreatingName] = useState('')
  const [creatingAddress, setCreatingAddress] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    axiosClient.get('/public/apartments').then(res => {
      const apts = extractArray(res.data)
      setApartments(apts)
      
      // If no apartment is currently selected, pick the first one and save to localStorage
      if (apts.length > 0) {
        const savedId = localStorage.getItem('selectedApartmentId')
        const exists = apts.some(a => String(a.id) === String(savedId))
        
        if (!savedId || !exists) {
          const initialId = String(apts[0].id)
          setApartmentId(initialId)
          localStorage.setItem('selectedApartmentId', initialId)
        }
      }
    }).catch(() => {})
  }, [])

  const handleApartmentChange = (e) => {
    const selectedId = e.target.value
    setApartmentId(selectedId)
    localStorage.setItem('selectedApartmentId', selectedId)
  }

  const refreshBadges = useCallback(() => {
    if (!apartmentId) return
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`)
      .then(r => setPendingCount(extractArray(r.data).length))
      .catch(() => {})
      
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`)
      .then(r => setAlertCount(extractArray(r.data).length))
      .catch(() => {})
  }, [apartmentId])

  useEffect(() => { refreshBadges() }, [refreshBadges, activeTab])

  const createApartment = async () => {
    if (!creatingName || !creatingAddress) return
    setCreating(true)
    try {
      const res = await axiosClient.post('/admin/apartments', { name: creatingName, address: creatingAddress })
      const newApt = res.data
      setApartments(p => [...p, newApt])
      setApartmentId(String(newApt.id))
      localStorage.setItem('selectedApartmentId', String(newApt.id))
      setCreatingName(''); setCreatingAddress('')
    } catch (err) {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  const tabs = [
    { key: 'overview', label: t('admin.tabs.overview', { defaultValue: 'Overview' }) },
    { key: 'households', label: t('admin.tabs.households', { defaultValue: 'Households' }) },
    { key: 'pending', label: t('admin.tabs.pending', { defaultValue: 'Pending Approvals' }), badge: pendingCount },
    { key: 'meters', label: t('admin.tabs.meters', { defaultValue: 'Meter Uploads' }) },
    { key: 'tariff', label: t('admin.tabs.tariff', { defaultValue: 'Tariff Plans' }) },
    { key: 'billing', label: t('admin.tabs.billing', { defaultValue: 'Billing Cycles' }) },
    { key: 'fines', label: t('admin.tabs.fines', { defaultValue: 'Fines' }) },
    { key: 'alerts', label: t('admin.tabs.alerts', { defaultValue: 'Alerts' }), badge: alertCount },
    { key: 'settings', label: t('admin.tabs.settings', { defaultValue: 'Apartment Settings' }) },
  ]

  const currentApartment = apartments.find(a => String(a.id) === String(apartmentId))

  const tabContent = apartmentId ? {
    overview: <OverviewTab apartmentId={apartmentId} />,
    households: <HouseholdsTab apartmentId={apartmentId} />,
    pending: <PendingTab apartmentId={apartmentId} onChanged={refreshBadges} />,
    meters: <MeterUploadsTab apartmentId={apartmentId} />,
    tariff: <TariffTab apartmentId={apartmentId} />,
    billing: <BillingTab apartmentId={apartmentId} />,
    fines: <FinesTab apartmentId={apartmentId} />,
    alerts: <AlertsTab apartmentId={apartmentId} onChanged={refreshBadges} />,
    settings: (
      <SettingsTab
        apartment={currentApartment}
        onUpdated={(updated) => setApartments(p => p.map(a => a.id === updated.id ? updated : a))}
        onDeleted={() => {
          setApartments(p => p.filter(a => String(a.id) !== String(apartmentId)))
          setApartmentId('')
          localStorage.removeItem('selectedApartmentId')
          setActiveTab('overview')
        }}
      />
    ),
  } : {}

  return (
    <div className="min-h-screen" style={{ background: '#F4FAF9' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-up mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: '#06141B' }}>{t('admin.title', { defaultValue: 'Admin Console' })}</h1>
            <p className="text-sm mt-1" style={{ color: '#7A9097' }}>{t('admin.subtitle', { defaultValue: 'Manage your apartment community · {{date}}', date: new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }) })}</p>
          </div>
          {apartments.length > 0 && (
            <select
              value={apartmentId}
              onChange={handleApartmentChange}
              className="px-4 py-2.5 rounded-xl text-sm border font-medium appearance-none"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B', background: '#fff', minWidth: 220 }}
            >
              {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>

        {!apartmentId ? (
          <div className="animate-fade-up max-w-md">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.createTitle', { defaultValue: 'Create a New Apartment' })}</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.createNameLabel', { defaultValue: 'Apartment name' })}</label>
                  <input value={creatingName} onChange={e => setCreatingName(e.target.value)} placeholder={t('admin.createNamePlaceholder', { defaultValue: 'Greenview Heights' })} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.createAddressLabel', { defaultValue: 'Address' })}</label>
                  <input value={creatingAddress} onChange={e => setCreatingAddress(e.target.value)} placeholder={t('admin.createAddressPlaceholder', { defaultValue: '14, Lake View Road…' })} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
                </div>
                <Btn variant="primary" onClick={createApartment} loading={creating}>{t('admin.createButton', { defaultValue: 'Create Apartment' })}</Btn>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Pending approvals banner */}
            {activeTab !== 'pending' && pendingCount > 0 && (
              <div className="animate-slide-down mb-4">
                <div
                  className="flex items-center justify-between px-5 py-3.5 rounded-xl gap-3 flex-wrap"
                  style={{ background: 'rgba(244,185,66,0.1)', border: '1px solid rgba(244,185,66,0.3)' }}
                >
                  <span className="text-sm font-medium" style={{ color: '#92400e' }}>
                    {t('admin.pendingBanner', { defaultValue: '🔔 {{count}} resident registration(s) waiting for your approval', count: pendingCount })}
                  </span>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ background: '#F4B942', color: '#06141B' }}
                  >
                    {t('admin.reviewNow', { defaultValue: 'Review now' })}
                  </button>
                </div>
              </div>
            )}

            <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

            <div key={activeTab} className="animate-fade-up">
              {tabContent[activeTab]}
            </div>
          </>
        )}
      </main>
    </div>
  )
}