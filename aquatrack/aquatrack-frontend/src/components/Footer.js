import React from "react";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #e2e8f0",
        background: "#ffffff",
        marginTop: "60px",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 0",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          © {new Date().getFullYear()} <strong style={{ color: "#0f172a" }}>AquaTrack</strong>. All rights reserved.
        </div>

        <div
          style={{
            display: "flex",
            gap: "18px",
            alignItems: "center",
          }}
        >
          <a
            href="mailto:support@aquatrack.com"
            style={{
              textDecoration: "none",
              color: "#0e7490",
              fontWeight: 500,
            }}
          >
            Contact
          </a>

          <span style={{ color: "#cbd5e1" }}>|</span>

          <a
            href="mailto:support@aquatrack.com?subject=AquaTrack%20Support"
            style={{
              textDecoration: "none",
              color: "#0e7490",
              fontWeight: 500,
            }}
          >
            Raise a Query
          </a>
        </div>
      </div>
    </footer>
  );
}