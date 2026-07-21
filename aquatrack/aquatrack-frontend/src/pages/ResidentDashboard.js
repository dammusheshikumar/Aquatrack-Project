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
  const [peer, setPeer] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Load all dashboard metrics concurrently
  const loadAll = useCallback(async () => {
    if (!householdId) return;
    try {
      const [usageRes, invoiceRes, alertRes, peerRes] = await Promise.all([
        axiosClient.get(`/resident/households/${householdId}/usage-logs`),
        axiosClient.get(`/resident/households/${householdId}/invoices`),
        axiosClient.get(`/resident/households/${householdId}/alerts`),
        axiosClient.get(`/resident/households/${householdId}/peer-comparison`),
      ]);
      setUsage(usageRes.data);
      setInvoices(invoiceRes.data);
      setAlerts(alertRes.data);
      setPeer(peerRes.data);
    } catch (e) {
      console.error("Dashboard failed to fill completely:", e);
    }
  }, [householdId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handle authenticated secure file downloads via blob transformation
  const handleDownloadPdf = async (invoiceId) => {
    setDownloadingId(invoiceId);
    try {
      const res = await axiosClient.get(`/resident/invoices/${invoiceId}/pdf`, { 
        responseType: "blob" 
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup DOM node & object URL reference memory
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Could not download invoice PDF:", err);
      alert("Failed to download invoice PDF. Please try again later.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Memoized Chart formatting
  const chartData = usage.map((u) => ({
    date: u.readingDate,
    consumption: Number(u.consumptionKl || 0),
  }));

  const peerChartData = peer ? [
    { label: "You", value: peer.myConsumptionKl },
    { label: "Apartment Avg", value: peer.apartmentAverageKl },
    { label: "Similar-sized Avg", value: peer.similarSizedAverageKl },
  ] : [];

  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        
        {/* Dashboard Header */}
        <div className="dash-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Welcome back, {user?.fullName}</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Your household's water consumption, billing, and alerts.
            </p>
          </div>
        </div>

        {/* Statistical Overview Cards */}
        <div className="grid grid-3" style={{ marginBottom: 24 }}>
          <div className="card stat-card">
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>💧 Latest reading</div>
            <div className="stat-value">
              {chartData.length ? chartData[chartData.length - 1].consumption.toFixed(2) : "0.00"} kL
            </div>
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
            <div className="stat-label">Overuse or leak signals needing attention</div>
          </div>
        </div>

        {/* Dynamic Critical Action Banners */}
        {activeAlerts.length > 0 && (
          <div className="alert-banner" style={{ marginBottom: 24 }}>
            {activeAlerts.slice(0, 3).map((a) => (
              <div key={a.id} style={{ marginBottom: 4 }}>⚠ {a.message}</div>
            ))}
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Daily Consumption Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f4b942" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: "#4b5f63", fontSize: 13 }}>Not enough data yet.</p>
            )}
          </div>
        </div>

        {/* Water-Saving Tips */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Water-Saving Tips</h3>
          <ul style={{ paddingLeft: 18, fontSize: 14, color: "#334155", lineHeight: 2, columns: 2, columnGap: 32 }}>
            {TIPS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>

        {/* Historical Invoice Ledger Table */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Invoice History</h3>
          {invoices.length === 0 ? (
            <p style={{ color: "#4b5f63", fontSize: 14 }}>
              No invoices yet — they'll appear here once your admin finalizes a billing cycle.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Consumption (kL)</th>
                  <th>Base Charge</th>
                  <th>Shared Allocation</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>{inv.consumptionKl}</td>
                    <td>Rs. {inv.baseCharge}</td>
                    <td>Rs. {inv.sharedAllocation}</td>
                    <td><strong>Rs. {inv.total}</strong></td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={downloadingId === inv.id}
                        onClick={() => handleDownloadPdf(inv.id)}
                      >
                        {downloadingId === inv.id ? "Downloading..." : "Download PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}