import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import Navbar from "../components/Navbar";
import GoogleSignInButton from "../components/GoogleSignInButton";

const RESIDENT_POINTS = [
  { icon: "📊", text: "Track your household's daily consumption in one dashboard." },
  { icon: "⚖️", text: "See how your usage compares to similar-sized flats." },
];
const ADMIN_POINTS = [
  { icon: "🏢", text: "Onboard your apartment, register flats, and configure tariffs." },
  { icon: "🧾", text: "Run billing cycles and generate invoices for every household." },
];

export default function RegisterPage() {
  const [role, setRole] = useState("RESIDENT");
  const [apartments, setApartments] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", fullName: "", apartmentId: "", flatNumber: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const { register, googleLogin, googleRegister } = useAuth();
  const navigate = useNavigate();

  const [pendingGoogle, setPendingGoogle] = useState(null);
  const [googleApartmentId, setGoogleApartmentId] = useState("");
  const [googleFlatNumber, setGoogleFlatNumber] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    axiosClient.get("/public/apartments").then((res) => setApartments(res.data)).catch(() => {});
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleGoogleCredential = async (idToken) => {
    setGoogleError("");
    try {
      const result = await googleLogin(idToken);
      if (result.accountExists && result.pendingApproval) {
        setGoogleError("Your account is registered but still pending admin approval. You'll get an email once it's approved.");
      } else if (result.accountExists) {
        navigate("/resident");
      } else {
        setPendingGoogle({ idToken, email: result.googleEmail, fullName: result.googleFullName });
      }
    } catch (err) {
      setGoogleError(err.response?.data?.message || "Google sign-in failed. Please try again.");
    }
  };

  const completeGoogleRegistration = async (e) => {
    e.preventDefault();
    if (!googleApartmentId || !googleFlatNumber) {
      setGoogleError("Select your apartment and enter your flat number.");
      return;
    }
    setGoogleError("");
    setGoogleLoading(true);
    try {
      const message = await googleRegister(pendingGoogle.idToken, googleApartmentId, googleFlatNumber);
      setPendingGoogle(null);
      setPendingMessage(message);
    } catch (err) {
      setGoogleError(err.response?.data?.message || "Could not complete your registration.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setPendingMessage("");
    setLoading(true);
    try {
      let payload = { username: form.username, email: form.email, password: form.password, fullName: form.fullName, role };

      if (role === "ADMIN") {
        payload.apartmentId = form.apartmentId || null;
      } else {
        if (!form.apartmentId || !form.flatNumber) {
          throw { response: { data: { message: "Select an apartment and enter your flat number." } } };
        }
        const lookup = await axiosClient.get(
          `/public/apartments/${form.apartmentId}/households/lookup`,
          { params: { flatNumber: form.flatNumber } }
        );
        payload.householdId = lookup.data.id;
      }

      const data = await register(payload);
      if (data.pendingApproval) {
        setPendingMessage(data.message);
      } else if (data.auth) {
        navigate(data.auth.role === "ADMIN" ? "/admin" : "/resident");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const points = role === "ADMIN" ? ADMIN_POINTS : RESIDENT_POINTS;

  return (
    <div>
      <Navbar />
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="ripple-rings" aria-hidden="true" style={{ top: "8%", left: "8%" }}><span></span><span></span><span></span></div>
          <div className="auth-brand-inner">
            <div className="auth-brand-mark">💧 AquaTrack</div>
            <h2 className="auth-brand-headline">
              {role === "ADMIN" ? <>Run your building's <em>whole billing cycle.</em></> : <>Know exactly what <em>you're paying for.</em></>}
            </h2>
            <p className="auth-brand-copy">
              {role === "ADMIN"
                ? "Onboard your apartment, configure tariffs, and bill every flat fairly in a few clicks."
                : "See your consumption, your bill, and your peer comparison — all in one place."}
            </p>
            <div className="auth-brand-list">
              {points.map((p) => (
                <div key={p.text} className="auth-brand-list-item"><span className="auth-brand-list-icon">{p.icon}</span><span>{p.text}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-card">
            <h1 className="page-title">Create your account</h1>
            <p className="page-subtitle">
              {role === "ADMIN"
                ? "Admins manage tariffs, billing cycles, and meter uploads for an apartment."
                : "Residents track their own usage, bills, and alerts. Your flat must already be registered by your admin. New resident accounts need admin approval before you can log in."}
            </p>

            <div className="role-toggle">
              <div className={`role-toggle-btn ${role === "RESIDENT" ? "active" : ""}`} onClick={() => { setRole("RESIDENT"); setPendingMessage(""); setPendingGoogle(null); setGoogleError(""); }}>Resident</div>
              <div className={`role-toggle-btn ${role === "ADMIN" ? "active" : ""}`} onClick={() => { setRole("ADMIN"); setPendingMessage(""); setPendingGoogle(null); setGoogleError(""); }}>Apartment Admin</div>
            </div>

            {error && <div className="alert-banner">{error}</div>}
            {pendingMessage && <div className="success-banner">{pendingMessage}</div>}

            {/* Google sign-up is resident-only — never shown for the admin role */}
            {role === "RESIDENT" && !pendingGoogle && !pendingMessage && (
              <>
                <div className="auth-divider"><span>Get started</span></div>
                {googleError && <div className="alert-banner">{googleError}</div>}
                <GoogleSignInButton onCredential={handleGoogleCredential} onError={setGoogleError} />
                <div className="auth-divider"><span>or register manually</span></div>
              </>
            )}

            {role === "RESIDENT" && pendingGoogle && (
              <div className="google-complete-box">
                <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 14 }}>
                  No resident account found for <strong>{pendingGoogle.email}</strong> yet.
                  Select your apartment and flat number to submit it for admin approval.
                </p>
                {googleError && <div className="alert-banner">{googleError}</div>}
                <form onSubmit={completeGoogleRegistration}>
                  <div className="form-group">
                    <label>Apartment</label>
                    <select value={googleApartmentId} onChange={(e) => setGoogleApartmentId(e.target.value)} required>
                      <option value="">Select apartment</option>
                      {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Flat number</label>
                    <input value={googleFlatNumber} onChange={(e) => setGoogleFlatNumber(e.target.value)} placeholder="e.g. A-204" required />
                  </div>
                  <button className="btn btn-primary btn-block" disabled={googleLoading}>
                    {googleLoading ? "Submitting..." : "Submit for approval"}
                  </button>
                  <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={() => { setPendingGoogle(null); setGoogleApartmentId(""); setGoogleFlatNumber(""); }}>
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {!pendingMessage && !pendingGoogle && (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-2" style={{ gap: 16 }}>
                  <div className="form-group"><label>Full name</label><input value={form.fullName} onChange={update("fullName")} required /></div>
                  <div className="form-group"><label>Username</label><input value={form.username} onChange={update("username")} required /></div>
                </div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={update("email")} required /></div>
                <div className="form-group"><label>Password</label><input type="password" minLength={6} value={form.password} onChange={update("password")} required /></div>

                <div className="form-group">
                  <label>Apartment {role === "ADMIN" ? "(optional if creating a new one later)" : ""}</label>
                  <select value={form.apartmentId} onChange={update("apartmentId")} required={role === "RESIDENT"}>
                    <option value="">Select apartment</option>
                    {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {role === "RESIDENT" && (
                  <div className="form-group">
                    <label>Flat number</label>
                    <input value={form.flatNumber} onChange={update("flatNumber")} placeholder="e.g. A-204" required />
                  </div>
                )}

                <button className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? "Submitting..." : "Register"}
                </button>
              </form>
            )}

            {!pendingMessage && (
              <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                Already have an account? <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>Log in</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
