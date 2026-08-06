import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { StatCard, Badge, AlertBanner, Card, EmptyState, SkeletonRows } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const TIPS_ICONS = ['🚿', '🚰', '🌿', '🫙', '🧺']

const severityVariant = (s) => (s === 'CRITICAL' ? 'danger' : s === 'WARNING' ? 'warning' : 'info')

export default function ResidentDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const householdId = user?.householdId

  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState([])
  const [invoices, setInvoices] = useState([])
  const [alerts, setAlerts] = useState([])
  const [fines, setFines] = useState([])
  const [peer, setPeer] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const loadAll = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    try {
      const [usageRes, invoiceRes, alertRes, peerRes, fineRes] = await Promise.all([
        axiosClient.get(`/resident/households/${householdId}/usage-logs/recent`),
        axiosClient.get(`/resident/households/${householdId}/invoices`),
        axiosClient.get(`/resident/households/${householdId}/alerts`),
        axiosClient.get(`/resident/households/${householdId}/peer-comparison`),
        axiosClient.get(`/resident/households/${householdId}/fines`),
      ])
      // recent usage-logs come back newest-first; reverse for a left-to-right trend chart
      setUsage([...usageRes.data].reverse())
      setInvoices(invoiceRes.data)
      setAlerts(alertRes.data)
      setPeer(peerRes.data)
      setFines(fineRes.data)
    } catch (e) {
      // dashboard renders with whatever loaded
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { loadAll() }, [loadAll])

  const activeAlerts = alerts.filter(a => !a.resolved)
  const unpaidFines = fines.filter(f => f.status === 'UNPAID')
  const unpaidFineTotal = unpaidFines.reduce((s, f) => s + Number(f.amount), 0)
  const latestConsumption = usage.length ? Number(usage[usage.length - 1].consumptionKl || 0) : 0
  const mostRecentBill = invoices.length ? Number(invoices[0].total) : 0

  const consumptionData = usage.map(u => ({ date: u.readingDate, kL: Number(u.consumptionKl || 0) }))
  const comparisonData = peer ? [
    { name: t('resident.peerYou', { defaultValue: 'You' }), kL: Number(peer.myConsumptionKl || 0) },
    { name: t('resident.peerAptAvg', { defaultValue: 'Apt Avg' }), kL: Number(peer.apartmentAverageKl || 0) },
    { name: t('resident.peerSimilarSize', { defaultValue: 'Similar Size' }), kL: Number(peer.similarSizedAverageKl || 0) },
  ] : []

  const downloadInvoice = async (invId) => {
    setDownloadingId(invId)
    try {
      const res = await axiosClient.get(`/resident/invoices/${invId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${invId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      // silently ignore
    } finally {
      setDownloadingId(null)
    }
  }

  const firstName = (user?.fullName || '').split(' ')[0]
  const tipsList = t('resident.tips', { returnObjects: true, defaultValue: [] })

  return (
    <div className="min-h-screen" style={{ background: '#F4FAF9' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="animate-fade-up mb-8">
          <h1 className="font-display text-3xl font-bold" style={{ color: '#06141B' }}>
            {t('resident.welcome', { defaultValue: 'Welcome back, {{name}} 👋', name: firstName || 'there' })}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7A9097' }}>
            {user?.fullName ? `${t('resident.householdLabel', { defaultValue: 'Household #{{id}}', id: householdId })} · ${t('resident.lastUpdated', { defaultValue: 'Last updated just now' })}` : ''}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: t('resident.statLatestReading', { defaultValue: 'Latest Reading' }),
              value: Number(latestConsumption.toFixed(2)),
              unit: 'kL',
              caption: usage.length ? t('resident.statLatestReadingCaption', { defaultValue: 'On {{date}}', date: usage[usage.length - 1].readingDate }) : t('resident.statLatestReadingCaptionEmpty', { defaultValue: 'No readings yet' }),
              accentColor: '#12A594',
              delay: 0
            },
            {
              label: t('resident.statMostRecentBill', { defaultValue: 'Most Recent Bill' }),
              value: Math.round(mostRecentBill),
              unit: '₹',
              caption: invoices.length ? t('resident.statMostRecentBillCaption', { defaultValue: 'From {{date}}', date: new Date(invoices[0].createdAt).toLocaleDateString() }) : t('resident.statMostRecentBillCaptionEmpty', { defaultValue: 'No invoices yet' }),
              accentColor: '#F4B942',
              delay: 80
            },
            {
              label: t('resident.statActiveAlerts', { defaultValue: 'Active Alerts' }),
              value: activeAlerts.length,
              caption: t('resident.statActiveAlertsCaption', { defaultValue: '{{count}} total this cycle', count: alerts.length }),
              accentColor: '#ef4444',
              delay: 160
            },
            {
              label: t('resident.statUnpaidFines', { defaultValue: 'Unpaid Fines' }),
              value: Math.round(unpaidFineTotal),
              unit: '₹',
              caption: unpaidFines.length === 0 ? t('resident.statUnpaidFinesCaptionEmpty', { defaultValue: 'No fines outstanding' }) : t('resident.statUnpaidFinesCaption', { defaultValue: '{{count}} outstanding', count: unpaidFines.length }),
              accentColor: '#F4B942',
              delay: 240
            },
          ].map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Alert strip */}
        {!bannerDismissed && activeAlerts.length > 0 && (
          <div className="animate-slide-down mb-6 flex flex-col gap-2">
            {activeAlerts.slice(0, 3).map(a => (
              <AlertBanner key={a.id} type={severityVariant(a.severity)} message={a.message} onDismiss={() => setBannerDismissed(true)} />
            ))}
          </div>
        )}

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-1" style={{ color: '#06141B' }}>{t('resident.trendTitle', { defaultValue: 'Daily Consumption Trend' })}</h3>
            <p className="text-xs mb-4" style={{ color: '#7A9097' }}>{t('resident.trendSubtitle', { defaultValue: 'Recent readings · kL / day' })}</p>
            {loading ? <SkeletonRows rows={1} height={200} /> : consumptionData.length === 0 ? (
              <EmptyState icon="💧" title={t('resident.trendEmptyTitle', { defaultValue: 'No readings yet' })} message={t('resident.trendEmptyMessage', { defaultValue: 'Your consumption trend will appear once your admin logs a reading.' })} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={consumptionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,20,27,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7A9097' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#7A9097' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(6,20,27,0.12)', fontSize: 12 }}
                    formatter={(v) => [`${v} kL`, 'Consumption']}
                  />
                  <Line
                    type="monotone"
                    dataKey="kL"
                    stroke="#12A594"
                    strokeWidth={2.5}
                    dot={{ fill: '#12A594', r: 3 }}
                    activeDot={{ r: 5, fill: '#12A594' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-1" style={{ color: '#06141B' }}>{t('resident.peerTitle', { defaultValue: 'You vs. Your Peers' })}</h3>
            <p className="text-xs mb-4" style={{ color: '#7A9097' }}>{t('resident.peerSubtitle', { defaultValue: 'Recent usage · kL' })}</p>
            {loading ? <SkeletonRows rows={1} height={200} /> : !peer ? (
              <EmptyState icon="⚖️" title={t('resident.peerEmptyTitle', { defaultValue: 'Not enough data yet' })} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData} barCategoryGap="32%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,20,27,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7A9097' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#7A9097' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(6,20,27,0.12)', fontSize: 12 }}
                    formatter={(v) => [`${v} kL`, 'Usage']}
                  />
                  <Bar dataKey="kL" fill="#12A594" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Alerts + Tips row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4" style={{ color: '#06141B' }}>{t('resident.alertsTitle', { defaultValue: 'Alerts for Your Household' })}</h3>
            {loading ? <SkeletonRows rows={3} /> : alerts.length === 0 ? (
              <EmptyState icon="🔔" title={t('resident.alertsEmptyTitle', { defaultValue: 'No alerts' })} message={t('resident.alertsEmptyMessage', { defaultValue: 'Nothing unusual detected yet.' })} />
            ) : (
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {alerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: a.resolved ? 'rgba(6,20,27,0.03)' : `${a.severity === 'CRITICAL' ? 'rgba(239,68,68,0.06)' : a.severity === 'WARNING' ? 'rgba(244,185,66,0.08)' : 'rgba(18,165,148,0.06)'}`,
                      opacity: a.resolved ? 0.5 : 1,
                    }}
                  >
                    <Badge variant={severityVariant(a.severity)} />
                    <p
                      className="text-sm flex-1"
                      style={{ color: '#06141B', textDecoration: a.resolved ? 'line-through' : 'none' }}
                    >
                      {a.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4" style={{ color: '#06141B' }}>{t('resident.tipsTitle', { defaultValue: 'Water-Saving Tips' })}</h3>
            <ul className="flex flex-col gap-3">
              {Array.isArray(tipsList) && tipsList.map((tipText, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(18,165,148,0.1)' }}>
                    {TIPS_ICONS[idx % TIPS_ICONS.length]}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: '#4B5F63' }}>{tipText}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Fines */}
        {fines.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="p-6 pb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('resident.finesTitle', { defaultValue: 'Fines' })}</h3>
              {unpaidFines.length > 0 && <Badge variant="unpaid" label={t('resident.finesOutstanding', { defaultValue: '₹{{amount}} outstanding', amount: unpaidFineTotal })} />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                    {[
                      t('common.date', { defaultValue: 'Date' }),
                      t('common.reason', { defaultValue: 'Reason' }),
                      t('common.amount', { defaultValue: 'Amount' }),
                      t('common.status', { defaultValue: 'Status' })
                    ].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fines.map((f) => (
                    <tr key={f.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                      <td className="px-6 py-3.5 text-xs" style={{ color: '#7A9097' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5" style={{ color: '#06141B' }}>{f.reason}</td>
                      <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>₹{f.amount}</td>
                      <td className="px-6 py-3.5"><Badge variant={f.status.toLowerCase()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Invoice history */}
        <Card className="overflow-hidden">
          <div className="p-6 pb-3 flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-display font-semibold text-lg" style={{ color: '#06141B' }}>{t('resident.invoicesTitle', { defaultValue: 'Invoice History' })}</h3>
              <p className="text-xs mt-0.5" style={{ color: '#7A9097' }}>{t('resident.invoicesSubtitle', { defaultValue: 'Invoices are automatically emailed when a billing cycle is finalized. Download PDFs below.' })}</p>
            </div>
          </div>
          {loading ? <SkeletonRows rows={3} /> : invoices.length === 0 ? (
            <EmptyState icon="🧾" title={t('resident.invoicesEmptyTitle', { defaultValue: 'No invoices yet' })} message={t('resident.invoicesEmptyMessage', { defaultValue: "They'll appear here once your admin finalizes a billing cycle." })} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(6,20,27,0.07)' }}>
                    {[
                      t('common.date', { defaultValue: 'Date' }),
                      t('resident.table.consumption', { defaultValue: 'Consumption' }),
                      t('resident.table.baseCharge', { defaultValue: 'Base Charge' }),
                      t('resident.table.sharedAllocation', { defaultValue: 'Shared Allocation' }),
                      t('resident.table.adjustments', { defaultValue: 'Adjustments' }),
                      t('resident.table.total', { defaultValue: 'Total' }),
                      ''
                    ].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9097' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="trow" style={{ borderBottom: '1px solid rgba(6,20,27,0.05)' }}>
                      <td className="px-6 py-3.5 text-xs" style={{ color: '#7A9097' }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5" style={{ color: '#06141B' }}>{inv.consumptionKl} kL</td>
                      <td className="px-6 py-3.5" style={{ color: '#06141B' }}>₹{inv.baseCharge}</td>
                      <td className="px-6 py-3.5" style={{ color: '#06141B' }}>₹{inv.sharedAllocation}</td>
                      <td className="px-6 py-3.5" style={{ color: '#4B5F63' }}>{Number(inv.adjustments) === 0 ? '–' : `₹${inv.adjustments}`}</td>
                      <td className="px-6 py-3.5 font-semibold" style={{ color: '#06141B' }}>₹{inv.total}</td>
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => downloadInvoice(inv.id)}
                          disabled={downloadingId === inv.id}
                          className="btn-press text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80"
                          style={{ background: 'rgba(18,165,148,0.1)', color: '#12A594' }}
                        >
                          {downloadingId === inv.id ? t('resident.downloading', { defaultValue: 'Downloading…' }) : t('resident.downloadPdf', { defaultValue: 'Download PDF' })}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}