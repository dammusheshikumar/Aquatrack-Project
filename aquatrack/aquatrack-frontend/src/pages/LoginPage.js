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

export default function LoginPage() {
  const [role, setRole] = useState("RESIDENT");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, googleLogin, googleRegister } = useAuth();
  const navigate = useNavigate();

  // Google sign-in workflow states
  const [pendingGoogle, setPendingGoogle] = useState(null); // { idToken, email, fullName }
  const [apartments, setApartments] = useState([]);
  const [googleApartmentId, setGoogleApartmentId] = useState("");
  const [googleFlatNumber, setGoogleFlatNumber] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Fetch apartments safely when role is RESIDENT
  useEffect(() => {
    let isMounted = true;
    if (role === "RESIDENT") {
      axiosClient
        .get("/public/apartments")
        .then((res) => {
          if (isMounted) setApartments(res.data);
        })
        .catch((err) => console.error("Failed to fetch apartments:", err));
    }
    return () => { isMounted = false; };
  }, [role]);

  // Clean state variables when flipping between tabs
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setPendingGoogle(null);
    setGoogleError("");
    setError("");
  };

  // Traditional Form Authentication Handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const data = await login(username, password);
      
      // FIX: Guard clause blocks unexpected navigation when roles don't match
      if (data.role !== role) {
        setError(`This account is registered as ${data.role}, not ${role}. Please check your selection.`);
        setLoading(false);
        return; 
      }
      
      navigate(data.role === "ADMIN" ? "/admin" : "/resident");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password.");
      setLoading(false);
    }
  };

  // Google Sign-In Initial Catch Flow
  const handleGoogleCredential = async (idToken) => {
    setGoogleError("");
    setError("");
    setPendingGoogle(null);

    try {
      const result = await googleLogin(idToken);

      if (result.accountExists) {
        navigate("/resident");
      } else {
        setPendingGoogle({
          idToken,
          email: result.googleEmail,
          fullName: result.googleFullName,
        });
      }
    } catch (err) {
      console.error("========== GOOGLE LOGIN ERROR ==========", err);
      setGoogleError(
        err.response?.data?.message ||
        err.message ||
        "Google sign-in failed."
      );
    }
  };

  // Final Step for Google Accounts lacking Flat/Unit assignments
  const completeGoogleRegistration = async (e) => {
    e.preventDefault();
    if (!googleApartmentId || !googleFlatNumber) {
      setGoogleError("Select your apartment and enter your flat number.");
      return;
    }
    setGoogleError("");
    setGoogleLoading(true);
    try {
      await googleRegister(pendingGoogle.idToken, googleApartmentId, googleFlatNumber);
      navigate("/resident");
    } catch (err) {
      setGoogleError(err.response?.data?.message || "Could not complete your registration.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-shell">
        {/* Left Side Branding Display */}
        <div className="auth-brand-panel">
          <div className="ripple-rings" aria-hidden="true" style={{ top: "8%", left: "8%" }}>
            <span></span><span></span><span></span>
          </div>
          <div className="auth-brand-inner">
            <div className="auth-brand-mark">💧 AquaTrack</div>
            <h2 className="auth-brand-headline">
              Welcome back to <em>clearer water bills.</em>
            </h2>
            <p className="auth-brand-copy">
              Log in to track consumption, download invoices, and catch leaks before they cost you.
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

        {/* Right Side Form Interaction Space */}
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <h1 className="page-title">Log in</h1>
            <p className="page-subtitle">Choose your role, then sign in to your dashboard.</p>

            {/* Role Toggle Tabs */}
            <div className="role-toggle">
              <div
                className={`role-toggle-btn ${role === "RESIDENT" ? "active" : ""}`}
                onClick={() => handleRoleChange("RESIDENT")}
              >
                Resident
              </div>
              <div
                className={`role-toggle-btn ${role === "ADMIN" ? "active" : ""}`}
                onClick={() => handleRoleChange("ADMIN")}
              >
                Apartment Admin
              </div>
            </div>

            {/* Conditional Sub-View Manager */}
            {!pendingGoogle ? (
              <>
                {error && <div className="alert-banner">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <button className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? "Signing in..." : `Log in as ${role === "ADMIN" ? "Admin" : "Resident"}`}
                  </button>
                </form>

                {/* Third-Party Integrations Group (Resident Only) */}
                {role === "RESIDENT" && (
                  <>
                    <div className="auth-divider"><span>or</span></div>
                    {googleError && <div className="alert-banner">{googleError}</div>}
                    <GoogleSignInButton
                      onCredential={handleGoogleCredential}
                      onError={setGoogleError}
                    />
                  </>
                )}
              </>
            ) : (
              /* Google Metadata Registration Fallback Screen */
              <div className="google-complete-box">
                <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 14 }}>
                  No resident account found for <strong>{pendingGoogle.email}</strong> yet.
                  Select your apartment and flat number to finish setting it up.
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
                    {googleLoading ? "Finishing setup..." : "Complete sign-in"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    style={{ marginTop: 8 }}
                    onClick={() => setPendingGoogle(null)}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              No account? <Link to="/register" style={{ color: "var(--primary)", fontWeight: 600 }}>Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}