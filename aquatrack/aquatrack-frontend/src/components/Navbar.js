import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <div className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">💧 AquaTrack</Link>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {user ? (
            <>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 999, padding: "4px 12px 4px 4px",
                }}
              >
                <span
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "var(--primary)", color: "#fff",
                    fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {initials}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {user.fullName} · <span style={{ color: "var(--primary-dark)", fontWeight: 600 }}>{user.role}</span>
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}