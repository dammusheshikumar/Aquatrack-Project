import React, { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "../components/Navbar";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const TABS = ["Overview", "Households", "Pending Approvals", "Meter Uploads", "Tariff Plans", "Billing Cycles", "Fines", "Alerts", "Apartment Settings"];

export default function AdminPanel() {
  const { user } = useAuth();
  const [apartmentId, setApartmentId] = useState(user?.apartmentId || "");
  const [apartments, setApartments] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [pendingCount, setPendingCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    axiosClient.get("/public/apartments").then((res) => setApartments(res.data)).catch(() => {});
  }, []);

  const refreshBadges = useCallback(() => {
    if (!apartmentId) return;
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`).then((r) => setPendingCount(r.data.length)).catch(() => {});
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).then((r) => setAlertCount(r.data.length)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { refreshBadges(); }, [refreshBadges, tab]);

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

        {apartmentId && (pendingCount > 0) && tab !== "Pending Approvals" && (
          <div className="alert-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>🔔 {pendingCount} resident registration{pendingCount > 1 ? "s" : ""} waiting for your approval.</span>
            <button className="btn btn-primary btn-sm" onClick={() => setTab("Pending Approvals")}>Review now</button>
          </div>
        )}

        <div className="tabs">
          {TABS.map((t) => (
            <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
              {t === "Pending Approvals" && pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
              {t === "Alerts" && alertCount > 0 && <span className="tab-badge">{alertCount}</span>}
            </div>
          ))}
        </div>

        {!apartmentId ? (
          <>
            <p style={{ color: "#4b5f63" }}>Select or create an apartment to continue.</p>
            <CreateApartmentCard onCreated={(a) => setApartments((prev) => [...prev, a])} />
          </>
        ) : (
          <>
            {tab === "Overview" && <OverviewTab apartmentId={apartmentId} />}
            {tab === "Households" && <HouseholdsTab apartmentId={apartmentId} />}
            {tab === "Pending Approvals" && <PendingApprovalsTab apartmentId={apartmentId} onChanged={refreshBadges} />}
            {tab === "Meter Uploads" && <MeterUploadTab apartmentId={apartmentId} />}
            {tab === "Tariff Plans" && <TariffTab apartmentId={apartmentId} />}
            {tab === "Billing Cycles" && <BillingTab apartmentId={apartmentId} />}
            {tab === "Fines" && <FinesTab apartmentId={apartmentId} />}
            {tab === "Alerts" && <AlertsTab apartmentId={apartmentId} onChanged={refreshBadges} />}
            {tab === "Apartment Settings" && (
              <ApartmentSettingsTab
                apartment={apartments.find((a) => String(a.id) === String(apartmentId))}
                onUpdated={(updated) => setApartments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
                onDeleted={() => {
                  setApartments((prev) => prev.filter((a) => String(a.id) !== String(apartmentId)));
                  setApartmentId("");
                  setTab("Overview");
                }}
              />
            )}
          </>
        )}
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
        <div className="form-group"><label>Apartment Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="form-group"><label>Address</label><input value={address} onChange={(e) => setAddress(e.target.value)} required /></div>
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

  useEffect(() => { setForm({ name: apartment?.name || "", address: apartment?.address || "" }); }, [apartment]);

  if (!apartment) return <p style={{ color: "#4b5f63" }}>Select an apartment above to manage its details.</p>;

  const save = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setSaving(true);
    try {
      const res = await axiosClient.put(`/admin/apartments/${apartment.id}`, form);
      onUpdated(res.data);
      setMessage("Apartment details updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update apartment.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    const confirmed = window.confirm(
      `Delete "${apartment.name}"? This permanently deletes all its households, meter readings, ` +
      `tariff plans, billing cycles, invoices, fines, and resident/admin accounts tied to it. This cannot be undone.`
    );
    if (!confirmed) return;
    setError(""); setDeleting(true);
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
          <div className="form-group"><label>Apartment Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          <button className="btn btn-primary btn-block" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      </div>
      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <h3 style={{ marginBottom: 8, color: "var(--danger)" }}>Danger Zone</h3>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Deleting an apartment permanently removes every household, meter reading, tariff plan,
          billing cycle, invoice, fine, and alert under it — along with the resident and admin accounts tied to it.
        </p>
        <button className="btn" style={{ background: "var(--danger)", color: "#fff" }} onClick={remove} disabled={deleting}>
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
  const [pending, setPending] = useState(0);

  useEffect(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/households`).then((r) => setHouseholds(r.data)).catch(() => {});
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).then((r) => setAlerts(r.data)).catch(() => {});
    axiosClient.get(`/admin/apartments/${apartmentId}/usage-comparison`).then((r) => setComparison(r.data)).catch(() => {});
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`).then((r) => setPending(r.data.length)).catch(() => {});
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
        <div className="card stat-card" style={{ borderTopColor: pending ? "var(--accent)" : "var(--primary)" }}>
          <div className="stat-value">{pending}</div><div className="stat-label">Pending resident approvals</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Consumption by Household (recent readings)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={comparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dfeceb" />
            <XAxis dataKey="flatNumber" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="totalConsumptionKl" fill="#12a594" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Active Alerts</h3>
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

function PendingApprovalsTab({ apartmentId, onChanged }) {
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/pending-residents`).then((r) => setPending(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const approve = async (userId) => {
    setError(""); setMessage(""); setBusyId(userId);
    try {
      await axiosClient.post(`/admin/residents/${userId}/approve`);
      setMessage("Resident approved — they've been emailed and can now log in.");
      load(); onChanged && onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Could not approve this registration.");
    } finally { setBusyId(null); }
  };

  const reject = async (userId) => {
    if (!window.confirm("Reject this registration? The pending account will be deleted and the applicant notified by email.")) return;
    setError(""); setMessage(""); setBusyId(userId);
    try {
      await axiosClient.post(`/admin/residents/${userId}/reject`);
      setMessage("Registration rejected.");
      load(); onChanged && onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Could not reject this registration.");
    } finally { setBusyId(null); }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>Pending Resident Registrations</h3>
      <p style={{ fontSize: 13, color: "#4b5f63", marginBottom: 16 }}>
        New residents can't log in until you approve them here. Both the applicant and any decision are sent by email automatically.
      </p>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="alert-banner">{error}</div>}
      {pending.length === 0 ? (
        <p style={{ color: "#4b5f63", fontSize: 14 }}>No pending registrations right now.</p>
      ) : (
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Flat</th><th>Sign-up method</th><th></th></tr></thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.household?.flatNumber}</td>
                <td>{u.authProvider === "GOOGLE" ? "Google" : "Username/password"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" disabled={busyId === u.id} onClick={() => approve(u.id)}>Approve</button>
                  <button className="btn btn-outline btn-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} disabled={busyId === u.id} onClick={() => reject(u.id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HouseholdsTab({ apartmentId }) {
  const [households, setHouseholds] = useState([]);
  const [form, setForm] = useState({ flatNumber: "", flatSizeSqft: "", occupancy: "", meterSerialNumber: "", dailyLimitKl: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fineFormFor, setFineFormFor] = useState(null); // householdId currently showing the impose-fine form
  const [fineAmount, setFineAmount] = useState("");
  const [fineReason, setFineReason] = useState("");

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/households/detail`).then((r) => setHouseholds(r.data)).catch(() => {});
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
        dailyLimitKl: form.dailyLimitKl === "" ? null : Number(form.dailyLimitKl),
      });
      setMessage("Household registered.");
      setForm({ flatNumber: "", flatSizeSqft: "", occupancy: "", meterSerialNumber: "", dailyLimitKl: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not register household.");
    }
  };

  const submitFine = async (e, householdId) => {
    e.preventDefault();
    if (!fineAmount || !fineReason) return;
    try {
      await axiosClient.post("/admin/fines", { householdId, amount: Number(fineAmount), reason: fineReason });
      setFineFormFor(null); setFineAmount(""); setFineReason("");
      setMessage("Fine imposed and the resident has been notified by email.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not impose fine.");
    }
  };

  return (
    <div className="grid grid-2">
      <div className="card" style={{ alignSelf: "start" }}>
        <h3 style={{ marginBottom: 16 }}>Register Household</h3>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="alert-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label>Flat Number</label><input value={form.flatNumber} onChange={(e) => setForm({ ...form, flatNumber: e.target.value })} required /></div>
          <div className="form-group"><label>Flat Size (sqft)</label><input type="number" value={form.flatSizeSqft} onChange={(e) => setForm({ ...form, flatSizeSqft: e.target.value })} required /></div>
          <div className="form-group"><label>Occupancy</label><input type="number" value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })} required /></div>
          <div className="form-group"><label>Meter Serial Number (optional)</label><input value={form.meterSerialNumber} onChange={(e) => setForm({ ...form, meterSerialNumber: e.target.value })} /></div>
          <div className="form-group"><label>Daily Usage Limit (kL, optional)</label><input type="number" step="0.001" value={form.dailyLimitKl} onChange={(e) => setForm({ ...form, dailyLimitKl: e.target.value })} placeholder="Leave blank for no daily-limit alert" /></div>
          <button className="btn btn-primary btn-block">Register Household</button>
        </form>
      </div>

      <div className="card" style={{ alignSelf: "start" }}>
        <h3 style={{ marginBottom: 16 }}>Households &amp; Residents ({households.length})</h3>
        {households.length === 0 ? (
          <p style={{ color: "#4b5f63", fontSize: 14 }}>No households registered yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {households.map((h) => (
              <div key={h.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 15 }}>{h.flatNumber}</strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    {h.meterActive ? <span className="badge badge-success">Meter Active</span> : <span className="badge badge-danger">Meter Inactive</span>}
                    {h.unpaidFineCount > 0 && <span className="badge badge-danger">{h.unpaidFineCount} unpaid fine{h.unpaidFineCount > 1 ? "s" : ""} · Rs. {h.unpaidFineTotal}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>
                  {h.flatSizeSqft} sqft · {h.occupancy} occupant{h.occupancy > 1 ? "s" : ""}
                  {h.dailyLimitKl ? ` · daily limit ${h.dailyLimitKl} kL` : ""}
                </div>

                {h.residents.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>No resident account registered for this flat yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                    {h.residents.map((r) => (
                      <div key={r.userId} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{r.fullName}</span>
                        <span style={{ color: "var(--text-muted)" }}>{r.email}</span>
                        <span className={`badge ${r.approvalStatus === "APPROVED" ? "badge-success" : r.approvalStatus === "PENDING" ? "badge-warning" : "badge-danger"}`} style={{ fontSize: 10 }}>
                          {r.approvalStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {fineFormFor === h.id ? (
                  <form onSubmit={(e) => submitFine(e, h.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <input type="number" step="0.01" placeholder="Amount (Rs.)" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} style={{ width: 120 }} required />
                    <input placeholder="Reason" value={fineReason} onChange={(e) => setFineReason(e.target.value)} style={{ flex: 1, minWidth: 140 }} required />
                    <button className="btn btn-primary btn-sm">Confirm Fine</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setFineFormFor(null)}>Cancel</button>
                  </form>
                ) : (
                  <button className="btn btn-outline btn-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => setFineFormFor(h.id)}>
                    Impose Fine
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
          <div className="form-group"><input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} required /></div>
          <button className="btn btn-primary">Upload CSV</button>
        </form>
        {result && (
          <div className="success-banner" style={{ marginTop: 16 }}>
            Processed {result.totalRows} rows — {result.inserted} inserted, {result.duplicatesSkipped} duplicates skipped.
            {result.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
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
    setError(""); setMessage(""); setSaving(true);
    try {
      await axiosClient.post("/admin/usage-logs", {
        householdId: form.householdId,
        readingDate: form.readingDate,
        readingValue: Number(form.readingValue),
      });
      setMessage("Reading logged for the selected household.");
      setForm({ householdId: form.householdId, readingDate: "", readingValue: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Could not log reading.");
    } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>Manual Reading Entry</h3>
      <p style={{ fontSize: 13, color: "#4b5f63", marginBottom: 16 }}>
        Log a single meter reading for one household — useful for corrections or one-off readings without a full CSV upload.
      </p>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="alert-banner">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Household</label>
          <select value={form.householdId} onChange={(e) => setForm({ ...form, householdId: e.target.value })} required>
            <option value="">Select flat</option>
            {households.map((h) => <option key={h.id} value={h.id}>{h.flatNumber}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Reading Date</label><input type="date" value={form.readingDate} onChange={(e) => setForm({ ...form, readingDate: e.target.value })} required /></div>
        <div className="form-group"><label>Meter Reading Value (cumulative, kL)</label><input type="number" step="0.001" value={form.readingValue} onChange={(e) => setForm({ ...form, readingValue: e.target.value })} required /></div>
        <button className="btn btn-primary btn-block" disabled={saving}>{saving ? "Saving..." : "Submit Reading"}</button>
      </form>
    </div>
  );
}

function TariffTab({ apartmentId }) {
  const [plans, setPlans] = useState([]);
  const [planName, setPlanName] = useState("");
  const [tiers, setTiers] = useState([{ upToKl: "", rate: "" }, { upToKl: "", rate: "" }]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    axiosClient.get(`/admin/tariff-plans/apartment/${apartmentId}`).then((r) => setPlans(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const updateTier = (index, field, value) => setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  const addTier = () => setTiers((prev) => [...prev, { upToKl: "", rate: "" }]);
  const removeTier = (index) => { if (tiers.length > 1) setTiers((prev) => prev.filter((_, i) => i !== index)); };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      const payload = {
        apartmentId, planName,
        tiers: tiers.map((t, i) => ({
          upToKl: i === tiers.length - 1 && t.upToKl === "" ? null : Number(t.upToKl),
          rate: Number(t.rate),
        })),
      };
      await axiosClient.post("/admin/tariff-plans", payload);
      setMessage("Tariff plan created and set as active.");
      setPlanName("");
      setTiers([{ upToKl: "", rate: "" }, { upToKl: "", rate: "" }]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save tariff plan.");
    }
  };

  const describeTiers = (planTiers) => {
    let lower = 0;
    return planTiers.map((t, i) => {
      const label = t.upToKl != null ? `${lower}\u2013${t.upToKl} kL @ Rs. ${t.rate}` : `${lower}+ kL @ Rs. ${t.rate}`;
      if (t.upToKl != null) lower = t.upToKl;
      return <div key={i} style={{ fontSize: 13 }}>{label}</div>;
    });
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>New Tariff Plan</h3>
        <p style={{ fontSize: 13, color: "#4b5f63", marginBottom: 16 }}>
          Add as many rate tiers as you need. Leave the last tier's "up to" blank — it applies to all consumption beyond the previous tier.
        </p>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="alert-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label>Plan Name</label><input value={planName} onChange={(e) => setPlanName(e.target.value)} required /></div>
          <label>Rate Tiers</label>
          {tiers.map((tier, i) => {
            const isLast = i === tiers.length - 1;
            return (
              <div key={i} className="grid grid-2" style={{ gap: 10, marginBottom: 10, alignItems: "end" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 400, fontSize: 12 }}>{isLast ? "Up to (kL) — blank = unlimited" : "Up to (kL)"}</label>
                  <input type="number" step="0.01" value={tier.upToKl} onChange={(e) => updateTier(i, "upToKl", e.target.value)} placeholder={isLast ? "unlimited" : "e.g. 10"} required={!isLast} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label style={{ fontWeight: 400, fontSize: 12 }}>Rate (Rs./kL)</label>
                    <input type="number" step="0.01" value={tier.rate} onChange={(e) => updateTier(i, "rate", e.target.value)} required />
                  </div>
                  {tiers.length > 1 && (
                    <button type="button" className="btn btn-outline btn-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => removeTier(i)}>✕</button>
                  )}
                </div>
              </div>
            );
          })}
          <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={addTier}>+ Add Tier</button>
          <button className="btn btn-primary btn-block">Save Tariff Plan</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Tariff History</h3>
        {plans.length === 0 ? (
          <p style={{ color: "#4b5f63", fontSize: 14 }}>No tariff plans yet.</p>
        ) : (
          plans.map((p) => (
            <div key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <strong style={{ fontSize: 14 }}>{p.planName}</strong>
                {p.active && <span className="badge badge-success">Active</span>}
              </div>
              {describeTiers(p.tiers || [])}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BillingTab({ apartmentId }) {
  const [cycles, setCycles] = useState([]);
  const [openForm, setOpenForm] = useState({ startDate: "", endDate: "" });
  const [purchaseForm, setPurchaseForm] = useState({ billingCycleId: "", purchaseDate: "", purchaseType: "TANKER", volumeKl: "", unitCost: "", notes: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [purchasesByCycle, setPurchasesByCycle] = useState({});
  const [invoicesByCycle, setInvoicesByCycle] = useState({});
  const [expandedCycle, setExpandedCycle] = useState(null);
  const [adjustmentFor, setAdjustmentFor] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

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
        ...purchaseForm,
        volumeKl: Number(purchaseForm.volumeKl),
        unitCost: Number(purchaseForm.unitCost),
      });
      setMessage("Purchase recorded.");
      setPurchaseForm({ ...purchaseForm, volumeKl: "", unitCost: "", notes: "" });
      load();
      if (expandedCycle === purchaseForm.billingCycleId) loadPurchases(purchaseForm.billingCycleId);
    } catch (err) {
      setError(err.response?.data?.message || "Could not record purchase.");
    }
  };

  const loadPurchases = async (cycleId) => {
    const res = await axiosClient.get(`/admin/billing-cycles/${cycleId}/purchases`);
    setPurchasesByCycle((prev) => ({ ...prev, [cycleId]: res.data }));
  };

  const toggleExpand = (cycleId) => {
    if (expandedCycle === cycleId) { setExpandedCycle(null); return; }
    setExpandedCycle(cycleId);
    loadPurchases(cycleId);
  };

  const finalize = async (id) => {
    setError(""); setMessage("");
    try {
      const res = await axiosClient.post(`/admin/billing-cycles/${id}/finalize`);
      setInvoicesByCycle((prev) => ({ ...prev, [id]: res.data }));
      setMessage("Billing cycle finalized — invoices generated and emailed (with PDF attached) to residents.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not finalize cycle.");
    }
  };

  const archive = async (id) => {
    await axiosClient.post(`/admin/billing-cycles/${id}/archive`);
    load();
  };

  const loadInvoices = async (cycleId) => {
    const res = await axiosClient.get(`/admin/billing-cycles/${cycleId}/invoices`);
    setInvoicesByCycle((prev) => ({ ...prev, [cycleId]: res.data }));
  };

  const submitAdjustment = async (e, invoiceId) => {
    e.preventDefault();
    if (!adjustmentAmount || !adjustmentReason) return;
    try {
      await axiosClient.post(`/admin/invoices/${invoiceId}/adjustments`, { amount: Number(adjustmentAmount), reason: adjustmentReason });
      setAdjustmentFor(null); setAdjustmentAmount(""); setAdjustmentReason("");
      setMessage("Adjustment applied.");
      if (expandedCycle) loadInvoices(expandedCycle);
    } catch (err) {
      setError(err.response?.data?.message || "Could not apply adjustment.");
    }
  };

  return (
    <div>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="alert-banner">{error}</div>}

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Open Billing Cycle</h3>
          <form onSubmit={openCycle}>
            <div className="form-group"><label>Start Date</label><input type="date" value={openForm.startDate} onChange={(e) => setOpenForm({ ...openForm, startDate: e.target.value })} required /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={openForm.endDate} onChange={(e) => setOpenForm({ ...openForm, endDate: e.target.value })} required /></div>
            <button className="btn btn-primary btn-block">Open Cycle</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Record Bulk Water Purchase</h3>
          <form onSubmit={recordPurchase}>
            <div className="form-group">
              <label>Billing Cycle</label>
              <select value={purchaseForm.billingCycleId} onChange={(e) => setPurchaseForm({ ...purchaseForm, billingCycleId: e.target.value })} required>
                <option value="">Select cycle</option>
                {cycles.filter((c) => c.status === "OPEN").map((c) => <option key={c.id} value={c.id}>{c.startDate} to {c.endDate}</option>)}
              </select>
            </div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div className="form-group"><label>Purchase Date</label><input type="date" value={purchaseForm.purchaseDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} required /></div>
              <div className="form-group">
                <label>Source</label>
                <select value={purchaseForm.purchaseType} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseType: e.target.value })}>
                  <option value="TANKER">Tanker</option>
                  <option value="MUNICIPAL">Municipal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div className="form-group"><label>Volume (kL)</label><input type="number" step="0.01" value={purchaseForm.volumeKl} onChange={(e) => setPurchaseForm({ ...purchaseForm, volumeKl: e.target.value })} required /></div>
              <div className="form-group"><label>Unit Cost (Rs./kL)</label><input type="number" step="0.01" value={purchaseForm.unitCost} onChange={(e) => setPurchaseForm({ ...purchaseForm, unitCost: e.target.value })} required /></div>
            </div>
            <div className="form-group"><label>Notes (optional)</label><input value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} placeholder="e.g. supplier name / invoice #" /></div>
            <button className="btn btn-primary btn-block">Record Purchase</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Billing Cycles</h3>
        <table>
          <thead><tr><th>Period</th><th>Status</th><th>Purchased (kL)</th><th>Avg Unit Cost</th><th>Actions</th></tr></thead>
          <tbody>
            {cycles.map((c) => (
              <React.Fragment key={c.id}>
                <tr>
                  <td>{c.startDate} → {c.endDate}</td>
                  <td><span className={`badge badge-${c.status === "OPEN" ? "info" : c.status === "FINALIZED" ? "success" : "warning"}`}>{c.status}</span></td>
                  <td>{c.totalPurchasedVolumeKl}</td>
                  <td>Rs. {c.unitCost}</td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleExpand(c.id)}>{expandedCycle === c.id ? "Hide" : "Details"}</button>
                    {c.status === "OPEN" && <button className="btn btn-primary btn-sm" onClick={() => finalize(c.id)}>Finalize</button>}
                    {c.status === "FINALIZED" && <button className="btn btn-outline btn-sm" onClick={() => archive(c.id)}>Archive</button>}
                  </td>
                </tr>
                {expandedCycle === c.id && (
                  <tr>
                    <td colSpan={5} style={{ background: "var(--bg)", padding: 16 }}>
                      <div style={{ marginBottom: 16 }}>
                        <strong style={{ fontSize: 13 }}>Purchases in this cycle</strong>
                        {(purchasesByCycle[c.id] || []).length === 0 ? (
                          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No purchases recorded yet.</p>
                        ) : (
                          <table style={{ marginTop: 8 }}>
                            <thead><tr><th>Date</th><th>Type</th><th>Volume (kL)</th><th>Unit Cost</th><th>Total</th><th>Notes</th></tr></thead>
                            <tbody>
                              {purchasesByCycle[c.id].map((p) => (
                                <tr key={p.id}>
                                  <td>{p.purchaseDate}</td><td>{p.purchaseType}</td><td>{p.volumeKl}</td>
                                  <td>Rs. {p.unitCost}</td><td>Rs. {p.totalCost}</td><td style={{ fontSize: 12 }}>{p.notes || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {c.status !== "OPEN" && (
                        <div>
                          <strong style={{ fontSize: 13 }}>Invoices</strong>
                          <button className="btn btn-outline btn-sm" style={{ marginLeft: 10 }} onClick={() => loadInvoices(c.id)}>Load invoices</button>
                          {(invoicesByCycle[c.id] || []).length > 0 && (
                            <table style={{ marginTop: 8 }}>
                              <thead><tr><th>Flat</th><th>Consumption</th><th>Base</th><th>Shared</th><th>Adjustments</th><th>Total</th><th></th></tr></thead>
                              <tbody>
                                {invoicesByCycle[c.id].map((inv) => (
                                  <React.Fragment key={inv.id}>
                                    <tr>
                                      <td>{inv.household?.flatNumber}</td>
                                      <td>{inv.consumptionKl}</td>
                                      <td>Rs. {inv.baseCharge}</td>
                                      <td>Rs. {inv.sharedAllocation}</td>
                                      <td>Rs. {inv.adjustments}</td>
                                      <td><strong>Rs. {inv.total}</strong></td>
                                      <td>
                                        <button className="btn btn-outline btn-sm" onClick={() => setAdjustmentFor(adjustmentFor === inv.id ? null : inv.id)}>
                                          Adjust
                                        </button>
                                      </td>
                                    </tr>
                                    {adjustmentFor === inv.id && (
                                      <tr>
                                        <td colSpan={7}>
                                          <form onSubmit={(e) => submitAdjustment(e, inv.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 0" }}>
                                            <input type="number" step="0.01" placeholder="Amount (+/- Rs.)" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} style={{ width: 140 }} required />
                                            <input placeholder="Reason" value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} style={{ flex: 1, minWidth: 160 }} required />
                                            <button className="btn btn-primary btn-sm">Apply</button>
                                          </form>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinesTab({ apartmentId }) {
  const [fines, setFines] = useState([]);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/fines`).then((r) => setFines(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    await axiosClient.post(`/admin/fines/${id}/status`, { status });
    setMessage(`Fine marked as ${status.toLowerCase()}.`);
    load();
  };

  const unpaidTotal = fines.filter((f) => f.status === "UNPAID").reduce((s, f) => s + Number(f.amount), 0);

  return (
    <div className="card">
      <div className="dash-header">
        <h3>All Fines ({fines.length})</h3>
        <span className="badge badge-danger">Rs. {unpaidTotal.toFixed(2)} outstanding</span>
      </div>
      {message && <div className="success-banner">{message}</div>}
      {fines.length === 0 ? (
        <p style={{ color: "#4b5f63", fontSize: 14 }}>No fines imposed yet. Use the Households tab to impose one directly on a flat.</p>
      ) : (
        <table>
          <thead><tr><th>Flat</th><th>Amount</th><th>Reason</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {fines.map((f) => (
              <tr key={f.id}>
                <td>{f.household?.flatNumber}</td>
                <td>Rs. {f.amount}</td>
                <td style={{ fontSize: 13 }}>{f.reason}</td>
                <td><span className={`badge ${f.status === "UNPAID" ? "badge-danger" : f.status === "PAID" ? "badge-success" : "badge-info"}`}>{f.status}</span></td>
                <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {f.status === "UNPAID" && (
                    <>
                      <button className="btn btn-outline btn-sm" onClick={() => setStatus(f.id, "PAID")}>Mark Paid</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setStatus(f.id, "WAIVED")}>Waive</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AlertsTab({ apartmentId, onChanged }) {
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(() => {
    axiosClient.get(`/admin/apartments/${apartmentId}/alerts`).then((r) => setAlerts(r.data)).catch(() => {});
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  const runCheck = async () => {
    await axiosClient.post("/admin/alerts/run-check");
    load(); onChanged && onChanged();
  };

  const resolve = async (id) => {
    await axiosClient.post(`/admin/alerts/${id}/resolve`);
    load(); onChanged && onChanged();
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3>Active Alerts</h3>
        <button className="btn btn-outline btn-sm" onClick={runCheck}>Run Check Now</button>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>
        Checks every household for daily-limit breaches, relative overuse, and 2σ statistical leak anomalies.
        Also runs automatically on a schedule. Each new alert emails the affected household immediately.
      </p>
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
