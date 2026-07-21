import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import Navbar from "../components/Navbar";
import GoogleSignInButton from "../components/GoogleSignInButton";

const BRAND_POINTS = [
  { icon: "💧", text: "See daily consumption trends the moment you log a reading." },
  { icon: "🧾", text: "Download every past invoice as a PDF, whenever you need it." },
  { icon: "🔔", text: "Get emailed the moment a leak or overuse pattern shows up." },
];

export default function RegisterPage() {
  // Standard Registration Form States
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apartmentId, setApartmentId] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Registration intercepted States
  const [pendingGoogle, setPendingGoogle] = useState(null); // Holds { idToken, email, fullName }
  const [googleApartmentId, setGoogleApartmentId] = useState("");
  const [googleFlatNumber, setGoogleFlatNumber] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Shared Apartment Data List
  const [apartments, setApartments] = useState([]);

  const { register, googleLogin, googleRegister } = useAuth();
  const navigate = useNavigate();

  // Always fetch apartments list for registrations
  useEffect(() => {
    let isMounted = true;
    axiosClient
      .get("/public/apartments")
      .then((res) => {
        if (isMounted) setApartments(res.data);
      })
      .catch((err) => console.error("Failed to load apartments:", err));

    return () => { isMounted = false; };
  }, []);

  // 1. Traditional Email/Password Form Submit
  const handleTraditionalRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password, apartmentId, flatNumber);
      navigate("/resident");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Step 1 of Google Flow: Check if account exists, or intercept to request unit details
  const handleGoogleCredential = async (idToken) => {
    setGoogleError("");
    setError("");
    setPendingGoogle(null);

    try {
      // Re-use the googleLogin check logic to see if they're already registered
      const result = await googleLogin(idToken);

      if (result.accountExists) {
        // If they already exist, seamlessly log them in instead of double-registering
        navigate("/resident");
      } else {
        // Intercept standard page view, open the completion sub-form
        setPendingGoogle({
          idToken,
          email: result.googleEmail,
          fullName: result.googleFullName,
        });
      }
    } catch (err) {
      console.error("========== GOOGLE REGISTRATION INTERCEPT ERROR ==========", err);
      setGoogleError(
        err.response?.data?.message ||
        err.message ||
        "Google sign-in configuration failed."
      );
    }
  };

  // 3. Step 2 of Google Flow: Submitting unit info to save data to the backend
  const completeGoogleRegistration = async (e) => {
    e.preventDefault();
    if (!googleApartmentId || !googleFlatNumber) {
      setGoogleError("Please select your apartment and enter your flat number.");
      return;
    }
    setGoogleError("");
    setGoogleLoading(true);
    try {
      await googleRegister(pendingGoogle.idToken, googleApartmentId, googleFlatNumber);
      navigate("/resident");
    } catch (err) {
      setGoogleError(err.response?.data?.message || "Could not complete your Google registration.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-shell">
        {/* Left Side Branding Panel */}
        <div className="auth-brand-panel">
          <div className="ripple-rings" aria-hidden="true" style={{ top: "8%", left: "8%" }}>
            <span></span><span></span><span></span>
          </div>
          <div className="auth-brand-inner">
            <div className="auth-brand-mark">💧 AquaTrack</div>
            <h2 className="auth-brand-headline">
              Join us for <em>clearer water tracking.</em>
            </h2>
            <p className="auth-brand-copy">
              Create your account to track consumption, view invoices, and instantly identify home leaks.
            </p>
            <div className="auth-brand-list">
              {BRAND_POINTS.map((p) => (
                <div key={p.text} className="auth-brand-list-item">
                  <span className="auth-brand-list-icon">{p.icon}</span>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <h1 className="page-title">Create Account</h1>
            <p className="page-subtitle">Register as a new resident to monitor your unit.</p>

            {/* CASE A: Show Regular Form (If no Google button step is pending) */}
            {!pendingGoogle && (
              <>
                {error && <div className="alert-banner">{error}</div>}
                
                <form onSubmit={handleTraditionalRegister}>
                  <div className="form-group">
                    <label>Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Apartment Complex</label>
                    <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} required>
                      <option value="">Select apartment</option>
                      {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Flat Number</label>
                    <input value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} placeholder="e.g. B-102" required />
                  </div>
                  <button className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? "Registering..." : "Sign Up"}
                  </button>
                </form>

                {/* The "Continue with Google" Section */}
                <div className="auth-divider"><span>or</span></div>
                {googleError && <div className="alert-banner">{googleError}</div>}
                <GoogleSignInButton
                  onCredential={handleGoogleCredential}
                  onError={setGoogleError}
                />
              </>
            )}

            {/* CASE B: Show Step-2 Google Completion Sub-Form */}
            {pendingGoogle && (
              <div className="google-complete-box">
                <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 14 }}>
                  Setting up your account via Google email: <strong>{pendingGoogle.email}</strong>. 
                  Please select your apartment building information to complete registration.
                </p>
                {googleError && <div className="alert-banner">{googleError}</div>}
                
                <form onSubmit={completeGoogleRegistration}>
                  <div className="form-group">
                    <label>Apartment Complex</label>
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
                    {googleLoading ? "Completing Setup..." : "Complete Registration"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    style={{ marginTop: 8 }}
                    onClick={() => setPendingGoogle(null)}
                  >
                    Cancel Google Registration
                  </button>
                </form>
              </div>
            )}

            <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              Already have an account? <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>Log in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}