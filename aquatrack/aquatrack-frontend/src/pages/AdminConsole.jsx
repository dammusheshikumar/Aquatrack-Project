import { useCallback, useEffect, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { StatCard, Badge, AlertBanner, Card, TabBar, EmptyState, Btn, ConfirmDialog, SkeletonRows } from '../components/ui'
import axiosClient from '../api/axiosClient'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const severityVariant = (s) => (s === 'CRITICAL' ? 'danger' : s === 'WARNING' ? 'warning' : 'info')

/* ── Overview ──────────────────────────────────────────────────────────────── */
function OverviewTab({ apartmentId }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [households, setHouseholds] = useState([])
  const [alerts, setAlerts] = useState([])
  const [comparison, setComparison] = useState([])
  const [pending, setPending] = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axiosClient.get(`/admin/apartments/${apartmentId}/households`),
      axiosClient.get(`/admin/apartments/${apartmentId}/alerts`),
      axiosClient.get(`/admin/apartments/${apartmentId}/usage-comparison`),
      axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`),
    ]).then(([h, a, c, p]) => {
      setHouseholds(h.data); setAlerts(a.data); setComparison(c.data); setPending(p.data.length)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [apartmentId])

  const avgUsageL = comparison.length
    ? Math.round((comparison.reduce((s, c) => s + Number(c.totalConsumptionKl || 0), 0) / comparison.length) * 1000)
    : 0

  return (
    <div className="py-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('admin.households', { defaultValue: 'Households' }), value: households.length, caption: t('admin.registeredFlats', { defaultValue: 'Registered flats' }), accentColor: '#12A594', delay: 0 },
          { label: t('admin.activeAlerts', { defaultValue: 'Active Alerts' }), value: alerts.length, caption: `${alerts.filter(a => a.severity === 'CRITICAL').length} ${t('admin.critical', { defaultValue: 'critical' })}`, accentColor: '#ef4444', delay: 80 },
          { label: t('admin.avgDailyUsage', { defaultValue: 'Avg. Daily Usage' }), value: avgUsageL, unit: 'L', caption: t('admin.perHouseholdRecent', { defaultValue: 'Per household · recent' }), accentColor: '#F4B942', delay: 160 },
          { label: t('admin.pendingApprovals', { defaultValue: 'Pending Approvals' }), value: pending, caption: t('admin.awaitingReview', { defaultValue: 'Residents awaiting review' }), accentColor: '#F4B942', delay: 240 },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-1" style={{ color: '#06141B' }}>{t('admin.consumptionByHousehold', { defaultValue: 'Consumption by Household' })}</h3>
        <p className="text-xs mb-4" style={{ color: '#7A9097' }}>{t('admin.recentReadings', { defaultValue: 'Recent readings · kL / flat' })}</p>
        {loading ? <SkeletonRows rows={1} height={220} /> : comparison.length === 0 ? (
          <EmptyState icon="📊" title={t('admin.noUsageData', { defaultValue: 'No usage data yet' })} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparison.map(c => ({ flat: c.flatNumber, kL: Number(c.totalConsumptionKl || 0) }))} barCategoryGap="28%">
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
          <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.activeAlerts', { defaultValue: 'Active Alerts' })}</h3>
        </div>
        {loading ? <SkeletonRows rows={2} /> : alerts.length === 0 ? (
          <EmptyState icon="✅" title={t('admin.allClear', { defaultValue: 'All clear' })} message={t('admin.noActiveAlerts', { defaultValue: 'No active alerts right now.' })} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                {[t('admin.table.flat', { defaultValue: 'Flat' }), t('admin.table.type', { defaultValue: 'Type' }), t('admin.table.severity', { defaultValue: 'Severity' }), t('admin.table.message', { defaultValue: 'Message' })].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                  <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>{a.household?.flatNumber}</td>
                  <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{a.alertType}</td>
                  <td className="px-6 py-3.5"><Badge variant={severityVariant(a.severity)} /></td>
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
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/households/detail`)
      .then(res => setHouseholds(res.data))
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
      setBanner({ type: 'success', msg: `Flat ${hhForm.flat} registered.` })
      setHhForm({ flat: '', size: '', occupancy: '', meter: '', limit: '' })
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not register household.' })
    } finally {
      setHhSubmitting(false)
    }
  }

  const submitFine = async (householdId) => {
    if (!fineAmount || !fineReason) return
    setFineSubmitting(true)
    try {
      await axiosClient.post('/admin/fines', { householdId, amount: Number(fineAmount), reason: fineReason })
      setBanner({ type: 'success', msg: 'Fine imposed and the resident has been notified by email.' })
      setExpandedFine(null); setFineAmount(''); setFineReason('')
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not impose fine.' })
    } finally {
      setFineSubmitting(false)
    }
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      {/* Register form */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.registerHousehold', { defaultValue: 'Register Household' })}</h3>
        {banner && <div className="mb-4"><AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} /></div>}
        <div className="flex flex-col gap-4">
          {[
            { key: 'flat', label: t('admin.flatNumber', { defaultValue: 'Flat number' }), placeholder: 'e.g. 5A' },
            { key: 'size', label: t('admin.flatSizeSqft', { defaultValue: 'Flat size (sqft)' }), placeholder: '850' },
            { key: 'occupancy', label: t('admin.occupancy', { defaultValue: 'Occupancy' }), placeholder: '2' },
            { key: 'meter', label: t('admin.meterSerial', { defaultValue: 'Meter serial no. (optional)' }), placeholder: 'MT-00421' },
            { key: 'limit', label: t('admin.dailyLimit', { defaultValue: 'Daily usage limit (kL, optional)' }), placeholder: '0.5' },
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
          <Btn variant="primary" className="mt-1" onClick={registerHousehold} loading={hhSubmitting}>{t('admin.registerHousehold', { defaultValue: 'Register Household' })}</Btn>
        </div>
      </Card>

      {/* Household cards */}
      <div className="flex flex-col gap-4">
        <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.householdsResidents', { defaultValue: 'Households & Residents' })}</h3>
        {loading ? <SkeletonRows rows={3} height={120} /> : households.length === 0 ? (
          <EmptyState icon="🏠" title={t('admin.noHouseholds', { defaultValue: 'No households yet' })} message={t('admin.noHouseholdsMessage', { defaultValue: 'Register your first flat using the form.' })} />
        ) : households.map(hh => (
          <Card key={hh.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.flatLabel', { defaultValue: 'Flat {{number}}', number: hh.flatNumber })}</span>
                <Badge variant={hh.meterActive ? 'active' : 'inactive'} label={hh.meterActive ? t('admin.meterActive', { defaultValue: 'Meter Active' }) : t('admin.meterInactive', { defaultValue: 'Meter Inactive' })} />
                {hh.unpaidFineCount > 0 && <Badge variant="unpaid" label={t('admin.unpaidFineBadge', { defaultValue: '{{count}} unpaid · ₹{{amount}}', count: hh.unpaidFineCount, amount: hh.unpaidFineTotal })} />}
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: '#7A9097' }}>
              {hh.flatSizeSqft} {t('admin.sqft', { defaultValue: 'sqft' })} · {hh.occupancy} {hh.occupancy > 1 ? t('admin.occupants', { defaultValue: 'occupants' }) : t('admin.occupant', { defaultValue: 'occupant' })}{hh.dailyLimitKl ? ` · ${t('admin.dailyLimitValue', { defaultValue: 'Limit: {{value}} kL/day', value: hh.dailyLimitKl })}` : ''}
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {hh.residents.length === 0 ? (
                <p className="text-xs italic" style={{ color: '#7A9097' }}>{t('admin.noResidentAccount', { defaultValue: 'No resident account registered for this flat yet.' })}</p>
              ) : hh.residents.map(r => (
                <div key={r.userId} className="flex items-center gap-2 justify-between flex-wrap">
                  <div>
                    <span className="text-sm font-medium" style={{ color: '#06141B' }}>{r.fullName}</span>
                    <span className="text-xs ml-2" style={{ color: '#7A9097' }}>{r.email}</span>
                  </div>
                  <Badge variant={r.approvalStatus.toLowerCase()} />
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
                {t('admin.imposeFine', { defaultValue: 'Impose Fine' })}
              </button>
            ) : (
              <div className="animate-slide-down p-4 rounded-xl mt-1 flex flex-col gap-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#4B5F63' }}>{t('admin.amountRupees', { defaultValue: 'Amount (₹)' })}</label>
                  <input
                    value={fineAmount}
                    onChange={e => setFineAmount(e.target.value)}
                    placeholder="500"
                    className="field-input w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ border: '1.5px solid rgba(239,68,68,0.25)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#4B5F63' }}>{t('admin.reason', { defaultValue: 'Reason' })}</label>
                  <input
                    value={fineReason}
                    onChange={e => setFineReason(e.target.value)}
                    placeholder="Overuse penalty"
                    className="field-input w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ border: '1.5px solid rgba(239,68,68,0.25)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <Btn variant="danger" size="sm" onClick={() => submitFine(hh.id)} loading={fineSubmitting}>{t('admin.confirmFine', { defaultValue: 'Confirm Fine' })}</Btn>
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
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`)
      .then(res => setApprovals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const approve = async (userId, name) => {
    setBusyId(userId)
    try {
      await axiosClient.post(`/admin/residents/${userId}/approve`)
      setBanner({ type: 'success', msg: `${name} has been approved and notified.` })
      load(); onChanged && onChanged()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not approve this registration.' })
    } finally {
      setBusyId(null)
    }
  }
  const reject = async (userId, name) => {
    setBusyId(userId)
    try {
      await axiosClient.post(`/admin/residents/${userId}/reject`)
      setBanner({ type: 'danger', msg: `${name} has been rejected.` })
      load(); onChanged && onChanged()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not reject this registration.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="py-6 flex flex-col gap-4">
      <p className="text-sm" style={{ color: '#4B5F63' }}>
        Review residents who registered and are awaiting your approval. Approved residents can log in immediately.
      </p>
      {banner && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} />}

      {loading ? <SkeletonRows rows={3} /> : approvals.length === 0 ? (
        <EmptyState icon="✅" title="All caught up" message="No pending registrations to review." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {['Name', 'Username', 'Email', 'Flat', 'Sign-up', 'Actions'].map(h => (
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
                        <span className="text-xs font-medium" style={{ color: '#4285F4' }}>Google</span>
                      ) : (
                        <span className="text-xs" style={{ color: '#7A9097' }}>Password</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        <Btn variant="primary" size="sm" onClick={() => approve(a.id, a.fullName)} loading={busyId === a.id}>{t('admin.approve', { defaultValue: 'Approve' })}</Btn>
                        <Btn variant="danger" size="sm" onClick={() => reject(a.id, a.fullName)} loading={busyId === a.id}>{t('admin.reject', { defaultValue: 'Reject' })}</Btn>
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
    axiosClient.get(`/admin/apartments/${apartmentId}/households`).then(res => setHouseholds(res.data)).catch(() => {})
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
        setUploadResult(`✅ ${r.totalRows} rows processed · ${r.inserted} inserted · ${r.duplicatesSkipped} duplicate(s) skipped${r.errors.length ? ` · ${r.errors.length} error(s)` : ''}`)
      })
      .catch(err => setUploadError(err.response?.data?.message || 'Upload failed.'))
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
      setManualBanner('Reading recorded successfully.')
      setManualForm(p => ({ ...p, date: '', value: '' }))
    } catch (err) {
      setManualError(err.response?.data?.message || 'Could not log reading.')
    } finally {
      setManualSubmitting(false)
    }
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      {/* CSV upload */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-2" style={{ color: '#06141B' }}>{t('admin.bulkUploadTitle', { defaultValue: 'Bulk Meter Reading Upload (CSV)' })}</h3>
        <p className="text-xs mb-5" style={{ color: '#7A9097' }}>
          {t('admin.csvFormat', { defaultValue: 'CSV format:' })} <span className="font-mono">flat_number,reading_date,reading_value</span>
        </p>
        <label className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: 'rgba(6,20,27,0.15)' }}>
          <span className="text-2xl">📁</span>
          <span className="text-sm font-medium" style={{ color: '#4B5F63' }}>
            {uploading ? t('admin.uploading', { defaultValue: 'Uploading…' }) : file ? file.name : t('admin.clickUpload', { defaultValue: 'Click to upload CSV file' })}
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
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.manualEntryTitle', { defaultValue: 'Manual Reading Entry' })}</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.household', { defaultValue: 'Household' })}</label>
            <select
              value={manualForm.household}
              onChange={e => setManualForm(p => ({ ...p, household: e.target.value }))}
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: manualForm.household ? '#06141B' : '#7A9097' }}
            >
              <option value="">{t('admin.selectFlat', { defaultValue: 'Select flat…' })}</option>
              {households.map(h => <option key={h.id} value={h.id}>Flat {h.flatNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.readingDate', { defaultValue: 'Reading Date' })}</label>
            <input
              type="date"
              value={manualForm.date}
              onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))}
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.readingValue', { defaultValue: 'Reading (cumulative kL)' })}</label>
            <input
              type="number"
              value={manualForm.value}
              onChange={e => setManualForm(p => ({ ...p, value: e.target.value }))}
              placeholder="0.380"
              step="0.001"
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
            />
          </div>
          {manualBanner && <AlertBanner type="success" message={manualBanner} onDismiss={() => setManualBanner(null)} />}
          {manualError && <AlertBanner type="danger" message={manualError} onDismiss={() => setManualError(null)} />}
          <Btn variant="primary" onClick={submitManual} loading={manualSubmitting}>{t('admin.submitReading', { defaultValue: 'Submit Reading' })}</Btn>
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
    setLoading(true)
    axiosClient.get(`/admin/tariff-plans/apartment/${apartmentId}`)
      .then(res => setPlans(res.data))
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
      setBanner({ type: 'success', msg: 'Tariff plan created and set as active.' })
      setPlanName('')
      setTiers([{ upTo: '10', rate: '20' }, { upTo: '25', rate: '35' }, { upTo: '', rate: '50' }])
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not save tariff plan.' })
    } finally {
      setSubmitting(false)
    }
  }

  const describeTiers = (planTiers) => {
    let lower = 0
    return planTiers.map((t, i) => {
      const label = `${lower}–${t.upToKl ?? '∞'} kL @ ₹${t.rate}/kL`
      if (t.upToKl != null) lower = t.upToKl
      return <li key={i} className="text-xs" style={{ color: '#4B5F63' }}>{label}</li>
    })
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.newTariffPlan', { defaultValue: 'New Tariff Plan' })}</h3>
        {banner && <div className="mb-4"><AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} /></div>}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.planName', { defaultValue: 'Plan name' })}</label>
            <input
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              placeholder="Monsoon 2025"
              className="field-input w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
            />
          </div>
          <div className="flex flex-col gap-2">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={tier.upTo}
                  onChange={e => setTiers(p => p.map((t, idx) => idx === i ? { ...t, upTo: e.target.value } : t))}
                  placeholder={i === tiers.length - 1 ? 'unlimited' : 'Up to (kL)'}
                  className="field-input flex-1 px-3 py-2 rounded-lg text-sm border"
                  style={{ border: '1.5px solid rgba(6,20,27,0.12)' }}
                />
                <input
                  value={tier.rate}
                  onChange={e => setTiers(p => p.map((t, idx) => idx === i ? { ...t, rate: e.target.value } : t))}
                  placeholder="Rate ₹/kL"
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
            + {t('admin.addTier', { defaultValue: 'Add Tier' })}
          </button>
          <Btn variant="primary" onClick={savePlan} loading={submitting}>{t('admin.saveTariffPlan', { defaultValue: 'Save Tariff Plan' })}</Btn>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.tariffHistory', { defaultValue: 'Tariff History' })}</h3>
        {loading ? <SkeletonRows rows={2} height={90} /> : plans.length === 0 ? (
          <EmptyState icon="⚖️" title={t('admin.noTariffPlans', { defaultValue: 'No tariff plans yet' })} />
        ) : plans.map(plan => (
          <Card key={plan.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold" style={{ color: '#06141B' }}>{plan.planName}</span>
              {plan.active && <Badge variant="active" label={t('admin.active', { defaultValue: 'Active' })} />}
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
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/billing-cycles`)
      .then(res => setCycles(res.data))
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
      setBanner({ type: 'success', msg: 'Billing cycle opened.' })
      setStartDate(''); setEndDate('')
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not open billing cycle.' })
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
      setBanner({ type: 'success', msg: 'Purchase recorded.' })
      setPurchaseForm(p => ({ ...p, volumeKl: '', unitCost: '', notes: '' }))
      load()
      if (expanded === f.billingCycleId) loadDetail(f.billingCycleId)
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not record purchase.' })
    } finally {
      setPurchaseSubmitting(false)
    }
  }

  const loadDetail = async (cycleId) => {
    const [purchases, invoices] = await Promise.all([
      axiosClient.get(`/admin/billing-cycles/${cycleId}/purchases`).catch(() => ({ data: [] })),
      axiosClient.get(`/admin/billing-cycles/${cycleId}/invoices`).catch(() => ({ data: [] })),
    ])
    setPurchasesByCycle(p => ({ ...p, [cycleId]: purchases.data }))
    setInvoicesByCycle(p => ({ ...p, [cycleId]: invoices.data }))
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
      setBanner({ type: 'success', msg: 'Billing cycle finalized — invoices generated and emailed (with PDF attached) to residents.' })
      load()
      if (expanded === id) loadDetail(id)
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not finalize cycle.' })
    }
  }

  const archive = async (id) => {
    try {
      await axiosClient.post(`/admin/billing-cycles/${id}/archive`)
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not archive cycle.' })
    }
  }

  const submitAdjustment = async (invoiceId) => {
    if (!adjustAmount || !adjustReason) return
    try {
      await axiosClient.post(`/admin/invoices/${invoiceId}/adjustments`, { amount: Number(adjustAmount), reason: adjustReason })
      setAdjustFor(null); setAdjustAmount(''); setAdjustReason('')
      setBanner({ type: 'success', msg: 'Adjustment applied.' })
      if (expanded) loadDetail(expanded)
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not apply adjustment.' })
    }
  }

  return (
    <div className="py-6 flex flex-col gap-6">
      {banner && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} />}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Open cycle */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.openBillingCycle', { defaultValue: 'Open Billing Cycle' })}</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.startDate', { defaultValue: 'Start date' })}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.endDate', { defaultValue: 'End date' })}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)' }} />
            </div>
            <Btn variant="primary" onClick={openCycle} loading={openSubmitting}>{t('admin.openCycle', { defaultValue: 'Open Cycle' })}</Btn>
          </div>
        </Card>

        {/* Bulk water purchase */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.recordBulkPurchase', { defaultValue: 'Record Bulk Water Purchase' })}</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.billingCycle', { defaultValue: 'Billing Cycle' })}</label>
              <select
                value={purchaseForm.billingCycleId}
                onChange={e => setPurchaseForm(p => ({ ...p, billingCycleId: e.target.value }))}
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
                style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
              >
                <option value="">Select…</option>
                {cycles.filter(c => c.status === 'OPEN').map(c => <option key={c.id} value={c.id}>{c.startDate} to {c.endDate}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.purchaseDate', { defaultValue: 'Purchase Date' })}</label>
              <input type="date" value={purchaseForm.purchaseDate} onChange={e => setPurchaseForm(p => ({ ...p, purchaseDate: e.target.value }))} className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.source', { defaultValue: 'Source' })}</label>
              <select
                value={purchaseForm.purchaseType}
                onChange={e => setPurchaseForm(p => ({ ...p, purchaseType: e.target.value }))}
                className="field-input w-full px-4 py-2.5 rounded-xl text-sm border appearance-none"
                style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }}
              >
                {PURCHASE_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{t(`admin.${o.value.toLowerCase()}`, { defaultValue: o.value })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.volumeKl', { defaultValue: 'Volume (kL)' })}</label>
              <input type="number" value={purchaseForm.volumeKl} onChange={e => setPurchaseForm(p => ({ ...p, volumeKl: e.target.value }))} placeholder="120" className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.unitCost', { defaultValue: 'Unit Cost (₹/kL)' })}</label>
              <input type="number" value={purchaseForm.unitCost} onChange={e => setPurchaseForm(p => ({ ...p, unitCost: e.target.value }))} placeholder="42" className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>{t('admin.notes', { defaultValue: 'Notes (optional)' })}</label>
              <input type="text" value={purchaseForm.notes} onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))} placeholder="Rainy season tanker" className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
            </div>
            <Btn variant="primary" onClick={recordPurchase} loading={purchaseSubmitting}>{t('admin.recordPurchase', { defaultValue: 'Record Purchase' })}</Btn>
          </div>
        </Card>
      </div>

      {/* Cycles table */}
      <Card className="overflow-hidden">
        {loading ? <SkeletonRows rows={3} /> : cycles.length === 0 ? (
          <EmptyState icon="🧾" title={t('admin.noBillingCycles', { defaultValue: 'No billing cycles yet' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {['Period', 'Status', 'Purchased', 'Avg Cost', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cycles.map(c => (
                  <Fragment key={c.id}>
                    <tr className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                      <td className="px-6 py-3.5 font-medium" style={{ color: '#06141B' }}>{c.startDate} – {c.endDate}</td>
                      <td className="px-6 py-3.5"><Badge variant={c.status.toLowerCase()} /></td>
                      <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{c.totalPurchasedVolumeKl} kL</td>
                      <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>₹{c.unitCost}/kL</td>
                      <td className="px-6 py-3.5">
                        <div className="flex gap-2">
                          <Btn variant="ghost" size="sm" onClick={() => toggleExpand(c.id)}>{expanded === c.id ? t('admin.hide', { defaultValue: 'Hide' }) : t('admin.details', { defaultValue: 'Details' })}</Btn>
                          {c.status === 'OPEN' && <Btn variant="outline" size="sm" onClick={() => finalize(c.id)}>{t('admin.finalize', { defaultValue: 'Finalize' })}</Btn>}
                          {c.status === 'FINALIZED' && <Btn variant="ghost" size="sm" onClick={() => archive(c.id)}>{t('admin.archive', { defaultValue: 'Archive' })}</Btn>}
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={5} className="px-6 pb-4">
                          <div className="animate-slide-down rounded-xl p-4" style={{ background: 'rgba(18,165,148,0.04)', border: '1px solid rgba(18,165,148,0.12)' }}>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7A9097' }}>Purchases</p>
                            {!purchasesByCycle[c.id] || purchasesByCycle[c.id].length === 0 ? (
                              <p className="text-xs mb-4" style={{ color: '#7A9097' }}>{t('admin.noPurchases', { defaultValue: 'No purchases recorded yet.' })}</p>
                            ) : (
                              <table className="w-full text-xs mb-4">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                                    {['Date', 'Type', 'Volume', 'Unit Cost', 'Total', 'Notes'].map(h => <th key={h} className="pb-2 text-left font-semibold" style={{ color: '#7A9097' }}>{h}</th>)}
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
                                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7A9097' }}>Invoices</p>
                                {!invoicesByCycle[c.id] || invoicesByCycle[c.id].length === 0 ? (
                                  <p className="text-xs" style={{ color: '#7A9097' }}>{t('admin.noInvoices', { defaultValue: 'No invoices yet.' })}</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                                        {['Flat', 'Consumption', 'Base', 'Shared', 'Adjustments', 'Total', ''].map(h => <th key={h} className="pb-2 text-left font-semibold" style={{ color: '#7A9097' }}>{h}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {invoicesByCycle[c.id].map(inv => (
                                        <Fragment key={inv.id}>
                                          <tr>
                                            <td className="py-1.5 font-semibold" style={{ color: '#06141B' }}>{inv.household?.flatNumber}</td>
                                            <td>{inv.consumptionKl} kL</td><td>₹{inv.baseCharge}</td><td>₹{inv.sharedAllocation}</td>
                                            <td>{Number(inv.adjustments) === 0 ? '—' : `₹${inv.adjustments}`}</td><td>₹{inv.total}</td>
                                            <td><Btn size="sm" variant="ghost" onClick={() => setAdjustFor(adjustFor === inv.id ? null : inv.id)}>Adjust</Btn></td>
                                          </tr>
                                          {adjustFor === inv.id && (
                                            <tr>
                                              <td colSpan={7} className="py-2">
                                                <div className="flex gap-2 flex-wrap items-center">
                                                  <input value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="Amount +/- ₹" className="field-input px-2 py-1.5 rounded-lg text-xs border" style={{ width: 120, border: '1.5px solid rgba(6,20,27,0.12)' }} />
                                                  <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason" className="field-input px-2 py-1.5 rounded-lg text-xs border flex-1" style={{ minWidth: 140, border: '1.5px solid rgba(6,20,27,0.12)' }} />
                                                  <Btn size="xs" variant="primary" onClick={() => submitAdjustment(inv.id)}>{t('admin.apply', { defaultValue: 'Apply' })}</Btn>
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
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/fines`)
      .then(res => setFines(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const outstanding = fines.filter(f => f.status === 'UNPAID').reduce((s, f) => s + Number(f.amount), 0)

  const setStatus = async (id, status) => {
    setBusyId(id)
    try {
      await axiosClient.post(`/admin/fines/${id}/status`, { status })
      setBanner({ type: 'success', msg: `Fine marked as ${status.toLowerCase()}.` })
      load()
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not update fine.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('admin.finesTitle', { defaultValue: 'Fines' })}</h3>
        <Badge variant="danger" label={t('admin.outstandingAmount', { defaultValue: '₹{{amount}} outstanding', amount: outstanding })} />
      </div>
      {banner && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} />}
      <Card className="overflow-hidden">
        {loading ? <SkeletonRows rows={3} /> : fines.length === 0 ? (
          <EmptyState icon="🧾" title={t('admin.noFinesYet', { defaultValue: 'No fines yet' })} message={t('admin.noFinesMessage', { defaultValue: 'Use the Households tab to impose one directly on a flat.' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {['Flat', 'Amount', 'Reason', 'Status', 'Date', 'Actions'].map(h => (
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
                    <td className="px-6 py-3.5"><Badge variant={f.status.toLowerCase()} /></td>
                    <td className="px-6 py-3.5 text-xs" style={{ color: '#7A9097' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5">
                      {f.status === 'UNPAID' && (
                        <div className="flex gap-2">
                          <Btn variant="primary" size="sm" onClick={() => setStatus(f.id, 'PAID')} loading={busyId === f.id}>{t('admin.markPaid', { defaultValue: 'Mark Paid' })}</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => setStatus(f.id, 'WAIVED')} loading={busyId === f.id}>{t('admin.waive', { defaultValue: 'Waive' })}</Btn>
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
    setLoading(true)
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`)
      .then(res => setAlerts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apartmentId])

  useEffect(() => { load() }, [load])

  const runCheck = async () => {
    setRunning(true)
    try {
      await axiosClient.post('/admin/alerts/run-check')
      load(); onChanged && onChanged()
      setRanMsg('Check complete. Any new alerts now appear below.')
    } catch (err) {
      setRanMsg(err.response?.data?.message || 'Could not run the check.')
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
          AquaTrack checks every household for daily-limit breaches, relative overuse, and 2σ statistical leak anomalies. Run a check to catch any new issues.
        </p>
        <Btn variant="primary" onClick={runCheck} loading={running}>{t('admin.runCheckNow', { defaultValue: 'Run Check Now' })}</Btn>
      </div>
      {ranMsg && <AlertBanner type="success" message={ranMsg} onDismiss={() => setRanMsg(null)} />}
      <Card className="overflow-hidden">
        {loading ? <SkeletonRows rows={3} /> : alerts.length === 0 ? (
          <EmptyState icon="✅" title="No active alerts" message="Every household looks normal." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                  {['Flat', 'Type', 'Severity', 'Message', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                    <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>{a.household?.flatNumber}</td>
                    <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{a.alertType}</td>
                    <td className="px-6 py-3.5"><Badge variant={severityVariant(a.severity)} /></td>
                    <td className="px-6 py-3.5 text-sm" style={{ color: '#4B5F63' }}>{a.message}</td>
                    <td className="px-6 py-3.5">
                      <Btn variant="ghost" size="sm" onClick={() => resolve(a.id)} loading={busyId === a.id}>{t('admin.resolve', { defaultValue: 'Resolve' })}</Btn>
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

  if (!apartment) return <div className="py-6"><EmptyState icon="🏢" title="Select an apartment" message="Choose an apartment above to manage its details." /></div>

  const save = async () => {
    setSaving(true)
    setBanner(null)
    try {
      const res = await axiosClient.put(`/admin/apartments/${apartment.id}`, form)
      onUpdated(res.data)
      setBanner({ type: 'success', msg: 'Apartment details saved.' })
    } catch (err) {
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not update apartment.' })
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
      setBanner({ type: 'danger', msg: err.response?.data?.message || 'Could not delete apartment.' })
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="py-6 grid lg:grid-cols-2 gap-8 items-start">
      <Card className="p-6">
        <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>{t('admin.editApartmentDetails', { defaultValue: 'Edit Apartment Details' })}</h3>
        {banner && <div className="mb-4"><AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner(null)} /></div>}
        <div className="flex flex-col gap-4">
          {[
            { key: 'name', label: 'Apartment name', placeholder: 'Greenview Heights' },
            { key: 'address', label: 'Address', placeholder: '14, Lake View Road…' },
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
          <Btn variant="primary" onClick={save} loading={saving}>{t('common.save', { defaultValue: 'Save Changes' })}</Btn>
        </div>
      </Card>

      <Card className="p-6" style={{ border: '1.5px solid rgba(239,68,68,0.2)' }}>
        <h3 className="font-display font-semibold text-lg mb-2" style={{ color: '#b91c1c' }}>{t('admin.dangerZone', { defaultValue: 'Danger Zone' })}</h3>
        <p className="text-sm mb-5" style={{ color: '#4B5F63' }}>
          Deleting this apartment will permanently remove all associated households, meter readings, billing cycles, invoices, fines, and resident accounts. This action cannot be undone.
        </p>
        <Btn variant="danger" onClick={() => setShowConfirm(true)}>{t('admin.deleteApartment', { defaultValue: 'Delete Apartment' })}</Btn>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        title={`Delete ${apartment.name}?`}
        message="This will permanently delete all households, readings, invoices, fines, and resident accounts. This action cannot be undone."
        confirmLabel={deleting ? t('admin.deleting', { defaultValue: 'Deleting…' }) : t('admin.confirmDeleteApartment', { defaultValue: 'Yes, delete apartment' })}
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
  const [apartmentId, setApartmentId] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)
  const [creatingName, setCreatingName] = useState('')
  const [creatingAddress, setCreatingAddress] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    axiosClient.get('/public/apartments').then(res => {
      setApartments(res.data)
      if (res.data.length > 0 && !apartmentId) setApartmentId(String(res.data[0].id))
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshBadges = useCallback(() => {
    if (!apartmentId) return
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`).then(r => setPendingCount(r.data.length)).catch(() => {})
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).then(r => setAlertCount(r.data.length)).catch(() => {})
  }, [apartmentId])

  useEffect(() => { refreshBadges() }, [refreshBadges, activeTab])

  const createApartment = async () => {
    if (!creatingName || !creatingAddress) return
    setCreating(true)
    try {
      const res = await axiosClient.post('/admin/apartments', { name: creatingName, address: creatingAddress })
      setApartments(p => [...p, res.data])
      setApartmentId(String(res.data.id))
      setCreatingName(''); setCreatingAddress('')
    } catch (err) {
      // ignore — could surface a banner here
    } finally {
      setCreating(false)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'households', label: 'Households' },
    { key: 'pending', label: 'Pending Approvals', badge: pendingCount },
    { key: 'meters', label: 'Meter Uploads' },
    { key: 'tariff', label: 'Tariff Plans' },
    { key: 'billing', label: 'Billing Cycles' },
    { key: 'fines', label: 'Fines' },
    { key: 'alerts', label: 'Alerts', badge: alertCount },
    { key: 'settings', label: 'Apartment Settings' },
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
            <h1 className="font-display text-3xl font-bold" style={{ color: '#06141B' }}>{t('admin.consoleTitle', { defaultValue: 'Admin Console' })}</h1>
            <p className="text-sm mt-1" style={{ color: '#7A9097' }}>Manage your apartment community · {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          </div>
          {apartments.length > 0 && (
            <select
              value={apartmentId}
              onChange={e => setApartmentId(e.target.value)}
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
              <h3 className="font-display font-semibold text-lg mb-5" style={{ color: '#06141B' }}>Create a New Apartment</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>Apartment name</label>
                  <input value={creatingName} onChange={e => setCreatingName(e.target.value)} placeholder="Greenview Heights" className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4B5F63' }}>Address</label>
                  <input value={creatingAddress} onChange={e => setCreatingAddress(e.target.value)} placeholder="14, Lake View Road…" className="field-input w-full px-4 py-2.5 rounded-xl text-sm border" style={{ border: '1.5px solid rgba(6,20,27,0.12)', color: '#06141B' }} />
                </div>
                <Btn variant="primary" onClick={createApartment} loading={creating}>Create Apartment</Btn>
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
                    🔔 {t('admin.pendingBanner', { defaultValue: '{{count}} resident registration{{plural}} waiting for your approval', count: pendingCount, plural: pendingCount > 1 ? 's' : '' })}
                  </span>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ background: '#F4B942', color: '#06141B' }}
                  >
                    Review now
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
