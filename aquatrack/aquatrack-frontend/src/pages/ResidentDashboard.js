import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import Navbar from "../components/Navbar";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const TIPS = [
  "Fix dripping taps — a single drip per second wastes over 11,000 litres a year.",
  "Take shorter showers; a 5-minute shower uses about half the water of a bath.",
  "Run washing machines and dishwashers only with full loads.",
  "Reuse RO reject water for mopping or watering plants.",
  "Install aerators on taps to cut flow without losing pressure.",
];

export default function ResidentDashboard() {
  const { user } = useAuth();
  const householdId = user?.householdId;

  const [usage, setUsage] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [fines, setFines] = useState([]);
  const [peer, setPeer] = useState(null);

  const loadAll = useCallback(async () => {
    if (!householdId) return;
    try {
      const [usageRes, invoiceRes, alertRes, peerRes, fineRes] = await Promise.all([
        axiosClient.get(`/resident/households/${householdId}/usage-logs`),
        axiosClient.get(`/resident/households/${householdId}/invoices`),
        axiosClient.get(`/resident/households/${householdId}/alerts`),
        axiosClient.get(`/resident/households/${householdId}/peer-comparison`),
        axiosClient.get(`/resident/households/${householdId}/fines`),
      ]);
      setUsage(usageRes.data);
      setInvoices(invoiceRes.data);
      setAlerts(alertRes.data);
      setPeer(peerRes.data);
      setFines(fineRes.data);
    } catch (e) {
      // dashboard renders with whatever loaded
    }
  }, [householdId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const chartData = usage.map((u) => ({ date: u.readingDate, consumption: Number(u.consumptionKl || 0) }));
  const activeAlerts = alerts.filter((a) => !a.resolved);
  const unpaidFines = fines.filter((f) => f.status === "UNPAID");

  const peerChartData = peer ? [
    { label: "You", value: peer.myConsumptionKl },
    { label: "Apartment Avg", value: peer.apartmentAverageKl },
    { label: "Similar-sized Avg", value: peer.similarSizedAverageKl },
  ] : [];

  const severityBadge = (severity) => {
    if (severity === "CRITICAL") return "badge-danger";
    if (severity === "WARNING") return "badge-warning";
    return "badge-info";
  };

  const downloadInvoice = (invId) => {
    axiosClient.get(`/resident/invoices/${invId}/pdf`, { responseType: "blob" }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${invId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  };

  return (
    <div>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div className="dash-header">
          <div>
            <h1 className="page-title">Welcome back, {user?.fullName}</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Your household's water consumption, billing, and alerts.</p>
          </div>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat-card">
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>💧 Latest reading</div>
            <div className="stat-value">{chartData.length ? chartData[chartData.length - 1].consumption.toFixed(2) : "0.00"} kL</div>
            <div className="stat-label">Consumption on last logged day</div>
          </div>
          <div className="card stat-card">
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>🧾 Most recent bill</div>
            <div className="stat-value">{invoices.length ? `Rs. ${invoices[0].total}` : "—"}</div>
            <div className="stat-label">From your latest finalized invoice</div>
          </div>
          <div className="card stat-card">
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>🔔 Active alerts</div>
            <div className="stat-value">{activeAlerts.length}</div>
            <div className="stat-label">Overuse, leak, or limit signals</div>
          </div>
          <div className="card stat-card" style={{ borderTopColor: unpaidFines.length ? "var(--danger)" : "var(--primary)" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>⚠️ Unpaid fines</div>
            <div className="stat-value">{unpaidFines.length ? `Rs. ${unpaidFines.reduce((s, f) => s + Number(f.amount), 0).toFixed(2)}` : "Rs. 0"}</div>
            <div className="stat-label">{unpaidFines.length} outstanding</div>
          </div>
        </div>

        {activeAlerts.length > 0 && (
          <div className="alert-banner">
            {activeAlerts.slice(0, 3).map((a) => <div key={a.id} style={{ marginBottom: 4 }}>⚠ {a.message}</div>)}
          </div>
        )}

        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Daily Consumption Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfeceb" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} label={{ value: "kL", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="consumption" stroke="#12a594" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>You vs. Your Peers</h3>
            {peer ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dfeceb" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f4b942" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: "#4b5f63", fontSize: 13 }}>Not enough data yet.</p>}
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Alerts for Your Household</h3>
            {alerts.length === 0 ? (
              <p style={{ color: "#4b5f63", fontSize: 14 }}>No alerts yet — nothing unusual detected.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alerts.slice(0, 6).map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                    <span className={`badge ${severityBadge(a.severity)}`}>{a.resolved ? "Resolved" : a.severity}</span>
                    <span style={{ fontSize: 13, color: "#334155" }}>{a.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Water-Saving Tips</h3>
            <ul style={{ paddingLeft: 18, fontSize: 14, color: "#334155", lineHeight: 2 }}>
              {TIPS.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>

        {fines.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Fines</h3>
            <table>
              <thead><tr><th>Date</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id}>
                    <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: 13 }}>{f.reason}</td>
                    <td>Rs. {f.amount}</td>
                    <td>
                      <span className={`badge ${f.status === "UNPAID" ? "badge-danger" : f.status === "PAID" ? "badge-success" : "badge-info"}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Invoice History</h3>
          {invoices.length === 0 ? (
            <p style={{ color: "#4b5f63", fontSize: 14 }}>No invoices yet — they'll appear here once your admin finalizes a billing cycle.</p>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Consumption (kL)</th><th>Base Charge</th><th>Shared Allocation</th><th>Adjustments</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>{inv.consumptionKl}</td>
                    <td>Rs. {inv.baseCharge}</td>
                    <td>Rs. {inv.sharedAllocation}</td>
                    <td>Rs. {inv.adjustments}</td>
                    <td><strong>Rs. {inv.total}</strong></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => downloadInvoice(inv.id)}>
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 12 }}>
            Your invoice PDF is also emailed to you automatically the moment a billing cycle is finalized.
          </p>
        </div>
      </div>
    </div>
  );
}
