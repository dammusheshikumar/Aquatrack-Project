import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const modules = [
  {
    icon: "📊",
    title: "Tiered Tariff Billing",
    desc: "Configurable rate bands per apartment turn metered kL readings into accurate, transparent charges.",
  },
  {
    icon: "⚖️",
    title: "Fair Cost Apportionment",
    desc: "Shared costs — tankers, municipal supply, garden, lobby — split by consumption, with a flat-area fallback for meter-less flats.",
  },
  {
    icon: "🔎",
    title: "Leak & Overuse Alerts",
    desc: "A 2-sigma statistical check plus threshold rules catch abnormal spikes and email residents before the bill does.",
  },
  {
    icon: "🧾",
    title: "PDF Invoices & Email",
    desc: "Every billing cycle generates a downloadable invoice per household and sends automated email notifications.",
  },
];

const CONTACT_TOPICS = ["Billing question", "Technical issue", "New apartment onboarding", "Something else"];

export default function LandingPage() {
  const year = new Date().getFullYear();

  const [form, setForm] = useState({ name: "", email: "", topic: CONTACT_TOPICS[0], message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submitQuery = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    // Front-end only for now — wire to a real /api/public/contact endpoint when the
    // backend contact-query API is added.
    setTimeout(() => {
      setStatus("sent");
      setForm({ name: "", email: "", topic: CONTACT_TOPICS[0], message: "" });
    }, 700);
  };

  return (
    <div>
      <Navbar />

      {/* HERO */}
      <section className="hero-landing">
        <div className="container hero-landing-inner">
          <div className="ripple-rings" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>

          <span className="hero-eyebrow">💧 For apartment communities</span>
          <h1 className="hero-headline">
            Every litre, <em>accounted for.</em>
          </h1>
          <p className="hero-subhead">
            AquaTrack meters household consumption, apportions bulk water purchases fairly,
            and flags leaks before they become expensive — with a resident dashboard and
            a full admin billing console.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/register" className="btn btn-gold">Get started</Link>
            <Link to="/login" className="btn btn-glass">I already have an account</Link>
          </div>

          <div className="hero-stat-strip">
            <div className="hero-stat">
              <div className="hero-stat-value">2σ</div>
              <div className="hero-stat-label">statistical leak detection</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">Tiered</div>
              <div className="hero-stat-label">rate-band billing engine</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">PDF</div>
              <div className="hero-stat-label">invoice per household</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">Live</div>
              <div className="hero-stat-label">consumption dashboards</div>
            </div>
          </div>
        </div>

        <div className="wave-divider" aria-hidden="true">
          <svg viewBox="0 0 1440 84" preserveAspectRatio="none">
            <path
              d="M0,32 C240,80 480,0 720,24 C960,48 1200,88 1440,40 L1440,84 L0,84 Z"
              fill="#eafdfb"
            />
          </svg>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section-light">
        <div className="container">
          <div className="section-eyebrow">What AquaTrack handles</div>
          <h2 className="section-heading">Built for the two people who run a building</h2>
          <p style={{ color: "#4b5f63", marginBottom: 32, maxWidth: 560 }}>
            The resident who wants clarity on their bill, and the admin who wants control over the whole cycle.
          </p>
          <div className="grid grid-2">
            {modules.map((m) => (
              <div key={m.title} className="feature-card-land">
                <div className="feature-card-icon">{m.icon}</div>
                <h3 style={{ fontSize: 16.5, marginBottom: 8, color: "#0b3d3f" }}>{m.title}</h3>
                <p style={{ fontSize: 14, color: "#4b5f63", lineHeight: 1.6 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-light" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card" style={{ textAlign: "center", padding: 48, background: "#fff" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 12, color: "#0b3d3f" }}>
              Ready to see your water bill differently?
            </h2>
            <p style={{ color: "#4b5f63", marginBottom: 24 }}>
              Residents track daily usage. Admins run the whole billing cycle. Both in one place.
            </p>
            <Link to="/register" className="btn btn-primary">Create your account</Link>
          </div>
        </div>
      </section>

      {/* CONTACT / RAISE A QUERY */}
      <section className="contact-section" id="contact">
        <div className="container">
          <div className="contact-grid">
            <div>
              <div className="section-eyebrow" style={{ color: "var(--land-gold)" }}>Get in touch</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, marginBottom: 12 }}>
                Have a question or a query to raise?
              </h2>
              <p style={{ fontSize: 14.5, color: "rgba(234,253,251,0.75)", lineHeight: 1.7, marginBottom: 24 }}>
                Whether it's a billing discrepancy, a technical issue with your dashboard, or you're
                onboarding a new apartment — send us a note and we'll get back to you.
              </p>

              <div className="contact-info-item">
                <div className="contact-info-icon">✉️</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--land-foam)" }}>Email</div>
                  <div style={{ fontSize: 13, color: "rgba(234,253,251,0.7)" }}>support@aquatrack.app</div>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">⏱️</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--land-foam)" }}>Response time</div>
                  <div style={{ fontSize: 13, color: "rgba(234,253,251,0.7)" }}>Within 1 business day</div>
                </div>
              </div>
              <div className="contact-info-item" style={{ borderBottom: "none" }}>
                <div className="contact-info-icon">🏢</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--land-foam)" }}>For admins</div>
                  <div style={{ fontSize: 13, color: "rgba(234,253,251,0.7)" }}>Onboarding help for new apartment communities</div>
                </div>
              </div>
            </div>

            <div className="contact-form-card">
              {status === "sent" && (
                <div className="success-banner" style={{ background: "rgba(18,165,148,0.15)", color: "#7de3d3" }}>
                  Your query has been sent. We'll reply at the email you provided.
                </div>
              )}
              {status === "error" && (
                <div className="alert-banner" style={{ background: "rgba(220,38,38,0.15)", color: "#fca5a5" }}>
                  Please fill in your name, email, and a message before sending.
                </div>
              )}

              <form onSubmit={submitQuery}>
                <div className="grid grid-2" style={{ gap: 16 }}>
                  <div className="form-group">
                    <label>Name</label>
                    <input value={form.name} onChange={update("name")} placeholder="Your name" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Query type</label>
                  <select value={form.topic} onChange={update("topic")}>
                    {CONTACT_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea value={form.message} onChange={update("message")} placeholder="Tell us what's going on..." />
                </div>
                <button className="btn btn-gold btn-block" disabled={status === "sending"}>
                  {status === "sending" ? "Sending..." : "Raise query"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-land">
        <div className="container">
          <div className="footer-land-top">
            <div>
              <div className="footer-brand">💧 AquaTrack</div>
              <div className="footer-tagline">
                Water metering, billing, and leak alerts for apartment communities.
              </div>
            </div>

            <div className="footer-links">
              <div className="footer-link-group">
                <h4>Product</h4>
                <a href="#contact">Contact</a>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </div>
              <div className="footer-link-group">
                <h4>Roles</h4>
                <Link to="/register">Resident sign up</Link>
                <Link to="/register">Admin sign up</Link>
              </div>
              <div className="footer-link-group">
                <h4>Support</h4>
                <a href="#contact">Raise a query</a>
                <a href="mailto:support@aquatrack.app">support@aquatrack.app</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {year} AquaTrack. All rights reserved.</span>
            <span>Built for cleaner bills and fewer leaks.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}