import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Navbar from "../components/Navbar";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const TABS = ["Overview", "Households", "Meter Uploads", "Tariff Plans", "Billing Cycles", "Alerts", "Apartment Settings"];

export default function AdminPanel() {
  const { user } = useAuth();
  const [apartmentId, setApartmentId] = useState(user?.apartmentId || "");
  const [apartments, setApartments] = useState([]);
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    axiosClient.get("/public/apartments").then((res) => setApartments(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div className="dash-header">
          <div>
            <h1 className="page-title">Admin Console</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Manage households, tariffs, meter readings, and billing cycles.</p>
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: 320 }}>
          <label>Managing Apartment</label>
          <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)}>
            <option value="">Select apartment</option>
            {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</div>
          ))}
        </div>

        {!apartmentId ? (
          <p style={{ color: "#4b5f63" }}>Select or create an apartment to continue.</p>
        ) : (
          <>
            {tab === "Overview" && <OverviewTab apartmentId={apartmentId} />}
            {tab === "Households" && <HouseholdsTab apartmentId={apartmentId} />}
            {tab === "Meter Uploads" && <MeterUploadTab apartmentId={apartmentId} />}
            {tab === "Tariff Plans" && <TariffTab apartmentId={apartmentId} />}
            {tab === "Billing Cycles" && <BillingTab apartmentId={apartmentId} />}
            {tab === "Alerts" && <AlertsTab apartmentId={apartmentId} />}
            {tab === "Apartment Settings" && (
              <ApartmentSettingsTab
                apartment={apartments.find((a) => String(a.id) === String(apartmentId))}
                onUpdated={(updated) => {
                  setApartments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
                }}
                onDeleted={() => {
                  setApartments((prev) => prev.filter((a) => String(a.id) !== String(apartmentId)));
                  setApartmentId("");
                  setTab("Overview");
                }}
              />
            )}
          </>
        )}

        {!apartmentId && <CreateApartmentCard onCreated={(a) => setApartments((prev) => [...prev, a])} />}
      </div>
    </div>
  );
}

function CreateApartmentCard({ onCreated }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const res = await axiosClient.post("/admin/apartments", { name, address });
    onCreated(res.data);
    setMessage(`Apartment "${res.data.name}" created — select it above.`);
    setName(""); setAddress("");
  };

  return (
    <div className="card" style={{ marginTop: 20, maxWidth: 480 }}>
      <h3 style={{ marginBottom: 16 }}>Create a New Apartment</h3>
      {message && <div className="success-banner">{message}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Apartment Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <button className="btn btn-primary btn-block">Create Apartment</button>
      </form>
    </div>
  );
}

function ApartmentSettingsTab({ apartment, onUpdated, onDeleted }) {
  const [form, setForm] = useState({ name: apartment?.name || "", address: apartment?.address || "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({ name: apartment?.name || "", address: apartment?.address || "" });
  }, [apartment]);

  if (!apartment) {
    return <p style={{ color: "#4b5f63" }}>Select an apartment above to manage its details.</p>;
  }

  const save = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    setSaving(true);
    try {
      const res = await axiosClient.put(`/admin/apartments/${apartment.id}`, form);
      onUpdated(res.data);
      setMessage("Apartment details updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update apartment.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = window.confirm(
      `Delete "${apartment.name}"? This permanently deletes all its households, meter readings, ` +
      `tariff plans, billing cycles, invoices, and resident/admin accounts tied to it. This cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    setDeleting(true);
    try {
      await axiosClient.delete(`/admin/apartments/${apartment.id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete apartment.");
      setDeleting(false);
    }
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Edit Apartment Details</h3>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="alert-banner">{error}</div>}
        <form onSubmit={save}>
          <div className="form-group">
            <label>Apartment Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          </div>
          <button className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <h3 style={{ marginBottom: 8, color: "var(--danger)" }}>Danger Zone</h3>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Deleting an apartment permanently removes every household, meter reading, tariff plan,
          billing cycle, invoice, and alert under it — along with the resident and admin accounts
          tied to it. This action cannot be undone.
        </p>
        <button
          className="btn"
          style={{ background: "var(--danger)", color: "#fff" }}
          onClick={remove}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Apartment"}
        </button>
      </div>
    </div>
  );
}

function OverviewTab({ apartmentId }) {
  const [households, setHouseholds] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [comparison, setComparison] = useState([]);

  useEffect(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/households`).then((r) => setHouseholds(r.data)).catch(() => {});
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).then((r) => setAlerts(r.data)).catch(() => {});
    axiosClient.get(`/admin/apartments/${apartmentId}/usage-comparison`).then((r) => setComparison(r.data)).catch(() => {});
  }, [apartmentId]);

  const avgUsage = comparison.length
    ? (comparison.reduce((s, c) => s + Number(c.totalConsumptionKl || 0), 0) / comparison.length).toFixed(2)
    : "0.00";

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card stat-card"><div className="stat-value">{households.length}</div><div className="stat-label">Households</div></div>
        <div className="card stat-card"><div className="stat-value">{alerts.length}</div><div className="stat-label">Active alerts</div></div>
        <div className="card stat-card"><div className="stat-value">{avgUsage} kL</div><div className="stat-label">Avg. daily usage (recent)</div></div>
        <div className="card stat-card"><div className="stat-value">{comparison.length}</div><div className="stat-label">Meters reporting</div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Consumption by Household (recent readings)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={comparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="flatNumber" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="totalConsumptionKl" fill="#12a594" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Recent Usage Logs / Active Alerts</h3>
        {alerts.length === 0 ? (
          <p style={{ color: "#4b5f63", fontSize: 14 }}>No active alerts. All households look normal.</p>
        ) : (
          <table>
            <thead><tr><th>Flat</th><th>Type</th><th>Severity</th><th>Message</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>{a.household?.flatNumber}</td>
                  <td>{a.alertType}</td>
                  <td><span className={`badge badge-${a.severity === "CRITICAL" ? "danger" : a.severity === "WARNING" ? "warning" : "info"}`}>{a.severity}</span></td>
                  <td style={{ fontSize: 13 }}>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HouseholdsTab({ apartmentId }) {
  const [households, setHouseholds] = useState([]);
  const [form, setForm] = useState({ flatNumber: "", flatSizeSqft: "", occupancy: "", meterSerialNumber: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/households`).then((r) => setHouseholds(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      await axiosClient.post("/admin/households", {
        apartmentId, ...form,
        flatSizeSqft: Number(form.flatSizeSqft),
        occupancy: Number(form.occupancy),
      });
      setMessage("Household registered.");
      setForm({ flatNumber: "", flatSizeSqft: "", occupancy: "", meterSerialNumber: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not register household.");
    }
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Register Household</h3>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="alert-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label>Flat Number</label>
            <input value={form.flatNumber} onChange={(e) => setForm({ ...form, flatNumber: e.target.value })} required /></div>
          <div className="form-group"><label>Flat Size (sqft)</label>
            <input type="number" value={form.flatSizeSqft} onChange={(e) => setForm({ ...form, flatSizeSqft: e.target.value })} required /></div>
          <div className="form-group"><label>Occupancy</label>
            <input type="number" value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })} required /></div>
          <div className="form-group"><label>Meter Serial Number (optional)</label>
            <input value={form.meterSerialNumber} onChange={(e) => setForm({ ...form, meterSerialNumber: e.target.value })} /></div>
          <button className="btn btn-primary btn-block">Register Household</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Households ({households.length})</h3>
        <table>
          <thead><tr><th>Flat</th><th>Size (sqft)</th><th>Occupancy</th><th>Meter</th></tr></thead>
          <tbody>
            {households.map((h) => (
              <tr key={h.id}>
                <td>{h.flatNumber}</td><td>{h.flatSizeSqft}</td><td>{h.occupancy}</td>
                <td>{h.meterActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MeterUploadTab({ apartmentId }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null);
    if (!file) return;
    const formData = new FormData();
    formData.append("apartmentId", apartmentId);
    formData.append("file", file);
    try {
      const res = await axiosClient.post("/admin/usage-logs/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    }
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Bulk Meter Reading Upload (CSV)</h3>
        <p style={{ fontSize: 13, color: "#4b5f63", marginBottom: 16 }}>
          CSV columns: <code>flat_number, reading_date (YYYY-MM-DD), reading_value</code>.
          Duplicate readings for the same flat and date are automatically skipped.
        </p>
        {error && <div className="alert-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <button className="btn btn-primary">Upload CSV</button>
        </form>

        {result && (
          <div className="success-banner" style={{ marginTop: 16 }}>
            Processed {result.totalRows} rows — {result.inserted} inserted, {result.duplicatesSkipped} duplicates skipped.
            {result.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <ManualReadingEntryCard apartmentId={apartmentId} />
    </div>
  );
}

function ManualReadingEntryCard({ apartmentId }) {
  const [households, setHouseholds] = useState([]);
  const [form, setForm] = useState({ householdId: "", readingDate: "", readingValue: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/households`).then((r) => setHouseholds(r.data)).catch(() => {});
  }, [apartmentId]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    setSaving(true);
    try {
      await axiosClient.post("/resident/usage-logs", {
        householdId: form.householdId,
        readingDate: form.readingDate,
        readingValue: Number(form.readingValue),
      });
      setMessage("Reading logged for the selected household.");
      setForm({ householdId: form.householdId, readingDate: "", readingValue: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Could not log reading.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>Manual Reading Entry</h3>
      <p style={{ fontSize: 13, color: "#4b5f63", marginBottom: 16 }}>
        Log a single meter reading for one household — useful for corrections
        or one-off readings without a full CSV upload.
      </p>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="alert-banner">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Household</label>
          <select
            value={form.householdId}
            onChange={(e) => setForm({ ...form, householdId: e.target.value })}
            required
          >
            <option value="">Select flat</option>
            {households.map((h) => <option key={h.id} value={h.id}>{h.flatNumber}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Reading Date</label>
          <input
            type="date"
            value={form.readingDate}
            onChange={(e) => setForm({ ...form, readingDate: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Meter Reading Value (cumulative, kL)</label>
          <input
            type="number" step="0.001"
            value={form.readingValue}
            onChange={(e) => setForm({ ...form, readingValue: e.target.value })}
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Saving..." : "Submit Reading"}
        </button>
      </form>
    </div>
  );
}

function TariffTab({ apartmentId }) {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ planName: "", baseRate: "", baseTierLimitKl: "", excessRate: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState(""); // Add error state tracking

  const load = useCallback(() => {
    axiosClient.get(`/admin/tariff-plans/apartment/${apartmentId}`).then((r) => setPlans(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); 
    setMessage("");
    
    try {
      await axiosClient.post("/admin/tariff-plans", {
        apartmentId, ...form,
        baseRate: Number(form.baseRate),
        baseTierLimitKl: Number(form.baseTierLimitKl),
        excessRate: Number(form.excessRate),
      });
      setMessage("Tariff plan created and set as active.");
      setForm({ planName: "", baseRate: "", baseTierLimitKl: "", excessRate: "" });
      load();
    } catch (err) {
      // Safely read the exact message coming back from the backend logic
      setError(err.response?.data?.message || "Could not save tariff plan. Please verify the input values.");
    }
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>New Tariff Plan</h3>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="alert-banner">{error}</div>} {/* Render error banner here */}
        <form onSubmit={submit}>
          <div className="form-group"><label>Plan Name</label>
            <input value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} required /></div>
          <div className="form-group"><label>Base Rate (Rs./kL up to limit)</label>
            <input type="number" step="0.01" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} required /></div>
          <div className="form-group"><label>Base Tier Limit (kL)</label>
            <input type="number" step="0.01" value={form.baseTierLimitKl} onChange={(e) => setForm({ ...form, baseTierLimitKl: e.target.value })} required /></div>
          <div className="form-group"><label>Excess Rate (Rs./kL beyond limit)</label>
            <input type="number" step="0.01" value={form.excessRate} onChange={(e) => setForm({ ...form, excessRate: e.target.value })} required /></div>
          <button className="btn btn-primary btn-block">Save Tariff Plan</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Tariff History</h3>
        <table>
          <thead><tr><th>Name</th><th>Base Rate</th><th>Limit (kL)</th><th>Excess Rate</th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.planName}</td><td>Rs. {p.baseRate}</td><td>{p.baseTierLimitKl}</td><td>Rs. {p.excessRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingTab({ apartmentId }) {
  const [cycles, setCycles] = useState([]);
  const [openForm, setOpenForm] = useState({ startDate: "", endDate: "" });
  const [purchaseForm, setPurchaseForm] = useState({ billingCycleId: "", purchasedVolumeKl: "", unitCost: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [invoicesByCycle, setInvoicesByCycle] = useState({});

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/billing-cycles`).then((r) => setCycles(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const openCycle = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      await axiosClient.post("/admin/billing-cycles", { apartmentId, ...openForm });
      setMessage("Billing cycle opened.");
      setOpenForm({ startDate: "", endDate: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not open billing cycle.");
    }
  };

  const recordPurchase = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      await axiosClient.post("/admin/billing-cycles/purchases", {
        billingCycleId: purchaseForm.billingCycleId,
        purchasedVolumeKl: Number(purchaseForm.purchasedVolumeKl),
        unitCost: Number(purchaseForm.unitCost),
      });
      setMessage("Purchase recorded.");
      setPurchaseForm({ billingCycleId: "", purchasedVolumeKl: "", unitCost: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record purchase.");
    }
  };

  const finalize = async (id) => {
    setError(""); setMessage("");
    try {
      const res = await axiosClient.post(`/admin/billing-cycles/${id}/finalize`);
      setInvoicesByCycle((prev) => ({ ...prev, [id]: res.data }));
      setMessage("Billing cycle finalized — invoices generated and emailed to residents.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not finalize cycle.");
    }
  };

  const archive = async (id) => {
    await axiosClient.post(`/admin/billing-cycles/${id}/archive`);
    load();
  };

  return (
    <div>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="alert-banner">{error}</div>}

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Open Billing Cycle</h3>
          <form onSubmit={openCycle}>
            <div className="form-group"><label>Start Date</label>
              <input type="date" value={openForm.startDate} onChange={(e) => setOpenForm({ ...openForm, startDate: e.target.value })} required /></div>
            <div className="form-group"><label>End Date</label>
              <input type="date" value={openForm.endDate} onChange={(e) => setOpenForm({ ...openForm, endDate: e.target.value })} required /></div>
            <button className="btn btn-primary btn-block">Open Cycle</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Record Bulk Water Purchase</h3>
          <form onSubmit={recordPurchase}>
            <div className="form-group"><label>Billing Cycle</label>
              <select value={purchaseForm.billingCycleId} onChange={(e) => setPurchaseForm({ ...purchaseForm, billingCycleId: e.target.value })} required>
                <option value="">Select cycle</option>
                {cycles.filter(c => c.status === "OPEN").map((c) => (
                  <option key={c.id} value={c.id}>{c.startDate} to {c.endDate}</option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Purchased Volume (kL)</label>
              <input type="number" step="0.01" value={purchaseForm.purchasedVolumeKl} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasedVolumeKl: e.target.value })} required /></div>
            <div className="form-group"><label>Unit Cost (Rs./kL)</label>
              <input type="number" step="0.01" value={purchaseForm.unitCost} onChange={(e) => setPurchaseForm({ ...purchaseForm, unitCost: e.target.value })} required /></div>
            <button className="btn btn-primary btn-block">Record Purchase</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Billing Cycles</h3>
        <table>
          <thead><tr><th>Period</th><th>Status</th><th>Purchased (kL)</th><th>Unit Cost</th><th>Actions</th></tr></thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id}>
                <td>{c.startDate} → {c.endDate}</td>
                <td><span className={`badge badge-${c.status === "OPEN" ? "info" : c.status === "FINALIZED" ? "success" : "warning"}`}>{c.status}</span></td>
                <td>{c.totalPurchasedVolumeKl}</td>
                <td>Rs. {c.unitCost}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  {c.status === "OPEN" && <button className="btn btn-primary btn-sm" onClick={() => finalize(c.id)}>Finalize</button>}
                  {c.status === "FINALIZED" && <button className="btn btn-outline btn-sm" onClick={() => archive(c.id)}>Archive</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsTab({ apartmentId }) {
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).then((r) => setAlerts(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const runCheck = async () => {
    await axiosClient.post("/admin/alerts/run-check");
    load();
  };

  const resolve = async (id) => {
    await axiosClient.post(`/admin/alerts/${id}/resolve`);
    load();
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3>Active Alerts</h3>
        <button className="btn btn-outline btn-sm" onClick={runCheck}>Run Check Now</button>
      </div>
      {alerts.length === 0 ? (
        <p style={{ color: "#4b5f63", fontSize: 14 }}>No active alerts across households.</p>
      ) : (
        <table>
          <thead><tr><th>Flat</th><th>Type</th><th>Severity</th><th>Message</th><th></th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.household?.flatNumber}</td>
                <td>{a.alertType}</td>
                <td><span className={`badge badge-${a.severity === "CRITICAL" ? "danger" : a.severity === "WARNING" ? "warning" : "info"}`}>{a.severity}</span></td>
                <td style={{ fontSize: 13 }}>{a.message}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => resolve(a.id)}>Resolve</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}